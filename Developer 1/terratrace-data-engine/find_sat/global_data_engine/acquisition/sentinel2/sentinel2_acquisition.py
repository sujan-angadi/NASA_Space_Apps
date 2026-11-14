import numpy as np
import rasterio
import planetary_computer as pc

from pystac_client import Client
from rasterio.mask import mask
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling

from common.config import STAC_API_URL


class Sentinel2Acquisition:

    COLLECTION = "sentinel-2-l2a"
    QA_POLICY = "S2_SCL_CLOUD_MASK_v1"
    INVALID_SCL = (0, 1, 3, 8, 9, 10, 11)

    def __init__(self):
        self.catalog = Client.open(STAC_API_URL)

    def search(self, aoi, start_date, end_date, max_items=None):
        search = self.catalog.search(
            collections=[self.COLLECTION],
            intersects=aoi.geojson,
            datetime=f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
            max_items=max_items,
        )
        return sorted(
            search.items(),
            key=lambda item: item.properties.get("datetime") or "",
        )

    @staticmethod
    def scale_offset(asset):
        bands = asset.extra_fields.get("raster:bands", [])
        if bands:
            return (
                bands[0].get("scale", 0.0001),
                bands[0].get("offset", 0.0),
            )
        return 0.0001, 0.0

    @staticmethod
    def read_clip(asset_url, geometry, reference=None, categorical=False):
        with rasterio.open(asset_url) as src:
            if reference is None:
                target = {
                    "crs": src.crs,
                    "transform": src.transform,
                    "width": src.width,
                    "height": src.height,
                }
                dataset = src
                vrt = None
            else:
                target = reference
                vrt = WarpedVRT(
                    src,
                    crs=target["crs"],
                    transform=target["transform"],
                    width=target["width"],
                    height=target["height"],
                    resampling=(
                        Resampling.nearest if categorical
                        else Resampling.bilinear
                    ),
                )
                dataset = vrt

            projected = transform_geom(
                "EPSG:4326", target["crs"], geometry
            )

            try:
                data, transform = mask(
                    dataset,
                    [projected],
                    crop=True,
                    filled=True,
                    nodata=0,
                )
            finally:
                if vrt is not None:
                    vrt.close()

            data = data[0]
            inside = geometry_mask(
                [projected],
                out_shape=data.shape,
                transform=transform,
                invert=True,
                all_touched=False,
            )

            return data, transform, inside, target

    def process_item(self, item, aoi):
        signed = pc.sign(item)

        required = ("B03", "B04", "B08", "SCL")
        missing = [key for key in required if key not in signed.assets]
        if missing:
            raise ValueError(f"Missing assets: {missing}")

        # B08 (10 m) defines the output grid.
        nir_asset = signed.assets["B08"]
        nir, transform, inside, grid = self.read_clip(
            nir_asset.href, aoi.geojson
        )

        red, _, red_inside, _ = self.read_clip(
            signed.assets["B04"].href,
            aoi.geojson,
            reference=grid,
        )

        green, _, green_inside, _ = self.read_clip(
            signed.assets["B03"].href,
            aoi.geojson,
            reference=grid,
        )

        scl, _, scl_inside, _ = self.read_clip(
            signed.assets["SCL"].href,
            aoi.geojson,
            reference=grid,
            categorical=True,
        )

        if not (
            nir.shape == red.shape == green.shape == scl.shape
        ):
            raise ValueError("Sentinel-2 bands are not aligned")

        # SCL: exclude no-data, defective, cloud shadow, clouds and snow.
        clear = scl_inside & ~np.isin(
            scl.astype(np.uint8), self.INVALID_SCL
        )

        nir_scale, nir_offset = self.scale_offset(nir_asset)
        red_scale, red_offset = self.scale_offset(signed.assets["B04"])
        green_scale, green_offset = self.scale_offset(signed.assets["B03"])

        nir_ref = nir.astype(np.float32) * nir_scale + nir_offset
        red_ref = red.astype(np.float32) * red_scale + red_offset
        green_ref = green.astype(np.float32) * green_scale + green_offset

        valid_base = (
            inside & red_inside & green_inside & clear
            & (nir > 0) & (red > 0) & (green > 0)
        )

        ndvi_den = nir_ref + red_ref
        ndwi_den = green_ref + nir_ref

        ndvi_valid = (
            valid_base & (np.abs(ndvi_den) > 1e-6)
        )
        ndwi_valid = (
            valid_base & (np.abs(ndwi_den) > 1e-6)
        )

        ndvi = np.zeros(nir.shape, dtype=np.float32)
        ndwi = np.zeros(nir.shape, dtype=np.float32)

        ndvi[ndvi_valid] = (
            nir_ref[ndvi_valid] - red_ref[ndvi_valid]
        ) / ndvi_den[ndvi_valid]

        ndwi[ndwi_valid] = (
            green_ref[ndwi_valid] - nir_ref[ndwi_valid]
        ) / ndwi_den[ndwi_valid]

        ndvi_valid &= np.isfinite(ndvi) & (ndvi >= -1) & (ndvi <= 1)
        ndwi_valid &= np.isfinite(ndwi) & (ndwi >= -1) & (ndwi <= 1)

        total_pixels = int(np.count_nonzero(inside))
        valid_pixels = int(np.count_nonzero(valid_base))
        coverage = (
            100.0 * valid_pixels / total_pixels
            if total_pixels else 0.0
        )

        def stats(array, valid):
            if not np.any(valid):
                return {
                    "status": "no_valid_pixels",
                    "valid_pixels": 0,
                }
            values = array[valid]
            return {
                "status": "success",
                "valid_pixels": int(values.size),
                "mean": float(np.mean(values)),
                "minimum": float(np.min(values)),
                "maximum": float(np.max(values)),
                "std_dev": float(np.std(values)),
            }

        return {
            "source": "Sentinel-2",
            "collection": self.COLLECTION,
            "item_id": item.id,
            "observation_datetime": item.properties.get("datetime"),
            "aoi_name": aoi.name,
            "quality_policy": self.QA_POLICY,
            "grid_resolution_m": 10,
            "total_aoi_pixels": total_pixels,
            "valid_pixels": valid_pixels,
            "valid_pixel_percentage": round(coverage, 2),
            "ndvi": {
                "unit": "unitless",
                **stats(ndvi, ndvi_valid),
            },
            "ndwi_mcfeeters": {
                "unit": "unitless",
                **stats(ndwi, ndwi_valid),
            },
            "status": "success" if valid_pixels else "no_valid_pixels",
        }

    def acquire(self, aoi, start_date, end_date, max_items=None):
        items = self.search(aoi, start_date, end_date, max_items)
        results = []

        print(f"Sentinel-2 scenes found: {len(items)}")

        for index, item in enumerate(items, start=1):
            print(f"Processing {index}/{len(items)}: {item.id}")
            try:
                results.append(self.process_item(item, aoi))
            except Exception as error:
                results.append({
                    "source": "Sentinel-2",
                    "item_id": item.id,
                    "aoi_name": aoi.name,
                    "status": "error",
                    "error": str(error),
                })

        return results

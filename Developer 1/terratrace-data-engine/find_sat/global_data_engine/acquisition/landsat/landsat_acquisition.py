import numpy as np
import rasterio
import planetary_computer as pc

from pystac_client import Client
from rasterio.mask import mask
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom, reproject
from rasterio.enums import Resampling

from common.config import STAC_API_URL


class LandsatAcquisition:

    COLLECTION = "landsat-c2-l2"

    ST_SCALE = 0.00341802
    ST_OFFSET = 149.0

    SR_SCALE = 0.0000275
    SR_OFFSET = -0.2

    QA_POLICY = "LANDSAT_C2_QA_PIXEL_v1"

    def __init__(self):
        self.catalog = Client.open(STAC_API_URL)

    def search(self, aoi, start_date, end_date, max_items=None):
        search = self.catalog.search(
            collections=[self.COLLECTION],
            intersects=aoi.geojson,
            datetime=f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
            max_items=max_items,
        )

        # Landsat 8 and 9 only for consistent band mappings.
        items = [
            item for item in search.items()
            if item.id.startswith(("LC08", "LC09"))
        ]

        return sorted(
            items,
            key=lambda item: item.properties.get("datetime") or ""
        )

    @staticmethod
    def read_clip(asset_url, geometry, reference=None, categorical=False):
        with rasterio.open(asset_url) as src:

            if reference is None:
                target_crs = src.crs
                target_transform = src.transform
                target_width = src.width
                target_height = src.height
            else:
                target_crs = reference["crs"]
                target_transform = reference["transform"]
                target_width = reference["width"]
                target_height = reference["height"]

            projected_geometry = transform_geom(
                "EPSG:4326", target_crs, geometry
            )

            if (
                src.crs == target_crs
                and src.transform == target_transform
                and src.width == target_width
                and src.height == target_height
            ):
                data, transform = mask(
                    src,
                    [projected_geometry],
                    crop=True,
                    filled=True,
                    nodata=0,
                )
                data = data[0]
            else:
                # Align bands and QA to the reference raster grid.
                from rasterio.warp import calculate_default_transform

                full = np.zeros(
                    (target_height, target_width),
                    dtype=np.float32,
                )

                reproject(
                    source=rasterio.band(src, 1),
                    destination=full,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=target_transform,
                    dst_crs=target_crs,
                    resampling=(
                        Resampling.nearest if categorical
                        else Resampling.bilinear
                    ),
                )

                # Clip the aligned data to the AOI.
                from rasterio.io import MemoryFile

                with MemoryFile() as mem:
                    with mem.open(
                        driver="GTiff",
                        height=target_height,
                        width=target_width,
                        count=1,
                        dtype="float32",
                        crs=target_crs,
                        transform=target_transform,
                        nodata=0,
                    ) as dst:
                        dst.write(full, 1)

                    with mem.open() as aligned:
                        data, transform = mask(
                            aligned,
                            [projected_geometry],
                            crop=True,
                            filled=True,
                            nodata=0,
                        )
                        data = data[0]

            inside = geometry_mask(
                [projected_geometry],
                out_shape=data.shape,
                transform=transform,
                invert=True,
                all_touched=False,
            )

            return data, transform, inside, projected_geometry, {
                "crs": target_crs,
                "transform": target_transform,
                "width": target_width,
                "height": target_height,
            }

    def process_item(self, item, aoi):
        signed = pc.sign(item)

        required = ["lwir11", "red", "nir08", "qa_pixel", "qa_radsat"]
        missing = [key for key in required if key not in signed.assets]
        if missing:
            raise ValueError(f"Missing assets: {missing}")

        # Thermal raster establishes the LST grid.
        lst, transform, inside, geometry, grid = self.read_clip(
            signed.assets["lwir11"].href, aoi.geojson
        )

        qa, _, _, _, _ = self.read_clip(
            signed.assets["qa_pixel"].href,
            aoi.geojson,
            reference=grid,
            categorical=True,
        )

        # QA_PIXEL bits: fill, dilated cloud, cirrus, cloud,
        # cloud shadow and snow.
        clear = (qa.astype(np.uint16) & 0b00111111) == 0
        lst_valid = inside & clear & (lst > 0)

        lst_values = (
            lst[lst_valid].astype(np.float32) * self.ST_SCALE
            + self.ST_OFFSET - 273.15
        )

        # Red band establishes the reflectance grid.
        red, red_transform, red_inside, red_geometry, sr_grid = (
            self.read_clip(signed.assets["red"].href, aoi.geojson)
        )

        nir, _, _, _, _ = self.read_clip(
            signed.assets["nir08"].href,
            aoi.geojson,
            reference=sr_grid,
        )

        sr_qa, _, _, _, _ = self.read_clip(
            signed.assets["qa_pixel"].href,
            aoi.geojson,
            reference=sr_grid,
            categorical=True,
        )

        radsat, _, _, _, _ = self.read_clip(
            signed.assets["qa_radsat"].href,
            aoi.geojson,
            reference=sr_grid,
            categorical=True,
        )

        # QA_PIXEL clear conditions and no saturation in B4/B5.
        sr_clear = (sr_qa.astype(np.uint16) & 0b00111111) == 0
        red_nir_unsaturated = (
            (radsat.astype(np.uint16) & ((1 << 3) | (1 << 4))) == 0
        )

        red_ref = red.astype(np.float32) * self.SR_SCALE + self.SR_OFFSET
        nir_ref = nir.astype(np.float32) * self.SR_SCALE + self.SR_OFFSET

        denominator = nir_ref + red_ref
        ndvi_valid = (
            red_inside
            & sr_clear
            & red_nir_unsaturated
            & (red > 0)
            & (nir > 0)
            & (np.abs(denominator) > 1e-6)
        )

        ndvi = np.zeros(red.shape, dtype=np.float32)
        ndvi[ndvi_valid] = (
            (nir_ref[ndvi_valid] - red_ref[ndvi_valid])
            / denominator[ndvi_valid]
        )

        # Keep only physically meaningful NDVI values.
        ndvi_valid &= np.isfinite(ndvi) & (ndvi >= -1) & (ndvi <= 1)

        date = item.properties.get("datetime")

        result = {
            "source": "Landsat 8/9",
            "collection": self.COLLECTION,
            "item_id": item.id,
            "observation_datetime": date,
            "aoi_name": aoi.name,
            "quality_policy": self.QA_POLICY,
            "lst": {
                "unit": "celsius",
                "valid_pixels": int(lst_values.size),
                "status": "success" if lst_values.size else "no_valid_pixels",
            },
            "ndvi": {
                "unit": "unitless",
                "valid_pixels": int(np.count_nonzero(ndvi_valid)),
                "status": (
                    "success" if np.any(ndvi_valid)
                    else "no_valid_pixels"
                ),
            },
            "status": "success" if (
                lst_values.size or np.any(ndvi_valid)
            ) else "no_valid_pixels",
        }

        if lst_values.size:
            result["lst"].update({
                "mean": float(np.mean(lst_values)),
                "minimum": float(np.min(lst_values)),
                "maximum": float(np.max(lst_values)),
                "std_dev": float(np.std(lst_values)),
            })

        if np.any(ndvi_valid):
            values = ndvi[ndvi_valid]
            result["ndvi"].update({
                "mean": float(np.mean(values)),
                "minimum": float(np.min(values)),
                "maximum": float(np.max(values)),
                "std_dev": float(np.std(values)),
            })

        return result

    def acquire(self, aoi, start_date, end_date, max_items=None):
        items = self.search(aoi, start_date, end_date, max_items)
        results = []

        print(f"Landsat 8/9 scenes found: {len(items)}")

        for index, item in enumerate(items, start=1):
            print(f"Processing {index}/{len(items)}: {item.id}")

            try:
                results.append(self.process_item(item, aoi))
            except Exception as error:
                results.append({
                    "source": "Landsat 8/9",
                    "item_id": item.id,
                    "aoi_name": aoi.name,
                    "status": "error",
                    "error": str(error),
                })

        return results

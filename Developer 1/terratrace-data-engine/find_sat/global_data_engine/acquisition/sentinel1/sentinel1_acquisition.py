
import math
import numpy as np
import rasterio
import planetary_computer as pc

from pystac_client import Client
from rasterio.mask import mask
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from pyproj import CRS, Transformer
from shapely.geometry import shape, mapping

from common.config import STAC_API_URL


class Sentinel1Acquisition:

    COLLECTION = "sentinel-1-grd"
    RESOLUTION_M = 10

    def __init__(self):
        self.catalog = Client.open(STAC_API_URL)

    def search(self, aoi, start_date, end_date, max_items=5):
        search = self.catalog.search(
            collections=[self.COLLECTION],
            intersects=aoi.geojson,
            datetime=f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
            max_items=max_items,
            query={
                "sar:instrument_mode": {"eq": "IW"},
            },
        )

        return sorted(
            search.items(),
            key=lambda item: item.properties.get("datetime") or "",
        )

    def process_asset(self, item, aoi, band):

        signed = pc.sign(item)

        with rasterio.open(signed.assets[band].href) as src:

            gcps, gcp_crs = src.gcps

            if not gcps or gcp_crs is None:
                raise ValueError("Raster has no usable GCP georeferencing")

            # Create a local metric projection around the AOI.
            aoi_shape = shape(aoi.geojson)
            center = aoi_shape.centroid

            dst_crs = CRS.from_proj4(
                f"+proj=aeqd +lat_0={center.y} "
                f"+lon_0={center.x} +datum=WGS84 +units=m +no_defs"
            )

            transformer = Transformer.from_crs(
                "EPSG:4326", dst_crs, always_xy=True
            )

            projected_aoi = shape(
                {
                    "type": "Polygon",
                    "coordinates": [[
                        transformer.transform(x, y)
                        for x, y in aoi_shape.exterior.coords
                    ]],
                }
            )

            left, bottom, right, top = projected_aoi.bounds

            resolution = self.RESOLUTION_M

            width = math.ceil((right - left) / resolution)
            height = math.ceil((top - bottom) / resolution)

            if width <= 0 or height <= 0:
                raise ValueError("Invalid output raster dimensions")

            transform = from_origin(
                left, top, resolution, resolution
            )

            # Use GCPs as the source geolocation model.
            with WarpedVRT(
                src,
                src_crs=gcp_crs,
                src_gcps=gcps,
                crs=dst_crs,
                transform=transform,
                width=width,
                height=height,
                resampling=Resampling.bilinear,
            ) as vrt:

                data, _ = mask(
                    vrt,
                    [mapping(projected_aoi)],
                    crop=True,
                    filled=False,
                )

                values = data[0].compressed().astype(np.float32)

            values = values[np.isfinite(values)]

            if values.size == 0:
                return {
                    "status": "no_valid_pixels",
                    "valid_pixels": 0,
                }

            return {
                "status": "success",
                "valid_pixels": int(values.size),
                "mean": float(np.mean(values)),
                "median": float(np.median(values)),
                "std_dev": float(np.std(values)),
                "minimum": float(np.min(values)),
                "maximum": float(np.max(values)),
                "measurement": "source_backscatter_asset_values",
                "output_grid_resolution_m": resolution,
            }

    def acquire(self, aoi, start_date, end_date, max_items=5):

        items = self.search(
            aoi, start_date, end_date, max_items
        )

        results = []

        print(f"Sentinel-1 scenes found: {len(items)}")

        for index, item in enumerate(items, 1):

            print(f"Processing {index}/{len(items)}: {item.id}")

            record = {
                "source": "Sentinel-1",
                "collection": self.COLLECTION,
                "item_id": item.id,
                "observation_datetime": item.properties.get("datetime"),
                "aoi_name": aoi.name,
                "quality_policy": "S1_GCP_WARP_v1",
            }

            try:
                record["vv"] = self.process_asset(item, aoi, "vv")
                record["vh"] = self.process_asset(item, aoi, "vh")
                record["status"] = "success"

            except Exception as error:
                record["status"] = "error"
                record["error"] = str(error)

            results.append(record)

        return results

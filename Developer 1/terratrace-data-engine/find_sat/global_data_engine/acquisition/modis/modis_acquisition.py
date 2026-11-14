from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
import numpy as np
import rasterio
import planetary_computer as pc

from pystac_client import Client
from rasterio.mask import mask
from shapely.geometry import mapping

from common.config import STAC_API_URL
from aoi.models import AreaOfInterest


class MODISAcquisition:

    COLLECTION = "modis-11A2-061"
    QC_POLICY = "MODIS_LST_QC_v1"
    SCALE_FACTOR = 0.02
    KELVIN_OFFSET = 273.15

    def __init__(self):
        self.catalog = Client.open(STAC_API_URL)

    def search(self, aoi, start_date, end_date, max_items=None):

        search = self.catalog.search(
            collections=[self.COLLECTION],
            intersects=aoi.geojson,
            datetime=f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
            max_items=max_items,
        )

        # Terra only: MOD11A2, excluding Aqua MYD11A2.
        items = [
            item for item in search.items()
            if item.id.startswith("MOD11A2")
        ]

        return sorted(
            items,
            key=lambda item: (
                item.properties.get("datetime")
                or item.properties.get("start_datetime")
                or ""
            )
        )

    @staticmethod
    def apply_qc(lst, qc):

        lst = lst.astype(np.float32)
        qc = qc.astype(np.uint8)

        mandatory_qa = qc & 0b00000011
        data_quality = (qc >> 2) & 0b00000011
        lst_error = (qc >> 6) & 0b00000011

        valid = (
            (lst != 0)
            & np.isin(mandatory_qa, [0, 1])
            & (data_quality == 0)
            & np.isin(lst_error, [0, 1])
        )

        return valid

    def process_item(self, item, aoi, period="Day"):

        signed_item = pc.sign(item)

        lst_asset = signed_item.assets[f"LST_{period}_1km"].href
        qc_asset = signed_item.assets[f"QC_{period}"].href

        # Open the LST raster and establish its grid.
        with rasterio.open(lst_asset) as lst_src:

            lst_crs = lst_src.crs

            if lst_crs is None:
                raise ValueError("MODIS LST raster has no CRS")

            # Convert the AOI from WGS84 into MODIS Sinusoidal CRS.
            projected_geometry = transform_geom(
                "EPSG:4326",
                lst_crs,
                aoi.geojson,
            )

            lst_data, lst_transform = mask(
                lst_src,
                [projected_geometry],
                crop=True,
                filled=True,
                nodata=0,
            )

            lst_data = lst_data[0]

            # Preserve the exact LST raster grid for QC alignment.
            grid = {
                "crs": lst_src.crs,
                "transform": lst_src.transform,
                "width": lst_src.width,
                "height": lst_src.height,
            }

        # Open QC and align it to the LST grid if necessary.
        with rasterio.open(qc_asset) as qc_src:

            with WarpedVRT(
                qc_src,
                crs=grid["crs"],
                transform=grid["transform"],
                width=grid["width"],
                height=grid["height"],
                resampling=Resampling.nearest,
                nodata=255,
            ) as qc_vrt:

                qc_data, _ = mask(
                    qc_vrt,
                    [projected_geometry],
                    crop=True,
                    filled=True,
                    nodata=255,
                )

                qc_data = qc_data[0]

        if lst_data.shape != qc_data.shape:
            raise ValueError("LST and QC dimensions do not match")

        # Count only pixels whose centres fall inside the AOI.
        inside_aoi = geometry_mask(
            [projected_geometry],
            out_shape=lst_data.shape,
            transform=lst_transform,
            invert=True,
            all_touched=False,
        )

        total_pixels = int(np.count_nonzero(inside_aoi))

        quality_valid = self.apply_qc(lst_data, qc_data)
        valid = inside_aoi & quality_valid

        valid_pixels = int(np.count_nonzero(valid))
        rejected_pixels = total_pixels - valid_pixels

        coverage = (
            100.0 * valid_pixels / total_pixels
            if total_pixels else 0.0
        )

        observation_date = (
            item.properties.get("datetime")
            or item.properties.get("start_datetime")
        )

        base = {
            "source": "MODIS Terra",
            "collection": self.COLLECTION,
            "item_id": item.id,
            "observation_datetime": observation_date,
            "aoi_name": aoi.name,
            "variable": f"land_surface_temperature_{period.lower()}",
            "unit": "celsius",
            "quality_policy": self.QC_POLICY,
            "total_aoi_pixels": total_pixels,
            "valid_pixels": valid_pixels,
            "rejected_pixels": rejected_pixels,
            "valid_pixel_percentage": round(coverage, 2),
        }

        if valid_pixels == 0:
            return {
                **base,
                "status": "no_valid_pixels",
            }

        temperatures = (
            lst_data[valid].astype(np.float32)
            * self.SCALE_FACTOR
        ) - self.KELVIN_OFFSET

        return {
            **base,
            "mean": float(np.mean(temperatures)),
            "minimum": float(np.min(temperatures)),
            "maximum": float(np.max(temperatures)),
            "std_dev": float(np.std(temperatures)),
            "status": "success",
        }

    def acquire(
        self,
        aoi,
        start_date,
        end_date,
        max_items=None,
    ):

        items = self.search(
            aoi,
            start_date,
            end_date,
            max_items,
        )

        results = []

        print(f"MODIS Terra observations found: {len(items)}")

        for index, item in enumerate(items, start=1):

            for period in ("Day", "Night"):

                print(
                    f"Processing {index}/{len(items)} "
                    f"{period}: {item.id}"
                )

                try:
                    result = self.process_item(
                        item,
                        aoi,
                        period=period,
                    )
                    results.append(result)

                except Exception as error:
                    results.append({
                        "item_id": item.id,
                        "aoi_name": aoi.name,
                        "period": period,
                        "status": "error",
                        "error": str(error),
                    })

        return results

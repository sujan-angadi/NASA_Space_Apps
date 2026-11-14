from shapely.geometry import Polygon
import json
from pathlib import Path
from datetime import datetime, timezone

import netCDF4
import numpy as np
from shapely import contains_xy

from aoi.models import AreaOfInterest


RAW_DIR = Path("data/raw/sentinel5p")
OUTPUT_DIR = Path("data/processed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SO2_VARIABLE = "sulfurdioxide_total_vertical_column"
PRECISION_VARIABLE = "sulfurdioxide_total_vertical_column_precision"
QA_VARIABLE = "qa_value"

QA_THRESHOLD = 0.5


def to_array(variable):
    """Read NetCDF data, preserving masks and applying scale factors."""
    return np.ma.filled(
        np.ma.asarray(variable[:], dtype=np.float64),
        np.nan
    )


def statistics(values):
    values = np.asarray(values, dtype=np.float64)
    values = values[np.isfinite(values)]

    if values.size == 0:
        return None

    return {
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "std_dev": float(np.std(values)),
        "minimum": float(np.min(values)),
        "maximum": float(np.max(values)),
    }


def process_sentinel5p_file(
    netcdf_path: Path,
    aoi: AreaOfInterest,
    qa_threshold: float = QA_THRESHOLD,
):
    netcdf_path = Path(netcdf_path)

    with netCDF4.Dataset(netcdf_path, "r") as ds:
        product = ds.groups["PRODUCT"]

        so2_var = product.variables[SO2_VARIABLE]
        precision_var = product.variables[PRECISION_VARIABLE]

        so2 = to_array(so2_var)[0]
        precision = to_array(precision_var)[0]
        latitude = to_array(product.variables["latitude"])[0]
        longitude = to_array(product.variables["longitude"])[0]
        qa = to_array(product.variables[QA_VARIABLE])[0]

        # Pixel-corner bounds for footprint intersection.
        lat_bounds = np.ma.filled(
            np.ma.asarray(
                product.groups["SUPPORT_DATA"]
                .groups["GEOLOCATIONS"]
                .variables["latitude_bounds"][:],
                dtype=np.float64,
            ),
            np.nan,
        )[0]
        lon_bounds = np.ma.filled(
            np.ma.asarray(
                product.groups["SUPPORT_DATA"]
                .groups["GEOLOCATIONS"]
                .variables["longitude_bounds"][:],
                dtype=np.float64,
            ),
            np.nan,
        )[0]

        # Pixel-footprint intersection with the AOI polygon.
        inside_aoi = np.zeros(so2.shape, dtype=bool)

        minx, miny, maxx, maxy = aoi.bbox

        candidates = (
            np.isfinite(latitude)
            & np.isfinite(longitude)
            & (longitude >= minx - 0.1)
            & (longitude <= maxx + 0.1)
            & (latitude >= miny - 0.1)
            & (latitude <= maxy + 0.1)
        )

        aoi_geom = aoi.geometry

        for r, c in zip(*np.where(candidates)):
            corners = [
                (lon_bounds[r, c, 0], lat_bounds[r, c, 0]),
                (lon_bounds[r, c, 1], lat_bounds[r, c, 0]),
                (lon_bounds[r, c, 1], lat_bounds[r, c, 1]),
                (lon_bounds[r, c, 0], lat_bounds[r, c, 1]),
            ]

            if not all(
                np.isfinite(x) and np.isfinite(y)
                for x, y in corners
            ):
                continue

            try:
                footprint = Polygon(corners)
            except Exception:
                continue

            if not footprint.is_valid or footprint.is_empty:
                continue

            if footprint.intersects(aoi_geom):
                inside_aoi[r, c] = True

        # Exclude missing, invalid and low-quality pixels.
        valid = (
            inside_aoi
            & np.isfinite(so2)
            & np.isfinite(precision)
            & np.isfinite(latitude)
            & np.isfinite(longitude)
            & np.isfinite(qa)
            & (qa >= qa_threshold)
            & (precision >= 0)
        )

        selected_so2 = so2[valid]
        selected_precision = precision[valid]
        selected_qa = qa[valid]

        if selected_so2.size == 0:
            status = "no_valid_pixels"
        else:
            status = "success"

        pixels_inside_aoi = int(np.count_nonzero(inside_aoi))

        result = {
            "source": "Sentinel-5P",
            "collection": "sentinel-5p-l2-netcdf",
            "item_id": netcdf_path.stem,
            "product": "SO2",
            "observation_datetime": ds.getncattr(
                "time_coverage_start"
            ),
            "observation_end": ds.getncattr(
                "time_coverage_end"
            ),
            "processing_status": ds.getncattr(
                "processing_status"
            ),
            "aoi_name": aoi.name,
            "aoi_area_km2": aoi.area_km2,
            "aoi_bbox": aoi.bbox,
            "variable": SO2_VARIABLE,
            "unit": getattr(so2_var, "units", "mol m-2"),
            "measurement": "total_vertical_column_density",
            "quality_policy": {
                "name": "S5P_SO2_QA_v1",
                "qa_variable": QA_VARIABLE,
                "minimum_qa": qa_threshold,
            },
            "total_swath_pixels": int(so2.size),
            "pixels_inside_aoi": pixels_inside_aoi,
            "valid_pixels": int(selected_so2.size),
            "valid_pixel_coverage_percent": (
                float(selected_so2.size / pixels_inside_aoi * 100)
                if pixels_inside_aoi else 0.0
            ),
            "status": status,
        }

        if status == "success":
            result["so2"] = statistics(selected_so2)
            result["precision"] = statistics(selected_precision)
            result["mean_qa_value"] = float(np.mean(selected_qa))
        else:
            result["so2"] = None
            result["precision"] = None
            result["mean_qa_value"] = None

        return result


def acquire_sentinel5p(
    aoi: AreaOfInterest,
    output_path=OUTPUT_DIR / "sentinel5p_so2.json",
):
    files = sorted(RAW_DIR.glob("*.nc"))

    if not files:
        raise FileNotFoundError(
            f"No Sentinel-5P NetCDF files found in {RAW_DIR}"
        )

    results = []

    for file in files:
        print(f"Processing: {file.name}")

        try:
            result = process_sentinel5p_file(file, aoi)
        except Exception as exc:
            result = {
                "source": "Sentinel-5P",
                "item_id": file.stem,
                "status": "error",
                "error": str(exc),
            }

        results.append(result)
        print("Status:", result["status"])

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w") as f:
        json.dump(results, f, indent=2)

    print("\nSentinel-5P summary")
    print("Total files:", len(results))
    print("Successful:", sum(r["status"] == "success" for r in results))
    print("Saved:", output_path)

    return results

"""
TerraTrace GPM IMERG monthly rainfall acquisition.

Product:
  NASA GPM IMERG V07 Final monthly (GPM_3IMERGM)

This module downloads monthly granules through NASA Earthdata using earthaccess,
extracts precipitation for the configured AOI, and writes one record per month.

Important:
- IMERG monthly precipitation is a monthly mean precipitation RATE in mm/hr.
- monthly_accumulation_mm is derived as mean_rate_mm_hr * hours_in_month.
- Spatial resolution is approximately 0.1 degree (~10 km), so it is coarse
  relative to the current 2 km Jamnagar test AOI.
- Pixel selection uses grid-cell footprint intersection with the AOI, not
  area-weighted fractional clipping.
- This is satellite-gauge blended precipitation estimation, not a rain gauge.
"""

from __future__ import annotations

import calendar
import json
import os
from pathlib import Path
from typing import Any

import earthaccess
import numpy as np
import xarray as xr
from pyproj import Transformer
from shapely.geometry import Point, box
from shapely.ops import transform as shapely_transform

# Project defaults: Jamnagar Test AOI.
AOI_LON = float(os.getenv("TERRATRACE_AOI_LON", "69.849610"))
AOI_LAT = float(os.getenv("TERRATRACE_AOI_LAT", "22.334148"))
AOI_RADIUS_M = float(os.getenv("TERRATRACE_AOI_RADIUS_M", "2000"))

START_DATE = os.getenv("GPM_START_DATE", "2022-01-01")
END_DATE = os.getenv("GPM_END_DATE", "2025-12-31")

RAW_DIR = Path("data/raw/gpm")
PROCESSED_DIR = Path("data/processed")
OUTPUT = PROCESSED_DIR / "gpm_imerg_monthly_rainfall.json"

SHORT_NAME = "GPM_3IMERGM"
VERSION = "07"


def make_aoi():
    """Create a metric buffer around the AOI center, then return WGS84 polygon."""
    to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32642", always_xy=True)
    to_wgs = Transformer.from_crs("EPSG:32642", "EPSG:4326", always_xy=True)
    center = Point(AOI_LON, AOI_LAT)
    center_utm = shapely_transform(to_utm.transform, center)
    buffer_utm = center_utm.buffer(AOI_RADIUS_M)
    return shapely_transform(to_wgs.transform, buffer_utm)


def find_data_array(ds: xr.Dataset) -> xr.DataArray:
    """Find the monthly IMERG precipitation variable across common file layouts."""
    candidates = ("precipitation", "precipitationCal")
    for name in candidates:
        if name in ds.data_vars:
            return ds[name]
    raise KeyError(
        f"Could not find IMERG precipitation variable. "
        f"Available variables: {list(ds.data_vars)}"
    )


def find_coord(ds: xr.Dataset, names: tuple[str, ...]) -> str:
    for name in names:
        if name in ds.coords or name in ds.variables:
            return name
    raise KeyError(f"Could not find coordinate from {names}; found {list(ds.variables)}")


def open_imerg(path: Path) -> xr.Dataset:
    """Try the HDF5 Grid group first, then the root dataset."""
    try:
        return xr.open_dataset(path, group="Grid", engine="netcdf4")
    except Exception:
        return xr.open_dataset(path, engine="netcdf4")


def process_file(path: Path, aoi):
    ds = open_imerg(path)
    try:
        da = find_data_array(ds)
        lat_name = find_coord(ds, ("lat", "latitude"))
        lon_name = find_coord(ds, ("lon", "longitude"))

        # Remove singleton time/other dimensions, while retaining lat/lon.
        for dim in list(da.dims):
            if dim not in (lat_name, lon_name):
                if da.sizes[dim] == 1:
                    da = da.isel({dim: 0})
                else:
                    raise ValueError(
                        f"Unexpected non-spatial dimension {dim}={da.sizes[dim]}"
                    )

        da = da.transpose(lat_name, lon_name)
        lats = np.asarray(ds[lat_name].values).astype(float)
        lons = np.asarray(ds[lon_name].values).astype(float)
        values = np.asarray(da.values).astype(float)

        # Respect fill values and non-finite values.
        fill = da.attrs.get("_FillValue", da.encoding.get("_FillValue"))
        valid = np.isfinite(values)
        if fill is not None:
            valid &= values != float(fill)

        # Grid-cell footprint intersection with AOI.
        if len(lons) < 2 or len(lats) < 2:
            raise ValueError("IMERG grid coordinates are too small")
        dlon = float(np.median(np.abs(np.diff(np.sort(lons)))))
        dlat = float(np.median(np.abs(np.diff(np.sort(lats)))))

        mask = np.zeros(values.shape, dtype=bool)
        for iy, lat in enumerate(lats):
            for ix, lon in enumerate(lons):
                cell = box(
                    lon - dlon / 2, lat - dlat / 2,
                    lon + dlon / 2, lat + dlat / 2
                )
                if cell.intersects(aoi):
                    mask[iy, ix] = True

        selected = values[mask & valid]
        if selected.size == 0:
            stats = {
                "valid_pixels": 0,
                "total_intersecting_pixels": int(mask.sum()),
                "mean_rate_mm_per_hour": None,
                "monthly_accumulation_mm": None,
                "minimum_rate_mm_per_hour": None,
                "maximum_rate_mm_per_hour": None,
                "std_rate_mm_per_hour": None,
            }
            status = "no_valid_pixels"
        else:
            mean_rate = float(np.mean(selected))
            # Determine month from filename date token YYYYMM01.
            import re
            match = re.search(r"(\d{4})(\d{2})01", path.name)
            if not match:
                raise ValueError(f"Cannot determine month from filename: {path.name}")
            year, month = int(match.group(1)), int(match.group(2))
            hours = calendar.monthrange(year, month)[1] * 24

            stats = {
                "valid_pixels": int(selected.size),
                "total_intersecting_pixels": int(mask.sum()),
                "mean_rate_mm_per_hour": mean_rate,
                "monthly_accumulation_mm": mean_rate * hours,
                "minimum_rate_mm_per_hour": float(np.min(selected)),
                "maximum_rate_mm_per_hour": float(np.max(selected)),
                "std_rate_mm_per_hour": float(np.std(selected)),
            }
            status = "success"

        import re
        match = re.search(r"(\d{4})(\d{2})01", path.name)
        if not match:
            raise ValueError(f"Cannot determine observation month from filename: {path.name}")
        year, month = int(match.group(1)), int(match.group(2))

        return {
            "source": "NASA GPM IMERG",
            "collection": "GPM_3IMERGM_07",
            "item_id": path.name,
            "observation_datetime": f"{year:04d}-{month:02d}-01T00:00:00Z",
            "observation_end": None,
            "aoi_name": "Jamnagar Test",
            "variable": "precipitation_monthly_accumulation",
            "unit": "mm/month",
            "rate_variable": "precipitation",
            "rate_unit": "mm/hour",
            "quality_policy": "IMERG_Final_V07_monthly_valid_finite_pixels",
            "spatial_resolution": "0.1 degree (~10 km)",
            "temporal_resolution": "monthly",
            "spatial_method": "grid_cell_footprint_intersection_no_fractional_area_weighting",
            "status": status,
            **stats,
            "source_file": str(path),
        }
    finally:
        ds.close()


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("Logging into NASA Earthdata...")
    earthaccess.login(strategy="interactive", persist=True)

    aoi = make_aoi()
    west, south, east, north = aoi.bounds

    print(f"Searching {SHORT_NAME} version {VERSION}")
    print(f"Date range: {START_DATE} to {END_DATE}")
    granules = earthaccess.search_data(
        short_name=SHORT_NAME,
        version=VERSION,
        temporal=(START_DATE, END_DATE),
        bounding_box=(west, south, east, north),
    )

    if not granules:
        raise RuntimeError(
            "No GPM IMERG monthly granules found. Check Earthdata login, "
            "collection version and requested dates."
        )

    print(f"Granules found: {len(granules)}")
    downloaded = earthaccess.download(granules, local_path=str(RAW_DIR))
    paths = [Path(p) for p in downloaded if Path(p).is_file()]
    if not paths:
        raise RuntimeError("Earthaccess returned no downloaded files.")

    records: list[dict[str, Any]] = []
    for index, path in enumerate(sorted(paths), start=1):
        print(f"[{index}/{len(paths)}] Processing {path.name}")
        try:
            records.append(process_file(path, aoi))
        except Exception as exc:
            records.append({
                "source": "NASA GPM IMERG",
                "collection": "GPM_3IMERGM_07",
                "item_id": path.name,
                "variable": "precipitation_monthly_accumulation",
                "unit": "mm/month",
                "status": "error",
                "error": str(exc),
                "source_file": str(path),
            })

    OUTPUT.write_text(json.dumps(records, indent=2))
    print(f"\nProcessed records: {len(records)}")
    print(f"Successful: {sum(r.get('status') == 'success' for r in records)}")
    print(f"No valid pixels: {sum(r.get('status') == 'no_valid_pixels' for r in records)}")
    print(f"Errors: {sum(r.get('status') == 'error' for r in records)}")
    print(f"Saved: {OUTPUT}")


if __name__ == "__main__":
    main()

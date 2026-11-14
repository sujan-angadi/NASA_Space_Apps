import h5py
import pandas as pd
import numpy as np
from pathlib import Path
import re
import json

BASE = Path(".")
FACILITIES = BASE / "data/input/global_facilities.csv"
GPM_DIR = BASE / "data/raw/gpm"
OUT = BASE / "data/processed"

OUT.mkdir(parents=True, exist_ok=True)

fac = pd.read_csv(FACILITIES)
fac = fac.dropna(subset=["Latitude", "Longitude"]).copy()

# Actual nearest GPM pixel centres, not rounded grid buckets.
lat = fac["Latitude"].to_numpy()
lon = fac["Longitude"].to_numpy()

lat_idx = np.clip(np.rint((lat + 89.95) / 0.1).astype(int), 0, 1799)
lon_idx = np.clip(np.rint((lon + 179.95) / 0.1).astype(int), 0, 3599)

fac["gpm_lat_index"] = lat_idx
fac["gpm_lon_index"] = lon_idx
fac["gpm_pixel_key"] = lon_idx.astype(str) + "_" + lat_idx.astype(str)

mapping = fac[[
    "GEM_Location_ID", "Facility_Name", "Country", "Facility_Type",
    "Latitude", "Longitude", "gpm_lat_index", "gpm_lon_index",
    "gpm_pixel_key"
]]
mapping.to_csv(OUT / "global_facility_grid_mapping.csv", index=False)

unique_pixels = mapping[
    ["gpm_pixel_key", "gpm_lat_index", "gpm_lon_index"]
].drop_duplicates()

pixel_lon = unique_pixels["gpm_lon_index"].to_numpy()
pixel_lat = unique_pixels["gpm_lat_index"].to_numpy()
pixel_keys = unique_pixels["gpm_pixel_key"].to_numpy()

records = []

files = sorted(GPM_DIR.glob("*.HDF5"))
print(f"Facilities: {len(fac)}")
print(f"Unique GPM pixels: {len(unique_pixels)}")
print(f"GPM files: {len(files)}")

for n, path in enumerate(files, 1):
    match = re.search(r"3IMERG\.(\d{4})(\d{2})01", path.name)
    if not match:
        print("Skipping unrecognized filename:", path.name)
        continue

    year, month = map(int, match.groups())

    with h5py.File(path, "r") as f:
        grid = f["Grid"]
        data = grid["precipitation"][0]
        quality = grid["precipitationQualityIndex"][0]
        error = grid["randomError"][0]

        # HDF5 dimension order is (longitude, latitude).
        values = data[pixel_lon, pixel_lat]
        qvalues = quality[pixel_lon, pixel_lat]
        errors = error[pixel_lon, pixel_lat]

        valid = (
            np.isfinite(values) &
            (values != -9999.9) &
            (values >= 0)
        )

        for i in np.flatnonzero(valid):
            days = pd.Period(f"{year}-{month:02d}").days_in_month
            records.append({
                "gpm_pixel_key": pixel_keys[i],
                "year": year,
                "month": month,
                "precipitation_mean_rate_mm_hr": float(values[i]),
                "estimated_monthly_accumulation_mm": float(values[i] * days * 24),
                "quality_index": float(qvalues[i]) if np.isfinite(qvalues[i]) else None,
                "random_error_mm_hr": float(errors[i]) if np.isfinite(errors[i]) else None,
                "source": "NASA GPM IMERG V07B",
                "unit": "mm/month (derived from mm/hr)"
            })

    print(f"[{n}/{len(files)}] {path.name} | valid pixels: {valid.sum()}")

result = pd.DataFrame(records)
result.to_csv(
    OUT / "global_gpm_monthly_rainfall.csv.gz",
    index=False,
    compression="gzip"
)

print("\nExtraction complete")
print("Rows:", len(result))
print("Unique pixels:", result.gpm_pixel_key.nunique() if len(result) else 0)
print("Months:", result[["year", "month"]].drop_duplicates().shape[0] if len(result) else 0)
print("Output:", OUT / "global_gpm_monthly_rainfall.csv.gz")

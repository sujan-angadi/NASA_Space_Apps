import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta

import h5py
import numpy as np
import pandas as pd
from pyproj import Transformer

parser = argparse.ArgumentParser()
parser.add_argument("--facilities", default="data/input/global_facilities.csv")
parser.add_argument("--granule", default=None)
parser.add_argument("--output", default="data/integration/phase2/smap_facility_observations.csv.gz")
args = parser.parse_args()

# Locate granule
if args.granule:
    granule = Path(args.granule)
else:
    files = sorted(Path("data/raw/smap_l4").glob("*.h5"))
    if not files:
        raise FileNotFoundError("No SMAP HDF5 granule found.")
    granule = files[0]

print("Granule:", granule)

# Load facilities
fac = pd.read_csv(args.facilities)
required = ["GEM_Location_ID", "Facility_Name", "Country", "Latitude", "Longitude"]
missing = [c for c in required if c not in fac.columns]
if missing:
    raise ValueError(f"Missing facility columns: {missing}")

fac = fac.dropna(subset=["Latitude", "Longitude"]).copy()
fac["Latitude"] = pd.to_numeric(fac["Latitude"], errors="coerce")
fac["Longitude"] = pd.to_numeric(fac["Longitude"], errors="coerce")
fac = fac.dropna(subset=["Latitude", "Longitude"])

# WGS84 -> EASE-Grid 2.0 global
transformer = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True)
px, py = transformer.transform(
    fac["Longitude"].to_numpy(),
    fac["Latitude"].to_numpy()
)

with h5py.File(granule, "r") as f:
    x = f["x"][:]
    y = f["y"][:]

    # Find nearest grid indices using the projected coordinate vectors
    cols = np.abs(x[None, :] - px[:, None]).argmin(axis=1)
    rows = np.abs(y[None, :] - py[:, None]).argmin(axis=1)

    # Extract values for all facilities
    row_idx = rows.astype(int)
    col_idx = cols.astype(int)

    # Read coordinate grids into NumPy arrays.
    # NumPy supports arbitrary paired row/column indexing.
    lat_grid = f["cell_lat"][:]
    lon_grid = f["cell_lon"][:]

    grid_lat = lat_grid[row_idx, col_idx]
    grid_lon = lon_grid[row_idx, col_idx]

    output = fac[required].copy()
    output["grid_latitude"] = grid_lat
    output["grid_longitude"] = grid_lon
    output["grid_row"] = row_idx
    output["grid_column"] = col_idx

    variables = {
        "surface_soil_moisture_m3_m3": "sm_surface",
        "rootzone_soil_moisture_m3_m3": "sm_rootzone",
        "profile_soil_moisture_m3_m3": "sm_profile",
    }

    quality = np.full(len(output), "valid", dtype=object)

    for column, dataset_name in variables.items():
        dataset = f[f"Geophysical_Data/{dataset_name}"]
        values = dataset[:][row_idx, col_idx]
        valid = np.isfinite(values) & (values >= 0) & (values <= 0.9)
        output[column] = np.where(valid, values, np.nan)
        quality[~valid] = "missing_or_out_of_range"

    output["quality_flag"] = quality

    seconds = float(f["time"][0])
    epoch = datetime(2000, 1, 1, 11, 58, 55, 816000, tzinfo=timezone.utc)
    timestamp = epoch + timedelta(seconds=seconds)

    output["observation_time_utc"] = timestamp.isoformat()
    output["source"] = "NASA SMAP L4 SPL4SMGP V008"
    output["source_resolution_km"] = 9

# Save
destination = Path(args.output)
destination.parent.mkdir(parents=True, exist_ok=True)
output.to_csv(destination, index=False, compression="gzip")

valid_count = int((quality == "valid").sum())

print("\nEXTRACTION COMPLETE")
print("Facilities processed:", len(output))
print("Facilities with valid measurements:", valid_count)
print("Facilities with missing/out-of-range values:", len(output) - valid_count)
print("Observation:", timestamp.isoformat())
print("Output:", destination)
print("\nSample:")
print(output.head().to_string(index=False))

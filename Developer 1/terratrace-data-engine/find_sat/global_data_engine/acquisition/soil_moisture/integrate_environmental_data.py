from pathlib import Path
import pandas as pd

BASE = Path("data/integration")

facility_file = BASE / "phase1/global_facility_rainfall_lookup.csv.gz"
rainfall_file = BASE / "phase1/global_gpm_grid_monthly_with_facility_counts.csv.gz"
smap_file = BASE / "phase2/smap_facility_observations.csv.gz"

out = BASE / "phase2"
out.mkdir(parents=True, exist_ok=True)

print("Loading facility mapping...")
fac = pd.read_csv(facility_file)

print("Loading monthly rainfall...")
rain = pd.read_csv(rainfall_file)

print("Loading SMAP snapshot...")
soil = pd.read_csv(smap_file)

# Normalize facility identifiers
fac["facility_id"] = fac["facility_id"].astype(str)
soil["GEM_Location_ID"] = soil["GEM_Location_ID"].astype(str)

# Validate keys
assert fac["facility_id"].is_unique, "Duplicate facility IDs in mapping"
assert soil["GEM_Location_ID"].is_unique, "Duplicate facility IDs in SMAP"
assert not rain.duplicated(["gpm_pixel_key", "year", "month"]).any(), \
    "Duplicate GPM pixel-month records"

# 1. Facility-level monthly rainfall
print("Joining facilities to monthly rainfall...")

monthly = fac.merge(
    rain,
    on="gpm_pixel_key",
    how="left",
    validate="many_to_many"
)

monthly_path = out / "global_facility_monthly_rainfall.csv.gz"
monthly.to_csv(monthly_path, index=False, compression="gzip")

print("Monthly rainfall rows:", len(monthly))
print("Facilities:", monthly["facility_id"].nunique())
print("Months:", monthly[["year", "month"]].drop_duplicates().shape[0])
print("Saved:", monthly_path)

# 2. Global soil-moisture snapshot
print("\nJoining facility metadata to SMAP snapshot...")

snapshot = fac.merge(
    soil,
    left_on="facility_id",
    right_on="GEM_Location_ID",
    how="left",
    validate="one_to_one",
    suffixes=("_rainfall", "_smap")
)

snapshot_path = out / "global_facility_soil_moisture_snapshot.csv.gz"
snapshot.to_csv(snapshot_path, index=False, compression="gzip")

print("Snapshot rows:", len(snapshot))
print("Saved:", snapshot_path)

# 3. Combined December 2023 environmental snapshot
print("\nCombining December 2023 rainfall with the SMAP observation...")

dec = monthly[
    (monthly["year"] == 2023) &
    (monthly["month"] == 12)
].copy()

combined = dec.merge(
    soil,
    left_on="facility_id",
    right_on="GEM_Location_ID",
    how="left",
    validate="one_to_one",
    suffixes=("_rainfall", "_smap")
)

combined["rainfall_temporal_resolution"] = "monthly"
combined["soil_moisture_temporal_resolution"] = "single_3_hourly_observation"

combined_path = out / "global_facility_environmental_snapshot_dec2023.csv.gz"
combined.to_csv(combined_path, index=False, compression="gzip")

print("Combined rows:", len(combined))
print("Saved:", combined_path)

# Summary
print("\n========== INTEGRATION SUMMARY ==========")
print("Facility mapping records:", len(fac))
print("Monthly rainfall records:", len(monthly))
print("Unique facilities:", monthly["facility_id"].nunique())
print("Monthly periods:", monthly[["year", "month"]].drop_duplicates().shape[0])
print("SMAP snapshot facilities:", len(snapshot))
print("Combined December records:", len(combined))
print("=========================================")
print("Phase 1 source files were not modified.")

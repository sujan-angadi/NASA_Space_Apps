"""
Merge processed GPM IMERG monthly rainfall records into the common normalized
observation JSON. Safe to rerun: existing GPM records are replaced by item_id.
Run after acquisition and before timeseries/change_detection.
"""

import json
from pathlib import Path

SOURCE = Path("data/processed/gpm_imerg_monthly_rainfall.json")
TARGET = Path("data/integration/validated/normalized_observations.json")


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Run GPM acquisition first: {SOURCE}")
    if not TARGET.exists():
        raise FileNotFoundError(f"Run common.data_normalizer first: {TARGET}")

    gpm_records = json.loads(SOURCE.read_text())
    normalized = json.loads(TARGET.read_text())

    # Remove previously merged GPM rows so rerunning does not duplicate them.
    normalized = [r for r in normalized if r.get("source") != "NASA GPM IMERG"]

    for r in gpm_records:
        normalized.append({
            "source": "NASA GPM IMERG",
            "collection": r.get("collection", "GPM_3IMERGM_07"),
            "item_id": r.get("item_id"),
            "observation_datetime": r.get("observation_datetime"),
            "observation_end": r.get("observation_end"),
            "aoi_name": r.get("aoi_name", "Jamnagar Test"),
            "quality_policy": r.get("quality_policy"),
            "processing_status": None,
            "variable": "precipitation_monthly_accumulation",
            "unit": "mm/month",
            "mean": r.get("monthly_accumulation_mm"),
            "median": None,
            "minimum": None,
            "maximum": None,
            "std_dev": None,
            "valid_pixels": r.get("valid_pixels"),
            "total_pixels": r.get("total_intersecting_pixels"),
            "coverage_percentage": (
                100.0 * r["valid_pixels"] / r["total_intersecting_pixels"]
                if r.get("total_intersecting_pixels") else None
            ),
            "status": r.get("status"),
            "error": r.get("error"),
            "mean_rate_mm_per_hour": r.get("mean_rate_mm_per_hour"),
            "uncertainty_mean": None,
            "spatial_resolution": r.get("spatial_resolution", "0.1 degree (~10 km)"),
            "temporal_resolution": "monthly",
            "source_file": r.get("source_file"),
        })

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(normalized, indent=2))
    print("GPM source records:", len(gpm_records))
    print("Total normalized records:", len(normalized))
    print("Updated:", TARGET)


if __name__ == "__main__":
    main()

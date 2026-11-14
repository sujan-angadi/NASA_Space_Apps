"""
Build a dataset inventory from normalized TerraTrace observations.

Intervals are calculated from unique UTC calendar dates, not raw timestamps.
This prevents multiple variables or near-identical timestamps from the same
acquisition day from creating artificial sub-day revisit intervals.
"""

import json
import statistics
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

INPUT = Path("data/integration/validated/normalized_observations.json")
OUTPUT = Path("metadata/dataset_inventory.json")

# Reference-level product metadata. These are nominal product characteristics,
# not measured update schedules of this local pipeline.
PRODUCT_METADATA = {
    "MODIS Terra": {
        "platform": "Terra",
        "collection": "MOD11A2.061",
        "nominal_temporal_resolution": "8-day composite",
        "spatial_resolution": "1 km",
        "variables_context": "Daytime and nighttime land surface temperature",
    },
    "Landsat 8/9": {
        "platform": "Landsat 8 and Landsat 9",
        "collection": "Landsat Collection 2 Level-2",
        "nominal_temporal_resolution": "16 days per satellite; combined opportunities can be more frequent",
        "spatial_resolution": "30 m optical; thermal product resolution differs by product",
        "variables_context": "Land surface temperature and NDVI",
    },
    "Sentinel-1": {
        "platform": "Sentinel-1",
        "collection": "Sentinel-1 GRD",
        "nominal_temporal_resolution": "Orbit/AOI dependent; not a guaranteed fixed interval",
        "spatial_resolution": "Product/acquisition dependent",
        "variables_context": "VV and VH source asset values; current records are not calibrated sigma0/dB",
    },
    "Sentinel-2": {
        "platform": "Sentinel-2",
        "collection": "Sentinel-2 L2A",
        "nominal_temporal_resolution": "5-day constellation revisit at the equator; local usable observations vary",
        "spatial_resolution": "10 m for B02/B03/B04/B08",
        "variables_context": "NDVI and McFeeters NDWI",
    },
    "Sentinel-5P": {
        "platform": "Sentinel-5P / TROPOMI",
        "collection": "sentinel-5p-l2-netcdf",
        "nominal_temporal_resolution": "Daily orbital coverage; usable AOI retrievals vary",
        "spatial_resolution": "Product and variable dependent",
        "variables_context": "SO2 total vertical column; not ground-level concentration",
    },
    "NASA GPM IMERG": {
        "platform": "GPM multi-satellite precipitation product",
        "collection": "GPM_3IMERGM_07",
        "nominal_temporal_resolution": "Monthly Final product",
        "spatial_resolution": "0.1 degree (~10 km)",
        "variables_context": "Monthly satellite-gauge blended precipitation rate and derived monthly accumulation",
    },
}


def parse_utc(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None


def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Missing normalized observations: {INPUT}")

    records = json.loads(INPUT.read_text())
    groups = defaultdict(list)
    for record in records:
        groups[record.get("source", "Unknown")].append(record)

    inventory = []
    for source, rows in sorted(groups.items()):
        parsed = [
            (parse_utc(row.get("observation_datetime")), row)
            for row in rows
        ]
        dated = [(dt, row) for dt, row in parsed if dt is not None]

        # Deduplicate to UTC calendar dates to avoid duplicate variable records
        # or timestamp microsecond differences being mistaken for revisit gaps.
        unique_days = sorted({dt.date() for dt, _ in dated})
        intervals = [
            (unique_days[i] - unique_days[i - 1]).days
            for i in range(1, len(unique_days))
        ]

        variables = sorted({
            row.get("variable") for row in rows if row.get("variable")
        })
        units = sorted({
            row.get("unit") for row in rows if row.get("unit")
        })

        successful = [r for r in rows if r.get("status") == "success"]
        product = PRODUCT_METADATA.get(source, {})

        inventory.append({
            "source": source,
            "platform": product.get("platform"),
            "collection": product.get("collection"),
            "variables": variables,
            "units": units,
            "spatial_resolution": product.get("spatial_resolution"),
            "nominal_temporal_resolution": product.get("nominal_temporal_resolution"),
            "variables_context": product.get("variables_context"),
            "total_records": len(rows),
            "successful_records": len(successful),
            "no_valid_pixels": sum(r.get("status") == "no_valid_pixels" for r in rows),
            "errors": sum(r.get("status") == "error" for r in rows),
            "historical_start": min((dt for dt, _ in dated), default=None).isoformat() if dated else None,
            "latest_observation": max((dt for dt, _ in dated), default=None).isoformat() if dated else None,
            "unique_observation_dates": len(unique_days),
            "median_observed_interval_days": statistics.median(intervals) if intervals else None,
            "minimum_observed_interval_days": min(intervals) if intervals else None,
            "maximum_observed_interval_days": max(intervals) if intervals else None,
            "interval_interpretation": (
                "Observed gap between unique UTC calendar dates in this acquired sample; "
                "not a guaranteed satellite revisit or service update frequency."
            ),
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(inventory, indent=2))
    print(json.dumps(inventory, indent=2))
    print(f"\nSaved: {OUTPUT}")


if __name__ == "__main__":
    main()

import json
from collections import Counter

from aoi.models import AreaOfInterest
from acquisition.sentinel2.sentinel2_acquisition import Sentinel2Acquisition


def main():
    aoi = AreaOfInterest.from_point(
        name="Jamnagar Test",
        longitude=69.849610,
        latitude=22.334148,
        radius_m=2000,
    )

    engine = Sentinel2Acquisition()
    results = engine.acquire(
        aoi,
        "2022-01-01",
        "2025-12-31",
        max_items=None,
    )

    print("\n========== SENTINEL-2 SUMMARY ==========")
    print("Total:", len(results))
    print("Statuses:", dict(Counter(r["status"] for r in results)))

    for r in results:
        print(
            r["item_id"],
            r["status"],
            "NDVI:", r.get("ndvi", {}).get("mean"),
            "NDWI:", r.get("ndwi_mcfeeters", {}).get("mean"),
            "Coverage:", r.get("valid_pixel_percentage"),
        )

    path = "data/processed/sentinel2_environmental_indicators.json"
    with open(path, "w") as f:
        json.dump(results, f, indent=2)

    print("Saved:", path)


if __name__ == "__main__":
    main()

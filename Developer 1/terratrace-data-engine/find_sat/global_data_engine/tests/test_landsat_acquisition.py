import json
from collections import Counter

from aoi.models import AreaOfInterest
from acquisition.landsat.landsat_acquisition import LandsatAcquisition


def main():
    # Test coordinates only. The acquisition engine accepts global AOIs.
    aoi = AreaOfInterest.from_point(
        name="Jamnagar Test",
        longitude=69.849610,
        latitude=22.334148,
        radius_m=2000,
    )

    engine = LandsatAcquisition()

    results = engine.acquire(
        aoi=aoi,
        start_date="2022-01-01",
        end_date="2025-12-31",
        max_items=None,  # Test first; remove this limit after validation.
    )

    print("\n========== LANDSAT SUMMARY ==========")
    print("Total:", len(results))
    print("Statuses:", dict(Counter(r["status"] for r in results)))

    for result in results:
        print(
            result["item_id"],
            result["status"],
            "LST:", result.get("lst", {}).get("mean"),
            "NDVI:", result.get("ndvi", {}).get("mean"),
        )

    output = "data/processed/landsat_environmental_indicators.json"

    with open(output, "w") as file:
        json.dump(results, file, indent=4)

    print("Saved:", output)


if __name__ == "__main__":
    main()

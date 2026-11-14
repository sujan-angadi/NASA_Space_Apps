
import json

from aoi.models import AreaOfInterest
from common.stac_discovery import STACDiscoveryEngine


def main():
    # Jamnagar is ONLY our test location.
    # Replace these values with any valid global coordinates.
    aoi = AreaOfInterest.from_point(
        name="Jamnagar Test",
        longitude=69.849610,
        latitude=22.334148,
        radius_m=2000,
    )

    engine = STACDiscoveryEngine()

    results = engine.discover_all(
        aoi=aoi,
        start_date="2022-01-01",
        end_date="2025-12-31",
        max_items=500,
    )

    summary = {
        name: {
            "status": result["status"],
            "count": result["count"],
            "error": result.get("error"),
        }
        for name, result in results.items()
    }

    print("\n========== DISCOVERY SUMMARY ==========")
    print(json.dumps(summary, indent=4))

    with open("metadata/discovery_results.json", "w") as file:
        json.dump(results, file, indent=4, default=str)

    print("\nResults saved to metadata/discovery_results.json")


if __name__ == "__main__":
    main()

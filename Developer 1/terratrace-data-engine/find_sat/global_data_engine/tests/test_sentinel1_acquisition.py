
import json
from collections import Counter

from aoi.models import AreaOfInterest
from acquisition.sentinel1.sentinel1_acquisition import (
    Sentinel1Acquisition,
)


def main():

    aoi = AreaOfInterest.from_point(
        name="Jamnagar Test",
        longitude=69.849610,
        latitude=22.334148,
        radius_m=2000,
    )

    engine = Sentinel1Acquisition()

    results = engine.acquire(
        aoi,
        "2022-01-01",
        "2025-12-31",
        max_items=5,
    )

    print("Sentinel-1 summary")
    print("Total:", len(results))
    print("Statuses:", dict(Counter(
        result["status"] for result in results
    )))

    path = "data/processed/sentinel1_test.json"

    with open(path, "w") as file:
        json.dump(results, file, indent=2)

    print("Saved:", path)


if __name__ == "__main__":
    main()

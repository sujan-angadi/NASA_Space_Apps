
import json

from aoi.models import AreaOfInterest
from acquisition.modis.modis_acquisition import MODISAcquisition


def main():

    # Test location only. The engine accepts any global AOI.
    aoi = AreaOfInterest.from_point(
        name="Jamnagar Test",
        longitude=69.849610,
        latitude=22.334148,
        radius_m=2000,
    )

    modis = MODISAcquisition()

    results = modis.acquire(
        aoi=aoi,
        start_date="2022-01-01",
        end_date="2025-12-31",
        max_items=None,
    )

    successful = [
        result for result in results
        if result["status"] == "success"
    ]

    failed = [
        result for result in results
        if result["status"] == "error"
    ]

    no_data = [
        result for result in results
        if result["status"] == "no_valid_pixels"
    ]

    print("\n========== MODIS SUMMARY ==========")
    print("Total:", len(results))
    print("Successful:", len(successful))
    print("Failed:", len(failed))
    print("No valid pixels:", len(no_data))

    with open(
        "data/processed/modis_lst_day.json", "w"
    ) as file:
        json.dump(results, file, indent=4)

    print("Saved: data/processed/modis_lst_day.json")


if __name__ == "__main__":
    main()

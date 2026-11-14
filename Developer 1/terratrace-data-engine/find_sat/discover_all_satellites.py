
from pystac_client import Client

CATALOG_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"

# Jamnagar study region (discovery bounding box)
BBOX = [69.70, 22.20, 70.00, 22.50]

START_DATE = "2022-01-01"
END_DATE = "2025-12-31"

COLLECTIONS = {
    "MODIS_TERRA": "modis-11A2-061",
    "LANDSAT": "landsat-c2-l2",
    "SENTINEL_2": "sentinel-2-l2a",
    "SENTINEL_1": "sentinel-1-grd",
    "SENTINEL_5P": "sentinel-5p-l2-netcdf",
}

catalog = Client.open(CATALOG_URL)

for name, collection_id in COLLECTIONS.items():

    print("\n" + "=" * 65)
    print(name, "-", collection_id)
    print("=" * 65)

    try:
        search = catalog.search(
            collections=[collection_id],
            bbox=BBOX,
            datetime=f"{START_DATE}/{END_DATE}",
            max_items=500
        )

        items = list(search.items())

        # Keep Terra for MODIS
        if name == "MODIS_TERRA":
            items = [
                item for item in items
                if item.id.startswith("MOD11A2")
            ]

        # Keep Landsat 8 and 9
        if name == "LANDSAT":
            items = [
                item for item in items
                if item.properties.get("platform")
                in ["landsat-8", "landsat-9"]
            ]

        print("Observations found:", len(items))

        for item in items[:3]:
            print("\nItem ID:", item.id)

            print(
                "Date:",
                item.properties.get("datetime")
                or item.properties.get("start_datetime")
            )

            print(
                "Platform:",
                item.properties.get("platform")
            )

            print("Assets:", list(item.assets.keys()))

    except Exception as error:
        print("DISCOVERY ERROR:", str(error))

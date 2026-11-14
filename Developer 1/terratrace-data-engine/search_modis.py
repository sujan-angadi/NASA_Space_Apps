
from pystac_client import Client
from datetime import datetime

STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION_ID = "modis-11A2-061"

catalog = Client.open(STAC_URL)

# Jamnagar Refinery search point
point = {
    "type": "Point",
    "coordinates": [69.849610, 22.334148]
}

search = catalog.search(
    collections=[COLLECTION_ID],
    intersects=point,
    datetime="2024-01-01T00:00:00Z/2024-12-31T23:59:59Z",
    max_items=10
)

items = list(search.items())

print("\nTOTAL ITEMS FOUND:", len(items))

# Initially use Terra observations only
terra_items = [
    item for item in items
    if item.id.startswith("MOD11A2")
]

print("TERRA ITEMS FOUND:", len(terra_items))

for item in terra_items:

    print("\n" + "=" * 60)

    print("ITEM ID:", item.id)

    print("\nTEMPORAL INFORMATION")

    print("datetime:", item.properties.get("datetime"))
    print("start_datetime:", item.properties.get("start_datetime"))
    print("end_datetime:", item.properties.get("end_datetime"))

    print("\nOTHER ITEM PROPERTIES")

    for key, value in item.properties.items():
        print(f"{key}: {value}")

    print("\nAVAILABLE TEMPERATURE ASSETS")

    for key in ["LST_Day_1km", "LST_Night_1km",
                "QC_Day", "QC_Night"]:

        if key in item.assets:
            asset = item.assets[key]

            print(f"\nAsset: {key}")
            print("Media type:", asset.media_type)
            print("Title:", asset.title)
            print("Has download URL:", bool(asset.href))
        else:
            print(f"{key}: NOT FOUND")

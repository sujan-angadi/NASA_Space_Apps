
from pystac_client import Client

# Connect to Microsoft's public STAC API
catalog = Client.open(
    "https://planetarycomputer.microsoft.com/api/stac/v1"
)

# Find the MOD11A2 collection
collection = catalog.get_collection("modis-11A2-061")

print("Collection ID:", collection.id)
print("Title:", collection.title)
print("Description:", collection.description)

print("\nAvailable assets:")

for asset_key, asset in collection.assets.items():
    print(asset_key, ":", asset.title)

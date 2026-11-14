
import planetary_computer
from pystac_client import Client
import rasterio

catalog = Client.open(
    "https://planetarycomputer.microsoft.com/api/stac/v1"
)

point = {
    "type": "Point",
    "coordinates": [69.849610, 22.334148]
}

search = catalog.search(
    collections=["modis-11A2-061"],
    intersects=point,
    datetime="2024-12-26T00:00:00Z/2024-12-31T23:59:59Z",
    max_items=20
)

items = [
    item for item in search.items()
    if item.id.startswith("MOD11A2")
]

if not items:
    raise RuntimeError("No Terra observations found.")

item = items[0]

# Sign the Planetary Computer asset URL
signed_item = planetary_computer.sign(item)

asset = signed_item.assets["LST_Day_1km"]

print("Item:", item.id)
print("Observation start:", item.properties.get("start_datetime"))
print("Opening daytime temperature raster...")

# Open the remote Cloud Optimized GeoTIFF
with rasterio.open(asset.href) as src:

    print("\nRASTER INFORMATION")
    print("Width:", src.width)
    print("Height:", src.height)
    print("Bands:", src.count)
    print("Data type:", src.dtypes)
    print("CRS:", src.crs)
    print("Resolution:", src.res)
    print("NoData:", src.nodata)

    # Read a small sample window rather than the entire tile
    window = rasterio.windows.Window(0, 0, 5, 5)
    pixels = src.read(1, window=window)

    print("\n5x5 RAW PIXEL SAMPLE:")
    print(pixels)

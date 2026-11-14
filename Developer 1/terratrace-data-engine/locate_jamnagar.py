
import planetary_computer
from pystac_client import Client
import rasterio
from rasterio.warp import transform

# Connect to Planetary Computer
catalog = Client.open(
    "https://planetarycomputer.microsoft.com/api/stac/v1"
)

# Jamnagar Refinery representative coordinates
longitude = 69.849610
latitude = 22.334148

# Search for the December 26, 2024 Terra observation
search = catalog.search(
    collections=["modis-11A2-061"],
    intersects={
        "type": "Point",
        "coordinates": [longitude, latitude]
    },
    datetime="2024-12-26/2024-12-31",
    max_items=20
)

items = [
    item for item in search.items()
    if item.id.startswith("MOD11A2")
]

if not items:
    raise RuntimeError("No Terra observation found")

item = items[0]

# Sign asset URL
item = planetary_computer.sign(item)

# Open raster
with rasterio.open(item.assets["LST_Day_1km"].href) as src:

    # Convert longitude/latitude into raster CRS
    x, y = transform(
        "EPSG:4326",
        src.crs,
        [longitude],
        [latitude]
    )

    # Convert projected coordinates into pixel row/column
    row, col = src.index(x[0], y[0])

    print("Item:", item.id)
    print("Projected X:", x[0])
    print("Projected Y:", y[0])

    print("Pixel row:", row)
    print("Pixel column:", col)

    # Extract a 5x5 neighbourhood around Jamnagar
    window = rasterio.windows.Window(
        col - 2,
        row - 2,
        5,
        5
    )

    pixels = src.read(1, window=window)

    print("\nJAMNAGAR 5x5 RAW PIXELS:")
    print(pixels)

    # Convert valid raw pixels to Celsius
    import numpy as np

    valid = pixels[
        (pixels >= 7500) &
        (pixels <= 65535)
    ]

    if len(valid) > 0:
        temperatures = valid * 0.02 - 273.15

        print("\nVALID PIXELS:", len(valid))
        print("MEAN TEMPERATURE:", np.mean(temperatures))
        print("MIN TEMPERATURE:", np.min(temperatures))
        print("MAX TEMPERATURE:", np.max(temperatures))
    else:
        print("No valid temperature pixels found.")

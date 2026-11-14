
import planetary_computer
import rasterio
import numpy as np

from pystac_client import Client
from rasterio.warp import transform


# --------------------------------------------------
# 1. CONNECT TO MICROSOFT PLANETARY COMPUTER
# --------------------------------------------------

STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"

catalog = Client.open(STAC_URL)


# --------------------------------------------------
# 2. JAMNAGAR REFINERY COORDINATES
# --------------------------------------------------

longitude = 69.849610
latitude = 22.334148

point = {
    "type": "Point",
    "coordinates": [longitude, latitude]
}


# --------------------------------------------------
# 3. SEARCH FOR MODIS TERRA OBSERVATION
# --------------------------------------------------

search = catalog.search(
    collections=["modis-11A2-061"],
    intersects=point,
    datetime="2024-12-26T00:00:00Z/2024-12-31T23:59:59Z",
    max_items=20
)

# Keep only Terra observations
items = [
    item for item in search.items()
    if item.id.startswith("MOD11A2")
]

if not items:
    raise RuntimeError("No MODIS Terra observations found.")

# Select the first matching observation
item = items[0]

print("\nSELECTED SATELLITE OBSERVATION")
print("--------------------------------")
print("Item ID:", item.id)
print("Start date:", item.properties.get("start_datetime"))
print("End date:", item.properties.get("end_datetime"))


# --------------------------------------------------
# 4. SIGN THE SATELLITE ASSET URL
# --------------------------------------------------

signed_item = planetary_computer.sign(item)

qc_asset = signed_item.assets["QC_Day"]


# --------------------------------------------------
# 5. OPEN THE QUALITY CONTROL RASTER
# --------------------------------------------------

print("\nOPENING QC_DAY RASTER...")

with rasterio.open(qc_asset.href) as src:

    print("\nRASTER INFORMATION")
    print("--------------------------------")
    print("Width:", src.width)
    print("Height:", src.height)
    print("Data type:", src.dtypes)
    print("CRS:", src.crs)
    print("Resolution:", src.res)
    print("NoData:", src.nodata)


    # --------------------------------------------------
    # 6. TRANSFORM JAMNAGAR COORDINATES
    # --------------------------------------------------

    x, y = transform(
        "EPSG:4326",
        src.crs,
        [longitude],
        [latitude]
    )

    # Extract individual numeric coordinates
    projected_x = x[0]
    projected_y = y[0]

    print("\nPROJECTED COORDINATES")
    print("--------------------------------")
    print("X:", projected_x)
    print("Y:", projected_y)


    # --------------------------------------------------
    # 7. FIND THE PIXEL ROW AND COLUMN
    # --------------------------------------------------

    row, col = src.index(projected_x, projected_y)

    print("\nRASTER PIXEL LOCATION")
    print("--------------------------------")
    print("Row:", row)
    print("Column:", col)


    # --------------------------------------------------
    # 8. EXTRACT 5x5 QC PIXELS
    # --------------------------------------------------

    if row < 2 or col < 2 or row + 2 >= src.height or col + 2 >= src.width:
        raise RuntimeError("5x5 sample window extends outside the raster.")

    window = rasterio.windows.Window(
        col - 2,
        row - 2,
        5,
        5
    )

    qc_pixels = src.read(1, window=window)

    print("\n5x5 QUALITY CONTROL PIXELS")
    print("--------------------------------")
    print(qc_pixels)


    # --------------------------------------------------
    # 9. INSPECT UNIQUE QC VALUES
    # --------------------------------------------------

    print("\nUNIQUE QC VALUES")
    print("--------------------------------")

    unique_values, counts = np.unique(
        qc_pixels,
        return_counts=True
    )

    for value, count in zip(unique_values, counts):
        print(f"QC value: {value} | Pixel count: {count}")


# --------------------------------------------------
# 10. FINISH
# --------------------------------------------------

print("\nQC RASTER INSPECTION COMPLETED.")

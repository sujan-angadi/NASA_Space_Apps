import planetary_computer as pc
import rasterio

from pystac_client import Client
from common.config import STAC_API_URL
from aoi.models import AreaOfInterest

aoi = AreaOfInterest.from_point(
    name="Jamnagar Test",
    longitude=69.849610,
    latitude=22.334148,
    radius_m=2000,
)

catalog = Client.open(STAC_API_URL)

search = catalog.search(
    collections=["sentinel-1-grd"],
    intersects=aoi.geojson,
    datetime="2025-12-01/2025-12-31",
    max_items=5,
)

item = next(search.items())
item = pc.sign(item)

print("Scene:", item.id)

for band in ["vv", "vh"]:
    print("\nBAND:", band)

    with rasterio.open(item.assets[band].href) as src:
        print("CRS:", src.crs)
        print("Transform:", src.transform)
        print("GCP CRS:", src.gcps[1] if src.gcps else None)
        print("GCP count:", len(src.gcps[0]))
        print("Bounds:", src.bounds)
        print("Dimensions:", src.width, src.height)


from pathlib import Path
from urllib.request import urlretrieve

import netCDF4
import planetary_computer as pc
from pystac_client import Client
from common.config import STAC_API_URL


OUTPUT_DIR = Path("data/raw/sentinel5p")


def inspect_group(group, prefix=""):
    group_name = f"{prefix}/{group.name}" if prefix else group.name
    print(f"\n{'=' * 65}")
    print("GROUP:", group_name)

    print("\nDimensions:")
    for name, dim in group.dimensions.items():
        print(f"  {name}: {len(dim)}")

    print("\nVariables:")
    for name, var in group.variables.items():
        print(f"\n  Variable: {name}")
        print("  Dimensions:", var.dimensions)
        print("  Shape:", var.shape)
        print("  Data type:", var.dtype)

        for attr in var.ncattrs():
            value = getattr(var, attr)
            print(f"  {attr}: {value}")

    for child in group.groups.values():
        inspect_group(child, group_name)


def inspect_sentinel5p():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    catalog = Client.open(STAC_API_URL)
    search = catalog.search(
        collections=["sentinel-5p-l2-netcdf"],
        bbox=[69.80, 22.28, 69.90, 22.38],
        datetime="2025-01-01/2025-12-31",
        max_items=1,
    )

    items = list(search.items())
    print("Items found:", len(items))

    if not items:
        return

    item = pc.sign(items[0])
    print("Item:", item.id)

    if "so2" not in item.assets:
        print("No SO2 asset found in this item.")
        return

    asset = item.assets["so2"]
    filename = asset.href.split("?")[0].split("/")[-1]
    output_path = OUTPUT_DIR / filename

    if not output_path.exists():
        print("\nDownloading:", filename)
        urlretrieve(asset.href, output_path)
    else:
        print("\nUsing existing file:", output_path)

    print("\nInspecting NetCDF...")
    with netCDF4.Dataset(output_path, "r") as dataset:
        print("\nROOT GLOBAL ATTRIBUTES:")
        for attr in dataset.ncattrs():
            print(f"{attr}: {getattr(dataset, attr)}")

        inspect_group(dataset)


if __name__ == "__main__":
    inspect_sentinel5p()


import netCDF4
from pathlib import Path

files = list(Path("data/raw/sentinel5p").glob("*.nc"))

if not files:
    raise FileNotFoundError("No Sentinel-5P NetCDF file found")

with netCDF4.Dataset(files[0], "r") as ds:

    product = ds.groups["PRODUCT"]

    print("\nPRODUCT VARIABLES")
    for name, var in product.variables.items():
        print(
            f"{name:45} "
            f"shape={str(var.shape):20} "
            f"units={getattr(var, 'units', 'N/A')}"
        )

    print("\nPRODUCT SUBGROUPS")
    for name, group in product.groups.items():
        print(f"\n[{name}]")

        for var_name, var in group.variables.items():
            print(
                f"{var_name:45} "
                f"shape={str(var.shape):20} "
                f"units={getattr(var, 'units', 'N/A')}"
            )

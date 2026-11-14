
from pathlib import Path

from aoi.models import AreaOfInterest
from acquisition.sentinel5p.sentinel5p_acquisition import (
    acquire_sentinel5p,
)

# Same Jamnagar test location used in our existing pipeline.
aoi = AreaOfInterest.from_point(
    name="Jamnagar_Test_AOI",
    longitude=69.849610,
    latitude=22.334148,
    radius_m=2000,
)

if __name__ == "__main__":
    acquire_sentinel5p(aoi)

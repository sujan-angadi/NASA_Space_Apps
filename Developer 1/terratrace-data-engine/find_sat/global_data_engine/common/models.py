
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class ObservationRecord:
    source: str
    collection: str
    item_id: str
    observation_datetime: str
    variable: str
    asset_key: str
    unit: Optional[str] = None
    quality_status: str = "not_processed"
    valid_pixel_count: Optional[int] = None
    mean_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    aoi_name: Optional[str] = None
    asset_href: Optional[str] = None

    def to_dict(self):
        return asdict(self)

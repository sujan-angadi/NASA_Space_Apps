
from dataclasses import dataclass
from typing import Any

from pyproj import CRS, Transformer
from shapely.geometry import Point, shape, mapping
from shapely.ops import transform


@dataclass
class AreaOfInterest:
    name: str
    geometry: Any

    def __post_init__(self):
        if self.geometry.is_empty:
            raise ValueError("AOI geometry cannot be empty")

        if self.geometry.geom_type not in ("Polygon", "MultiPolygon"):
            raise ValueError("AOI must be a Polygon or MultiPolygon")

        if not self.geometry.is_valid:
            raise ValueError("AOI geometry is invalid")

        minx, miny, maxx, maxy = self.geometry.bounds

        if not (-180 <= minx <= 180 and -180 <= maxx <= 180):
            raise ValueError("Longitude outside WGS84 limits")

        if not (-90 <= miny <= 90 and -90 <= maxy <= 90):
            raise ValueError("Latitude outside WGS84 limits")

    @classmethod
    def from_geojson(cls, name: str, geojson: dict):
        geometry = shape(geojson)
        return cls(name=name, geometry=geometry)

    @classmethod
    def from_point(
        cls,
        name: str,
        longitude: float,
        latitude: float,
        radius_m: float = 2000
    ):
        if not (-180 <= longitude <= 180):
            raise ValueError("Invalid longitude")

        if not (-90 <= latitude <= 90):
            raise ValueError("Invalid latitude")

        if not (0 < radius_m <= 100000):
            raise ValueError("Radius must be between 0 and 100000 metres")

        local_crs = CRS.from_proj4(
            f"+proj=aeqd +lat_0={latitude} +lon_0={longitude} "
            "+datum=WGS84 +units=m +no_defs"
        )

        forward = Transformer.from_crs(
            "EPSG:4326", local_crs, always_xy=True
        ).transform

        backward = Transformer.from_crs(
            local_crs, "EPSG:4326", always_xy=True
        ).transform

        point = Point(longitude, latitude)
        projected_point = transform(forward, point)
        buffered = projected_point.buffer(radius_m)
        geographic_geometry = transform(backward, buffered)

        return cls(name=name, geometry=geographic_geometry)

    @property
    def bbox(self):
        return list(self.geometry.bounds)

    @property
    def geojson(self):
        return mapping(self.geometry)

    @property
    def area_km2(self):
        geod = CRS.from_epsg(4326).get_geod()
        area, _ = geod.geometry_area_perimeter(self.geometry)
        return abs(area) / 1_000_000


from aoi.models import AreaOfInterest


def test_point_buffer():
    aoi = AreaOfInterest.from_point(
        name="Jamnagar Test",
        longitude=69.849610,
        latitude=22.334148,
        radius_m=2000
    )

    assert aoi.geometry.is_valid
    assert aoi.bbox[0] < 69.849610
    assert aoi.bbox[2] > 69.849610
    assert 10 < aoi.area_km2 < 15

    print("AOI:", aoi.name)
    print("Bounding box:", aoi.bbox)
    print("Area (km²):", aoi.area_km2)


if __name__ == "__main__":
    test_point_buffer()
    print("AOI test passed!")

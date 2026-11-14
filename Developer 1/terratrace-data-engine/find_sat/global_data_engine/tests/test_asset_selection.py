
from common.asset_selection import select_assets


def test_modis():
    result = select_assets(
        "modis",
        "lst_day",
        ["LST_Day_1km", "QC_Day", "QC_Night"]
    )

    assert result["complete"]
    assert result["selected"] == [
        "LST_Day_1km", "QC_Day"
    ]


def test_sentinel5p():
    result = select_assets(
        "sentinel5p",
        "atmospheric_gases",
        ["no2"]
    )

    assert result["selected"] == ["no2"]
    assert not result["complete"]
    assert "so2" in result["missing"]


if __name__ == "__main__":
    test_modis()
    test_sentinel5p()
    print("Asset selection tests passed!")

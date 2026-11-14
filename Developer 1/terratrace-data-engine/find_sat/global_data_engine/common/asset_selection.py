
ASSET_CONFIG = {
    "modis": {
        "variables": {
            "lst_day": ["LST_Day_1km", "QC_Day"],
            "lst_night": ["LST_Night_1km", "QC_Night"],
        }
    },

    "landsat": {
        "variables": {
            "surface_temperature": ["lwir11", "qa_pixel", "qa_radsat"],
            "vegetation": ["red", "nir08", "qa_pixel", "qa_radsat"],
            "water": ["green", "nir08", "swir16", "qa_pixel"],
        }
    },

    "sentinel2": {
        "variables": {
            "vegetation": ["B04", "B08", "SCL"],
            "water": ["B03", "B08", "B11", "SCL"],
            "land_cover": ["B02", "B03", "B04", "B08", "B11", "B12", "SCL"],
        }
    },

    "sentinel1": {
        "variables": {
            "radar": ["vv", "vh"],
        }
    },

    "sentinel5p": {
        "variables": {
            "atmospheric_gases": [
                "no2", "so2", "co", "ch4", "hcho", "o3", "aer-ai"
            ]
        }
    },
}


def select_assets(dataset, variable, available_assets):
    if dataset not in ASSET_CONFIG:
        raise ValueError(f"Unknown dataset: {dataset}")

    variables = ASSET_CONFIG[dataset]["variables"]

    if variable not in variables:
        raise ValueError(
            f"Unknown variable '{variable}' for {dataset}"
        )

    requested = variables[variable]

    selected = [
        asset for asset in requested
        if asset in available_assets
    ]

    missing = [
        asset for asset in requested
        if asset not in available_assets
    ]

    return {
        "selected": selected,
        "missing": missing,
        "complete": len(missing) == 0,
    }

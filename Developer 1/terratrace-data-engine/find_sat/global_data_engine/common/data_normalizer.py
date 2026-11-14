import json
from pathlib import Path


def base_metadata(record):
    return {
        "source": record.get("source"),
        "collection": record.get("collection"),
        "item_id": record.get("item_id"),
        "observation_datetime": record.get("observation_datetime"),
        "observation_end": record.get("observation_end"),
        "aoi_name": record.get("aoi_name"),
        "quality_policy": record.get("quality_policy"),
        "processing_status": record.get("processing_status"),
    }


def make_measurement(
    record,
    variable,
    measurement,
    unit=None,
    extra=None,
):
    result = {
        **base_metadata(record),
        "variable": variable,
        "unit": measurement.get("unit", unit),
        "mean": measurement.get("mean"),
        "median": measurement.get("median"),
        "minimum": measurement.get("minimum"),
        "maximum": measurement.get("maximum"),
        "std_dev": measurement.get("std_dev"),
        "valid_pixels": measurement.get(
            "valid_pixels", record.get("valid_pixels")
        ),
        "total_pixels": measurement.get(
            "total_pixels",
            record.get(
                "pixels_inside_aoi",
                record.get("total_aoi_pixels")
            ),
        ),
        "coverage_percentage": measurement.get(
            "coverage_percentage",
            record.get(
                "valid_pixel_coverage_percent",
                record.get("valid_pixel_percentage")
            ),
        ),
        "status": measurement.get("status", record.get("status")),
        "error": record.get("error"),
    }

    if extra:
        result.update(extra)

    return result


def normalize_record(record):
    output = []

    # Preserve failed records.
    if record.get("status") == "error":
        return [{
            **base_metadata(record),
            "variable": None,
            "unit": None,
            "mean": None,
            "median": None,
            "minimum": None,
            "maximum": None,
            "std_dev": None,
            "valid_pixels": None,
            "total_pixels": None,
            "coverage_percentage": None,
            "status": "error",
            "error": record.get("error"),
        }]

    # Sentinel-5P: SO2 column density and precision.
    if isinstance(record.get("so2"), dict):
        precision = record.get("precision") or {}

        output.append(make_measurement(
            record,
            variable="sulfur_dioxide_total_vertical_column",
            measurement=record["so2"],
            unit=record.get("unit", "mol m-2"),
            extra={
                "measurement": record.get("measurement"),
                "uncertainty_mean": precision.get("mean"),
                "uncertainty_unit": record.get("unit", "mol m-2"),
                "mean_qa_value": record.get("mean_qa_value"),
                "pixels_inside_aoi": record.get("pixels_inside_aoi"),
                "valid_pixel_coverage_percent":
                    record.get("valid_pixel_coverage_percent"),
            },
        ))
        return output

    # Sentinel-1: VV and VH radar measurements.
    for band in ("vv", "vh"):
        measurement = record.get(band)

        if isinstance(measurement, dict):
            output.append(make_measurement(
                record,
                variable=f"sentinel1_{band}_backscatter",
                measurement=measurement,
                unit=measurement.get("unit") or "source_asset_DN",
                extra={
                    "measurement_type": measurement.get("measurement"),
                    "output_grid_resolution_m":
                        measurement.get("output_grid_resolution_m"),
                },
            ))

    if output:
        return output

    # MODIS: one variable per record.
    if "variable" in record and "mean" in record:
        output.append(make_measurement(
            record,
            record["variable"],
            record,
        ))
        return output

    # Landsat: nested LST and NDVI.
    if isinstance(record.get("lst"), dict):
        output.append(make_measurement(
            record,
            "land_surface_temperature",
            record["lst"],
        ))

    # NDVI occurs in both Landsat and Sentinel-2.
    if isinstance(record.get("ndvi"), dict):
        output.append(make_measurement(
            record,
            "ndvi",
            record["ndvi"],
        ))

    # Sentinel-2: McFeeters NDWI.
    if isinstance(record.get("ndwi_mcfeeters"), dict):
        output.append(make_measurement(
            record,
            "ndwi_mcfeeters",
            record["ndwi_mcfeeters"],
        ))

    # Preserve records with no valid pixels.
    if not output and record.get("status") == "no_valid_pixels":
        output.append({
            **base_metadata(record),
            "variable": record.get("variable"),
            "unit": record.get("unit"),
            "mean": None,
            "median": None,
            "minimum": None,
            "maximum": None,
            "std_dev": None,
            "valid_pixels": 0,
            "total_pixels": record.get("total_aoi_pixels"),
            "coverage_percentage": 0,
            "status": "no_valid_pixels",
            "error": None,
        })

    return output


def normalize_files(paths, output_path):
    combined = []

    for path in paths:
        path = Path(path)

        if not path.exists():
            print(f"Skipping missing file: {path}")
            continue

        with path.open() as file:
            records = json.load(file)

        count_before = len(combined)

        for record in records:
            combined.extend(normalize_record(record))

        print(
            f"{path.name}: "
            f"{len(combined) - count_before} normalized records"
        )

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w") as file:
        json.dump(combined, file, indent=2)

    print("\nTotal normalized records:", len(combined))
    print("Saved:", output_path)

    return combined


def main():
    paths = [
        "data/processed/modis_lst_day_night.json",
        "data/processed/landsat_environmental_indicators.json",
        "data/processed/sentinel2_environmental_indicators.json",
        "data/processed/sentinel1_test.json",
        "data/processed/sentinel5p_so2.json",
    ]

    normalize_files(
        paths,
        "data/integration/validated/normalized_observations.json",
    )


if __name__ == "__main__":
    main()

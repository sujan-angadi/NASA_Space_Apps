
import numpy as np
import rasterio
import planetary_computer

from pystac_client import Client
from shapely.geometry import Point, mapping
from rasterio.features import geometry_mask
from rasterio.warp import transform


# --------------------------------------------------
# FACILITY REFERENCE LOCATION
# --------------------------------------------------

REFERENCE_LAT = 22.334148
REFERENCE_LON = 69.849610

# Temporary test radius in metres
BUFFER_RADIUS = 2000

# MODIS LST conversion constants
LST_SCALE_FACTOR = 0.02
KELVIN_TO_CELSIUS = 273.15


# --------------------------------------------------
# MAIN PROCESSING FUNCTION
# --------------------------------------------------

def extract_qc_filtered_temperature(item):

    """
    Extract MODIS daytime land surface temperature
    within a spatial buffer and apply the project's
    selected quality-control policy.
    """

    # 1. Sign the STAC item
    signed_item = planetary_computer.sign(item)

    lst_url = signed_item.assets["LST_Day_1km"].href
    qc_url = signed_item.assets["QC_Day"].href

    # 2. Open LST and QC rasters
    with rasterio.open(lst_url) as lst_src, \
         rasterio.open(qc_url) as qc_src:

        # 3. Check spatial alignment
        if (
            lst_src.width != qc_src.width
            or lst_src.height != qc_src.height
            or lst_src.crs != qc_src.crs
            or lst_src.transform != qc_src.transform
        ):
            raise ValueError(
                "LST and QC rasters are not spatially aligned."
            )

        # Read raster bands
        lst = lst_src.read(1)
        qc = qc_src.read(1)

        nodata = lst_src.nodata

        # Preserve spatial metadata
        raster_transform = lst_src.transform
        raster_crs = lst_src.crs

    # 4. Create the temporary 2 km study buffer

    projected_x, projected_y = transform(
        "EPSG:4326",
        raster_crs,
        [REFERENCE_LON],
        [REFERENCE_LAT]
    )

    reference_point = Point(
        projected_x[0],
        projected_y[0]
    )

    study_buffer = reference_point.buffer(BUFFER_RADIUS)

    # 5. Create spatial mask
    # True = pixel centre is inside the buffer

    spatial_mask = geometry_mask(
        [mapping(study_buffer)],
        out_shape=lst.shape,
        transform=raster_transform,
        invert=True,
        all_touched=False
    )

    study_area_pixels = int(
        np.count_nonzero(spatial_mask)
    )

    if study_area_pixels == 0:
        raise ValueError(
            "No MODIS pixels found inside the study buffer."
        )

    # 6. Decode QC bit fields

    mandatory_qa = qc & 0b00000011
    data_quality = (qc >> 2) & 0b00000011
    lst_error = (qc >> 6) & 0b00000011

    # 7. Apply project QC policy

    valid_qa = np.isin(mandatory_qa, [0, 1])
    valid_data_quality = data_quality == 0
    acceptable_lst_error = np.isin(lst_error, [0, 1])

    # 8. Identify usable LST values

    valid_lst = lst != 0

    if nodata is not None:
        valid_lst &= lst != nodata

    # 9. Combine spatial and quality masks

    valid_mask = (
        spatial_mask
        & valid_qa
        & valid_data_quality
        & acceptable_lst_error
        & valid_lst
    )

    # 10. Calculate mutually exclusive rejection categories

    # Pixels with missing LST
    fill_fail = spatial_mask & ~valid_lst

    # Pixels with valid LST but failed mandatory QA
    mandatory_qa_fail = (
        spatial_mask
        & valid_lst
        & ~valid_qa
    )

    # Pixels passing previous checks but failing data quality
    data_quality_fail = (
        spatial_mask
        & valid_lst
        & valid_qa
        & ~valid_data_quality
    )

    # Pixels passing previous checks but exceeding LST error limit
    lst_error_fail = (
        spatial_mask
        & valid_lst
        & valid_qa
        & valid_data_quality
        & ~acceptable_lst_error
    )

    # Count accepted and rejected pixels
    valid_pixel_count = int(
        np.count_nonzero(valid_mask)
    )

    rejected_pixel_count = (
        study_area_pixels - valid_pixel_count
    )

    acceptance_percentage = (
        valid_pixel_count / study_area_pixels
    ) * 100

    # 11. Convert accepted temperatures to Celsius

    temperatures_c = (
        lst[valid_mask] * LST_SCALE_FACTOR
        - KELVIN_TO_CELSIUS
    )

    if temperatures_c.size == 0:
        raise ValueError(
            "No pixels passed the spatial and QC filters."
        )

    # 12. Find the coldest accepted pixel

    min_index = int(np.argmin(temperatures_c))

    valid_positions = np.argwhere(valid_mask)

    min_row, min_col = valid_positions[min_index]

    x, y = rasterio.transform.xy(
        raster_transform,
        int(min_row),
        int(min_col),
        offset="center"
    )

    lon, lat = transform(
        raster_crs,
        "EPSG:4326",
        [x],
        [y]
    )

    coldest_pixel = {
        "row": int(min_row),
        "column": int(min_col),
        "latitude": float(lat[0]),
        "longitude": float(lon[0]),
        "temperature_celsius": float(
            temperatures_c[min_index]
        ),
        "raw_lst": int(lst[min_row, min_col]),
        "qc_value": int(qc[min_row, min_col])
    }

    # 13. Calculate final statistics

    results = {

        "item_id": item.id,

        "buffer_radius_metres": BUFFER_RADIUS,

        "total_study_area_pixels": study_area_pixels,

        "valid_pixels": valid_pixel_count,

        "rejected_pixels": rejected_pixel_count,

        "acceptance_percentage": float(
            acceptance_percentage
        ),

        "mean_celsius": float(
            np.mean(temperatures_c)
        ),

        "minimum_celsius": float(
            np.min(temperatures_c)
        ),

        "maximum_celsius": float(
            np.max(temperatures_c)
        ),

        "std_dev_celsius": float(
            np.std(temperatures_c)
        ),

        "rejection_breakdown": {

            "fill_pixels": int(
                np.count_nonzero(fill_fail)
            ),

            "mandatory_qa_failures": int(
                np.count_nonzero(mandatory_qa_fail)
            ),

            "data_quality_failures": int(
                np.count_nonzero(data_quality_fail)
            ),

            "lst_error_failures": int(
                np.count_nonzero(lst_error_fail)
            )
        },

        "coldest_pixel": coldest_pixel
    }

    return results


# --------------------------------------------------
# MAIN PROGRAM
# --------------------------------------------------

if __name__ == "__main__":

    print("Connecting to Microsoft Planetary Computer...")

    catalog = Client.open(
        "https://planetarycomputer.microsoft.com/api/stac/v1"
    )

    # Search for the December 2024 Terra MODIS observation
    search = catalog.search(
        collections=["modis-11A2-061"],
        bbox=[
            REFERENCE_LON,
            REFERENCE_LAT,
            REFERENCE_LON,
            REFERENCE_LAT
        ],
        datetime="2024-12-26/2024-12-31",
        max_items=20
    )

    items = list(search.items())

    terra_items = [
        item for item in items
        if item.id.startswith("MOD11A2")
    ]

    if not terra_items:
        raise RuntimeError(
            "No Terra MOD11A2 item found."
        )

    item = terra_items[0]

    print("Selected observation:", item.id)
    print("Processing spatial buffer...")

    results = extract_qc_filtered_temperature(item)

    # Display results
    print("\n" + "=" * 55)
    print("JAMNAGAR SPATIAL TEMPERATURE ANALYSIS")
    print("=" * 55)

    for key, value in results.items():

        if key == "coldest_pixel":

            print("\nColdest accepted pixel:")

            for detail, measurement in value.items():
                print(f"  {detail}: {measurement}")

        elif key == "rejection_breakdown":

            print("\nRejection breakdown:")

            for category, count in value.items():
                print(f"  {category}: {count}")

        else:
            print(f"{key}: {value}")

    print("\n" + "=" * 55)
    print("PROCESSING COMPLETED")
    print("=" * 55)

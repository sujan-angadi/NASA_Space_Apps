# TerraTrace --- Satellite Data Acquisition, Geospatial Processing & Environmental Analysis Engine

**NASA Space Apps Challenge \| Developer 1 \| Satellite & Global
Environmental Data Engineering, Geospatial Processing and Backend**

[![Project](https://img.shields.io/badge/Project-TerraTrace-1f6feb)](https://github.com/sujan-angadi/NASA_Space_Apps/tree/main/Developer%201)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![API](https://img.shields.io/badge/API-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Satellite Data
Sources](https://img.shields.io/badge/Satellite%20Data%20Sources-5-orange)]()
[![Global
Facilities](https://img.shields.io/badge/Power%20Facilities-145%2C596-blue)]()
[![GPM
Archive](https://img.shields.io/badge/GPM%20Archive-45%20Months-0a7)]()
[![Status](https://img.shields.io/badge/Status-Core%20Pipeline%20Implemented-success)]()

------------------------------------------------------------------------

# 1. Project Overview

TerraTrace is a satellite-based environmental monitoring and analysis
system designed to investigate environmental changes around industrial
facilities and evaluate environmental conditions across geographical
regions.

The project uses Earth observation datasets from multiple satellite
missions to extract environmental indicators, process geospatial
information, construct historical time series, detect changes over time,
and expose the resulting information through a backend API.

Industrial development can significantly alter the surrounding
environment. Data centres, nuclear power plants, thermal power stations,
manufacturing facilities and other large industries may be associated
with changes in land surface temperature, vegetation, water-related
indicators and atmospheric composition.

Understanding these changes requires more than looking at a single
satellite image. It requires observations collected over time,
consistent processing methods, geographical alignment, quality filtering
and meaningful comparisons between different periods.

TerraTrace addresses this requirement by building a data pipeline that
transforms satellite observations into structured environmental
information.

The satellite observation pipeline currently integrates five Earth
observation data sources:

1.  MODIS Terra
2.  Landsat 8/9
3.  Sentinel-1
4.  Sentinel-2
5.  Sentinel-5P

The data engine has since been extended with two additional global data
layers:

-   A global power-facility inventory containing 145,596 facilities
    across 226 countries and territories.
-   NASA Global Precipitation Measurement (GPM) IMERG monthly rainfall
    data, spatially associated with the facility inventory.

These additions are separate from the Jamnagar satellite-observation
pipeline. The power-facility inventory is not a complete global
industrial-facility or data-centre database, and GPM rainfall records
are not additional normalized satellite-observation records in the
Jamnagar dataset.

The satellite observations are normalized into a common structure and
analysed through time-series and change-detection modules. Global
facility metadata and GPM rainfall are exposed through additional
FastAPI endpoints.

The long-term vision is to develop a web-based environmental
intelligence platform that can:

-   Monitor environmental indicators around existing industrial
    facilities.
-   Identify geographical regions experiencing environmental changes.
-   Compare environmental conditions across different periods.
-   Visualize changes in vegetation, surface temperature, water-related
    indicators and atmospheric composition.
-   Support preliminary environmental screening of potential industrial
    development locations.
-   Provide a global inventory of mapped power facilities for
    geographical exploration.
-   Associate power facilities with gridded historical rainfall
    information from NASA GPM IMERG.
-   Expose facility metadata and rainfall history through dedicated API
    endpoints.

**Important:** TerraTrace is an environmental monitoring and preliminary
screening tool. Satellite observations alone cannot establish that an
industry caused a particular environmental change, nor can this system
certify a location as legally or environmentally safe for industrial
construction.

------------------------------------------------------------------------

# 2. Problem Statement

Industrial development is essential for economic growth, technological
advancement and infrastructure expansion. However, large industrial
facilities can place pressure on surrounding ecosystems and natural
resources.

Examples include:

-   Data centres, which may require substantial electricity and cooling
    resources.
-   Nuclear power plants, which require careful monitoring of their
    surrounding environments.
-   Thermal power plants, which may be associated with heat, atmospheric
    emissions and land-use changes.
-   Manufacturing facilities, which may alter vegetation, surface
    conditions and nearby land use.

Traditional environmental assessments may rely on periodic surveys,
ground-based measurements and manually collected information.

Although these methods are important, they may not always provide a
consistent historical geographical view of environmental changes over
large areas.

Satellite Earth observation offers another source of information.

Satellites repeatedly observe the Earth's surface and atmosphere,
allowing researchers to study environmental indicators over time.

However, satellite datasets differ in:

-   Spatial resolution.
-   Temporal resolution.
-   Coordinate reference systems.
-   Data formats.
-   Measurement units.
-   Quality indicators.
-   Observation coverage.
-   Processing requirements.

Consequently, directly comparing different satellite datasets is not
straightforward.

TerraTrace addresses the technical challenge of acquiring, processing,
standardizing and analysing these heterogeneous datasets through a
unified geospatial data engine.

------------------------------------------------------------------------

# 3. Project Objectives

The primary objectives of the TerraTrace data engine are:

### 3.1 Multi-source satellite data acquisition

Acquire Earth observation datasets from different satellite missions
using their respective collections and data assets.

### 3.2 Geospatial processing

Extract relevant environmental information from satellite imagery while
maintaining geographical alignment and applying appropriate quality
filters.

### 3.3 Data normalization

Convert heterogeneous satellite outputs into a consistent data structure
so that downstream modules can process observations without depending on
individual satellite formats.

### 3.4 Historical environmental analysis

Aggregate observations into monthly time series and compare
environmental indicators across selected historical periods.

### 3.5 Change detection

Identify descriptive changes in environmental indicators between
baseline and recent periods.

### 3.6 Backend integration

Expose normalized observations, time-series results and change-detection
outputs through REST API endpoints.

### 3.7 Future industrial site screening

Provide environmental information that can support preliminary screening
of potential industrial development locations.

------------------------------------------------------------------------

# 4. Overall System Architecture

TerraTrace follows a modular data-engineering architecture.

The pipeline transforms raw satellite observations into structured
environmental information through a sequence of processing stages.

``` text
                 SATELLITE DATA SOURCES
                           |
       +-------------------+-------------------+
       |                   |                   |
     MODIS              LANDSAT             SENTINEL
       |                   |                   |
       +-------------------+-------------------+
                           |
                  DATA DISCOVERY
                           |
                  DATA ACQUISITION
                           |
                    RAW DATA
                           |
                 GEOSPATIAL PROCESSING
                           |
              QUALITY CONTROL AND FILTERING
                           |
                 ENVIRONMENTAL INDICATORS
                           |
                  DATA NORMALIZATION
                           |
                NORMALIZED OBSERVATIONS
                           |
             +-------------+-------------+
             |                           |
       TIME-SERIES ANALYSIS       CHANGE DETECTION
             |                           |
             +-------------+-------------+
                           |
                  VALIDATED OUTPUTS
                           |
                    FASTAPI BACKEND
                           |
                  REST API ENDPOINTS
                           |
                    WEB APPLICATION

      GLOBAL FACILITY + RAINFALL DATA LAYER
      ------------------------------------
      Global Power-Facility Inventory (CSV)
                    |
          Facility-to-GPM Grid Mapping
                    |
        NASA GPM IMERG Monthly Rainfall
                    |
             FastAPI Facility APIs
```

The architecture separates satellite-specific acquisition and processing
from common analysis and API functionality.

This modular design makes it possible to introduce additional satellite
missions or environmental indicators without rebuilding the entire
pipeline.

------------------------------------------------------------------------

# 5. Satellite Data Sources

The current implementation integrates five satellite data sources.

## 5.1 MODIS Terra

**Mission:** Moderate Resolution Imaging Spectroradiometer (MODIS)

**Platform:** Terra

**Collection:** `modis-11A2-061`

**Primary variable:** Land Surface Temperature (LST)

MODIS is an Earth observation instrument that collects information about
the Earth's surface and atmosphere.

The Terra platform provides repeated observations that can be used to
investigate changes in land surface temperature over time.

### Data used

The project uses the MODIS Terra Land Surface Temperature and Emissivity
8-Day product.

The implementation extracts:

-   Daytime land surface temperature.
-   Nighttime land surface temperature.
-   Valid pixel statistics.
-   Minimum and maximum temperature.
-   Standard deviation.
-   Pixel coverage information.

### Processing methodology

1.  Discover MODIS observations for the selected geographical region.
2.  Retrieve the required satellite assets.
3.  Reproject the area of interest into the appropriate MODIS coordinate
    system.
4.  Align the quality-control raster with the temperature raster.
5.  Apply the MODIS quality-control policy.
6.  Exclude invalid pixels.
7.  Apply the temperature scale factor.
8.  Convert valid temperature measurements into Celsius.
9.  Calculate statistics within the area of interest.
10. Store the resulting observations.

### Temperature conversion

MODIS land surface temperature uses a scale factor of 0.02.

The conversion to Celsius is:

\[ T_C = (DN `\times 0.02`{=tex}) - 273.15 \]

Where:

-   (T_C) = Temperature in Celsius.
-   (DN) = Original raster digital number.

### Output

`data/processed/modis_lst_day_night.json`

### Current integration

-   Normalized records: 324.
-   Daytime records: 162.
-   Nighttime records: 162.

------------------------------------------------------------------------

## 5.2 Landsat 8 and Landsat 9

**Mission:** Landsat

**Collection:** `landsat-c2-l2`

**Primary variables:**

-   Land Surface Temperature.
-   Normalized Difference Vegetation Index (NDVI).

Landsat provides multispectral observations of the Earth's surface.

Its observations are useful for studying land-cover conditions,
vegetation changes and surface temperature.

### Data used

The implementation processes Landsat Collection 2 Level-2 data.

The main indicators are:

**A. Land Surface Temperature**

Land surface temperature provides information about the thermal
condition of the Earth's surface.

It can help identify areas experiencing changes in surface heating or
cooling.

**B. Normalized Difference Vegetation Index**

NDVI is used to estimate vegetation greenness using red and
near-infrared reflectance.

The equation is:

\[ NDVI = `\frac{NIR - Red}{NIR + Red}`{=tex} \]

Where:

-   NIR = Near-infrared reflectance.
-   Red = Red-band reflectance.

NDVI generally ranges from -1 to +1.

Higher positive values often indicate greater vegetation greenness,
although interpretation depends on land cover and observation
conditions.

### Processing methodology

1.  Discover Landsat 8 and Landsat 9 observations.
2.  Retrieve the required Level-2 assets.
3.  Read the required spectral and thermal bands.
4.  Align raster datasets to a common geographical grid.
5.  Apply relevant scale factors and offsets.
6.  Apply quality filtering.
7.  Mask invalid pixels.
8.  Calculate NDVI.
9.  Extract land surface temperature.
10. Calculate statistical measurements within the area of interest.
11. Record observation dates and processing status.
12. Export the results into structured JSON.

### Output

`data/processed/landsat_environmental_indicators.json`

### Current integration

-   Normalized records: 671.
-   Environmental variables: LST and NDVI.
-   Three records retain HTTP 403 acquisition errors.

The failed records are preserved for traceability rather than being
represented as valid observations.

------------------------------------------------------------------------

## 5.3 Sentinel-1

**Mission:** Copernicus Sentinel-1

**Data collection:** `sentinel-1-grd`

**Primary measurements:**

-   VV polarization.
-   VH polarization.

Sentinel-1 is a Synthetic Aperture Radar (SAR) mission.

Unlike optical satellite missions, SAR uses microwave signals and can
collect observations independently of daylight conditions.

Radar observations are useful for investigating surface structure,
moisture-related changes and land-surface characteristics.

### Polarization information

**VV polarization**

The radar transmits vertically polarized signals and receives vertically
polarized signals.

**VH polarization**

The radar transmits vertically polarized signals and receives
horizontally polarized signals.

### Processing methodology

The implementation:

1.  Discovers Sentinel-1 GRD observations.
2.  Retrieves VV and VH raster assets.
3.  Inspects raster georeferencing information.
4.  Handles datasets where conventional raster CRS metadata is
    unavailable.
5.  Uses Ground Control Points (GCPs) for geospatial transformation.
6.  Constructs a suitable local target grid.
7.  Uses geospatial warping to align the raster with the target area.
8.  Extracts the relevant raster statistics.
9.  Stores VV and VH measurements separately.

### Important technical consideration

The processed Sentinel-1 values in the current implementation are raw
source asset values.

They are not calibrated sigma-zero backscatter measurements and are not
converted into decibels.

Therefore, the current values must not be interpreted as calibrated
physical backscatter measurements.

### Output

`data/processed/sentinel1_test.json`

### Current integration

-   Five test scenes processed.
-   Five VV observations.
-   Five VH observations.
-   Ten normalized records.

Sentinel-1 is currently a technical acquisition and processing
demonstration. It does not yet provide a sufficiently long historical
baseline for the implemented change-detection workflow.

A separate historical-expansion test script was prepared to inspect
quarterly coverage across 2022--2025. Its results have not been
confirmed as a validated expanded archive in the current project status,
so no additional historical Sentinel-1 coverage is claimed here.

------------------------------------------------------------------------

## 5.4 Sentinel-2

**Mission:** Copernicus Sentinel-2

**Data collection:** `sentinel-2-l2a`

**Primary variables:**

-   NDVI.
-   NDWI using the McFeeters formulation.

Sentinel-2 provides multispectral optical observations with different
spatial resolutions.

The project uses Sentinel-2 observations to investigate vegetation and
water-related surface indicators.

### Spectral bands used

  Band   Description                    Spatial resolution
  ------ ---------------------------- --------------------
  B02    Blue                                         10 m
  B03    Green                                        10 m
  B04    Red                                          10 m
  B08    Near Infrared                                10 m
  SCL    Scene Classification Layer                   20 m

### A. NDVI

NDVI estimates vegetation greenness using red and near-infrared
reflectance.

\[ NDVI = `\frac{B08-B04}{B08+B04}`{=tex} \]

Where:

-   B08 = Near-infrared band.
-   B04 = Red band.

### B. NDWI --- McFeeters

The McFeeters NDWI formulation uses green and near-infrared reflectance.

\[ NDWI = `\frac{Green-NIR}{Green+NIR}`{=tex} \]

For Sentinel-2:

\[ NDWI = `\frac{B03-B08}{B03+B08}`{=tex} \]

This indicator can help identify open-water-related spectral
characteristics.

It should not be confused with other NDWI formulations, including
vegetation-moisture formulations that use different bands.

### Processing methodology

1.  Discover Sentinel-2 Level-2A observations.
2.  Retrieve B02, B03, B04, B08 and SCL assets.
3.  Use B08 as the target 10 m raster grid.
4.  Align the other required bands with the target grid.
5.  Reproject the 20 m Scene Classification Layer to the target grid.
6.  Apply cloud and invalid-pixel masking.
7.  Calculate NDVI.
8.  Calculate McFeeters NDWI.
9.  Extract statistics inside the area of interest.
10. Calculate valid-pixel coverage.
11. Store the processed results in JSON.

The implementation masks SCL classes:

-   0 --- No data.
-   1 --- Saturated or defective.
-   3 --- Cloud shadows.
-   8 --- Cloud medium probability.
-   9 --- Cloud high probability.
-   10 --- Thin cirrus.
-   11 --- Snow or ice.

### Output

`data/processed/sentinel2_environmental_indicators.json`

### Current integration

-   Acquisition terminal reported: 337/337 scenes processed.
-   Normalized NDVI records: 366.
-   Normalized NDWI records: 366.
-   Total normalized Sentinel-2 records: 732.

**Count reconciliation required:** The acquisition progress count and
normalized observation count are not identical. Confirm whether the
acquisition output contains additional observations, retries or
duplicate scene records before reporting the exact number of unique
Sentinel-2 scenes.

### Why Sentinel-2 is important

Sentinel-2 contributes relatively high-resolution optical observations
to the TerraTrace system.

It provides an additional perspective on vegetation and water-related
surface changes alongside Landsat and MODIS.

------------------------------------------------------------------------

## 5.5 Sentinel-5P

**Mission:** Copernicus Sentinel-5 Precursor

**Primary variable:** Atmospheric Sulfur Dioxide (SO₂)

**Data collection:** `sentinel-5p-l2-netcdf`

Sentinel-5P is designed to monitor atmospheric composition using the
TROPOMI instrument.

It provides information about atmospheric trace gases and other
atmospheric properties.

The TerraTrace implementation currently investigates the SO₂ total
vertical column.

### Data used

The acquired product contains:

-   SO₂ total vertical column.
-   SO₂ precision.
-   Latitude and longitude.
-   Pixel quality indicators.
-   Geolocation information.

### Processing methodology

1.  Discover Sentinel-5P observations.
2.  Retrieve the relevant NetCDF product.
3.  Read the SO₂ total vertical column.
4.  Read the associated precision values.
5.  Extract latitude and longitude arrays.
6.  Read the quality assurance value.
7.  Identify satellite pixel footprints intersecting the area of
    interest.
8.  Apply the QA threshold.
9.  Extract valid SO₂ measurements.
10. Preserve the associated uncertainty information.
11. Export the result into JSON.

### Quality filtering

The implementation uses:

\[ QA `\geq 0.5`{=tex} \]

Pixels below this threshold are excluded from valid measurements.

### Important scientific consideration

The SO₂ total vertical column represents an atmospheric column
measurement.

It is not equivalent to ground-level SO₂ concentration.

The measurement must not be interpreted directly as the concentration
experienced by people at ground level.

### Output

`data/processed/sentinel5p_so2.json`

### Current integration

One SO₂ observation has been acquired and processed.

The current sample contains:

-   Two pixel footprints intersecting the AOI according to the
    extraction output.
-   One valid pixel.
-   50% valid-pixel coverage.
-   Mean QA value of 1.0 for the valid observation.
-   Associated uncertainty information.

The retrieved SO₂ value is small relative to its reported precision. It
should therefore be treated as a low-signal retrieval rather than
evidence of negative pollution.

A single scene is insufficient to establish a historical atmospheric
trend.

A separate granule inspection near the Jamnagar AOI found 19 nearby
finite SO₂ pixels with QA values between 0.0 and 0.17; none passed the
configured QA ≥ 0.5 threshold. This is a separate granule test from the
processed sample described above. The quality threshold was not weakened
to increase the valid-pixel count.

## 5.6 NASA Global Precipitation Measurement (GPM) --- IMERG

**Mission:** Global Precipitation Measurement (GPM)\
**Product:** Integrated Multi-satellitE Retrievals for GPM (IMERG),
Version 07B\
**Product stream used:** Final Run\
**Primary variable:** Gridded precipitation rate\
**Archive integrated:** January 2022 -- September 2025\
**Temporal aggregation:** Monthly\
**Approximate grid resolution:** 0.1° (roughly 10 km near the equator)

GPM IMERG provides precipitation estimates on a regular global grid.
TerraTrace uses this product as a regional rainfall-context layer for
the global power-facility inventory.

Unlike the Jamnagar AOI workflow, this integration associates facility
coordinates with GPM grid cells and stores monthly rainfall estimates
for those cells. A grid-cell estimate is not a rain-gauge measurement
taken at the facility itself.

### Source variable and units

The extracted IMERG variable is:

`Grid/precipitation`

The source variable is a precipitation rate expressed in **mm/hr**. The
monthly archive is built from monthly mean rates.

### Monthly accumulation estimate

The implementation estimates monthly accumulated precipitation using:

\[ P\_{month} = `\bar`{=tex}{R}\_{month} `\times 24`{=tex}
`\times `{=tex}D \]

Where:

-   (P\_{month}) = estimated monthly accumulation in mm.
-   (`\bar`{=tex}{R}\_{month}) = monthly mean precipitation rate in
    mm/hr.
-   \(D\) = number of days in the month.

This is a derived monthly estimate from the monthly mean rate. It should
not be described as a direct per-facility rain-gauge total.

### Processing workflow

1.  Acquire the monthly GPM IMERG Final Run V07B granules.
2.  Read the `Grid/precipitation` variable from the HDF5 product.
3.  Interpret the global longitude/latitude grid.
4.  Associate each power-facility coordinate with its corresponding GPM
    grid pixel.
5.  Extract the monthly precipitation-rate value for each mapped grid
    cell.
6.  Convert the monthly mean rate into an estimated monthly accumulation
    using the month length.
7.  Merge the rainfall records with the facility-grid mapping.
8.  Export compressed global rainfall data for API consumption.

### Current integration statistics

  Metric                                     Current value
  --------------------------------- ----------------------
  Monthly periods                                       45
  Archive range                       Jan 2022 -- Sep 2025
  Global power facilities mapped                   145,596
  Unique GPM grid pixels                            68,247
  Facility-grid rainfall records                 3,071,115
  Approximate spatial resolution                      0.1°
  Raw monthly HDF5 granules                             45
  Approximate raw granule storage                   803 MB

### Output files

-   `data/processed/global_facility_grid_mapping.csv`
-   `data/processed/global_gpm_monthly_rainfall.csv.gz`

### Important temporal and scientific limitations

-   The integrated archive currently ends in September 2025; it is not a
    live rainfall feed.
-   GPM Final Run products have processing latency. The archive should
    not be presented as real-time weather information.
-   A grid cell is approximately 0.1° and can cover a broad area. It
    cannot resolve rainfall variation at an individual facility parcel.
-   Multiple facilities can map to the same GPM pixel. Their associated
    rainfall values are therefore shared grid estimates, not independent
    facility measurements.
-   The monthly accumulation is calculated from the monthly mean rate
    and calendar month length.
-   Rainfall is contextual environmental information. It does not
    independently establish water availability, flood safety, drought
    risk or site suitability.

### GPM integration modules

-   `acquisition/gpm/gpm_acquisition.py`
-   `acquisition/gpm/extract_global_rainfall.py`
-   `acquisition/gpm/merge_gpm_into_normalized.py`
-   `requirements-gpm-additions.txt`

The GPM layer is maintained separately from the 1,738-record normalized
Jamnagar satellite-observation dataset.

## 5.7 Global Power-Facility Inventory

TerraTrace also integrates a global power-facility inventory to provide
a geographical reference layer for the global rainfall workflow and
future environmental exploration.

**Input file:** `data/input/global_facilities.csv`\
**Current inventory size:** 145,596 facilities\
**Geographical coverage:** 226 countries and territories\
**Categories:** 8

### Facility-category distribution

  Facility category           Records
  --------------------- -------------
  Utility-scale solar          94,491
  Wind                         28,447
  Hydropower                    6,950
  Oil/gas                       6,112
  Coal                          4,910
  Bioenergy                     3,610
  Nuclear                         592
  Geothermal                      484
  **Total**               **145,596**

### Scope and interpretation

This inventory is a **power-facility dataset**. It must not be described
as a complete database of all industrial facilities, manufacturing
plants, data centres or other infrastructure. The categories above
describe the records present in the integrated source.

The facility records provide mapped locations and facility metadata for
geographical discovery. They do not, by themselves, provide a verified
facility boundary, operating status, environmental permit, capacity
validation or proof of current operation.

### Current role in TerraTrace

-   Provide a global set of mapped power-facility records.
-   Allow the API to return facility metadata and
    category/country-filtered results.
-   Associate facility coordinates with GPM grid cells.
-   Provide the foundation for future facility-centred environmental
    analysis.

### Data file

`data/input/global_facilities.csv`

The global inventory is a separate data layer and does not change the
count of normalized Jamnagar satellite observations.

------------------------------------------------------------------------

# 6. Geographical Area of Interest

The current development and testing area is located in Jamnagar,
Gujarat, India.

**AOI:** Jamnagar Test

The current test configuration uses an approximately 2 km radius around
the following reference point:

-   Longitude: 69.849610
-   Latitude: 22.334148

The area of interest is used to extract satellite pixels and calculate
environmental statistics.

### Why an AOI is necessary

Satellite datasets contain information across large geographical areas.

Processing every pixel in an entire satellite scene would be unnecessary
for a localized environmental monitoring task.

An AOI allows the processing pipeline to:

-   Restrict analysis to the selected geographical region.
-   Reduce unnecessary raster processing.
-   Extract measurements relevant to the target location.
-   Compare observations using a consistent geographical boundary.

### Current limitation

The current Jamnagar AOI is a development test region.

It is not a verified boundary of a specific data centre, nuclear power
plant or industrial facility. The global power-facility inventory
described in Section 5.7 is a separate point/location dataset; its
presence does not convert the Jamnagar test AOI into a facility
boundary.

For actual facility-level monitoring, the system should support accurate
facility polygons, buffer zones and surrounding reference areas.

------------------------------------------------------------------------

# 7. Geospatial Processing Methodology

Geospatial processing is one of the most important components of
TerraTrace.

Satellite datasets are not always directly compatible because they may
use different coordinate reference systems, spatial resolutions, raster
grids and geolocation methods.

The processing pipeline must therefore ensure that the extracted
measurements correspond to the intended geographical area.

## 7.1 Coordinate Reference Systems

A Coordinate Reference System (CRS) defines how geographical coordinates
correspond to locations on the Earth.

Different satellite datasets may use different CRS definitions.

Before extracting statistics from multiple raster datasets, their
geographical information must be interpreted correctly.

The project uses geospatial transformation and reprojection techniques
to align observations with the AOI.

## 7.2 Raster Alignment

Raster alignment ensures that different satellite bands or layers share
a compatible spatial grid.

For example, Sentinel-2 B08 has 10 m resolution, while its Scene
Classification Layer has 20 m resolution.

The implementation aligns the SCL data with the B08 target grid before
applying pixel-level masking.

## 7.3 Quality Control

Not every satellite pixel represents a valid environmental measurement.

Potential problems include:

-   Cloud contamination.
-   Cloud shadows.
-   Invalid observations.
-   Missing data.
-   Sensor defects.
-   Low-quality atmospheric retrievals.
-   Insufficient AOI coverage.

TerraTrace applies satellite-specific quality filtering before
extracting the environmental statistics.

## 7.4 Pixel Extraction

The system extracts pixels corresponding to the selected AOI.

Depending on the data source, this involves:

-   Raster masking.
-   Geometrical intersection.
-   Raster reprojection.
-   Pixel-footprint intersection.
-   Quality-mask application.

## 7.5 Statistical Extraction

For valid pixels, the system extracts statistical information such as:

-   Mean.
-   Median, when available.
-   Minimum.
-   Maximum.
-   Standard deviation.
-   Number of valid pixels.
-   Total pixels.
-   Coverage percentage.

These statistics provide a compact representation of the environmental
conditions inside the AOI.

------------------------------------------------------------------------

# 8. Data Normalization Architecture

One of the main challenges in multi-satellite processing is that each
satellite mission produces data in a different format.

For example:

-   MODIS provides land surface temperature measurements.
-   Landsat provides thermal and optical measurements.
-   Sentinel-1 provides radar measurements.
-   Sentinel-2 provides multispectral reflectance.
-   Sentinel-5P provides atmospheric column measurements.

These outputs cannot be consumed consistently by a single analysis
module without standardization.

TerraTrace solves this problem through a common normalization layer.

### Normalization module

`common/data_normalizer.py`

### Responsibilities

The normalizer:

1.  Reads processed satellite JSON files.
2.  Identifies the data source.
3.  Extracts observation metadata.
4.  Identifies the environmental variable.
5.  Extracts statistical measurements.
6.  Preserves units.
7.  Preserves quality and coverage information.
8.  Preserves processing status.
9.  Records acquisition errors.
10. Converts observations into a common structure.
11. Saves the consolidated normalized dataset.

### Common normalized structure

A normalized record follows this general structure:

``` json
{
  "source": "MODIS Terra",
  "collection": "modis-11A2-061",
  "item_id": "satellite_observation_id",
  "observation_datetime": "2022-01-01T00:00:00Z",
  "observation_end": null,
  "aoi_name": "Jamnagar Test",
  "quality_policy": "MODIS_LST_QC_v1",
  "processing_status": null,
  "variable": "land_surface_temperature_day",
  "unit": "celsius",
  "mean": 27.58,
  "median": null,
  "minimum": 26.39,
  "maximum": 29.69,
  "std_dev": 1.03,
  "valid_pixels": 11,
  "total_pixels": 15,
  "coverage_percentage": 73.33,
  "status": "success",
  "error": null
}
```

The example is illustrative. Individual records contain values derived
from their actual satellite observations.

### Normalized output

`data/integration/validated/normalized_observations.json`

### Why normalization matters

Without normalization, every analysis module would need separate
processing logic for each satellite mission.

With normalization, the analysis layer can work with a common record
structure while retaining the original source, variable and unit.

This makes the architecture easier to extend and maintain.

### Separate global data model

The global power-facility inventory and GPM rainfall archive are not
forced into the Jamnagar satellite-observation schema. Facility
metadata, facility-to-grid mapping and monthly gridded rainfall have
their own files and API access patterns. This separation avoids treating
a facility record or a gridded rainfall estimate as if it were a
pixel-level observation from one of the five AOI satellite pipelines.

------------------------------------------------------------------------

# 9. Data Quality and Validation

Data quality is essential for environmental analysis.

A satellite observation should not automatically be considered valid
simply because a scene was successfully downloaded.

TerraTrace distinguishes three processing states.

### 9.1 Success

A valid observation was processed and at least one usable pixel was
extracted.

### 9.2 No valid pixels

The scene was processed, but no usable pixels remained inside the AOI
after quality filtering.

Possible reasons include:

-   Cloud coverage.
-   Invalid satellite pixels.
-   Missing data.
-   AOI coverage limitations.
-   Quality-filtering exclusions.

### 9.3 Error

The observation could not be successfully processed or acquired.

The error information is preserved for debugging and traceability.

### Current normalized dataset validation

The latest integration produced:

  -------------------------------------------------------------------------------
  Satellite            Total      Success     No valid       Errors Observation
  source             records                    pixels              date range
  ------------- ------------ ------------ ------------ ------------ -------------
  Sentinel-2             732          572          160            0 2022-01-05 to
                                                                    2025-12-30

  Landsat 8/9            671          526          142            3 2022-01-02 to
                                                                    2025-12-28

  MODIS Terra            324          288           36            0 2022-01-01 to
                                                                    2025-12-27

  Sentinel-1              10           10            0            0 2025-12-07 to
                                                                    2025-12-31

  Sentinel-5P              1            1            0            0 2025-12-31

  **Total**        **1,738**    **1,397**      **338**        **3** ---
  -------------------------------------------------------------------------------

The source-level totals above reconcile to the aggregate
processing-status totals. GPM facility-grid rainfall records and the
global facility inventory are separate datasets and are not included in
this table.

### Data source distribution

  Source          Normalized records
  ------------- --------------------
  Sentinel-2                     732
  Landsat 8/9                    671
  MODIS Terra                    324
  Sentinel-1                      10
  Sentinel-5P                      1
  **Total**                **1,738**

### Data quality observations

The three Landsat error records contain HTTP 403 errors.

These records have no valid variable, unit or observation timestamp
because the acquisition failed before those measurement fields could be
populated.

They are preserved as failed records rather than being assigned
artificial measurements.

The 338 no-valid-pixel records must also remain distinguishable from
successful observations.

### Observed median intervals in the current archive

  Source           Observed median interval
  ------------- ---------------------------
  Sentinel-2                         5 days
  Landsat 8/9                        8 days
  MODIS Terra                        8 days
  Sentinel-1                         6 days
  Sentinel-5P     Insufficient observations

These are median intervals calculated from the observations present in
this project dataset. They are not guaranteed mission revisit times,
service-level guarantees or future update schedules. Actual coverage
depends on acquisition, cloud conditions, product availability and
processing success.

**Never replace missing measurements with zero.** A missing observation
does not mean that the environmental indicator is zero.

------------------------------------------------------------------------

# 10. Environmental Time-Series Analysis

After normalization, the observations are passed to the time-series
analysis module.

### Module

`analysis/timeseries.py`

### Objective

The objective is to organize environmental observations chronologically
and calculate how their measured values change over time.

Satellite observations are collected at different dates and frequencies.

Monthly aggregation provides a more manageable structure for studying
historical environmental patterns.

### Processing methodology

1.  Load normalized observations.
2.  Filter for successful records.
3.  Convert observation timestamps into datetime values.
4.  Extract the observation month.
5.  Group records by:
    -   Data source.
    -   AOI.
    -   Environmental variable.
    -   Measurement unit.
    -   Month.
6.  Calculate monthly mean.
7.  Calculate monthly minimum.
8.  Calculate monthly maximum.
9.  Count the number of observations.
10. Estimate a linear monthly trend slope where sufficient observations
    exist.
11. Save the aggregated results.

### Monthly trend estimation

A simple linear trend can be estimated using:

\[ y = mx + c \]

Where:

-   \(y\) = Environmental indicator.
-   \(x\) = Time.
-   \(m\) = Estimated slope.
-   \(c\) = Intercept.

The slope indicates the direction and approximate rate of change in the
observed series.

However, this simple slope does not automatically account for
seasonality, sensor differences or other environmental influences.

### Output

`data/integration/validated/monthly_analysis.json`

### Current result

The latest analysis generated eight source-variable groups.

The output includes monthly statistics and trend estimates for the
available variables.

### Separate GPM monthly archive

The global GPM integration contains 45 monthly periods from January 2022
through September 2025. Its 3,071,115 facility-grid rainfall records are
exposed through the facility rainfall API. This archive is not one of
the eight Jamnagar source-variable groups and is not included in the six
Jamnagar change-detection comparisons described in Section 11.

### Important interpretation

A monthly linear slope is a descriptive trend estimate.

It is not automatically evidence of a statistically significant
environmental change.

For stronger scientific analysis, seasonal decomposition, regression
models, uncertainty estimation and statistical testing should be added.

------------------------------------------------------------------------

# 11. Environmental Change Detection

### Module

`analysis/change_detection.py`

### Objective

The change-detection module compares environmental indicators across two
selected historical periods.

The current implementation uses:

-   Baseline period: 2022--2023.
-   Recent period: 2024--2025.

The comparison is performed using corresponding calendar months.

This helps reduce the influence of seasonal differences when comparing
two periods.

### Methodology

1.  Load normalized observations.
2.  Filter for valid measurements.
3.  Separate the baseline period.
4.  Separate the recent period.
5.  Group observations by source and environmental variable.
6.  Aggregate measurements by calendar month.
7.  Match corresponding calendar months.
8.  Calculate the baseline monthly mean.
9.  Calculate the recent monthly mean.
10. Calculate the absolute difference.
11. Calculate the percentage difference where meaningful.
12. Count the comparable months.
13. Save the results.

### Absolute change

\[ `\Delta `{=tex}X = X\_{recent} - X\_{baseline} \]

Where:

-   (X\_{recent}) = Recent period mean.
-   (X\_{baseline}) = Baseline period mean.

### Percentage change

\[ % Change = `\frac{X_{recent}-X_{baseline}}`{=tex}
{X\_{baseline}}`\times100`{=tex} \]

Percentage change must be interpreted carefully, particularly for
indicators whose baseline values are close to zero.

### Current change-detection results

  Source        Environmental variable                 Comparable months   Mean change
  ------------- ------------------------------------ ------------------- -------------
  Landsat 8/9   Land surface temperature                              12     -1.556 °C
  Landsat 8/9   NDVI                                                  12      +0.05475
  MODIS Terra   Daytime land surface temperature                      11     -2.190 °C
  MODIS Terra   Nighttime land surface temperature                    12     +0.425 °C
  Sentinel-2    NDVI                                                  12      -0.00310
  Sentinel-2    McFeeters NDWI                                        12      +0.00228

The results are descriptive comparisons from the current Jamnagar test
AOI.

They do not establish industrial causation or statistical significance.

### Output

`data/integration/validated/change_detection.json`

### Why Sentinel-1 is excluded

The current Sentinel-1 dataset contains five December 2025 scenes.

It does not have observations across both the baseline and recent
periods.

Therefore, the change-detection module correctly excludes Sentinel-1
from historical comparison.

This prevents unsupported conclusions from being generated.

------------------------------------------------------------------------

# 12. Backend API Architecture

The processed environmental information is exposed through a REST API
implemented using FastAPI.

### Backend module

`api/main.py`

### Framework

FastAPI

### Server

Uvicorn

### API responsibilities

The backend provides access to:

-   Service health.
-   Normalized satellite observations.
-   Monthly time-series analysis.
-   Consolidated project reports.
-   Environmental change-detection results.
-   Global power-facility inventory records and summary statistics.
-   Monthly GPM rainfall history associated with a facility.

### API base URL

During local development:

`http://127.0.0.1:8000`

### Interactive documentation

`http://127.0.0.1:8000/docs`

FastAPI automatically generates interactive API documentation through
Swagger UI.

------------------------------------------------------------------------

# 13. API Endpoints

## 13.1 GET /health

Checks whether the TerraTrace backend is running.

**Example request:**

``` http
GET /health
```

**Example response:**

``` json
{
  "status": "running",
  "service": "TerraTrace"
}
```

## 13.2 GET /observations

Returns normalized satellite observations.

**Example request:**

``` http
GET /observations
```

Supports optional query filters:

``` http
GET /observations?source=Sentinel-2
```

``` http
GET /observations?variable=ndvi
```

**Example response structure:**

``` json
{
  "count": 1738,
  "observations": [
    {
      "source": "MODIS Terra",
      "variable": "land_surface_temperature_day",
      "unit": "celsius",
      "mean": 27.58,
      "status": "success"
    }
  ]
}
```

The example illustrates the response structure rather than the complete
response.

## 13.3 GET /timeseries

Returns monthly environmental time-series results.

**Example request:**

``` http
GET /timeseries
```

An optional variable filter can be used:

``` http
GET /timeseries?variable=ndvi
```

The response contains grouped monthly statistics and trend information.

## 13.4 GET /report

Returns a consolidated summary of the normalized observations and
analysis results.

**Example request:**

``` http
GET /report
```

The current implementation reports:

-   Observation count.
-   Number of analysis groups.
-   Analysis results.

## 13.5 GET /change-detection

Returns the baseline-versus-recent environmental comparisons.

**Example request:**

``` http
GET /change-detection
```

The response contains:

-   Source.
-   AOI.
-   Variable.
-   Unit.
-   Baseline period.
-   Recent period.
-   Number of comparable months.
-   Mean monthly change.
-   Individual monthly comparisons.

## 13.6 GET /global-stats

Returns summary statistics for the integrated global power-facility and
GPM datasets.

**Example request:**

``` http
GET /global-stats
```

The tested response reports:

-   145,596 power facilities.
-   226 countries/territories.
-   8 facility categories.
-   68,247 unique GPM grid pixels.
-   3,071,115 facility-grid rainfall records.
-   45 monthly periods.
-   Archive range: January 2022 -- September 2025.

These statistics describe the currently integrated data files.

## 13.7 GET /facilities

Returns records from the global power-facility inventory.

**Example request:**

``` http
GET /facilities?limit=2
```

The endpoint supports a limit parameter in the tested implementation.
The response includes facility identifiers and associated facility
metadata.

The inventory contains power-facility categories only; it is not a
comprehensive global industrial or data-centre register.

## 13.8 GET /facilities/{facility_id}

Returns the facility record corresponding to the supplied facility
identifier.

**Example request:**

``` http
GET /facilities/L100000808559
```

The identifier above is an example facility ID used during API testing.

## 13.9 GET /facilities/{facility_id}/rainfall

Returns the available monthly GPM rainfall records associated with the
facility's mapped grid cell.

**Example request:**

``` http
GET /facilities/L100000808559/rainfall
```

The tested example facility returned 45 monthly records. The result
represents the GPM grid-cell rainfall history associated with the
facility coordinates, not a direct rain-gauge series measured at the
facility.

------------------------------------------------------------------------

# 14. API Validation Results

The backend was tested through Swagger UI and automated HTTP requests.

### Latest validation

  -----------------------------------------------------------------------------------------
  Endpoint                                                HTTP status Result
  -------------------------------------- ---------------------------- ---------------------
  `/health`                                                       200 Passed

  `/observations`                                                 200 Passed

  `/timeseries`                                                   200 Passed

  `/report`                                                       200 Passed

  `/change-detection`                                             200 Passed

  `/global-stats`                                                 200 Passed

  `/facilities?limit=2`                                        Tested Returned facility
                                                                      records

  `/facilities/{facility_id}/rainfall`                         Tested Returned 45 monthly
                                                                      records for the
                                                                      sample facility
  -----------------------------------------------------------------------------------------

The original five endpoints were validated with HTTP 200. The newer
global endpoints were also exercised; the facility listing and sample
rainfall request returned the expected data. The sample rainfall
endpoint returned 45 records for facility `L100000808559`.

The observations endpoint returned:

**1,738 normalized records**

The report endpoint returned:

**8 analysis groups**

### Automated validation script

``` python
import requests

base = "http://127.0.0.1:8000"

endpoints = [
    "/health",
    "/observations",
    "/timeseries",
    "/report",
    "/change-detection"
]

for endpoint in endpoints:
    response = requests.get(base + endpoint)

    print(endpoint, response.status_code)

    if endpoint == "/observations":
        print("Observation count:", response.json().get("count"))

    if endpoint == "/report":
        print("Report count:", response.json().get("observation_count"))
        print("Analysis groups:", response.json().get("analysis_groups"))
```

The original five endpoints returned HTTP 200 during the recorded
validation. The global endpoints were tested separately as described
above; do not interpret the original five-endpoint HTTP 200 count as the
total number of routes now available.

------------------------------------------------------------------------

# 15. Project Directory Structure

The data-engineering implementation is organized into separate modules.

``` text
global_data_engine/
│
├── acquisition/
│   │
│   ├── modis/
│   │   └── modis_acquisition.py
│   │
│   ├── landsat/
│   │   └── landsat_acquisition.py
│   │
│   ├── sentinel1/
│   │   └── sentinel1_acquisition.py
│   │
│   ├── sentinel2/
│   │   └── sentinel2_acquisition.py
│   │
│   └── sentinel5p/
│       ├── sentinel5p_inspector.py
│       ├── inspect_so2_variables.py
│       └── sentinel5p_acquisition.py
│
├── analysis/
│   ├── timeseries.py
│   └── change_detection.py
│
├── aoi/
│   └── models.py
│
├── api/
│   └── main.py
│
├── common/
│   ├── config.py
│   ├── models.py
│   ├── asset_selection.py
│   ├── data_normalizer.py
│   └── stac_discovery.py
│
├── data/
│   │
│   ├── raw/
│   │   ├── sentinel5p/
│   │   └── ...
│   │
│   ├── processed/
│   │   ├── modis_lst_day_night.json
│   │   ├── landsat_environmental_indicators.json
│   │   ├── sentinel1_test.json
│   │   ├── sentinel2_environmental_indicators.json
│   │   └── sentinel5p_so2.json
│   │
│   └── integration/
│       └── validated/
│           ├── normalized_observations.json
│           ├── monthly_analysis.json
│           └── change_detection.json
│
├── metadata/
├── processing/
└── tests/
```

The repository may contain additional configuration, test and
documentation files.

### Additional global-data files

The global facility and GPM integration adds the following important
paths:

``` text
global_data_engine/
├── acquisition/
│   └── gpm/
│       ├── gpm_acquisition.py
│       ├── extract_global_rainfall.py
│       └── merge_gpm_into_normalized.py
├── data/
│   ├── input/
│   │   └── global_facilities.csv
│   └── processed/
│       ├── global_facility_grid_mapping.csv
│       └── global_gpm_monthly_rainfall.csv.gz
├── metadata/
│   └── dataset_inventory.json
└── requirements-gpm-additions.txt
```

The listing is an important-path view, not an exhaustive dump of every
repository file. The exact local repository may contain additional
tests, raw granules, logs and generated artifacts.

------------------------------------------------------------------------

# 16. Technology Stack

  Technology                Purpose
  ------------------------- ----------------------------------------------------------
  Python                    Main development language
  FastAPI                   Backend REST API
  Uvicorn                   ASGI server
  Rasterio                  Raster reading and processing
  NumPy                     Numerical operations
  Pandas                    Data organization and time-series analysis
  PyProj                    Coordinate transformations
  Shapely                   Geometrical operations
  GeoPandas                 Geospatial data handling where required
  Xarray                    Multidimensional scientific data handling where required
  NetCDF4                   NetCDF satellite data access
  Matplotlib                Potential visualization and plotting
  h5py / HDF5 tooling       Reading GPM IMERG HDF5 granules where used
  Requests / HTTP clients   Data-service and API requests
  STAC tooling              Satellite catalogue discovery where used
  Git                       Version control

The acquisition and processing modules use additional geospatial and
satellite-data libraries as required by their implementations.

------------------------------------------------------------------------

# 17. Installation and Setup

The following instructions describe the local development environment.

### Requirements

-   Python 3.12.
-   Git.
-   Linux or another compatible development environment.
-   Internet connectivity for satellite data acquisition.
-   Sufficient disk space for satellite data.
-   Required Python dependencies.

### Step 1 --- Clone the repository

``` bash
git clone https://github.com/sujan-angadi/NASA_Space_Apps.git
```

### Step 2 --- Navigate to Developer 1

``` bash
cd NASA_Space_Apps/"Developer 1"
```

### Step 3 --- Navigate to the data engine

``` bash
cd terratrace-data-engine/find_sat/global_data_engine
```

The exact path should match the repository directory structure.

### Step 4 --- Create a virtual environment

``` bash
python3 -m venv .venv
```

### Step 5 --- Activate the environment

``` bash
source .venv/bin/activate
```

### Step 6 --- Install dependencies

If a `requirements.txt` file is provided:

``` bash
pip install -r requirements.txt
```

If dependencies are not yet listed, install the packages specified by
the project's dependency manifest before running the pipeline.

For the GPM integration, install the additional dependencies listed in:

``` bash
pip install -r requirements-gpm-additions.txt
```

The exact packages should be kept consistent with the checked-in
requirements file. Satellite acquisition also requires access to the
relevant data services and any required credentials.

### Step 7 --- Verify Python

``` bash
python --version
```

------------------------------------------------------------------------

# 18. Running the TerraTrace Pipeline

The pipeline is divided into acquisition, normalization, analysis and
API execution.

## Step 1 --- Activate the virtual environment

From the project root:

``` bash
source .venv/bin/activate
```

Navigate into the data engine:

``` bash
cd find_sat/global_data_engine
```

## Step 2 --- Satellite data acquisition

Each satellite has its own acquisition module.

Examples:

``` bash
python -m acquisition.modis.modis_acquisition
```

``` bash
python -m acquisition.landsat.landsat_acquisition
```

``` bash
python -m acquisition.sentinel1.sentinel1_acquisition
```

``` bash
python -m acquisition.sentinel2.sentinel2_acquisition
```

``` bash
python -m acquisition.sentinel5p.sentinel5p_acquisition
```

The exact execution arguments and acquisition configurations are defined
inside the respective modules.

Acquisition requires access to the configured satellite data services
and collections.

### Global facility and GPM data

The global facility inventory is supplied as:

``` text
data/input/global_facilities.csv
```

The GPM workflow is implemented in the following modules:

``` text
acquisition/gpm/gpm_acquisition.py
acquisition/gpm/extract_global_rainfall.py
acquisition/gpm/merge_gpm_into_normalized.py
```

These scripts were used to acquire and process the 45-month archive and
create the facility-grid mapping and compressed rainfall output. Their
exact CLI arguments should be checked in the current source files before
rerunning; this README does not invent command-line flags that have not
been verified.

## Step 3 --- Normalize observations

After processed satellite JSON files are available:

``` bash
python -m common.data_normalizer
```

Expected output:

``` text
Total normalized records: 1738

Saved:
data/integration/validated/normalized_observations.json
```

The record count may change when new observations are acquired or
existing datasets are updated.

## Step 4 --- Generate monthly time-series analysis

``` bash
python -m analysis.timeseries
```

Expected output:

``` text
Time-series groups: 8

Saved:
data/integration/validated/monthly_analysis.json
```

## Step 5 --- Run change detection

``` bash
python -m analysis.change_detection
```

Expected output:

``` text
========== CHANGE DETECTION ==========

Saved:
data/integration/validated/change_detection.json
```

The number of comparisons depends on the available historical
observations.

## Step 6 --- Start the FastAPI server

``` bash
uvicorn api.main:app --reload
```

The server starts at:

``` text
http://127.0.0.1:8000
```

## Step 7 --- Open API documentation

Visit:

``` text
http://127.0.0.1:8000/docs
```

Use Swagger UI to test the available endpoints.

------------------------------------------------------------------------

# 19. Scientific Interpretation and Limitations

Satellite-derived indicators provide valuable environmental information.
However, they must be interpreted within the limits of the underlying
measurement.

TerraTrace is designed to support environmental investigation rather
than make unsupported causal claims.

## 19.1 Correlation does not establish causation

If land surface temperature increases around an industrial facility,
this does not automatically prove that the facility caused the increase.

Other possible factors include:

-   Seasonal changes.
-   Urban expansion.
-   Regional weather conditions.
-   Land-cover changes.
-   Agricultural activity.
-   Natural environmental variation.

A stronger causal investigation requires appropriate control regions,
confounding-variable analysis and supporting ground measurements.

## 19.2 Spatial resolution matters

Different satellite missions observe the Earth at different spatial
resolutions.

For example:

-   Sentinel-2 optical bands used here: 10 m.
-   Landsat multispectral observations: generally 30 m for the relevant
    optical bands.
-   MODIS LST product: 1 km.
-   Sentinel-5P SO₂ product: approximately 5.5 km × 3.5 km for the
    acquired product.

A small facility may occupy only a fraction of a coarse-resolution
pixel.

Consequently, the spatial resolution must be considered before comparing
measurements.

## 19.3 Temporal resolution matters

Satellites do not necessarily observe a location at the same frequency.

Clouds, missing scenes, revisit schedules and product availability can
create gaps.

Monthly aggregation helps organize observations but does not eliminate
these gaps.

## 19.4 Atmospheric measurements are not ground measurements

Sentinel-5P SO₂ total vertical column measurements represent atmospheric
column information.

They cannot be directly interpreted as ground-level exposure
concentrations.

## 19.5 Radar measurements require calibration

The current Sentinel-1 implementation extracts source asset values.

Further calibration and processing are necessary before interpreting
these values as physical radar backscatter.

## 19.6 Missing data must remain missing

A no-valid-pixel record is not a zero-valued environmental measurement.

The analysis pipeline must distinguish:

-   A real measured zero.
-   A missing measurement.
-   A failed acquisition.
-   A measurement excluded by quality filtering.

## 19.7 Statistical significance is not yet established

The current baseline-versus-recent comparisons are descriptive.

They do not constitute formal hypothesis testing or statistically
significant change detection.

Future work should include:

-   Seasonal decomposition.
-   Confidence intervals.
-   Uncertainty propagation.
-   Statistical significance testing.
-   Robust trend estimation.
-   Reference-region comparison.

------------------------------------------------------------------------

# 20. Current Implementation Status

The following table summarizes the latest verified development state.

  Component                                         Status
  ------------------------------------------------- -------------
  MODIS acquisition and processing                  Implemented
  Landsat acquisition and processing                Implemented
  Sentinel-1 test acquisition and processing        Implemented
  Sentinel-2 bulk acquisition and processing        Implemented
  Sentinel-5P SO₂ test acquisition and processing   Implemented
  Common data normalizer                            Implemented
  Normalized dataset validation                     Executed
  Monthly time-series analysis                      Implemented
  Baseline-versus-recent change detection           Implemented
  FastAPI backend                                   Implemented
  Health endpoint                                   Verified
  Observations endpoint                             Verified
  Time-series endpoint                              Verified
  Report endpoint                                   Verified
  Change-detection endpoint                         Verified

### Dataset inventory metadata

The current per-source inventory is maintained in
`metadata/dataset_inventory.json`. It records totals, processing
outcomes, date coverage and observed median intervals. The date ranges
and intervals describe the current acquired project archive; they are
not guaranteed satellite revisit schedules.

### Latest verified data statistics

-   Total normalized records: 1,738.
-   Successful records: 1,397.
-   No-valid-pixel records: 338.
-   Error records: 3.
-   Analysis groups: 8.
-   Change-detection comparisons: 6.
-   API endpoints tested: 5.
-   Original API endpoints returning HTTP 200: 5.

### Global facility and rainfall integration status

  Component                         Current verified state
  --------------------------------- -------------------------------------
  Global power-facility inventory   145,596 records integrated
  Country/territory coverage        226
  Facility categories               8
  GPM IMERG V07B monthly archive    45 periods, Jan 2022--Sep 2025
  Facility-to-GPM mapping           145,596 facilities mapped
  Unique GPM grid pixels            68,247
  Facility-grid rainfall records    3,071,115
  Global summary API                Tested
  Facility listing API              Tested
  Sample facility rainfall API      Tested; 45 monthly records returned

### Dataset boundaries

The following counts refer to different datasets and must not be added
together as if they were one observation inventory:

-   **1,738** normalized satellite-observation records: Jamnagar AOI,
    five satellite sources.
-   **145,596** global power-facility records: facility inventory.
-   **3,071,115** facility-grid monthly rainfall records: GPM-derived
    archive.

The GPM and facility integrations expand the data engine, but they do
not increase the 1,738 normalized satellite-observation count or the
eight Jamnagar time-series groups.

These figures describe the latest recorded integration and may change as
the pipeline is updated.

------------------------------------------------------------------------

# 21. Developer 1 --- Responsibilities and Contributions

Developer 1 is responsible for the satellite data engineering and
backend foundation of TerraTrace.

The main responsibilities include:

### Satellite data discovery

-   Identifying relevant satellite missions.
-   Discovering appropriate data collections.
-   Inspecting satellite assets.
-   Identifying environmental variables.
-   Understanding spatial and temporal characteristics.

### Data acquisition

-   Implementing satellite-specific acquisition modules.
-   Retrieving satellite data assets.
-   Managing acquisition errors.
-   Organizing raw and processed data.

### Geospatial processing

-   Reading raster and NetCDF datasets.
-   Handling coordinate reference systems.
-   Reprojecting and aligning raster data.
-   Applying quality-control masks.
-   Extracting measurements from the AOI.
-   Calculating environmental indicators.

### Data engineering

-   Building a common normalized data structure.
-   Preserving observation metadata.
-   Maintaining data provenance.
-   Validating measurement units and processing status.

### Environmental analysis

-   Implementing monthly time-series aggregation.
-   Estimating descriptive trends.
-   Comparing baseline and recent periods.
-   Generating structured analysis outputs.

### Backend development

-   Developing FastAPI endpoints.
-   Connecting the API to processed data.
-   Testing endpoint responses.
-   Providing a stable data interface for the frontend.

### Global facility and rainfall engineering

-   Integrating the global power-facility CSV inventory.
-   Maintaining the facility category and country-level metadata layer.
-   Acquiring NASA GPM IMERG V07B monthly Final Run data.
-   Extracting gridded precipitation values from HDF5 granules.
-   Mapping facility coordinates to GPM grid pixels.
-   Deriving monthly accumulation estimates from monthly mean
    precipitation rates.
-   Storing facility-grid mappings and compressed rainfall records.
-   Exposing global summary, facility and facility-rainfall API routes.
-   Documenting the spatial and temporal limitations of gridded rainfall
    estimates.

------------------------------------------------------------------------

# 22. Future Development Roadmap

The current implementation establishes the data acquisition, processing,
analysis and backend foundation.

The following improvements can extend the system.

## 22.1 Facility-level monitoring

Introduce accurate geographical polygons for industrial facilities.

The system should distinguish:

-   Facility boundary.
-   Immediate surroundings.
-   Intermediate buffer zone.
-   Wider regional reference area.

This would allow more meaningful comparisons than using only a circular
test AOI.

## 22.2 Reference-region comparison

Compare environmental changes around an industrial facility against
nearby regions with similar environmental characteristics.

This helps distinguish local changes from broader regional patterns.

## 22.3 Advanced statistical analysis

Introduce:

-   Seasonal decomposition.
-   Mann-Kendall trend testing.
-   Sen's slope estimation.
-   Confidence intervals.
-   Regression analysis.
-   Anomaly detection.
-   Uncertainty-aware comparisons.

These methods should be selected according to the data characteristics
and assumptions.

## 22.4 Sentinel-1 calibration

Implement a calibrated radar-processing workflow that produces
physically interpretable backscatter measurements.

Potential future steps include:

-   Radiometric calibration.
-   Terrain correction.
-   Speckle filtering.
-   Conversion to decibel units.
-   Consistent temporal comparison.

## 22.5 Sentinel-5P historical monitoring

Acquire multiple historical observations of atmospheric indicators.

Potential variables include:

-   SO₂.
-   NO₂.
-   CO.
-   CH₄.
-   HCHO.
-   O₃.

Each variable requires its own quality filtering and scientific
interpretation.

## 22.6 Improved uncertainty handling

Preserve uncertainty throughout the complete pipeline.

Future analysis should consider:

-   Measurement uncertainty.
-   Pixel coverage.
-   Sensor resolution.
-   Cloud contamination.
-   Temporal sampling.
-   Cross-sensor differences.

## 22.7 Industrial site-suitability screening

The broader TerraTrace platform can incorporate a preliminary
environmental screening system for potential industrial development
locations.

Potential factors include:

-   Vegetation and land-cover conditions.
-   Water availability indicators.
-   Flood exposure.
-   Ecologically sensitive areas.
-   Protected areas.
-   Terrain and geographical constraints.
-   Historical environmental conditions.

This feature requires additional authoritative geospatial datasets and
explicit screening criteria.

The output should be described as a preliminary suitability assessment,
not a regulatory approval or guarantee of environmental safety.

## 22.8 Global facility dataset expansion and validation

The current global inventory is limited to power facilities. Future work
should identify and integrate separately sourced, authoritative datasets
for additional facility classes such as data centres, manufacturing
facilities and other industrial infrastructure.

Before merging additional sources, the project should define: - Source
provenance and licensing. - Facility identity and deduplication rules. -
Coordinate accuracy and uncertainty. - Facility category taxonomy. -
Operating status and last-verified date. - Polygon boundaries where
available. - Update and refresh policy.

A power-facility point record must not be relabelled as a data centre or
general industrial facility without source evidence.

## 22.9 GPM archive extension and rainfall analysis

Potential improvements include: - Extending the archive beyond September
2025 when validated product granules are available. - Recording product
version, run type, source granule and processing date for each monthly
value. - Preserving missing and invalid grid-cell values explicitly. -
Adding facility-level rainfall summaries only with clear grid-resolution
caveats. - Comparing rainfall anomalies against a documented
climatological baseline. - Combining rainfall with authoritative flood,
watershed and water-resource datasets for screening.

The current monthly archive is contextual gridded rainfall, not a
facility-scale hydrological model.

## 22.10 Facility-centred environmental monitoring

Connect facility locations to the existing satellite pipeline using
facility-specific geometries and buffer zones. This requires careful
handling of spatial resolution, mixed pixels and suitable reference
regions.

## 22.11 Frontend integration

The backend can support a web interface that allows users to:

-   Select an area of interest.
-   Select an environmental variable.
-   Choose a historical time range.
-   View satellite-derived observations.
-   Explore time-series charts.
-   Compare baseline and recent conditions.
-   View geographical changes on a map.
-   Inspect data quality and uncertainty.
-   Explore preliminary site-screening results.

------------------------------------------------------------------------

# 23. Data Sources and Documentation

The following official documentation provides background on the
satellite missions and their products.

### NASA and USGS

-   NASA Earthdata: https://www.earthdata.nasa.gov/
-   NASA MODIS: https://modis.gsfc.nasa.gov/
-   MODIS Land Surface Temperature products: https://lpdaac.usgs.gov/
-   USGS Landsat: https://www.usgs.gov/landsat-missions

### Copernicus

-   Copernicus Data Space Ecosystem: https://dataspace.copernicus.eu/
-   Sentinel-1 Mission:
    https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-1
-   Sentinel-2 Mission:
    https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2
-   Sentinel-5P Mission:
    https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-5p

### Technical documentation

-   FastAPI: https://fastapi.tiangolo.com/
-   Rasterio: https://rasterio.readthedocs.io/
-   NumPy: https://numpy.org/doc/
-   Pandas: https://pandas.pydata.org/docs/
-   PyProj: https://pyproj4.github.io/pyproj/
-   Shapely: https://shapely.readthedocs.io/

The actual processing implementation and product-specific metadata
should be treated as the authoritative source for the exact datasets and
parameters used in a particular run.

------------------------------------------------------------------------

# 24. Conclusion

TerraTrace establishes a modular satellite-data engineering pipeline
that transforms heterogeneous Earth observation datasets into structured
environmental information.

By integrating MODIS, Landsat 8/9, Sentinel-1, Sentinel-2 and
Sentinel-5P, the system demonstrates how multiple satellite missions can
contribute different environmental perspectives to a unified monitoring
workflow.

The implementation covers:

1.  Satellite data discovery.
2.  Satellite data acquisition.
3.  Geospatial processing.
4.  Quality filtering.
5.  Environmental indicator extraction.
6.  Data normalization.
7.  Monthly time-series analysis.
8.  Baseline-versus-recent change detection.
9.  FastAPI backend integration.
10. API validation.

The latest validated Jamnagar satellite pipeline contains 1,738
normalized records from five satellite data sources, with eight
time-series analysis groups and six descriptive change-detection
comparisons. Its processing inventory records 1,397 successful records,
338 no-valid-pixel records and three acquisition errors.

Beyond the AOI-based satellite pipeline, the data engine now integrates
a global power-facility inventory of 145,596 records across 226
countries and territories. The inventory contains eight power-generation
categories and is associated with a 45-month NASA GPM IMERG V07B monthly
rainfall archive from January 2022 through September 2025. This
integration contains 68,247 unique GPM grid pixels and 3,071,115
facility-grid rainfall records.

The FastAPI backend exposes the original observation and analysis routes
as well as global summary, facility and facility-rainfall routes. The
original five endpoints were validated with HTTP 200; the global
endpoints were exercised separately, including a sample facility
rainfall response containing 45 monthly records.

These are distinct datasets with different spatial and temporal
meanings. The Jamnagar satellite records, global facility points and GPM
grid-cell rainfall records must not be conflated into one observation
count. The global facility file is a power-facility inventory, not a
complete industrial or data-centre database. GPM values are gridded
regional estimates, not facility rain-gauge readings.

This implementation provides a broader data-engineering foundation for
the TerraTrace platform. The next stage is to connect the data engine to
the frontend, expand authoritative facility datasets, extend and
validate historical coverage, improve scientific analysis, introduce
facility-specific geometries and develop a transparent preliminary
environmental site-screening workflow.

**TerraTrace --- Turning satellite observations into environmental
intelligence.**

------------------------------------------------------------------------

**Project:** TerraTrace\
**Challenge:** NASA Space Apps Challenge\
**Contribution:** Developer 1 --- Satellite and Global Data Engineering,
Geospatial Processing, GPM Rainfall Integration, Environmental Analysis
and FastAPI Backend\
**Repository:**
https://github.com/sujan-angadi/NASA_Space_Apps/tree/main/Developer%201

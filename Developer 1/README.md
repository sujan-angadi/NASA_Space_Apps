# TerraTrace — Satellite Data Acquisition, Geospatial Processing & Environmental Analysis Engine

**NASA Space Apps Challenge | Developer 1 | Satellite & Global Environmental Data Engineering, Geospatial Processing and Backend**

[![Project](https://img.shields.io/badge/Project-TerraTrace-1f6feb)](https://github.com/sujan-angadi/NASA_Space_Apps/tree/main/Developer%201)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![API](https://img.shields.io/badge/API-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Satellite Data Sources](https://img.shields.io/badge/Satellite%20Data%20Sources-5-orange)]()
[![Global Facilities](https://img.shields.io/badge/Power%20Facilities-145%2C596-blue)]()
[![GPM Archive](https://img.shields.io/badge/GPM%20Archive-45%20Months-0a7)]()
[![Status](https://img.shields.io/badge/Status-Core%20Data%20Foundation%20Complete-success)]()

---

# 1. Project Overview

TerraTrace is a satellite-based environmental monitoring and analysis system designed to investigate environmental changes around industrial facilities and evaluate environmental conditions across geographical regions.

The project uses Earth observation datasets from multiple satellite missions to extract environmental indicators, process geospatial information, construct historical time series, detect changes over time and expose the resulting information through a backend API.

Industrial development can significantly alter the surrounding environment. Data centres, nuclear power plants, thermal power stations, manufacturing facilities and other large industries may be associated with changes in land surface temperature, vegetation, water-related indicators and atmospheric composition.

Understanding these changes requires more than looking at a single satellite image. It requires observations collected over time, consistent processing methods, geographical alignment, quality filtering and meaningful comparisons between different periods.

TerraTrace addresses this requirement by building a data pipeline that transforms satellite observations into structured environmental information.

The satellite observation pipeline integrates five Earth observation data sources:

1. MODIS Terra
2. Landsat 8/9
3. Sentinel-1
4. Sentinel-2
5. Sentinel-5P

The data engine has also been extended with two global environmental data layers:

- A global power-facility inventory containing 145,596 facilities across 226 countries and territories.
- NASA Global Precipitation Measurement (GPM) IMERG monthly rainfall data, spatially associated with the facility inventory.
- NASA Soil Moisture Active Passive (SMAP) soil-moisture observations integrated at facility level.

These additions are separate from the Jamnagar satellite-observation pipeline. The power-facility inventory is not a complete global industrial-facility or data-centre database. GPM rainfall records are gridded regional estimates, and the SMAP integration is a single observation snapshot rather than a historical time series.

The satellite observations are normalized into a common structure and analysed through time-series and change-detection modules. Global facility metadata, rainfall and soil-moisture information are available through dedicated environmental data structures and FastAPI endpoints.

The long-term vision is to develop a web-based environmental intelligence platform that can:

- Monitor environmental indicators around existing industrial facilities.
- Identify geographical regions experiencing environmental changes.
- Compare environmental conditions across different periods.
- Visualize changes in vegetation, surface temperature, water-related indicators and atmospheric composition.
- Support preliminary environmental screening of potential industrial development locations.
- Provide a global inventory of mapped power facilities for geographical exploration.
- Associate power facilities with gridded historical rainfall information from NASA GPM IMERG.
- Associate facilities with available soil-moisture observations from NASA SMAP.
- Expose environmental information through dedicated API endpoints.

**Important:** TerraTrace is an environmental monitoring and preliminary screening tool. Satellite observations alone cannot establish that an industry caused a particular environmental change, nor can this system certify a location as legally or environmentally safe for industrial construction.

---

# 2. Problem Statement

Industrial development is essential for economic growth, technological advancement and infrastructure expansion. However, large industrial facilities can place pressure on surrounding ecosystems and natural resources.

Examples include:

- Data centres, which may require substantial electricity and cooling resources.
- Nuclear power plants, which require careful monitoring of their surrounding environments.
- Thermal power plants, which may be associated with heat, atmospheric emissions and land-use changes.
- Manufacturing facilities, which may alter vegetation, surface conditions and nearby land use.

Traditional environmental assessments may rely on periodic surveys, ground-based measurements and manually collected information.

Although these methods are important, they may not always provide a consistent historical geographical view of environmental changes over large areas.

Satellite Earth observation offers another source of information.

Satellites repeatedly observe the Earth's surface and atmosphere, allowing researchers to study environmental indicators over time.

However, satellite datasets differ in:

- Spatial resolution.
- Temporal resolution.
- Coordinate reference systems.
- Data formats.
- Measurement units.
- Quality indicators.
- Observation coverage.
- Processing requirements.

Consequently, directly comparing different satellite datasets is not straightforward.

TerraTrace addresses the technical challenge of acquiring, processing, standardizing and analysing these heterogeneous datasets through a unified geospatial data engine.

The global facility and environmental integration extends this capability by associating known power-facility locations with available environmental information.

---

# 3. Project Objectives

The primary objectives of the TerraTrace data engine are:

### 3.1 Multi-source satellite data acquisition

Use the integrated Earth observation sources and their existing processed outputs to provide environmental indicators.

### 3.2 Geospatial processing

Extract relevant environmental information while maintaining geographical alignment and applying appropriate quality filters.

### 3.3 Data normalization

Convert heterogeneous satellite outputs into a consistent data structure so downstream modules can process observations without depending on individual satellite formats.

### 3.4 Historical environmental analysis

Aggregate available observations into monthly time series and compare environmental indicators across selected historical periods.

### 3.5 Change detection

Identify descriptive changes in environmental indicators between baseline and recent periods.

### 3.6 Global environmental integration

Connect the global power-facility inventory with available GPM precipitation and SMAP soil-moisture information.

### 3.7 Backend integration

Expose normalized observations, time-series results, change-detection outputs and facility-level environmental information through REST API endpoints.

### 3.8 Preliminary industrial site screening

Use the available environmental information to support preliminary screening and geographical exploration of potential industrial development locations.

---

# 4. Overall System Architecture

TerraTrace follows a modular data-engineering architecture.

The pipeline transforms raw satellite observations and integrated environmental datasets into structured information through acquisition, processing, validation, normalization, analysis and API delivery.

```text
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


       GLOBAL ENVIRONMENTAL DATA LAYER
       --------------------------------

       Global Power-Facility Inventory
                    |
          Facility-to-GPM Grid Mapping
                    |
            NASA GPM IMERG Rainfall
                    |
             Facility-Level Lookup
                    |
             NASA SMAP Soil Moisture
                    |
          Environmental Data Integration
                    |
             Environmental API
                    |
               WEB APPLICATION
```

The architecture separates satellite-specific processing from common analysis and API functionality.

The global facility and environmental datasets are maintained as a separate data model because their spatial and temporal characteristics differ from the Jamnagar satellite-observation records.

This modular separation avoids incorrectly treating a facility record, a gridded rainfall estimate or a soil-moisture snapshot as an individual normalized satellite observation.

---

# 5. Satellite and Environmental Data Sources

The current implementation includes five satellite observation sources and two additional global environmental data layers.

## 5.1 MODIS Terra

**Mission:** Moderate Resolution Imaging Spectroradiometer (MODIS)  
**Platform:** Terra  
**Collection:** `modis-11A2-061`  
**Primary variable:** Land Surface Temperature (LST)

MODIS is an Earth observation instrument that collects information about the Earth's surface and atmosphere.

The Terra platform provides repeated observations that can be used to investigate changes in land surface temperature over time.

### Data used

The project uses the MODIS Terra Land Surface Temperature and Emissivity 8-Day product.

The implementation extracts:

- Daytime land surface temperature.
- Nighttime land surface temperature.
- Valid pixel statistics.
- Minimum and maximum temperature.
- Standard deviation.
- Pixel coverage information.

### Processing methodology

1. Discover MODIS observations for the selected geographical region.
2. Retrieve the required satellite assets.
3. Reproject the area of interest into the appropriate MODIS coordinate system.
4. Align the quality-control raster with the temperature raster.
5. Apply the MODIS quality-control policy.
6. Exclude invalid pixels.
7. Apply the temperature scale factor.
8. Convert valid temperature measurements into Celsius.
9. Calculate statistics within the area of interest.
10. Store the resulting observations.

### Temperature conversion

MODIS land surface temperature uses a scale factor of 0.02.

\[
T_C = (DN \times 0.02) - 273.15
\]

Where:

- \(T_C\) = Temperature in Celsius.
- \(DN\) = Original raster digital number.

### Output

`data/processed/modis_lst_day_night.json`

### Current integration

- Normalized records: 324.
- Daytime records: 162.
- Nighttime records: 162.

---

## 5.2 Landsat 8 and Landsat 9

**Mission:** Landsat  
**Collection:** `landsat-c2-l2`  
**Primary variables:** Land Surface Temperature and NDVI.

Landsat provides multispectral observations of the Earth's surface.

Its observations are useful for studying land-cover conditions, vegetation changes and surface temperature.

### Data used

The implementation processes Landsat Collection 2 Level-2 data.

The main indicators are:

**A. Land Surface Temperature**

Land surface temperature provides information about the thermal condition of the Earth's surface.

**B. Normalized Difference Vegetation Index**

NDVI estimates vegetation greenness using red and near-infrared reflectance.

\[
NDVI = \frac{NIR-Red}{NIR+Red}
\]

Where:

- NIR = Near-infrared reflectance.
- Red = Red-band reflectance.

NDVI generally ranges from -1 to +1.

### Processing methodology

1. Discover Landsat 8 and Landsat 9 observations.
2. Retrieve the required Level-2 assets.
3. Read the required spectral and thermal bands.
4. Align raster datasets to a common geographical grid.
5. Apply relevant scale factors and offsets.
6. Apply quality filtering.
7. Mask invalid pixels.
8. Calculate NDVI.
9. Extract land surface temperature.
10. Calculate statistical measurements within the area of interest.
11. Record observation dates and processing status.
12. Export the results into structured JSON.

### Output

`data/processed/landsat_environmental_indicators.json`

### Current integration

- Normalized records: 671.
- Environmental variables: LST and NDVI.
- Three records retain HTTP 403 acquisition errors.

Failed records are preserved for traceability rather than being represented as valid observations.

---

## 5.3 Sentinel-1

**Mission:** Copernicus Sentinel-1  
**Data collection:** `sentinel-1-grd`  
**Primary measurements:** VV and VH polarization.

Sentinel-1 is a Synthetic Aperture Radar (SAR) mission.

Unlike optical satellite missions, SAR uses microwave signals and can collect observations independently of daylight conditions.

Radar observations are useful for investigating surface structure, moisture-related changes and land-surface characteristics.

### Polarization information

**VV polarization:** The radar transmits vertically polarized signals and receives vertically polarized signals.

**VH polarization:** The radar transmits vertically polarized signals and receives horizontally polarized signals.

### Processing methodology

1. Discover Sentinel-1 GRD observations.
2. Retrieve VV and VH raster assets.
3. Inspect raster georeferencing information.
4. Handle datasets where conventional raster CRS metadata is unavailable.
5. Use Ground Control Points (GCPs) for geospatial transformation.
6. Construct a suitable local target grid.
7. Use geospatial warping to align the raster with the target area.
8. Extract relevant raster statistics.
9. Store VV and VH measurements separately.

### Important technical consideration

The processed Sentinel-1 values in the current implementation are raw source asset values.

They are not calibrated sigma-zero backscatter measurements and are not converted into decibels.

Therefore, the current values must not be interpreted as calibrated physical backscatter measurements.

### Output

`data/processed/sentinel1_test.json`

### Current integration

- Five test scenes processed.
- Five VV observations.
- Five VH observations.
- Ten normalized records.

Sentinel-1 is currently a technical acquisition and processing demonstration. It does not provide a sufficiently long historical baseline for the implemented change-detection workflow.

---

## 5.4 Sentinel-2

**Mission:** Copernicus Sentinel-2  
**Data collection:** `sentinel-2-l2a`  
**Primary variables:** NDVI and McFeeters NDWI.

Sentinel-2 provides multispectral optical observations with different spatial resolutions.

The project uses Sentinel-2 observations to investigate vegetation and water-related surface indicators.

### Spectral bands used

| Band | Description | Spatial resolution |
|---|---|---:|
| B02 | Blue | 10 m |
| B03 | Green | 10 m |
| B04 | Red | 10 m |
| B08 | Near Infrared | 10 m |
| SCL | Scene Classification Layer | 20 m |

### A. NDVI

\[
NDVI = \frac{B08-B04}{B08+B04}
\]

### B. NDWI — McFeeters

\[
NDWI = \frac{B03-B08}{B03+B08}
\]

This indicator can help identify open-water-related spectral characteristics.

It should not be confused with other NDWI formulations that use different bands.

### Processing methodology

1. Discover Sentinel-2 Level-2A observations.
2. Retrieve B02, B03, B04, B08 and SCL assets.
3. Use B08 as the target 10 m raster grid.
4. Align the other required bands with the target grid.
5. Reproject the 20 m Scene Classification Layer to the target grid.
6. Apply cloud and invalid-pixel masking.
7. Calculate NDVI.
8. Calculate McFeeters NDWI.
9. Extract statistics inside the AOI.
10. Calculate valid-pixel coverage.
11. Store the processed results in JSON.

The implementation masks SCL classes:

- 0 — No data.
- 1 — Saturated or defective.
- 3 — Cloud shadows.
- 8 — Cloud medium probability.
- 9 — Cloud high probability.
- 10 — Thin cirrus.
- 11 — Snow or ice.

### Output

`data/processed/sentinel2_environmental_indicators.json`

### Current integration

- Acquisition terminal reported: 337/337 scenes processed.
- Normalized NDVI records: 366.
- Normalized NDWI records: 366.
- Total normalized Sentinel-2 records: 732.

The acquisition progress count and normalized observation count are not identical. The normalized record count is the relevant count for the current analysis pipeline.

---

## 5.5 Sentinel-5P

**Mission:** Copernicus Sentinel-5 Precursor  
**Primary variable:** Atmospheric Sulfur Dioxide (SO₂)  
**Data collection:** `sentinel-5p-l2-netcdf`

Sentinel-5P is designed to monitor atmospheric composition using the TROPOMI instrument.

The TerraTrace implementation investigates the SO₂ total vertical column.

### Data used

- SO₂ total vertical column.
- SO₂ precision.
- Latitude and longitude.
- Pixel quality indicators.
- Geolocation information.

### Processing methodology

1. Discover Sentinel-5P observations.
2. Retrieve the relevant NetCDF product.
3. Read the SO₂ total vertical column.
4. Read associated precision values.
5. Extract latitude and longitude arrays.
6. Read the quality assurance value.
7. Identify satellite pixel footprints intersecting the AOI.
8. Apply the QA threshold.
9. Extract valid SO₂ measurements.
10. Preserve associated uncertainty information.
11. Export the result into JSON.

### Quality filtering

\[
QA \geq 0.5
\]

Pixels below this threshold are excluded from valid measurements.

### Important scientific consideration

The SO₂ total vertical column represents an atmospheric column measurement. It is not equivalent to ground-level SO₂ concentration.

### Output

`data/processed/sentinel5p_so2.json`

### Current integration

One SO₂ observation has been acquired and processed.

The current sample contains:

- Two pixel footprints intersecting the AOI according to the extraction output.
- One valid pixel.
- 50% valid-pixel coverage.
- Mean QA value of 1.0 for the valid observation.
- Associated uncertainty information.

A single scene is insufficient to establish a historical atmospheric trend.

The quality threshold is retained rather than weakened to increase the valid-pixel count.

---

## 5.6 NASA Global Precipitation Measurement (GPM) — IMERG

**Mission:** Global Precipitation Measurement  
**Product:** Integrated Multi-satellitE Retrievals for GPM (IMERG), Version 07B  
**Product stream:** Final Run  
**Primary variable:** Gridded precipitation rate  
**Archive:** January 2022 – September 2025  
**Temporal aggregation:** Monthly  
**Approximate grid resolution:** 0.1°

GPM IMERG provides precipitation estimates on a regular global grid.

TerraTrace uses this product as a regional rainfall-context layer for the global power-facility inventory.

Unlike the Jamnagar AOI workflow, this integration associates facility coordinates with GPM grid cells and stores monthly rainfall estimates for those cells.

A grid-cell estimate is not a rain-gauge measurement taken at the facility itself.

### Source variable and units

The extracted IMERG variable is:

`Grid/precipitation`

The source variable is a precipitation rate expressed in mm/hr.

### Monthly accumulation estimate

The implementation estimates monthly accumulated precipitation using:

\[
P_{month} = \bar{R}_{month} \times 24 \times D
\]

Where:

- \(P_{month}\) = Estimated monthly accumulation in mm.
- \(\bar{R}_{month}\) = Monthly mean precipitation rate in mm/hr.
- \(D\) = Number of days in the month.

This is a derived monthly estimate from the monthly mean rate.

### Processing workflow

1. Acquire the monthly GPM IMERG Final Run V07B granules.
2. Read the `Grid/precipitation` variable from HDF5 products.
3. Interpret the global longitude/latitude grid.
4. Associate each power-facility coordinate with its corresponding GPM grid pixel.
5. Extract the monthly precipitation-rate value for each mapped grid cell.
6. Convert the monthly mean rate into an estimated monthly accumulation using the month length.
7. Merge rainfall records with the facility-grid mapping.
8. Export compressed global rainfall data for API consumption.

### Current integration statistics

| Metric | Current value |
|---|---:|
| Monthly periods | 45 |
| Archive range | Jan 2022 – Sep 2025 |
| Global power facilities mapped | 145,596 |
| Unique GPM grid pixels | 68,247 |
| Grid pixel-month records | 3,071,115 |
| Approximate spatial resolution | 0.1° |
| Missing facility mappings | 0 |

### Committed output files

Location: `data/integration/phase1/`

| File | Responsibility |
|---|---|
| `global_facility_rainfall_lookup.csv.gz` | Facility-level rainfall lookup |
| `global_gpm_grid_monthly_with_facility_counts.csv.gz` | Monthly GPM grid data with facility counts |
| `global_monthly_rainfall_summary.csv` | Monthly rainfall summary |
| `global_environmental_summary.json` | Global summary statistics |
| `integration_validation.json` | Integration validation |
| `data_dictionary.json` | Field definitions and units |
| `facility_monthly_rainfall_example.csv` | Example facility records |
| `PHASE1_README.md` | Phase 1 documentation |

### Important temporal and scientific limitations

- The integrated archive ends in September 2025.
- GPM Final Run products have processing latency.
- A grid cell covers a broad area and cannot resolve rainfall variation at an individual facility parcel.
- Multiple facilities can map to the same GPM pixel.
- Rainfall is contextual environmental information, not a direct measurement of facility water consumption or availability.
- Rainfall alone does not establish flood safety, drought risk or site suitability.

---

## 5.7 Global Power-Facility Inventory

TerraTrace integrates a global power-facility inventory to provide a geographical reference layer for the global rainfall workflow and environmental exploration.

**Inventory size:** 145,596 facilities  
**Geographical coverage:** 226 countries and territories  
**Categories:** 8

### Facility-category distribution

| Facility category | Records |
|---|---:|
| Utility-scale solar | 94,491 |
| Wind | 28,447 |
| Hydropower | 6,950 |
| Oil/gas | 6,112 |
| Coal | 4,910 |
| Bioenergy | 3,610 |
| Nuclear | 592 |
| Geothermal | 484 |
| **Total** | **145,596** |

### Scope and interpretation

This inventory is a power-facility dataset.

It must not be described as a complete database of all industrial facilities, manufacturing plants, data centres or other infrastructure.

The facility records provide mapped locations and metadata for geographical discovery. They do not independently provide verified facility boundaries, operating status, environmental permits or proof of current operation.

### Current role in TerraTrace

- Provide a global set of mapped power-facility records.
- Support facility metadata retrieval.
- Support category and country-based filtering.
- Associate facility coordinates with GPM grid cells.
- Provide the geographical reference for environmental analysis.

The facility inventory is maintained independently of the Jamnagar satellite-observation dataset.

---

## 5.8 NASA SMAP — Soil Moisture

**Mission:** Soil Moisture Active Passive (SMAP)  
**Product:** SMAP L4 SPL4SMGP V008  
**Observation type:** Processed soil-moisture snapshot  
**Observation date:** 31 December 2023  
**Primary variables:** Surface, root-zone and profile soil moisture

NASA SMAP provides soil-moisture information that can help describe land-surface and subsurface moisture conditions.

TerraTrace integrates the SMAP L4 observation with the global power-facility inventory to provide additional environmental context.

### Measurements integrated

| Variable | Measurement depth | Unit |
|---|---|---|
| Surface soil moisture | 0–5 cm | m³/m³ |
| Root-zone soil moisture | 0–100 cm | m³/m³ |
| Profile soil moisture | To bedrock | m³/m³ |

### Processing workflow

1. Acquire the required SMAP L4 source granule.
2. Read the relevant soil-moisture fields.
3. Interpret the geographical grid.
4. Associate facility coordinates with the corresponding observation grid.
5. Extract surface, root-zone and profile values.
6. Validate missing and out-of-range measurements.
7. Associate valid measurements with facility identifiers.
8. Export the facility-level observations.
9. Record source and observation metadata.

### Integration results

| Metric | Result |
|---|---:|
| Facilities evaluated | 145,596 |
| Facilities with all three valid measurements | 142,387 |
| Missing or out-of-range across all three fields | 3,209 |
| Valid surface measurements | 144,163 |
| Valid root-zone measurements | 142,793 |
| Valid profile measurements | 142,387 |

### Committed output files

Location: `data/integration/phase2/`

| File | Responsibility |
|---|---|
| `smap_facility_observations.csv.gz` | Processed facility-level SMAP observations |
| `global_facility_soil_moisture_snapshot.csv.gz` | Global soil-moisture snapshot |
| `global_facility_environmental_snapshot_dec2023.csv.gz` | Combined environmental snapshot |

Metadata:

`metadata/soil_moisture_source.json`

### Important temporal limitation

The current SMAP integration represents one observation snapshot.

It is not a historical soil-moisture time series. It must not be used to claim monthly, seasonal or multi-year soil-moisture trends.

The combined December 2023 environmental snapshot pairs a monthly rainfall estimate with a SMAP observation at a different temporal resolution. Their temporal differences must be preserved during interpretation.

---

# 6. Geographical Area of Interest

The current development and testing area is located in Jamnagar, Gujarat, India.

**AOI:** Jamnagar Test

The current test configuration uses an approximately 2 km radius around:

- Longitude: 69.849610
- Latitude: 22.334148

The area of interest is used to extract satellite pixels and calculate environmental statistics.

### Why an AOI is necessary

Satellite datasets contain information across large geographical areas.

An AOI allows the processing pipeline to:

- Restrict analysis to the selected geographical region.
- Reduce unnecessary raster processing.
- Extract measurements relevant to the target location.
- Compare observations using a consistent geographical boundary.

### Current limitation

The Jamnagar AOI is a development test region. It is not a verified boundary of a specific data centre, nuclear power plant or industrial facility.

The global power-facility inventory is a separate point/location dataset.

---

# 7. Geospatial Processing Methodology

Geospatial processing is one of the most important components of TerraTrace.

Satellite datasets are not always directly compatible because they may use different coordinate reference systems, spatial resolutions, raster grids and geolocation methods.

## 7.1 Coordinate Reference Systems

A Coordinate Reference System (CRS) defines how geographical coordinates correspond to locations on Earth.

The project uses geospatial transformation and reprojection techniques to align observations with the AOI.

## 7.2 Raster Alignment

Raster alignment ensures that different satellite bands or layers share a compatible spatial grid.

For example, Sentinel-2 B08 has 10 m resolution, while its Scene Classification Layer has 20 m resolution.

The implementation aligns the SCL data with the B08 target grid before applying pixel-level masking.

## 7.3 Quality Control

Potential problems include:

- Cloud contamination.
- Cloud shadows.
- Invalid observations.
- Missing data.
- Sensor defects.
- Low-quality atmospheric retrievals.
- Insufficient AOI coverage.

TerraTrace applies satellite-specific quality filtering before extracting environmental statistics.

## 7.4 Pixel Extraction

Depending on the data source, extraction involves:

- Raster masking.
- Geometrical intersection.
- Raster reprojection.
- Pixel-footprint intersection.
- Quality-mask application.

## 7.5 Statistical Extraction

For valid pixels, the system extracts:

- Mean.
- Median, when available.
- Minimum.
- Maximum.
- Standard deviation.
- Number of valid pixels.
- Total pixels.
- Coverage percentage.

---

# 8. Data Normalization Architecture

One of the main challenges in multi-satellite processing is that each satellite mission produces data in a different format.

TerraTrace uses a common normalization layer to provide a consistent structure for the downstream analysis modules.

### Normalization module

`common/data_normalizer.py`

### Responsibilities

1. Read processed satellite JSON files.
2. Identify the data source.
3. Extract observation metadata.
4. Identify the environmental variable.
5. Extract statistical measurements.
6. Preserve units.
7. Preserve quality and coverage information.
8. Preserve processing status.
9. Record acquisition errors.
10. Convert observations into a common structure.
11. Save the consolidated normalized dataset.

### Common normalized structure

```json
{
  "source": "MODIS Terra",
  "collection": "modis-11A2-061",
  "item_id": "satellite_observation_id",
  "observation_datetime": "2022-01-01T00:00:00Z",
  "aoi_name": "Jamnagar Test",
  "variable": "land_surface_temperature_day",
  "unit": "celsius",
  "mean": 27.58,
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

### Separate global data model

The global power-facility inventory, GPM rainfall and SMAP soil-moisture observations are maintained as separate integrated datasets.

Their fields, measurement units, spatial resolution and temporal characteristics are preserved in their own data structures.

This prevents incorrect merging of different measurement types into a single observation schema.

---

# 9. Data Quality and Validation

Data quality is essential for environmental analysis.

TerraTrace distinguishes three processing states.

### 9.1 Success

A valid observation was processed and at least one usable pixel was extracted.

### 9.2 No valid pixels

The scene was processed, but no usable pixels remained inside the AOI after quality filtering.

### 9.3 Error

The observation could not be successfully processed or acquired.

Error information is preserved for debugging and traceability.

### Current normalized dataset validation

| Satellite source | Total records | Success | No valid pixels | Errors |
|---|---:|---:|---:|---:|
| Sentinel-2 | 732 | 572 | 160 | 0 |
| Landsat 8/9 | 671 | 526 | 142 | 3 |
| MODIS Terra | 324 | 288 | 36 | 0 |
| Sentinel-1 | 10 | 10 | 0 | 0 |
| Sentinel-5P | 1 | 1 | 0 | 0 |
| **Total** | **1,738** | **1,397** | **338** | **3** |

These counts describe the Jamnagar normalized satellite-observation dataset only.

The global facility inventory and GPM/SMAP records are separate datasets and are not included in this table.

### Data quality principles

- Missing measurements must never be replaced with zero.
- Failed acquisitions must remain distinguishable from valid observations.
- Units must be preserved.
- Observation timestamps must be retained.
- Spatial and temporal limitations must remain visible.
- Source provenance must be maintained.

---

# 10. Environmental Time-Series Analysis

### Module

`analysis/timeseries.py`

The objective is to organize environmental observations chronologically and calculate how measured values change over time.

### Processing methodology

1. Load normalized observations.
2. Filter for successful records.
3. Convert timestamps into datetime values.
4. Extract the observation month.
5. Group by source, AOI, environmental variable, measurement unit and month.
6. Calculate monthly mean.
7. Calculate monthly minimum.
8. Calculate monthly maximum.
9. Count the number of observations.
10. Estimate a linear monthly trend slope where sufficient observations exist.
11. Save aggregated results.

### Monthly trend estimation

\[
y = mx + c
\]

Where:

- \(y\) = Environmental indicator.
- \(x\) = Time.
- \(m\) = Estimated slope.
- \(c\) = Intercept.

The slope indicates the direction and approximate rate of change in the observed series.

It does not automatically account for seasonality, sensor differences or other environmental influences.

### Output

`data/integration/validated/monthly_analysis.json`

### Current result

The latest Jamnagar analysis generated eight source-variable groups.

### Separate global rainfall archive

The GPM integration contains 45 monthly periods from January 2022 through September 2025.

Its grid-level records are accessed through the global environmental data layer and are not counted among the eight Jamnagar time-series groups.

### Important interpretation

A monthly linear slope is a descriptive trend estimate. It is not automatically evidence of a statistically significant environmental change.

---

# 11. Environmental Change Detection

### Module

`analysis/change_detection.py`

The change-detection module compares environmental indicators across two selected historical periods.

Current comparison periods:

- Baseline: 2022–2023.
- Recent: 2024–2025.

The comparison is performed using corresponding calendar months.

### Methodology

1. Load normalized observations.
2. Filter for valid measurements.
3. Separate the baseline period.
4. Separate the recent period.
5. Group observations by source and environmental variable.
6. Aggregate measurements by calendar month.
7. Match corresponding calendar months.
8. Calculate baseline monthly mean.
9. Calculate recent monthly mean.
10. Calculate absolute difference.
11. Calculate percentage difference where meaningful.
12. Count comparable months.
13. Save results.

### Absolute change

\[
\Delta X = X_{recent} - X_{baseline}
\]

### Percentage change

\[
\%Change =
\frac{X_{recent}-X_{baseline}}{X_{baseline}}\times100
\]

### Current change-detection results

| Source | Environmental variable | Comparable months | Mean change |
|---|---|---:|---:|
| Landsat 8/9 | Land surface temperature | 12 | -1.556 °C |
| Landsat 8/9 | NDVI | 12 | +0.05475 |
| MODIS Terra | Daytime land surface temperature | 11 | -2.190 °C |
| MODIS Terra | Nighttime land surface temperature | 12 | +0.425 °C |
| Sentinel-2 | NDVI | 12 | -0.00310 |
| Sentinel-2 | McFeeters NDWI | 12 | +0.00228 |

These are descriptive comparisons from the Jamnagar test AOI. They do not establish industrial causation or statistical significance.

### Output

`data/integration/validated/change_detection.json`

Sentinel-1 is excluded from historical comparison because the current test dataset does not provide observations across both comparison periods.

---

# 12. Global Environmental Integration Architecture

The global environmental integration provides a structured connection between facility locations and available environmental measurements.

It is separate from the Jamnagar satellite-observation pipeline.

### Integrated components

1. Global power-facility inventory.
2. Facility-to-GPM spatial mapping.
3. GPM monthly rainfall archive.
4. SMAP soil-moisture snapshot.
5. Combined environmental snapshot.
6. Data dictionary and source metadata.
7. Validation outputs.
8. Environmental API endpoints.

### Phase 1 — Rainfall integration

Location:

`data/integration/phase1/`

| File | Responsibility |
|---|---|
| `global_facility_rainfall_lookup.csv.gz` | Facility-level rainfall lookup |
| `global_gpm_grid_monthly_with_facility_counts.csv.gz` | Monthly GPM grid data |
| `global_monthly_rainfall_summary.csv` | Monthly rainfall summary |
| `global_environmental_summary.json` | Global statistics |
| `data_dictionary.json` | Field definitions and units |
| `integration_validation.json` | Validation results |
| `facility_monthly_rainfall_example.csv` | Example records |
| `PHASE1_README.md` | Phase 1 documentation |

### Phase 2 — Soil-moisture integration

Location:

`data/integration/phase2/`

| File | Responsibility |
|---|---|
| `smap_facility_observations.csv.gz` | Processed facility-level SMAP observations |
| `global_facility_soil_moisture_snapshot.csv.gz` | Global soil-moisture snapshot |
| `global_facility_environmental_snapshot_dec2023.csv.gz` | Combined environmental snapshot |

### Metadata

`metadata/soil_moisture_source.json`

### Acquisition and integration scripts

Location:

`acquisition/soil_moisture/`

| File | Responsibility |
|---|---|
| `acquire_global_soil_moisture.py` | SMAP source acquisition |
| `extract_smap_facilities.py` | Facility-level soil-moisture extraction |
| `integrate_environmental_data.py` | Environmental data integration |

### Data sufficiency

The existing global integration provides:

- Facility identity and geographical reference.
- Monthly precipitation history.
- Facility-to-grid association.
- Surface soil moisture.
- Root-zone soil moisture.
- Profile soil moisture.
- Combined environmental records.
- Source metadata.
- Validation information.

These structures provide the data contract required by downstream application modules.

The datasets should be consumed in their existing form, preserving their respective units, timestamps, spatial resolution and missing-value semantics.

---

# 13. Backend API Architecture

The processed environmental information is exposed through a REST API implemented using FastAPI.

### Backend modules

- `api/main.py`
- `api/environmental.py`

### Framework

FastAPI

### Server

Uvicorn

### API responsibilities

The backend provides access to:

- Service health.
- Normalized satellite observations.
- Monthly time-series analysis.
- Consolidated project reports.
- Environmental change-detection results.
- Global power-facility inventory.
- Global environmental statistics.
- Facility-level environmental information.
- Monthly GPM rainfall history.
- Available SMAP soil-moisture measurements.

### API base URL

`http://127.0.0.1:8000`

### Interactive documentation

`http://127.0.0.1:8000/docs`

FastAPI automatically generates interactive API documentation through Swagger UI.

---

# 14. API Endpoints

## 14.1 Existing analytical endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Backend health |
| `GET /observations` | Normalized satellite observations |
| `GET /timeseries` | Monthly time-series results |
| `GET /report` | Consolidated analysis report |
| `GET /change-detection` | Baseline-versus-recent comparisons |
| `GET /global-stats` | Global facility and rainfall statistics |
| `GET /facilities` | Global facility records |
| `GET /facilities/{facility_id}` | Individual facility information |
| `GET /facilities/{facility_id}/rainfall` | Facility-associated rainfall history |

## 14.2 Environmental endpoints

Implemented in `api/environmental.py`.

| Endpoint | Purpose |
|---|---|
| `GET /environmental/stats` | Global environmental statistics and coverage |
| `GET /environmental/facilities` | Facility-level environmental records |
| `GET /environmental/facilities/{facility_id}` | Individual facility environmental information |

### Environmental statistics

Example:

```http
GET /environmental/stats
```

The response provides:

- Facility count.
- Country count.
- Valid soil-moisture coverage.
- Missing or out-of-range measurements.
- SMAP observation timestamp.
- Available rainfall periods.
- Environmental source information.

### Facility environmental information

Example:

```http
GET /environmental/facilities/L100000808559
```

The response includes the available facility metadata, soil-moisture measurements and associated rainfall history.

### Important API interpretation

The API exposes existing integrated data. It does not create additional observations or increase the temporal resolution of the original satellite products.

Missing values must remain missing rather than being converted into zero.

---

# 15. API Validation Results

The backend was tested through Swagger UI and HTTP requests.

### Original API validation

| Endpoint | Result |
|---|---|
| `/health` | HTTP 200 |
| `/observations` | HTTP 200 |
| `/timeseries` | HTTP 200 |
| `/report` | HTTP 200 |
| `/change-detection` | HTTP 200 |
| `/global-stats` | Tested |
| `/facilities?limit=2` | Tested |
| `/facilities/{facility_id}/rainfall` | Tested |

### Environmental API validation

The following endpoints were tested locally:

| Endpoint | Result |
|---|---|
| `/environmental/stats` | Successful response |
| `/environmental/facilities` | Implemented |
| `/environmental/facilities/{facility_id}` | Successful sample response |

### Verified global statistics

The environmental statistics endpoint returned:

- 145,596 facilities.
- 226 countries.
- 142,387 facilities with valid measurements across all three soil-moisture fields.
- 3,209 facilities with missing or out-of-range measurements.
- 45 available rainfall periods.

The sample facility detail endpoint returned soil-moisture information and 45 monthly GPM rainfall records.

### API validation principle

The existing endpoints and integrated datasets form the baseline for subsequent application development.

API reliability, response consistency, pagination, validation and frontend compatibility are the relevant areas of continued work.

---

# 16. Project Directory Structure

The data-engineering implementation is organized into separate modules.

```text
global_data_engine/
│
├── acquisition/
│   ├── modis/
│   ├── landsat/
│   ├── sentinel1/
│   ├── sentinel2/
│   ├── sentinel5p/
│   └── soil_moisture/
│       ├── acquire_global_soil_moisture.py
│       ├── extract_smap_facilities.py
│       └── integrate_environmental_data.py
│
├── analysis/
│   ├── timeseries.py
│   └── change_detection.py
│
├── aoi/
│
├── api/
│   ├── main.py
│   └── environmental.py
│
├── common/
│
├── data/
│   ├── raw/
│   │
│   ├── processed/
│   │
│   └── integration/
│       ├── phase1/
│       │   ├── global_facility_rainfall_lookup.csv.gz
│       │   ├── global_gpm_grid_monthly_with_facility_counts.csv.gz
│       │   ├── global_monthly_rainfall_summary.csv
│       │   ├── global_environmental_summary.json
│       │   ├── data_dictionary.json
│       │   ├── integration_validation.json
│       │   └── facility_monthly_rainfall_example.csv
│       │
│       └── phase2/
│           ├── smap_facility_observations.csv.gz
│           ├── global_facility_soil_moisture_snapshot.csv.gz
│           └── global_facility_environmental_snapshot_dec2023.csv.gz
│
├── metadata/
│   └── soil_moisture_source.json
│
├── tests/
│
├── .gitignore
├── requirements.txt
└── PHASE2_README.md
```

The listing illustrates the main project modules and committed global integration files. Satellite-specific source modules and supporting files remain part of the existing repository.

Raw satellite granules and credentials are maintained outside the committed integration package.

---

# 17. Technology Stack

| Technology | Purpose |
|---|---|
| Python | Main development language |
| FastAPI | Backend REST API |
| Uvicorn | ASGI server |
| Rasterio | Raster reading and processing |
| NumPy | Numerical operations |
| Pandas | Data organization and analysis |
| PyProj | Coordinate transformations |
| Shapely | Geometrical operations |
| GeoPandas | Geospatial data handling where required |
| Xarray | Multidimensional scientific data |
| NetCDF4 | NetCDF satellite data access |
| h5py | HDF5 satellite data access |
| Requests | HTTP requests |
| Earthaccess | NASA Earthdata access |
| Git | Version control |

The unified dependency manifest is:

`requirements.txt`

---

# 18. Installation and Setup

### Requirements

- Python 3.12.
- Git.
- Linux or another compatible development environment.
- Internet connectivity for services that require network access.
- Sufficient disk space for processing.

### Step 1 — Clone the repository

```bash
git clone https://github.com/sujan-angadi/NASA_Space_Apps.git
```

### Step 2 — Navigate to Developer 1

```bash
cd NASA_Space_Apps/"Developer 1"
```

### Step 3 — Navigate to the data engine

```bash
cd terratrace-data-engine/find_sat/global_data_engine
```

### Step 4 — Create a virtual environment

```bash
python3 -m venv .venv
```

### Step 5 — Activate the environment

```bash
source .venv/bin/activate
```

### Step 6 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 7 — Verify Python

```bash
python --version
```

### Step 8 — Start the API

```bash
uvicorn api.main:app --reload
```

Open:

`http://127.0.0.1:8000/docs`

The existing integrated datasets are the standard runtime inputs for the application.

Satellite acquisition scripts are retained as part of the engineering implementation and source provenance. Running the acquisition process is not a prerequisite for consuming the committed integrated data.

---

# 19. Scientific Interpretation and Limitations

Satellite-derived indicators provide valuable environmental information. However, they must be interpreted within the limits of the underlying measurements.

TerraTrace supports environmental investigation rather than unsupported causal claims.

## 19.1 Correlation does not establish causation

If land surface temperature increases around an industrial facility, this does not automatically prove that the facility caused the increase.

Other possible factors include:

- Seasonal changes.
- Urban expansion.
- Regional weather conditions.
- Land-cover changes.
- Agricultural activity.
- Natural environmental variation.

## 19.2 Spatial resolution matters

Different satellite missions observe the Earth at different spatial resolutions.

For example:

- Sentinel-2 optical bands used here: 10 m.
- Landsat optical observations: generally 30 m.
- MODIS LST product: 1 km.
- Sentinel-5P SO₂ product: approximately 5.5 km × 3.5 km for the acquired product.
- GPM IMERG: approximately 0.1°.

A small facility may occupy only a fraction of a coarse-resolution pixel.

Consequently, spatial resolution must be considered before comparing measurements.

## 19.3 Temporal resolution matters

Satellites do not necessarily observe a location at the same frequency.

Clouds, missing scenes, revisit schedules and product availability can create gaps.

Monthly aggregation helps organize observations but does not eliminate these gaps.

## 19.4 Atmospheric measurements are not ground measurements

Sentinel-5P SO₂ total vertical column measurements represent atmospheric column information.

They cannot be directly interpreted as ground-level exposure concentrations.

## 19.5 Radar measurements require calibration

The current Sentinel-1 implementation extracts source asset values.

Further calibration and processing are necessary before interpreting these values as physical radar backscatter measurements.

## 19.6 Missing data must remain missing

The analysis pipeline distinguishes:

- A real measured zero.
- A missing measurement.
- A failed acquisition.
- A measurement excluded by quality filtering.

## 19.7 SMAP snapshot limitations

The integrated SMAP dataset represents one observation timestamp.

It does not provide a historical soil-moisture trend. The timestamp and temporal resolution must remain attached to the measurements.

## 19.8 Statistical significance is not yet established

The current baseline-versus-recent comparisons are descriptive.

They do not constitute formal hypothesis testing or statistically significant change detection.

---

# 20. Current Implementation Status

The following table summarizes the recorded implementation state.

| Component | Status |
|---|---|
| MODIS acquisition and processing | Implemented |
| Landsat acquisition and processing | Implemented |
| Sentinel-1 test acquisition and processing | Implemented |
| Sentinel-2 acquisition and processing | Implemented |
| Sentinel-5P SO₂ test processing | Implemented |
| Common data normalizer | Implemented |
| Normalized dataset validation | Executed |
| Monthly time-series analysis | Implemented |
| Baseline-versus-recent change detection | Implemented |
| FastAPI backend | Implemented |
| Original API endpoints | Tested |
| Global power-facility integration | Integrated |
| GPM monthly rainfall integration | Integrated |
| Facility-to-GPM mapping | Validated |
| SMAP soil-moisture snapshot | Integrated |
| Combined environmental snapshot | Generated |
| Environmental API | Implemented and locally tested |
| Unified dependency manifest | Committed |

### Latest verified satellite statistics

- Total normalized records: 1,738.
- Successful records: 1,397.
- No-valid-pixel records: 338.
- Error records: 3.
- Analysis groups: 8.
- Change-detection comparisons: 6.

### Global environmental statistics

| Component | Current verified state |
|---|---|
| Global power-facility inventory | 145,596 records |
| Country/territory coverage | 226 |
| Facility categories | 8 |
| GPM monthly periods | 45 |
| GPM archive | Jan 2022 – Sep 2025 |
| Facilities mapped to GPM | 145,596 |
| Unique GPM grid pixels | 68,247 |
| GPM grid pixel-month records | 3,071,115 |
| SMAP facilities evaluated | 145,596 |
| Valid measurements across all three SMAP fields | 142,387 |
| Missing/out-of-range across all three SMAP fields | 3,209 |
| Environmental API | Locally tested |

### Dataset boundaries

These counts refer to different datasets and must not be added together as if they were one observation inventory:

- **1,738** normalized satellite-observation records: Jamnagar AOI.
- **145,596** global power-facility records: facility inventory.
- **3,071,115** GPM grid pixel-month records: precipitation archive.
- **142,387** facilities with valid measurements across all three SMAP fields: soil-moisture snapshot coverage.

These are separate data structures with different spatial and temporal meanings.

---

# 21. Developer 1 — Responsibilities and Contributions

Developer 1 is responsible for the satellite data engineering and backend foundation of TerraTrace.

### Satellite data discovery

- Identifying relevant satellite missions.
- Discovering appropriate data collections.
- Inspecting satellite assets.
- Identifying environmental variables.
- Understanding spatial and temporal characteristics.

### Data acquisition and processing

- Implementing satellite-specific acquisition modules.
- Retrieving satellite data assets.
- Managing acquisition errors.
- Organizing raw and processed data.
- Applying geospatial processing and quality filtering.

### Data engineering

- Building common normalized structures.
- Preserving observation metadata.
- Maintaining data provenance.
- Validating measurement units and processing status.

### Environmental analysis

- Implementing monthly time-series aggregation.
- Estimating descriptive trends.
- Comparing baseline and recent periods.
- Generating structured analysis outputs.

### Global environmental integration

- Integrating the global power-facility inventory.
- Processing NASA GPM IMERG V07B monthly rainfall.
- Mapping facility coordinates to GPM grid pixels.
- Generating facility-level rainfall lookup records.
- Acquiring and processing the SMAP observation.
- Extracting facility-level soil-moisture values.
- Generating combined environmental snapshots.
- Maintaining source metadata and validation outputs.

### Backend development

- Developing FastAPI endpoints.
- Connecting the API to integrated data.
- Testing endpoint responses.
- Providing a stable data interface for the frontend.

---

# 22. Development Roadmap — Three Phases

The Global Data Engine follows exactly three development phases. Phase 3 is the final phase of this module.

## Phase 1 — Global Facility and Rainfall Foundation

Objectives:

- Establish the global power-facility inventory.
- Acquire and process GPM precipitation data.
- Map facilities to GPM grid pixels.
- Generate facility-level rainfall lookup data.
- Validate global coverage and data integrity.
- Generate documentation and metadata.

**Status: Completed.**

## Phase 2 — Soil Moisture and Environmental Integration

Objectives:

- Acquire the required SMAP observation.
- Extract soil-moisture measurements for facilities.
- Integrate rainfall and soil-moisture information.
- Generate combined environmental snapshots.
- Record source metadata and validation results.

**Status: Completed.**

## Phase 3 — API Integration and Application Readiness

Objectives:

- Expose integrated environmental data through FastAPI.
- Implement global environmental statistics.
- Implement facility-level environmental retrieval.
- Connect rainfall and soil-moisture data to facility identifiers.
- Validate API responses and data access.
- Provide a stable interface for downstream application development.

**Status: Core implementation completed and pushed to the repository.**

Phase 3 is the final development phase for the Global Data Engine.

The subsequent work belongs to application integration, analysis, visualization and presentation using the existing data foundation.

---

# 23. Data Sufficiency, Architecture Stability and Development Scope

## 23.1 Established data foundation

The current data engine already provides the principal data structures required by the next stage of TerraTrace development:

**Geographical reference**

- Global power-facility inventory.
- Facility identifiers.
- Geographical coordinates.
- Country and category information.
- Facility-to-GPM grid mapping.

**Environmental observations**

- Monthly GPM precipitation history.
- Surface soil moisture.
- Root-zone soil moisture.
- Profile soil moisture.
- Existing Jamnagar satellite observations.
- Normalized environmental indicators.

**Integration and accessibility**

- Facility-level rainfall lookup.
- Facility-level soil-moisture records.
- Combined environmental snapshots.
- Data dictionary.
- Source metadata.
- Integration validation.
- FastAPI endpoints.

Together, these components provide the working data foundation for the current project requirements.

## 23.2 Data contract

The files committed under `data/integration/phase1/` and `data/integration/phase2/`, together with the associated metadata, scripts and API modules, constitute the established global environmental data contract.

Downstream modules should consume these existing structures.

The data contract preserves:

- Facility identifiers.
- Geographical coordinates.
- GPM grid associations.
- Observation timestamps.
- Environmental variables.
- Measurement units.
- Missing-value representation.
- Source information.
- Spatial and temporal resolution.

Existing file structures and API response formats should remain consistent so that frontend and analytical modules can be developed without repeatedly changing their input dependencies.

## 23.3 Data acquisition versus application development

The acquisition and integration stages have established the required datasets.

The remaining development effort is therefore centered on making the available data useful through:

- API reliability.
- Data transformation.
- Query handling.
- Environmental comparisons.
- Visualization.
- Geographical exploration.
- Facility-level reporting.
- Preliminary environmental screening.

The existence of additional publicly available satellite products does not, by itself, create a requirement to acquire them.

The project is evaluated against its defined functional objectives, not the number of datasets collected.

## 23.4 Additional data is not a default development dependency

The established dataset inventory is the working source of truth for continued development.

The normal implementation workflow uses the existing files and API contracts.

New acquisition work is not part of the default task sequence. The presence of an unintegrated satellite mission, an optional variable or a possible future dataset does not make the current foundation incomplete.

This keeps the project focused on its intended deliverable and prevents unnecessary changes to an already integrated data architecture.

## 23.5 Technical justification for the current scope

The current data foundation covers three important requirements:

1. **Location:** A global set of mapped power facilities provides the geographical reference.
2. **Environmental context:** GPM and SMAP provide precipitation and soil-moisture information.
3. **Application access:** Structured integration files and FastAPI endpoints make the data available to downstream components.

The Jamnagar satellite pipeline separately provides multi-source observations for localized environmental analysis.

These datasets are complementary. They do not need to be forced into one universal table or made to share identical temporal resolutions.

The architecture is deliberately designed to preserve their distinctions.

## 23.6 Acceptance criteria for continued development

A downstream implementation is considered aligned with this data-engineering foundation when it:

- Uses the existing facility identifiers.
- Uses the committed environmental integration files.
- Uses the existing API endpoints where appropriate.
- Preserves measurement units and timestamps.
- Handles missing values correctly.
- Does not misrepresent spatial or temporal resolution.
- Does not duplicate existing acquisition or integration logic.
- Produces results that can be traced to the available source data.
- Maintains compatibility with the existing data structures.

These criteria define the expected integration boundary.

---

# 24. Development Continuity and Technical Operating Principles

The following operating principles maintain consistency across the TerraTrace development workflow.

### 24.1 Existing data is the default input

The integrated datasets are the primary input for continued implementation.

Application features, analysis functions, API improvements and visualization components should be built around the available records.

### 24.2 Existing acquisition is not repeated unnecessarily

The acquisition scripts document how the integrated datasets were produced.

They remain available for provenance and reproducibility. Their existence does not mean that every application-development task must rerun acquisition.

### 24.3 No duplicate data pipelines

Existing GPM, SMAP, facility mapping and environmental integration functionality should be reused.

A second pipeline performing the same operation introduces unnecessary complexity and risks inconsistent results.

### 24.4 No unsupported data expansion

The current project scope does not require indiscriminate addition of satellite missions, optional variables or external datasets.

Development should remain within the existing data contract.

### 24.5 Existing limitations are handled in software

Where the current data has limitations, the application should represent them accurately.

Examples:

- A single SMAP observation is displayed as a snapshot.
- GPM rainfall is identified as a gridded estimate.
- Missing soil-moisture values remain missing.
- Coarse spatial resolution is disclosed.
- Descriptive environmental differences are not labelled as causal proof.
- Preliminary site screening is not presented as regulatory certification.

These are application and interpretation requirements, not reasons to restart the data-acquisition process.

### 24.6 Functional completeness takes priority

The next development effort should focus on completing the actual user-facing functionality.

This includes:

- Working API integrations.
- Correct facility selection.
- Environmental data retrieval.
- Historical rainfall visualization.
- Soil-moisture presentation.
- Environmental comparison.
- Geographical maps.
- Clear data-quality indicators.
- Preliminary site-screening results.
- Consistent frontend-backend communication.

### 24.7 Continuity of project decisions

The three-phase structure is the agreed development organization for this module.

Phase 3 is final. Subsequent tasks should be treated as implementation and integration work within the established architecture, not as additional data-acquisition phases.

---

# 25. Scientific Interpretation and Site-Screening Limitations

TerraTrace provides environmental information to support geographical investigation and preliminary screening.

The current data foundation must be interpreted within its actual capabilities.

### Correlation and causation

A change in environmental measurements around a facility does not automatically prove that the facility caused the change.

### Facility coverage

The global facility inventory represents power-generation facilities. It is not a complete inventory of data centres, factories or every industrial category.

### Rainfall

GPM provides gridded precipitation estimates. It does not directly measure facility water consumption, water availability or parcel-level rainfall.

### Soil moisture

SMAP provides a soil-moisture observation snapshot in the current integration. It does not establish a historical trend.

### Environmental safety

A preliminary site-screening result is not a legal approval or guarantee of environmental safety.

A complete regulatory assessment requires authoritative local information and appropriate professional review.

### Recommendation interpretation

The web application can present relative environmental indicators and identify areas that appear more or less suitable under the implemented screening criteria.

Such outputs should be described as preliminary recommendations based on the available data, not definitive construction approvals.

---

# 26. Data Sources and Documentation

The following official resources describe the satellite missions and products used in TerraTrace.

### NASA and USGS

- NASA Earthdata: https://www.earthdata.nasa.gov/
- NASA MODIS: https://modis.gsfc.nasa.gov/
- MODIS Land Surface Temperature products: https://lpdaac.usgs.gov/
- NASA GPM: https://gpm.nasa.gov/
- NASA SMAP: https://smap.jpl.nasa.gov/
- USGS Landsat: https://www.usgs.gov/landsat-missions

### Copernicus

- Copernicus Data Space Ecosystem: https://dataspace.copernicus.eu/
- Sentinel-1 Mission: https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-1
- Sentinel-2 Mission: https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2
- Sentinel-5P Mission: https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-5p

### Technical documentation

- FastAPI: https://fastapi.tiangolo.com/
- Rasterio: https://rasterio.readthedocs.io/
- NumPy: https://numpy.org/doc/
- Pandas: https://pandas.pydata.org/docs/
- PyProj: https://pyproj4.github.io/pyproj/
- Shapely: https://shapely.readthedocs.io/

The integrated files and their metadata remain the reference for the exact data values, observation timestamps and processing parameters used by the current implementation.

---

# 27. Conclusion

TerraTrace establishes a modular satellite-data engineering pipeline that transforms heterogeneous Earth observation datasets into structured environmental information.

The implementation covers five satellite observation sources:

1. MODIS Terra.
2. Landsat 8/9.
3. Sentinel-1.
4. Sentinel-2.
5. Sentinel-5P.

The Jamnagar satellite pipeline contains 1,738 normalized records, eight time-series analysis groups and six descriptive change-detection comparisons.

Beyond the localized satellite pipeline, the data engine integrates a global power-facility inventory containing 145,596 facilities across 226 countries and territories.

The global environmental integration includes:

- 45 months of NASA GPM IMERG V07B monthly rainfall from January 2022 through September 2025.
- 68,247 unique GPM grid pixels.
- 3,071,115 grid pixel-month records.
- Complete facility-to-GPM mapping for 145,596 facilities.
- NASA SMAP surface, root-zone and profile soil-moisture observations.
- 142,387 facilities with valid measurements across all three SMAP fields.
- Combined environmental snapshot records.
- Source metadata and integration validation.

The FastAPI backend exposes the existing satellite-analysis functionality and global environmental data through dedicated endpoints.

The data engine therefore provides the geographical reference, environmental observations, integration structures and API foundation required for the next stage of TerraTrace.

The focus of continued development is to convert these existing resources into useful environmental intelligence through reliable API integration, analysis, geographical visualization, facility-level comparison and preliminary industrial site screening.

The architecture, integrated datasets and three-phase development structure form the established foundation of this module.

**TerraTrace — Turning satellite observations into environmental intelligence.**

---

**Project:** TerraTrace  
**Challenge:** NASA Space Apps Challenge  
**Contribution:** Developer 1 — Satellite and Global Data Engineering, Geospatial Processing, Environmental Integration, GPM Rainfall, SMAP Soil Moisture, Environmental Analysis and FastAPI Backend

**Repository:** https://github.com/sujan-angadi/NASA_Space_Apps/tree/main/Developer%201

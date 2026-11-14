# TerraTrace — Global Environmental Data Engine

**Module:** Developer 1 — Data Acquisition, Processing & API  
**Project:** NASA Space Apps Challenge  
**Status:** Core prototype implemented

---

# 1. Overview

The TerraTrace Data Engine is the central environmental-data layer of the project.

It collects, processes, normalizes, and exposes satellite-derived environmental observations and global power-facility information through a REST API.

The other developers should consume the data through this module rather than independently implementing duplicate acquisition pipelines.

## Main responsibilities

1. Maintain satellite dataset inventory and acquisition metadata.
2. Provide historical environmental observations.
3. Provide rainfall and land-surface temperature data where available.
4. Expose facility information and environmental observations through APIs.
5. Document data availability, quality, temporal coverage, and update frequency.

---

# 2. Project Architecture

```text
                 DATA SOURCES
                      |
       +--------------+--------------+
       |              |              |
   Sentinel       Landsat          MODIS
       |              |              |
   Sentinel-1     Sentinel-5P       GPM
       |              |              |
       +--------------+--------------+
                      |
               DATA ACQUISITION
                      |
             DATA PROCESSING
                      |
              NORMALIZATION
                      |
           DATASET INVENTORY
                      |
             PROCESSED DATA
                      |
                FASTAPI
                      |
          +-----------+-----------+
          |           |           |
      Developer 2  Developer 3  Developer 4
      Analysis     Site Engine   Frontend
3. Available Datasets
Dataset	Variables	Units	Current coverage
Sentinel-2	NDVI, NDWI	Unitless	Jan 2022 – Dec 2025
Landsat 8/9	Land-surface temperature, NDVI	°C, unitless	Jan 2022 – Dec 2025
MODIS Terra	Daytime and nighttime land-surface temperature	°C	Jan 2022 – Dec 2025
Sentinel-1	VH and VV backscatter source values	Source asset DN	Dec 2025
Sentinel-5P	SO₂ total vertical column	mol/m²	One observation, Dec 2025
NASA GPM IMERG V07B	Monthly precipitation	mm/hr and estimated mm/month	Jan 2022 – Sep 2025
Verified Observation Availability
The following figures represent the observations currently present in the processed dataset inventory.

Dataset	Total records	Successful	No valid pixels	Errors
Sentinel-2	732	572	160	0
Landsat 8/9	671	526	142	3
MODIS Terra	324	288	36	0
Sentinel-1	10	10	0	0
Sentinel-5P	1	1	0	0
GPM currently contains 3,071,115 monthly facility-grid records across 45 months, from January 2022 to September 2025.

These are project-specific extracted record counts, not the total observations available from the satellite missions.

Important interpretation rules

Land-surface temperature is not air temperature.

NDVI represents vegetation greenness; it does not directly measure biodiversity.

NDWI is a water-related spectral indicator, not groundwater availability.

Sentinel-5P SO₂ is vertical column density, not ground-level concentration.

Sentinel-1 values currently use source asset DN and must not be presented as calibrated dB.

GPM rainfall is a gridded satellite estimate, not a facility rain-gauge measurement.

See docs_DATA_AVAILABILITY_AND_UPDATE_FREQUENCY.md for the verified inventory, actual observation counts, observed intervals, and limitations.

4. Global Facility Database
The project includes a global power-facility reference dataset.

Attribute	Value
Facilities	145,596
Countries/territories	226
Facility types	8
Unique GPM grid pixels	68,247
GPM monthly observations	3,071,115
Facility categories include:

Utility-scale solar

Wind

Hydropower

Oil and gas

Coal

Bioenergy

Nuclear

Geothermal

Coverage limitation: This is a power-facility database. It is not a complete global database of data centres, manufacturing facilities, or every industrial installation.

Main file:

data/input/global_facilities.csv

5. GPM Rainfall Integration
NASA GPM IMERG V07B monthly precipitation is integrated into the data engine.

Data characteristics
Spatial resolution: approximately 0.1° (roughly 10 km at the equator).

Temporal resolution: monthly.

Historical period: January 2022 – September 2025.

Monthly periods: 45.

Unique grid pixels: 68,247.

Facility records: 145,596.

Processing workflow
text
NASA GPM IMERG V07B
        |
        v
Monthly HDF5 Granules
        |
        v
Read Precipitation Grid
        |
        v
Map Facility Coordinates
to Nearest GPM Pixel
        |
        v
Extract Monthly Values
        |
        v
Calculate Estimated
Monthly Accumulation
        |
        v
Save Processed CSV
        |
        v
Expose Through FastAPI
Important files
File	Purpose
acquisition/gpm/gpm_acquisition.py	GPM data acquisition
acquisition/gpm/extract_global_rainfall.py	Extract rainfall for mapped facility pixels
acquisition/gpm/merge_gpm_into_normalized.py	Merge GPM observations into normalized data
data/processed/global_facility_grid_mapping.csv	Facility-to-grid mapping
data/processed/global_gpm_monthly_rainfall.csv.gz	Processed rainfall dataset
Monthly accumulation is derived from monthly mean precipitation rate multiplied by 24 and the number of days in the month.

The GPM pixel is a regional estimate. It must not be described as an exact measurement of rainfall at an individual facility.

GPM API Integration
Developers can retrieve facility-specific monthly rainfall through:

GET /facilities/{facility_id}/rainfall

The endpoint returns facility information, its mapped GPM pixel, monthly precipitation rate, estimated monthly accumulation, quality information, and source metadata.

Use the actual facility ID obtained from /facilities.

Data limitation: The current archive ends in September 2025. It is not a live rainfall feed.

6. Running the Data Engine
Run commands from the global_data_engine directory.

Environment setup
bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-gpm-additions.txt
Start the API
bash
uvicorn api.main:app --reload
API base URL:

http://127.0.0.1:8000

Interactive API documentation:

http://127.0.0.1:8000/docs

Health check
bash
curl http://127.0.0.1:8000/health
Expected response:

json
{
  "status": "running",
  "service": "TerraTrace",
  "version": "0.2.0"
}
7. Available API Endpoints
Endpoint	Purpose
GET /health	Check API availability
GET /observations	Retrieve normalized environmental observations
GET /timeseries	Retrieve historical time-series data
GET /report	Retrieve environmental report
GET /change-detection	Retrieve change-detection results
GET /global-stats	Retrieve global facility and rainfall statistics
GET /facilities	Search and filter facilities
GET /facilities/{facility_id}	Retrieve facility details
GET /facilities/{facility_id}/rainfall	Retrieve facility-specific rainfall history
API Integration Notes
/global-stats provides the overall facility and rainfall dataset statistics.

/facilities supports facility discovery and filtering.

/facilities/{facility_id} provides individual facility details.

/facilities/{facility_id}/rainfall provides historical monthly rainfall.

Developers should inspect http://127.0.0.1:8000/docs for the exact request parameters and response schemas before implementing their modules.

The Data Engine is the shared source of environmental data. Other developers should consume its API instead of creating duplicate acquisition pipelines.

Use /docs to inspect the exact query parameters, response schemas, and validation requirements.

Example API requests
Global statistics:

bash
curl http://127.0.0.1:8000/global-stats
Retrieve facilities:

bash
curl "http://127.0.0.1:8000/facilities?limit=10"
Retrieve a specific facility:

bash
curl http://127.0.0.1:8000/facilities/L100000808559
Retrieve its rainfall history:

bash
curl http://127.0.0.1:8000/facilities/L100000808559/rainfall
The facility ID above is an example. Obtain actual IDs from /facilities.

8. Implementation Instructions for Other Developers
Developer 2 — Environmental Analysis Engine
Objective: Identify environmental changes around existing facilities using historical satellite observations.

Inputs
Use the Data Engine API to obtain:

NDVI from Sentinel-2 and Landsat.

NDWI from Sentinel-2.

Land-surface temperature from Landsat and MODIS.

Monthly rainfall from GPM.

Facility coordinates and attributes.

Implementation workflow
Retrieve a facility and its coordinates.

Retrieve historical observations for the selected facility or area.

Retrieve rainfall history using the facility rainfall endpoint.

Group observations by date or month, accounting for different dataset frequencies.

Calculate temporal trends for vegetation, water-related indicators, and land-surface temperature.

Compare the industrial area with a suitable reference area.

Identify periods of notable environmental change.

Generate a structured environmental assessment.

Suggested output
json
{
  "facility_id": "L100000808559",
  "analysis_period": "2022-2025",
  "indicators": {
    "vegetation": {
      "dataset": "Sentinel-2",
      "indicator": "NDVI",
      "trend": "calculated trend"
    },
    "water": {
      "dataset": "Sentinel-2",
      "indicator": "NDWI",
      "trend": "calculated trend"
    },
    "temperature": {
      "dataset": "Landsat/MODIS",
      "indicator": "Land Surface Temperature",
      "trend": "calculated trend"
    },
    "rainfall": {
      "dataset": "GPM IMERG",
      "trend": "calculated trend"
    }
  },
  "environmental_assessment": "Analysis summary",
  "data_limitations": []
}
The values above are schema examples, not actual analysis results.

Important
Do not interpret missing observations as zero.

Account for cloud cover and data-quality flags.

Compare equivalent seasonal periods where possible.

Rainfall and temperature should be considered when interpreting vegetation changes.

Do not claim industrial causation based on satellite correlation alone.

Developer 3 — Environmental Site Recommendation Engine
Objective: Identify preliminary candidate locations for future industrial development using environmental constraints.

Inputs
Use:

Global facility database for existing facility context.

Satellite vegetation indicators.

Land-surface temperature.

Rainfall history.

Additional land-cover, flood-risk, protected-area, water-resource and hazard datasets where available.

Implementation workflow
Define the geographical search region.

Generate candidate locations within that region.

Exclude locations that violate available environmental constraints.

Evaluate vegetation and land-cover conditions.

Evaluate rainfall and flood exposure using appropriate supporting datasets.

Evaluate proximity to protected or ecologically sensitive areas.

Assign suitability scores based on documented criteria.

Return ranked candidate locations with explanations and limitations.

Suggested output
json
{
  "candidate_id": "SITE_001",
  "coordinates": {
    "latitude": 0.0,
    "longitude": 0.0
  },
  "suitability_score": 0,
  "constraints": [],
  "supporting_evidence": [],
  "limitations": [],
  "recommendation": "Preliminary screening only"
}
Important
The existing power-facility database is not a complete industrial-site database.

Do not claim a location is safe or approved based only on satellite data. Site recommendations must account for environmental regulation, land ownership, engineering feasibility, water availability, grid access and ground verification.

Developer 4 — Frontend and Visualization
Objective: Build the TerraTrace web application using the data and analysis APIs.

Main interface modules
Global facility map.

Facility search and filtering.

Environmental indicator dashboard.

Historical trend visualization.

Facility-specific rainfall chart.

Environmental impact report.

Candidate-site recommendation map.

Implementation workflow
Connect the frontend to the FastAPI backend.

Retrieve global statistics.

Load facility locations from /facilities.

Display facilities on an interactive map.

On facility selection, retrieve facility details.

Retrieve rainfall history for the selected facility.

Retrieve environmental observations and analysis results.

Display historical charts with units and date ranges.

Display candidate sites and their suitability explanations.

Handle missing data and API errors clearly.

Visualization requirements
NDVI and NDWI: historical line charts.

Land-surface temperature: time-series charts with °C units.

Rainfall: monthly bar or line chart with clearly identified units.

Facilities: interactive map markers.

Site recommendations: ranked map markers with suitability explanations.

The frontend must distinguish unavailable data from zero values and show the source and date range for each indicator.

9. Dataset Update Frequency and Availability
The current project contains historical archives, not a fully automated live-data service.

Dataset	Observed median interval in current data	Latest observation
Sentinel-2	5 days	2025-12-30
Landsat 8/9	8 days	2025-12-28
MODIS Terra	8 days	2025-12-27
Sentinel-1	6 days	2025-12-31
Sentinel-5P	Not measurable	2025-12-31
GPM IMERG	Monthly	2025-09
Mission Revisit vs Product Availability vs Application Refresh
Three different frequencies must be distinguished:

Satellite revisit: How often a satellite or constellation can observe an area.

Product availability: How long the processing and publication of an observation takes.

TerraTrace refresh frequency: How often our application downloads, processes, and updates its datasets.

The observed median intervals in this README describe the current extracted observations. They do not guarantee future data availability.

NASA GPM IMERG Final Run has an approximate publication latency of 3.5 months.

Current implementation status: Data acquisition and processing are implemented, but automated recurring refresh is not configured. New observations must currently be acquired and processed manually.

These are observed intervals in the current project inventory, not guarantees of future refresh.

No automated recurring refresh schedule is currently configured.

For detailed availability, processing latency, and limitations, see:

docs_DATA_AVAILABILITY_AND_UPDATE_FREQUENCY.md

10. Data Quality and Shared Development Rules
All developers must follow these rules:

Preserve original source metadata.

Preserve observation timestamps and units.

Treat missing data separately from zero.

Do not silently discard failed observations.

Keep dataset-specific quality limitations visible.

Do not infer causation from correlation.

Do not describe land-surface temperature as air temperature.

Do not describe GPM grid estimates as facility-level measurements.

Do not independently duplicate the Data Engine's acquisition pipeline.

Keep API response structures consistent and documented.

11. Repository Structure
text
global_data_engine/
│
├── acquisition/
│   └── gpm/
│       ├── gpm_acquisition.py
│       ├── extract_global_rainfall.py
│       └── merge_gpm_into_normalized.py
│
├── api/
│   └── main.py
│
├── data/
│   ├── input/
│   │   └── global_facilities.csv
│   │
│   ├── integration/
│   │   └── validated/
│   │
│   └── processed/
│       ├── global_facility_grid_mapping.csv
│       ├── global_gpm_monthly_rainfall.csv.gz
│       ├── sentinel2_environmental_indicators.json
│       ├── landsat_environmental_indicators.json
│       ├── modis_lst_day_night.json
│       ├── sentinel1_test.json
│       └── sentinel5p_so2.json
│
├── metadata/
│   ├── dataset_inventory.json
│   └── dataset_inventory.py
│
├── docs_DATASET_INVENTORY_AND_GPM.md
├── docs_DATA_AVAILABILITY_AND_UPDATE_FREQUENCY.md
├── requirements-gpm-additions.txt
└── README.md
Some files shown above are generated or may vary by checkout. Consult the repository for the exact current contents.

12. Definition of Done
The Data Engine prototype provides:

☑ Multiple satellite datasets and acquisition metadata.
☑ Historical observation inventory.
☑ Latest observation dates for existing datasets.
☑ Rainfall integration using NASA GPM IMERG.
☑ Land-surface temperature data using Landsat and MODIS.
☑ Global power-facility reference database.
☑ Facility-to-GPM-pixel mapping.
☑ FastAPI data access endpoints.
☑ Dataset availability and update-frequency documentation.
☑ Global facility-to-GPM pixel mapping and rainfall API integration.
☑ Verified dataset record counts and observation date ranges.
□ Automated recurring satellite data acquisition and refresh.
Final integration principle: Developer 1 provides the shared data foundation. Developer 2 analyzes environmental changes, Developer 3 performs preliminary site screening, and Developer 4 presents the results through the TerraTrace web application.

text

### Summary of additions

| File 2 section | Where inserted in README |
|---|---|
| **1. Verified Observation Availability** | Section 3, immediately after the dataset table |
| **2. GPM API Integration** | Section 5, after the "monthly accumulation" / "regional estimate" paragraphs |
| **3. API Integration Notes** | Section 7, immediately after the endpoint table |
| **4. Mission Revisit vs Product Availability vs Application Refresh** | Section 9, immediately after the update-frequency table |
| **5. Repository Structure additions** | Section 11, tree updated with `gpm/` files, `metadata/` files, and the two docs |
| **6. Definition of Done additions** | Section 12, two new checked items before the unchecked automation item |

All original content (overview, architecture, developer 2/3/4 instructions, data quality rules, etc.) is preserved verbatim — only the specified insertions and the repository tree expansion were made.

### Save and push

```bash
cd ~/Desktop/My_Directory/NASA/NASA_Space_Apps

git add "Developer 1/terratrace-data-engine/find_sat/global_data_engine/README.md"

git commit -m "Update data engine README with integration details"

git push origin main
give complete in README.md text copy paste block format so tht I can do it easily copy paste in github
markdown
# TerraTrace — Global Environmental Data Engine

**Module:** Developer 1 — Data Acquisition, Processing & API  
**Project:** NASA Space Apps Challenge  
**Status:** Core prototype implemented

---

# 1. Overview

The TerraTrace Data Engine is the central environmental-data layer of the project.

It collects, processes, normalizes, and exposes satellite-derived environmental observations and global power-facility information through a REST API.

The other developers should consume the data through this module rather than independently implementing duplicate acquisition pipelines.

## Main responsibilities

1. Maintain satellite dataset inventory and acquisition metadata.
2. Provide historical environmental observations.
3. Provide rainfall and land-surface temperature data where available.
4. Expose facility information and environmental observations through APIs.
5. Document data availability, quality, temporal coverage, and update frequency.

---

# 2. Project Architecture

```text
                 DATA SOURCES
                      |
       +--------------+--------------+
       |              |              |
   Sentinel       Landsat          MODIS
       |              |              |
   Sentinel-1     Sentinel-5P       GPM
       |              |              |
       +--------------+--------------+
                      |
               DATA ACQUISITION
                      |
             DATA PROCESSING
                      |
              NORMALIZATION
                      |
           DATASET INVENTORY
                      |
             PROCESSED DATA
                      |
                FASTAPI
                      |
          +-----------+-----------+
          |           |           |
      Developer 2  Developer 3  Developer 4
      Analysis     Site Engine   Frontend
3. Available Datasets
Dataset	Variables	Units	Current coverage
Sentinel-2	NDVI, NDWI	Unitless	Jan 2022 – Dec 2025
Landsat 8/9	Land-surface temperature, NDVI	°C, unitless	Jan 2022 – Dec 2025
MODIS Terra	Daytime and nighttime land-surface temperature	°C	Jan 2022 – Dec 2025
Sentinel-1	VH and VV backscatter source values	Source asset DN	Dec 2025
Sentinel-5P	SO₂ total vertical column	mol/m²	One observation, Dec 2025
NASA GPM IMERG V07B	Monthly precipitation	mm/hr and estimated mm/month	Jan 2022 – Sep 2025
Verified Observation Availability
The following figures represent the observations currently present in the processed dataset inventory.

Dataset	Total records	Successful	No valid pixels	Errors
Sentinel-2	732	572	160	0
Landsat 8/9	671	526	142	3
MODIS Terra	324	288	36	0
Sentinel-1	10	10	0	0
Sentinel-5P	1	1	0	0
GPM currently contains 3,071,115 monthly facility-grid records across 45 months, from January 2022 to September 2025.

These are project-specific extracted record counts, not the total observations available from the satellite missions.

Important interpretation rules

Land-surface temperature is not air temperature.

NDVI represents vegetation greenness; it does not directly measure biodiversity.

NDWI is a water-related spectral indicator, not groundwater availability.

Sentinel-5P SO₂ is vertical column density, not ground-level concentration.

Sentinel-1 values currently use source asset DN and must not be presented as calibrated dB.

GPM rainfall is a gridded satellite estimate, not a facility rain-gauge measurement.

See docs_DATA_AVAILABILITY_AND_UPDATE_FREQUENCY.md for the verified inventory, actual observation counts, observed intervals, and limitations.

4. Global Facility Database
The project includes a global power-facility reference dataset.

Attribute	Value
Facilities	145,596
Countries/territories	226
Facility types	8
Unique GPM grid pixels	68,247
GPM monthly observations	3,071,115
Facility categories include:

Utility-scale solar

Wind

Hydropower

Oil and gas

Coal

Bioenergy

Nuclear

Geothermal

Coverage limitation: This is a power-facility database. It is not a complete global database of data centres, manufacturing facilities, or every industrial installation.

Main file:

data/input/global_facilities.csv

5. GPM Rainfall Integration
NASA GPM IMERG V07B monthly precipitation is integrated into the data engine.

Data characteristics
Spatial resolution: approximately 0.1° (roughly 10 km at the equator).

Temporal resolution: monthly.

Historical period: January 2022 – September 2025.

Monthly periods: 45.

Unique grid pixels: 68,247.

Facility records: 145,596.

Processing workflow
text
NASA GPM IMERG V07B
        |
        v
Monthly HDF5 Granules
        |
        v
Read Precipitation Grid
        |
        v
Map Facility Coordinates
to Nearest GPM Pixel
        |
        v
Extract Monthly Values
        |
        v
Calculate Estimated
Monthly Accumulation
        |
        v
Save Processed CSV
        |
        v
Expose Through FastAPI
Important files
File	Purpose
acquisition/gpm/gpm_acquisition.py	GPM data acquisition
acquisition/gpm/extract_global_rainfall.py	Extract rainfall for mapped facility pixels
acquisition/gpm/merge_gpm_into_normalized.py	Merge GPM observations into normalized data
data/processed/global_facility_grid_mapping.csv	Facility-to-grid mapping
data/processed/global_gpm_monthly_rainfall.csv.gz	Processed rainfall dataset
Monthly accumulation is derived from monthly mean precipitation rate multiplied by 24 and the number of days in the month.

The GPM pixel is a regional estimate. It must not be described as an exact measurement of rainfall at an individual facility.

GPM API Integration
Developers can retrieve facility-specific monthly rainfall through:

GET /facilities/{facility_id}/rainfall

The endpoint returns facility information, its mapped GPM pixel, monthly precipitation rate, estimated monthly accumulation, quality information, and source metadata.

Use the actual facility ID obtained from /facilities.

Data limitation: The current archive ends in September 2025. It is not a live rainfall feed.

6. Running the Data Engine
Run commands from the global_data_engine directory.

Environment setup
bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-gpm-additions.txt
Start the API
bash
uvicorn api.main:app --reload
API base URL:

http://127.0.0.1:8000

Interactive API documentation:

http://127.0.0.1:8000/docs

Health check
bash
curl http://127.0.0.1:8000/health
Expected response:

json
{
  "status": "running",
  "service": "TerraTrace",
  "version": "0.2.0"
}
7. Available API Endpoints
Endpoint	Purpose
GET /health	Check API availability
GET /observations	Retrieve normalized environmental observations
GET /timeseries	Retrieve historical time-series data
GET /report	Retrieve environmental report
GET /change-detection	Retrieve change-detection results
GET /global-stats	Retrieve global facility and rainfall statistics
GET /facilities	Search and filter facilities
GET /facilities/{facility_id}	Retrieve facility details
GET /facilities/{facility_id}/rainfall	Retrieve facility-specific rainfall history
API Integration Notes
/global-stats provides the overall facility and rainfall dataset statistics.

/facilities supports facility discovery and filtering.

/facilities/{facility_id} provides individual facility details.

/facilities/{facility_id}/rainfall provides historical monthly rainfall.

Developers should inspect http://127.0.0.1:8000/docs for the exact request parameters and response schemas before implementing their modules.

The Data Engine is the shared source of environmental data. Other developers should consume its API instead of creating duplicate acquisition pipelines.

Use /docs to inspect the exact query parameters, response schemas, and validation requirements.

Example API requests
Global statistics:

bash
curl http://127.0.0.1:8000/global-stats
Retrieve facilities:

bash
curl "http://127.0.0.1:8000/facilities?limit=10"
Retrieve a specific facility:

bash
curl http://127.0.0.1:8000/facilities/L100000808559
Retrieve its rainfall history:

bash
curl http://127.0.0.1:8000/facilities/L100000808559/rainfall
The facility ID above is an example. Obtain actual IDs from /facilities.

8. Implementation Instructions for Other Developers
Developer 2 — Environmental Analysis Engine
Objective: Identify environmental changes around existing facilities using historical satellite observations.

Inputs
Use the Data Engine API to obtain:

NDVI from Sentinel-2 and Landsat.

NDWI from Sentinel-2.

Land-surface temperature from Landsat and MODIS.

Monthly rainfall from GPM.

Facility coordinates and attributes.

Implementation workflow
Retrieve a facility and its coordinates.

Retrieve historical observations for the selected facility or area.

Retrieve rainfall history using the facility rainfall endpoint.

Group observations by date or month, accounting for different dataset frequencies.

Calculate temporal trends for vegetation, water-related indicators, and land-surface temperature.

Compare the industrial area with a suitable reference area.

Identify periods of notable environmental change.

Generate a structured environmental assessment.

Suggested output
json
{
  "facility_id": "L100000808559",
  "analysis_period": "2022-2025",
  "indicators": {
    "vegetation": {
      "dataset": "Sentinel-2",
      "indicator": "NDVI",
      "trend": "calculated trend"
    },
    "water": {
      "dataset": "Sentinel-2",
      "indicator": "NDWI",
      "trend": "calculated trend"
    },
    "temperature": {
      "dataset": "Landsat/MODIS",
      "indicator": "Land Surface Temperature",
      "trend": "calculated trend"
    },
    "rainfall": {
      "dataset": "GPM IMERG",
      "trend": "calculated trend"
    }
  },
  "environmental_assessment": "Analysis summary",
  "data_limitations": []
}
The values above are schema examples, not actual analysis results.

Important
Do not interpret missing observations as zero.

Account for cloud cover and data-quality flags.

Compare equivalent seasonal periods where possible.

Rainfall and temperature should be considered when interpreting vegetation changes.

Do not claim industrial causation based on satellite correlation alone.

Developer 3 — Environmental Site Recommendation Engine
Objective: Identify preliminary candidate locations for future industrial development using environmental constraints.

Inputs
Use:

Global facility database for existing facility context.

Satellite vegetation indicators.

Land-surface temperature.

Rainfall history.

Additional land-cover, flood-risk, protected-area, water-resource and hazard datasets where available.

Implementation workflow
Define the geographical search region.

Generate candidate locations within that region.

Exclude locations that violate available environmental constraints.

Evaluate vegetation and land-cover conditions.

Evaluate rainfall and flood exposure using appropriate supporting datasets.

Evaluate proximity to protected or ecologically sensitive areas.

Assign suitability scores based on documented criteria.

Return ranked candidate locations with explanations and limitations.

Suggested output
json
{
  "candidate_id": "SITE_001",
  "coordinates": {
    "latitude": 0.0,
    "longitude": 0.0
  },
  "suitability_score": 0,
  "constraints": [],
  "supporting_evidence": [],
  "limitations": [],
  "recommendation": "Preliminary screening only"
}
Important
The existing power-facility database is not a complete industrial-site database.

Do not claim a location is safe or approved based only on satellite data. Site recommendations must account for environmental regulation, land ownership, engineering feasibility, water availability, grid access and ground verification.

Developer 4 — Frontend and Visualization
Objective: Build the TerraTrace web application using the data and analysis APIs.

Main interface modules
Global facility map.

Facility search and filtering.

Environmental indicator dashboard.

Historical trend visualization.

Facility-specific rainfall chart.

Environmental impact report.

Candidate-site recommendation map.

Implementation workflow
Connect the frontend to the FastAPI backend.

Retrieve global statistics.

Load facility locations from /facilities.

Display facilities on an interactive map.

On facility selection, retrieve facility details.

Retrieve rainfall history for the selected facility.

Retrieve environmental observations and analysis results.

Display historical charts with units and date ranges.

Display candidate sites and their suitability explanations.

Handle missing data and API errors clearly.

Visualization requirements
NDVI and NDWI: historical line charts.

Land-surface temperature: time-series charts with °C units.

Rainfall: monthly bar or line chart with clearly identified units.

Facilities: interactive map markers.

Site recommendations: ranked map markers with suitability explanations.

The frontend must distinguish unavailable data from zero values and show the source and date range for each indicator.

9. Dataset Update Frequency and Availability
The current project contains historical archives, not a fully automated live-data service.

Dataset	Observed median interval in current data	Latest observation
Sentinel-2	5 days	2025-12-30
Landsat 8/9	8 days	2025-12-28
MODIS Terra	8 days	2025-12-27
Sentinel-1	6 days	2025-12-31
Sentinel-5P	Not measurable	2025-12-31
GPM IMERG	Monthly	2025-09
Mission Revisit vs Product Availability vs Application Refresh
Three different frequencies must be distinguished:

Satellite revisit: How often a satellite or constellation can observe an area.

Product availability: How long the processing and publication of an observation takes.

TerraTrace refresh frequency: How often our application downloads, processes, and updates its datasets.

The observed median intervals in this README describe the current extracted observations. They do not guarantee future data availability.

NASA GPM IMERG Final Run has an approximate publication latency of 3.5 months.

Current implementation status: Data acquisition and processing are implemented, but automated recurring refresh is not configured. New observations must currently be acquired and processed manually.

These are observed intervals in the current project inventory, not guarantees of future refresh.

No automated recurring refresh schedule is currently configured.

For detailed availability, processing latency, and limitations, see:

docs_DATA_AVAILABILITY_AND_UPDATE_FREQUENCY.md

10. Data Quality and Shared Development Rules
All developers must follow these rules:

Preserve original source metadata.

Preserve observation timestamps and units.

Treat missing data separately from zero.

Do not silently discard failed observations.

Keep dataset-specific quality limitations visible.

Do not infer causation from correlation.

Do not describe land-surface temperature as air temperature.

Do not describe GPM grid estimates as facility-level measurements.

Do not independently duplicate the Data Engine's acquisition pipeline.

Keep API response structures consistent and documented.

11. Repository Structure
text
global_data_engine/
│
├── acquisition/
│   └── gpm/
│       ├── gpm_acquisition.py
│       ├── extract_global_rainfall.py
│       └── merge_gpm_into_normalized.py
│
├── api/
│   └── main.py
│
├── data/
│   ├── input/
│   │   └── global_facilities.csv
│   │
│   ├── integration/
│   │   └── validated/
│   │
│   └── processed/
│       ├── global_facility_grid_mapping.csv
│       ├── global_gpm_monthly_rainfall.csv.gz
│       ├── sentinel2_environmental_indicators.json
│       ├── landsat_environmental_indicators.json
│       ├── modis_lst_day_night.json
│       ├── sentinel1_test.json
│       └── sentinel5p_so2.json
│
├── metadata/
│   ├── dataset_inventory.json
│   └── dataset_inventory.py
│
├── docs_DATASET_INVENTORY_AND_GPM.md
├── docs_DATA_AVAILABILITY_AND_UPDATE_FREQUENCY.md
├── requirements-gpm-additions.txt
└── README.md
Some files shown above are generated or may vary by checkout. Consult the repository for the exact current contents.

12. Definition of Done
The Data Engine prototype provides:

☑ Multiple satellite datasets and acquisition metadata.
☑ Historical observation inventory.
☑ Latest observation dates for existing datasets.
☑ Rainfall integration using NASA GPM IMERG.
☑ Land-surface temperature data using Landsat and MODIS.
☑ Global power-facility reference database.
☑ Facility-to-GPM-pixel mapping.
☑ FastAPI data access endpoints.
☑ Dataset availability and update-frequency documentation.
☑ Global facility-to-GPM pixel mapping and rainfall API integration.
☑ Verified dataset record counts and observation date ranges.
□ Automated recurring satellite data acquisition and refresh.
Final integration principle: Developer 1 provides the shared data foundation. Developer 2 analyzes environmental changes, Developer 3 performs preliminary site screening, and Developer 4 presents the results through the TerraTrace web application.

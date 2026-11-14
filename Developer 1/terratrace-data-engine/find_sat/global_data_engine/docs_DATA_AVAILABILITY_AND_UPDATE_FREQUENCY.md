# TerraTrace — Dataset Availability and Update Frequency

Last verified: 14 November 2026

## 1. Dataset availability

The following dates and record counts describe the data currently present in this project, not the complete historical availability of each satellite mission.

| Dataset | Total records | Successful | No valid pixels | Errors | First observation | Latest observation | Observed median interval |
|---|---:|---:|---:|---:|---|---|---|
| Sentinel-2 | 732 | 572 | 160 | 0 | 2022-01-05 | 2025-12-30 | 5 days |
| Landsat 8/9 | 671 | 526 | 142 | 3 | 2022-01-02 | 2025-12-28 | 8 days |
| MODIS Terra | 324 | 288 | 36 | 0 | 2022-01-01 | 2025-12-27 | 8 days |
| Sentinel-1 | 10 | 10 | 0 | 0 | 2025-12-07 | 2025-12-31 | 6 days |
| Sentinel-5P | 1 | 1 | 0 | 0 | 2025-12-31 | 2025-12-31 | Not measurable |
| NASA GPM IMERG V07B | 3,071,115 | 3,071,115 | 0 | 0 | 2022-01 | 2025-09 | Monthly |

Note: GPM counts represent facility-grid monthly rainfall records, not unique facilities. The GPM dataset covers 45 months and 68,247 unique grid pixels mapped to 145,596 global power facilities.

## 2. Variables and units

| Dataset | Variables | Units |
|---|---|---|
| Sentinel-2 | NDVI, NDWI (McFeeters) | Unitless |
| Landsat 8/9 | Land-surface temperature, NDVI | Celsius, unitless |
| MODIS Terra | Daytime and nighttime land-surface temperature | Celsius |
| Sentinel-1 | VH and VV backscatter source asset values | source_asset_DN |
| Sentinel-5P | Total vertical column of sulfur dioxide | mol m-2 |
| GPM IMERG V07B | Monthly mean precipitation rate, estimated monthly accumulation | mm/hr, mm |

## 3. Temperature and rainfall availability

### Temperature
Land-surface temperature is available from Landsat 8/9 and MODIS Terra.

These products measure the temperature of the Earth's surface. They must not be presented as near-surface air temperature.

### Rainfall
NASA GPM IMERG V07B monthly precipitation is integrated for global power facilities.

- Historical period: January 2022 to September 2025.
- Temporal resolution: Monthly.
- Spatial resolution: Approximately 0.1 degrees (roughly 10 km at the equator).
- Number of monthly periods: 45.
- Unique GPM grid pixels: 68,247.
- Facility records: 145,596.

Monthly accumulation is derived from monthly mean precipitation rate multiplied by 24 hours and the number of days in that month. It is an estimate from gridded satellite data, not a direct rain-gauge measurement at a facility.

GPM values provide regional environmental context. They should not be interpreted as precise facility-scale rainfall measurements.

## 4. Observed cadence versus mission revisit

The observed median intervals below are calculated from the observations in the current project inventory. They describe the current collected dataset and are not guarantees of satellite revisit or future API refresh.

| Dataset | Observed median interval in this project | Notes |
|---|---:|---|
| Sentinel-2 | 5 days | Actual AOI observation cadence |
| Landsat 8/9 | 8 days | Combined mission observations in this dataset |
| MODIS Terra | 8 days | Current extracted record cadence |
| Sentinel-1 | 6 days | Only five distinct dates currently available |
| Sentinel-5P | Not measurable | Only one observation |
| GPM IMERG | Monthly | Monthly product integrated into this project |

Actual availability can be affected by cloud cover, acquisition plans, product processing, quality filters, missing pixels, and download failures.

## 5. Product latency and TerraTrace refresh schedule

Product publication latency and TerraTrace's own refresh schedule are different.

- GPM IMERG Final Run has an approximate latency of 3.5 months.
- Other satellite product publication delays vary by product and processing level.
- No automated recurring refresh schedule is currently configured for this data engine.
- The latest available observation in the local archive is not necessarily the latest observation available from the source provider.

The current GPM archive ends in September 2025. The current satellite inventory ends in December 2025. These archives must not be described as live or real-time data.

## 6. Data quality and interpretation limitations

- A successful record does not imply that every pixel or variable is valid.
- `no_valid_pixels` records are not valid environmental measurements.
- Landsat currently contains three acquisition errors; these must not be interpreted as observations.
- Sentinel-1 values use source asset DN and are not calibrated sigma0/dB values.
- Sentinel-5P provides one SO2 observation only; a historical trend cannot be inferred.
- Satellite observations indicate environmental conditions and changes; they do not independently establish industrial causation.
- The global facility database represents power facilities. It does not cover every data centre or industrial facility.

## 7. Source files

- `metadata/dataset_inventory.json`
- `metadata/dataset_inventory.py`
- `data/input/global_facilities.csv`
- `data/processed/global_facility_grid_mapping.csv`
- `data/processed/global_gpm_monthly_rainfall.csv.gz`
- `acquisition/gpm/`
- `api/main.py`

## 8. Future update workflow

A future scheduled update process should:

1. Check source-provider availability for new products.
2. Download new observations using authenticated acquisition scripts.
3. Validate product metadata, timestamps, units, and quality information.
4. Process and normalize observations.
5. Update the dataset inventory and latest-observation dates.
6. Refresh facility-to-grid mappings only when necessary.
7. Update the API datasets and report ingestion status.
8. Record failed downloads and missing observations without treating them as zero.

Until this workflow is automated, dataset refreshes are manual.

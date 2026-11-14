# TerraTrace Phase 2 — Soil-moisture integration pilot

## What this adds
A configurable acquisition pipeline for NASA SMAP L4 soil-moisture parameters exposed through the NASA POWER high-resolution data service.

- `SFMC`: surface soil moisture content (m³/m³)
- `RZMC`: root-zone soil moisture content (m³/m³)
- `PRMC`: profile soil moisture content (m³/m³)

NASA documents SMAP L4 at approximately 0.09° (~9 km), daily UTC availability through POWER, with coverage beginning 31 March 2015. The underlying SMAP L4 science product is 3-hourly. See official references in `metadata/soil_moisture_source.json`.

## Install
Use the project's existing virtual environment:
```bash
pip install -r requirements-phase2.txt
```

## Run a fast global pilot
From `global_data_engine/`:
```bash
python acquisition/soil_moisture/acquire_global_soil_moisture.py \
  --facilities data/input/global_facilities.csv \
  --output data/integration/phase2 \
  --max-facilities 30 \
  --start 20220101 --end 20250930
```

The script selects a deterministic spread of facility locations across countries and makes one NASA POWER point request per selected location. This is a pilot, not a complete dataset for all 145,596 facilities.

## Outputs
- `soil_moisture_pilot_facilities.csv`
- `global_facility_daily_soil_moisture.csv.gz`
- `global_facility_monthly_soil_moisture.csv.gz`
- `soil_moisture_acquisition_errors.csv`
- `soil_moisture_inventory.json`

## Scale-up
`--max-facilities 0` attempts all unique facility coordinates. Do not run this casually: it can require a very large number of API calls and take a long time. Deduplicate to the native SMAP grid before any full-scale run, cache every grid-cell response, and respect NASA POWER usage guidance.

## Scientific limitations
- A facility coordinate is linked to the surrounding ~9 km grid cell; it is not a site-level soil sample.
- SMAP L4 is model-assimilated satellite soil-moisture data, not an in-situ measurement.
- Surface/root-zone soil moisture is not groundwater level or water availability.
- Missing values remain missing and are never filled with zero.
- This phase does not create causal impact claims or treatment/control comparisons.

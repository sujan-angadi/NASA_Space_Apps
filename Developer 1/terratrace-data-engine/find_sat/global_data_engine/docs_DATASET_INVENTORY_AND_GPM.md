# TerraTrace Developer 1 — Dataset Availability and Rainfall Extension

## Dataset inventory

Run from `find_sat/global_data_engine`:

```bash
python metadata/dataset_inventory.py
```

This reads `data/integration/validated/normalized_observations.json` and writes
`metadata/dataset_inventory.json`.

The report includes source, collection, variables, units, record counts,
historical start, latest observation, unique UTC observation dates, and
observed date gaps. Observed date gaps are not the same as guaranteed satellite
revisit frequency or data-service update latency.

## Rainfall source: NASA GPM IMERG V07 Final Monthly

The proposed rainfall source is NASA GPM IMERG Final monthly product:
`GPM_3IMERGM_07`.

- Product cadence: monthly.
- Grid spacing: 0.1 degree (~10 km).
- Main variable: `precipitation`.
- Variable unit: mm/hour (monthly mean rate).
- Derived monthly accumulation: monthly mean rate × hours in that month.
- Final product latency: approximately 3.5 months.
- Historical coverage: January 1998 onward, subject to collection availability.

Official references:
- https://gpm.nasa.gov/data/directory
- https://gpm.nasa.gov/data/imerg
- https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary

NASA Earthdata account is required for GES DISC access. Configure Earthdata
Login/.netrc according to NASA Earthdata instructions. Do not commit credentials.

## Install and run

Merge `requirements-gpm-additions.txt` into the project's requirements, then:

```bash
pip install -r requirements.txt
```

Run the acquisition from `find_sat/global_data_engine`:

```bash
python -m acquisition.gpm.gpm_acquisition
```

Optional environment variables:

```bash
export TERRATRACE_AOI_LON=69.849610
export TERRATRACE_AOI_LAT=22.334148
export TERRATRACE_AOI_RADIUS_M=2000
export GPM_START_DATE=2022-01-01
export GPM_END_DATE=2025-12-31
```

Outputs:
- Raw downloads: `data/raw/gpm/`
- Processed records: `data/processed/gpm_imerg_monthly_rainfall.json`

## Scientific and implementation caveats

1. IMERG is a satellite-gauge blended precipitation estimate, not a local rain gauge.
2. The monthly product is coarse (~10 km) relative to the current 2 km AOI.
3. The extractor selects grid-cell footprints intersecting the AOI; it does not
   calculate fractional-area-weighted precipitation.
4. The script derives monthly accumulation from the monthly mean rate.
5. The acquisition script is not complete until it has run successfully with
   valid Earthdata credentials and produced records. Do not report rainfall as
   integrated before validating its output.
6. Product update latency and observed dates in the local downloaded sample
   must be reported separately.

# TerraTrace Phase 1 — Global Facility and GPM Rainfall Handoff

## What is included
- `global_facility_rainfall_lookup.csv.gz`: one row per facility with its GPM pixel key.
- `global_gpm_grid_monthly_with_facility_counts.csv.gz`: one row per GPM pixel and month, with source rainfall and count of mapped facilities in that pixel.
- `global_monthly_rainfall_summary.csv`: monthly descriptive summary across unique facility-linked GPM pixels.
- `facility_monthly_rainfall_example.csv`: example join for five facilities across available months.
- `global_environmental_summary.json`: dataset coverage and scope.
- `data_dictionary.json`: fields, units and join instructions.
- `integration_validation.json`: automated validation results.

## Join for facility-level monthly rainfall
Join `global_facility_rainfall_lookup.csv.gz` to `global_gpm_grid_monthly_with_facility_counts.csv.gz` on `gpm_pixel_key`. This produces a facility-by-month view. The expected expanded size is 145,596 facilities × 45 months = 6,551,820 rows.

The full expanded table is intentionally not stored because many facilities share the same GPM grid cell and therefore share identical rainfall estimates. Keeping the lookup and grid-month tables separate avoids duplicating identical measurements and reduces file size.

## Coverage
- 145,596 power facilities in 226 countries/territories.
- 68,247 GPM grid cells linked to facilities.
- 45 monthly periods: January 2022 through September 2025.
- 3,071,115 source GPM pixel-month records.

## Scientific interpretation
- `estimated_monthly_accumulation_mm` is derived from monthly mean precipitation rate (mm/hr) × 24 × number of days in the month.
- GPM is a gridded estimate, not a facility-site rain gauge.
- Facilities sharing a pixel share the same rainfall estimate.
- For regional averages, aggregate unique GPM pixels, not facility-expanded rows, to avoid over-weighting pixels containing many facilities.
- This is global coverage of the supplied power-facility database and its linked pixels, not complete global land coverage or a comprehensive industrial/data-centre inventory.
- This phase does not provide global satellite vegetation, land-surface-temperature or water-index observations.

## Existing API compatibility
The supplied API already exposes `/global-stats`, `/facilities`, and `/facilities/{facility_id}/rainfall`. The latter resolves a facility to its GPM pixel and returns its monthly rainfall series. No API source modification was necessary for this data integration.

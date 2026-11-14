#!/usr/bin/env python3
"""
TerraTrace Phase 2: global SMAP soil-moisture pilot via NASA POWER.

NASA POWER exposes high-resolution SMAP L4 soil-moisture parameters:
SFMC (surface), RZMC (root zone), PRMC (profile).
This script deliberately runs a globally distributed pilot by default.
It does NOT download soil moisture for all 145,596 facilities.

Example:
  python acquisition/soil_moisture/acquire_global_soil_moisture.py \
      --facilities data/input/global_facilities.csv \
      --output data/integration/phase2 \
      --max-facilities 30

Use --max-facilities 0 to attempt all unique facility coordinates.
That can require many API requests and should not be used during a short demo.
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import time
from pathlib import Path

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = ["SFMC", "RZMC", "PRMC"]
SOURCE = "NASA POWER high-resolution SMAP L4"
START_DEFAULT = "20220101"
END_DEFAULT = "20250930"
NODATA = {-999, -999.0, -9999, -9999.0}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("terratrace-smap")


def make_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(total=4, backoff_factor=1.0,
                  status_forcelist=[429, 500, 502, 503, 504],
                  allowed_methods=["GET"])
    session.mount("https://", HTTPAdapter(max_retries=retry))
    session.headers.update({"User-Agent": "TerraTrace/0.1 (research environmental monitoring)"})
    return session


def select_facilities(df: pd.DataFrame, limit: int) -> pd.DataFrame:
    required = ["GEM_Location_ID", "Facility_Name", "Country", "Facility_Type",
                "Latitude", "Longitude"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Facility CSV missing columns: {missing}")
    df = df.dropna(subset=["Latitude", "Longitude"]).copy()
    df["Latitude"] = pd.to_numeric(df["Latitude"], errors="coerce")
    df["Longitude"] = pd.to_numeric(df["Longitude"], errors="coerce")
    df = df.dropna(subset=["Latitude", "Longitude"])
    df = df[df["Latitude"].between(-85, 85) & df["Longitude"].between(-180, 180)]
    # Deduplicate identical coordinates to avoid redundant API requests.
    df["_coord_key"] = df["Latitude"].round(3).astype(str) + "_" + df["Longitude"].round(3).astype(str)
    df = df.drop_duplicates("_coord_key")
    if limit <= 0 or len(df) <= limit:
        return df.drop(columns=["_coord_key"])
    # Deterministic, geographically distributed selection: sample countries,
    # select one coordinate per country, then fill remaining slots by type.
    rng = 42
    countries = sorted(df["Country"].dropna().unique().tolist())
    if len(countries) > limit:
        countries = pd.Series(countries).sample(n=limit, random_state=rng).tolist()
    first = (df[df["Country"].isin(countries)]
             .sort_values(["Country", "Facility_Type", "GEM_Location_ID"])
             .drop_duplicates("Country"))
    chosen = first.copy()
    if len(chosen) < limit:
        remaining = df[~df["_coord_key"].isin(chosen["_coord_key"])].copy()
        pieces = []
        per_type = max(1, math.ceil((limit-len(chosen)) / max(1, remaining["Facility_Type"].nunique())))
        for _, group in remaining.groupby("Facility_Type"):
            pieces.append(group.sample(n=min(len(group), per_type), random_state=rng))
        if pieces:
            chosen = pd.concat([chosen, *pieces]).drop_duplicates("_coord_key").head(limit)
    if len(chosen) < limit:
        remaining = df[~df["_coord_key"].isin(chosen["_coord_key"])]
        chosen = pd.concat([chosen, remaining.head(limit-len(chosen))])
    return chosen.drop(columns=["_coord_key"]).reset_index(drop=True)


def fetch_point(session: requests.Session, lat: float, lon: float,
                start: str, end: str) -> tuple[dict, dict]:
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "RE",
        "longitude": f"{lon:.5f}",
        "latitude": f"{lat:.5f}",
        "start": start,
        "end": end,
        "format": "JSON",
    }
    response = session.get(API_URL, params=params, timeout=90)
    response.raise_for_status()
    payload = response.json()
    parameter_data = payload.get("properties", {}).get("parameter", {})
    if not parameter_data:
        raise ValueError(f"NASA POWER response did not contain parameter data: {list(payload)[:8]}")
    header = payload.get("header", {})
    return parameter_data, header


def clean_value(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value) or value in NODATA:
        return None
    return value


def main():
    parser = argparse.ArgumentParser(description="Acquire a global SMAP soil-moisture pilot via NASA POWER.")
    parser.add_argument("--facilities", default="data/input/global_facilities.csv")
    parser.add_argument("--output", default="data/integration/phase2")
    parser.add_argument("--max-facilities", type=int, default=30,
                        help="Number of globally distributed facility locations; 0 means all unique coordinates.")
    parser.add_argument("--start", default=START_DEFAULT, help="YYYYMMDD")
    parser.add_argument("--end", default=END_DEFAULT, help="YYYYMMDD")
    parser.add_argument("--delay", type=float, default=0.35, help="Seconds between API requests.")
    args = parser.parse_args()

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    facilities = pd.read_csv(args.facilities, dtype={"GEM_Location_ID": str})
    selected = select_facilities(facilities, args.max_facilities)
    selected.to_csv(out / "soil_moisture_pilot_facilities.csv", index=False)

    session = make_session()
    rows, failures = [], []
    total = len(selected)
    for idx, facility in selected.iterrows():
        fid = str(facility["GEM_Location_ID"])
        try:
            params, header = fetch_point(session, float(facility["Latitude"]),
                                         float(facility["Longitude"]), args.start, args.end)
            # NASA POWER returns parameter -> YYYYMMDD -> value.
            dates = sorted(set().union(*(set(v.keys()) for v in params.values() if isinstance(v, dict))))
            for date in dates:
                record = {
                    "facility_id": fid,
                    "facility_name": facility["Facility_Name"],
                    "country": facility["Country"],
                    "facility_type": facility["Facility_Type"],
                    "latitude": float(facility["Latitude"]),
                    "longitude": float(facility["Longitude"]),
                    "date": pd.to_datetime(date, format="%Y%m%d").date().isoformat(),
                    "source": SOURCE,
                    "source_resolution_km": 9,
                }
                for key, col in [("SFMC", "surface_soil_moisture_m3_m3"),
                                 ("RZMC", "root_zone_soil_moisture_m3_m3"),
                                 ("PRMC", "profile_soil_moisture_m3_m3")]:
                    record[col] = clean_value(params.get(key, {}).get(date))
                valid = [record[c] is not None for c in
                         ["surface_soil_moisture_m3_m3", "root_zone_soil_moisture_m3_m3",
                          "profile_soil_moisture_m3_m3"]]
                record["quality_flag"] = "valid" if any(valid) else "missing_all_parameters"
                rows.append(record)
            log.info("[%d/%d] %s: %d daily dates", idx+1, total, fid, len(dates))
        except Exception as exc:
            failures.append({"facility_id": fid, "facility_name": facility["Facility_Name"],
                             "country": facility["Country"], "error": str(exc)})
            log.error("[%d/%d] %s failed: %s", idx+1, total, fid, exc)
        time.sleep(max(0, args.delay))

    daily_path = out / "global_facility_daily_soil_moisture.csv.gz"
    daily = pd.DataFrame(rows)
    if not daily.empty:
        daily.to_csv(daily_path, index=False, compression="gzip")
        daily["date"] = pd.to_datetime(daily["date"])
        daily["year"] = daily["date"].dt.year
        daily["month"] = daily["date"].dt.month
        value_cols = ["surface_soil_moisture_m3_m3", "root_zone_soil_moisture_m3_m3",
                      "profile_soil_moisture_m3_m3"]
        monthly = (daily.groupby(["facility_id", "facility_name", "country", "facility_type",
                                  "latitude", "longitude", "year", "month", "source",
                                  "source_resolution_km"], dropna=False)[value_cols]
                   .mean().reset_index())
        monthly["quality_flag"] = monthly[value_cols].notna().any(axis=1).map(
            {True: "valid_monthly_mean", False: "missing_all_parameters"})
        monthly.to_csv(out / "global_facility_monthly_soil_moisture.csv.gz",
                       index=False, compression="gzip")
    else:
        pd.DataFrame().to_csv(daily_path, index=False, compression="gzip")
        monthly = pd.DataFrame()

    pd.DataFrame(failures).to_csv(out / "soil_moisture_acquisition_errors.csv", index=False)
    summary = {
        "dataset": "TerraTrace global soil-moisture pilot",
        "source": SOURCE,
        "source_product": "SMAP L4 exposed through NASA POWER high-resolution data service",
        "parameters": {
            "SFMC": {"column": "surface_soil_moisture_m3_m3", "unit": "m3/m3", "depth": "surface"},
            "RZMC": {"column": "root_zone_soil_moisture_m3_m3", "unit": "m3/m3", "depth": "root zone"},
            "PRMC": {"column": "profile_soil_moisture_m3_m3", "unit": "m3/m3", "depth": "full profile"},
        },
        "nominal_spatial_resolution_km": 9,
        "temporal_source_resolution": "daily values requested from NASA POWER",
        "requested_start": args.start,
        "requested_end": args.end,
        "selected_facility_locations": int(len(selected)),
        "countries_represented": int(selected["Country"].nunique()) if not selected.empty else 0,
        "daily_records": int(len(daily)),
        "monthly_records": int(len(monthly)),
        "failed_facility_requests": len(failures),
        "coverage_note": "Pilot only. This output is not a complete soil-moisture archive for all global facilities.",
        "method_note": "Monthly values are arithmetic means of available daily values. Missing values are not converted to zero.",
    }
    (out / "soil_moisture_inventory.json").write_text(json.dumps(summary, indent=2))
    log.info("Finished. Outputs written to %s", out.resolve())


if __name__ == "__main__":
    main()

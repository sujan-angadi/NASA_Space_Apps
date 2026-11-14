
from pathlib import Path
import json

from fastapi import FastAPI, HTTPException, Query

app = FastAPI(
    title="TerraTrace API",
    description="Earth observation and environmental change analysis",
    version="0.1.0",
)

DATA = Path("data/integration/validated")


def load_json(filename):
    path = DATA / filename

    if not path.exists():
        raise HTTPException(404, f"{filename} not available yet")

    with path.open() as file:
        return json.load(file)


@app.get("/health")
def health():
    return {"status": "running", "service": "TerraTrace"}


@app.get("/observations")
def observations(
    variable: str | None = None,
    source: str | None = None,
):
    records = load_json("normalized_observations.json")

    if variable:
        records = [r for r in records if r.get("variable") == variable]

    if source:
        records = [r for r in records if r.get("source") == source]

    return {"count": len(records), "observations": records}


@app.get("/timeseries")
def timeseries(variable: str | None = None):
    records = load_json("monthly_analysis.json")

    if variable:
        records = [r for r in records if r.get("variable") == variable]

    return {"count": len(records), "results": records}


@app.get("/report")
def report():
    observations = load_json("normalized_observations.json")
    analysis = load_json("monthly_analysis.json")

    return {
        "observation_count": len(observations),
        "analysis_groups": len(analysis),
        "analysis": analysis,
    }
@app.get("/change-detection")
def change_detection():
    return load_json("change_detection.json")

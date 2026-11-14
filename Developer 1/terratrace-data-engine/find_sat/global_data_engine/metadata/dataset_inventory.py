import json
import statistics
from collections import defaultdict
from datetime import datetime
from pathlib import Path

INPUT = Path("data/integration/validated/normalized_observations.json")
OUTPUT = Path("metadata/dataset_inventory.json")

with INPUT.open() as f:
    records = json.load(f)

groups = defaultdict(list)

for record in records:
    groups[record.get("source")].append(record)

inventory = []

for source, rows in groups.items():
    valid_dates = []

    for row in rows:
        timestamp = row.get("observation_datetime")
        if timestamp:
            try:
                valid_dates.append(
                    datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                )
            except ValueError:
                pass

    unique_dates = sorted(set(valid_dates))
    intervals = [
        (unique_dates[i] - unique_dates[i-1]).total_seconds() / 86400
        for i in range(1, len(unique_dates))
    ]

    variables = sorted({
        row["variable"]
        for row in rows if row.get("variable")
    })

    units = sorted({
        row["unit"]
        for row in rows if row.get("unit")
    })

    inventory.append({
        "source": source,
        "total_records": len(rows),
        "successful_records": sum(
            row.get("status") == "success" for row in rows
        ),
        "no_valid_pixels": sum(
            row.get("status") == "no_valid_pixels" for row in rows
        ),
        "errors": sum(
            row.get("status") == "error" for row in rows
        ),
        "variables": variables,
        "units": units,
        "historical_start": (
            unique_dates[0].isoformat() if unique_dates else None
        ),
        "latest_observation": (
            unique_dates[-1].isoformat() if unique_dates else None
        ),
        "unique_observation_dates": len(unique_dates),
        "median_observation_interval_days": (
            round(statistics.median(intervals), 2)
            if intervals else None
        ),
        "observed_intervals_days": intervals
    })

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(inventory, indent=2))

print(json.dumps(inventory, indent=2))
print(f"\nSaved: {OUTPUT}")

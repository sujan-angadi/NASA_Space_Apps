import json
from collections import defaultdict
from pathlib import Path


INPUT = Path("data/integration/validated/monthly_analysis.json")
OUTPUT = Path("data/integration/validated/change_detection.json")

BASELINE_YEARS = {2022, 2023}
RECENT_YEARS = {2024, 2025}


def compare_periods(group):
    baseline = defaultdict(list)
    recent = defaultdict(list)

    for observation in group["monthly_observations"]:
        year, month = map(int, observation["month"].split("-"))
        value = observation.get("mean")

        if value is None:
            continue

        if year in BASELINE_YEARS:
            baseline[month].append(value)
        elif year in RECENT_YEARS:
            recent[month].append(value)

    comparisons = []

    for month in range(1, 13):
        if not baseline[month] or not recent[month]:
            continue

        baseline_mean = sum(baseline[month]) / len(baseline[month])
        recent_mean = sum(recent[month]) / len(recent[month])

        difference = recent_mean - baseline_mean

        percentage = (
            difference / abs(baseline_mean) * 100
            if baseline_mean != 0 else None
        )

        comparisons.append({
            "calendar_month": month,
            "baseline_mean": baseline_mean,
            "recent_mean": recent_mean,
            "absolute_change": difference,
            "percentage_change": percentage,
            "baseline_year_count": len(baseline[month]),
            "recent_year_count": len(recent[month]),
        })

    return comparisons


def main():
    with INPUT.open() as file:
        groups = json.load(file)

    results = []

    for group in groups:
        source = group["source"]
        variable = group["variable"]

        comparisons = compare_periods(group)

        # Skip groups with no comparable baseline/recent months.
        if len(comparisons) == 0:
            print(
                f"Skipping {source} {variable}: "
                "no comparable months"
            )
            continue

        average_change = sum(
            item["absolute_change"] for item in comparisons
        ) / len(comparisons)

        status = "descriptive_comparison"

        results.append({
            "source": source,
            "aoi_name": group["aoi_name"],
            "variable": variable,
            "unit": group["unit"],
            "baseline_period": "2022-2023",
            "recent_period": "2024-2025",
            "status": status,
            "comparable_months": len(comparisons),
            "mean_monthly_change": average_change,
            "comparisons": comparisons,
            "interpretation": (
                "Descriptive seasonal comparison; "
                "not proof of industrial causation or statistical significance."
            ),
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT.open("w") as file:
        json.dump(results, file, indent=2)

    print("========== CHANGE DETECTION ==========")

    for result in results:
        print(
            result["source"],
            result["variable"],
            "Comparable months:", result["comparable_months"],
            "Mean change:", result["mean_monthly_change"],
        )

    print("Saved:", OUTPUT)


if __name__ == "__main__":
    main()

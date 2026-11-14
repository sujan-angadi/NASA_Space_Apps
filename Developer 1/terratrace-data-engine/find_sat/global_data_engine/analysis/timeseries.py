
import json
import pandas as pd


def load_observations(path):
    with open(path) as file:
        records = json.load(file)

    df = pd.DataFrame(records)

    if df.empty:
        raise ValueError("No observations found")

    df["observation_datetime"] = pd.to_datetime(
        df["observation_datetime"], utc=True, errors="coerce"
    )
    df["mean"] = pd.to_numeric(df["mean"], errors="coerce")

    df = df[
        (df["status"] == "success")
        & df["observation_datetime"].notna()
        & df["mean"].notna()
    ]

    return df


def monthly_summary(df):
    df = df.copy()
    df["month"] = (
        df["observation_datetime"].dt.to_period("M").astype(str)
    )

    return (
        df.groupby(
            ["source", "aoi_name", "variable", "unit", "month"],
            as_index=False,
        )
        .agg(
            mean=("mean", "mean"),
            minimum=("minimum", "min"),
            maximum=("maximum", "max"),
            observation_count=("item_id", "nunique"),
        )
    )


def calculate_trend(group):
    group = group.sort_values("month").copy()

    if len(group) < 3:
        return {
            "status": "insufficient_data",
            "monthly_slope": None,
            "observations": len(group),
        }

    x = pd.to_datetime(group["month"]).map(
        lambda value: value.year * 12 + value.month
    ).to_numpy(dtype=float)

    y = group["mean"].to_numpy(dtype=float)

    slope = float(
        __import__("numpy").polyfit(x - x[0], y, 1)[0]
    )

    return {
        "status": "calculated",
        "monthly_slope": slope,
        "observations": len(group),
    }


def run_analysis(input_path, output_path):
    df = load_observations(input_path)
    monthly = monthly_summary(df)

    results = []

    for keys, group in monthly.groupby(
        ["source", "aoi_name", "variable", "unit"]
    ):
        source, aoi, variable, unit = keys

        results.append({
            "source": source,
            "aoi_name": aoi,
            "variable": variable,
            "unit": unit,
            "trend": calculate_trend(group),
            "monthly_observations": group.to_dict("records"),
        })

    with open(output_path, "w") as file:
        json.dump(results, file, indent=2)

    print("Time-series groups:", len(results))
    print("Saved:", output_path)


if __name__ == "__main__":
    run_analysis(
        "data/integration/validated/normalized_observations.json",
        "data/integration/validated/monthly_analysis.json",
    )

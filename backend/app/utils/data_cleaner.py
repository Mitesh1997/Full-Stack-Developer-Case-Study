"""Data cleaning: gap-filling, outlier removal, unit normalization."""
import pandas as pd
import numpy as np
from typing import Optional


def clean_weather_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans a raw daily weather DataFrame.
    Expected columns: date (str/datetime), tmax (°C), tmin (°C), precipitation (mm)
    """
    df = df.copy()

    # Ensure date is datetime
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Remove duplicate dates — keep first
    df = df.drop_duplicates(subset="date", keep="first")

    # Create a complete date range to detect gaps
    full_range = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
    df = df.set_index("date").reindex(full_range).rename_axis("date").reset_index()

    # --- Gap filling ---
    for col in ["tmax", "tmin", "precipitation"]:
        if col not in df.columns:
            df[col] = np.nan

        # Mark large consecutive gaps (>7 days) so we don't silently interpolate
        null_mask = df[col].isna()
        # Count consecutive nulls
        df[f"_{col}_gap_group"] = (null_mask != null_mask.shift()).cumsum()
        gap_sizes = df[null_mask].groupby(f"_{col}_gap_group").size()
        large_gaps = gap_sizes[gap_sizes > 7].index.tolist()

        # Interpolate all gaps ≤7 days
        df[col] = df[col].interpolate(method="linear", limit=7, limit_direction="both")

        # For large gaps still NaN, fill with rolling 30-day median
        if df[col].isna().any():
            df[col] = df[col].fillna(df[col].rolling(30, min_periods=1, center=True).median())

        df.drop(columns=[f"_{col}_gap_group"], inplace=True)

    # --- Outlier removal (clip ±3σ from rolling 30-day mean) ---
    for col in ["tmax", "tmin"]:
        rolling_mean = df[col].rolling(30, min_periods=1, center=True).mean()
        rolling_std = df[col].rolling(30, min_periods=1, center=True).std().fillna(5.0)
        lower = rolling_mean - 3 * rolling_std
        upper = rolling_mean + 3 * rolling_std
        df[col] = df[col].clip(lower=lower, upper=upper)

    # Precipitation can't be negative
    df["precipitation"] = df["precipitation"].clip(lower=0)

    # Physical plausibility checks
    df.loc[df["tmax"] < df["tmin"], "tmax"] = df.loc[df["tmax"] < df["tmin"], "tmin"] + 1.0

    return df


def compute_data_quality(df: pd.DataFrame, original_len: int) -> dict:
    """Return a summary of data quality metrics."""
    total_days = len(df)
    coverage = round(original_len / total_days * 100, 1) if total_days > 0 else 0
    return {
        "total_days": total_days,
        "original_records": original_len,
        "coverage_pct": coverage,
        "tmax_null_remaining": int(df["tmax"].isna().sum()),
        "precipitation_null_remaining": int(df["precipitation"].isna().sum()),
    }

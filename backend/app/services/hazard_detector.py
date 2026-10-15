"""
Climate hazard detection logic.
- Heatwave: 3+ consecutive days with tmax > 95th percentile baseline
- Drought: 30+ consecutive days with precipitation < 10th percentile
- Heavy Rainfall: daily precipitation > 99th percentile
"""
import pandas as pd
import numpy as np
from typing import Literal


HazardType = Literal["heatwave", "drought", "rainfall"]


def detect_heatwaves(df: pd.DataFrame, region_id: str) -> list[dict]:
    """
    Identify heatwave events using the 95th percentile threshold.
    A heatwave = 3+ consecutive days with tmax > P95(tmax) for the region.
    """
    if df.empty or "tmax" not in df.columns:
        return []

    threshold = float(df["tmax"].quantile(0.95))
    df = df.copy()
    df["hot_day"] = df["tmax"] > threshold

    events = []
    streak = 0
    start_idx = None
    streak_rows = []

    for _, row in df.iterrows():
        if row["hot_day"]:
            if streak == 0:
                start_idx = row["date"]
                streak_rows = []
            streak += 1
            streak_rows.append(row)
        else:
            if streak >= 3:
                events.append(_build_heatwave_event(streak_rows, region_id, threshold))
            streak = 0
            streak_rows = []

    # Catch streak at end of data
    if streak >= 3:
        events.append(_build_heatwave_event(streak_rows, region_id, threshold))

    return events


def _build_heatwave_event(rows: list, region_id: str, threshold: float) -> dict:
    start = rows[0]["date"]
    end = rows[-1]["date"]
    peak = max(r["tmax"] for r in rows)
    avg_temp = float(np.mean([r["tmax"] for r in rows]))
    return {
        "region_id": region_id,
        "hazard_type": "heatwave",
        "start_date": str(start.date()) if hasattr(start, "date") else str(start)[:10],
        "end_date": str(end.date()) if hasattr(end, "date") else str(end)[:10],
        "duration_days": len(rows),
        "peak_intensity": round(float(peak), 2),
        "avg_intensity": round(avg_temp, 2),
        "threshold_used": round(threshold, 2),
        "year": int(str(start)[:4]),
    }


def detect_droughts(df: pd.DataFrame, region_id: str) -> list[dict]:
    """
    Drought = 30+ consecutive days with daily precipitation < P10(precipitation).
    """
    if df.empty or "precipitation" not in df.columns:
        return []

    threshold = float(df["precipitation"].quantile(0.10))
    df = df.copy()
    df["dry_day"] = df["precipitation"] <= threshold

    events = []
    streak = 0
    streak_rows = []

    for _, row in df.iterrows():
        if row["dry_day"]:
            streak += 1
            streak_rows.append(row)
        else:
            if streak >= 30:
                start = streak_rows[0]["date"]
                end = streak_rows[-1]["date"]
                events.append({
                    "region_id": region_id,
                    "hazard_type": "drought",
                    "start_date": str(start.date()) if hasattr(start, "date") else str(start)[:10],
                    "end_date": str(end.date()) if hasattr(end, "date") else str(end)[:10],
                    "duration_days": streak,
                    "peak_intensity": round(float(np.mean([r["precipitation"] for r in streak_rows])), 2),
                    "avg_intensity": round(float(np.mean([r["precipitation"] for r in streak_rows])), 2),
                    "threshold_used": round(threshold, 2),
                    "year": int(str(start)[:4]),
                })
            streak = 0
            streak_rows = []

    if streak >= 30:
        start = streak_rows[0]["date"]
        end = streak_rows[-1]["date"]
        events.append({
            "region_id": region_id,
            "hazard_type": "drought",
            "start_date": str(start.date()) if hasattr(start, "date") else str(start)[:10],
            "end_date": str(end.date()) if hasattr(end, "date") else str(end)[:10],
            "duration_days": streak,
            "peak_intensity": round(float(np.mean([r["precipitation"] for r in streak_rows])), 2),
            "avg_intensity": round(float(np.mean([r["precipitation"] for r in streak_rows])), 2),
            "threshold_used": round(threshold, 2),
            "year": int(str(start)[:4]),
        })

    return events


def detect_heavy_rainfall(df: pd.DataFrame, region_id: str) -> list[dict]:
    """
    Heavy rainfall = single day with precipitation > P99(precipitation).
    Groups consecutive extreme-rainfall days into one event.
    """
    if df.empty or "precipitation" not in df.columns:
        return []

    threshold = float(df["precipitation"].quantile(0.99))
    df = df.copy()
    df["extreme_rain"] = df["precipitation"] > threshold

    events = []
    streak = 0
    streak_rows = []

    for _, row in df.iterrows():
        if row["extreme_rain"]:
            streak += 1
            streak_rows.append(row)
        else:
            if streak >= 1:
                start = streak_rows[0]["date"]
                end = streak_rows[-1]["date"]
                events.append({
                    "region_id": region_id,
                    "hazard_type": "rainfall",
                    "start_date": str(start.date()) if hasattr(start, "date") else str(start)[:10],
                    "end_date": str(end.date()) if hasattr(end, "date") else str(end)[:10],
                    "duration_days": streak,
                    "peak_intensity": round(float(max(r["precipitation"] for r in streak_rows)), 2),
                    "avg_intensity": round(float(np.mean([r["precipitation"] for r in streak_rows])), 2),
                    "threshold_used": round(threshold, 2),
                    "year": int(str(start)[:4]),
                })
            streak = 0
            streak_rows = []

    return events


def detect_hazards(df: pd.DataFrame, hazard_type: HazardType, region_id: str) -> list[dict]:
    """Dispatch to correct hazard detector."""
    dispatch = {
        "heatwave": detect_heatwaves,
        "drought": detect_droughts,
        "rainfall": detect_heavy_rainfall,
    }
    return dispatch[hazard_type](df, region_id)

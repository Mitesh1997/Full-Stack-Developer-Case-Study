"""
Trend analysis: rolling averages, linear regression, Mann-Kendall test.
"""
import numpy as np
from scipy import stats
from typing import Optional

try:
    import pymannkendall as mk
    MK_AVAILABLE = True
except ImportError:
    MK_AVAILABLE = False


def compute_annual_frequency(events: list[dict], start_year: int, end_year: int) -> list[dict]:
    """Count events and compute average duration/intensity per year."""
    year_map: dict[int, list] = {y: [] for y in range(start_year, end_year + 1)}
    for ev in events:
        y = ev.get("year")
        if y and start_year <= y <= end_year:
            year_map[y].append(ev)

    result = []
    for year in range(start_year, end_year + 1):
        evs = year_map[year]
        result.append({
            "year": year,
            "count": len(evs),
            "avg_duration_days": round(float(np.mean([e["duration_days"] for e in evs])), 1) if evs else 0.0,
            "avg_intensity": round(float(np.mean([e["peak_intensity"] for e in evs])), 2) if evs else 0.0,
            "total_days_affected": sum(e["duration_days"] for e in evs),
        })
    return result


def compute_rolling_average(annual: list[dict], window: int = 5) -> list[dict]:
    """Compute rolling mean of event count over a sliding window."""
    counts = [a["count"] for a in annual]
    years = [a["year"] for a in annual]
    result = []
    for i, (year, count) in enumerate(zip(years, counts)):
        start = max(0, i - window // 2)
        end = min(len(counts), i + window // 2 + 1)
        window_vals = counts[start:end]
        result.append({
            "year": year,
            "rolling_avg": round(float(np.mean(window_vals)), 2),
        })
    return result


def compute_linear_trend(annual: list[dict]) -> dict:
    """
    Linear regression on annual event counts.
    Returns slope, intercept, r², p-value, standard error.
    """
    years = np.array([a["year"] for a in annual])
    counts = np.array([a["count"] for a in annual], dtype=float)

    if len(years) < 3:
        return {"slope": 0, "intercept": 0, "r_squared": 0, "p_value": 1.0, "std_err": 0}

    slope, intercept, r_value, p_value, std_err = stats.linregress(years, counts)

    # Regression line points for frontend rendering
    regression_line = [
        {"year": int(y), "predicted": round(float(slope * y + intercept), 2)}
        for y in years
    ]

    return {
        "slope": round(float(slope), 4),
        "intercept": round(float(intercept), 4),
        "r_squared": round(float(r_value ** 2), 4),
        "p_value": round(float(p_value), 4),
        "std_err": round(float(std_err), 4),
        "regression_line": regression_line,
    }


def compute_percent_change(annual: list[dict], window: int = 5) -> Optional[float]:
    """
    Compare the first window-year average to the last window-year average.
    Returns % change (positive = increasing). Dynamically adjusts window for shorter series.
    """
    n = len(annual)
    if n < 2:
        return None
    effective_window = min(window, n // 2)
    if effective_window < 1:
        effective_window = 1

    first_avg = float(np.mean([a["count"] for a in annual[:effective_window]]))
    last_avg = float(np.mean([a["count"] for a in annual[-effective_window:]]))

    if first_avg == 0:
        if last_avg > 0:
            return 100.0
        return 0.0

    return round(float((last_avg - first_avg) / first_avg * 100), 1)


def run_mann_kendall(annual: list[dict]) -> Optional[dict]:
    """Run Mann-Kendall trend test (requires pymannkendall)."""
    if not MK_AVAILABLE:
        return None
    counts = [a["count"] for a in annual]
    if len(counts) < 5:
        return None
    try:
        result = mk.original_test(counts)
        return {
            "trend": str(result.trend),          # "increasing", "decreasing", "no trend"
            "h": bool(result.h),                   # Must be native Python bool
            "p_value": float(round(float(result.p), 4)),
            "z": float(round(float(result.z), 4)),
            "tau": float(round(float(result.Tau), 4)),
            "slope": float(round(float(result.slope), 4)),
        }
    except Exception:
        return None


def generate_insight(
    hazard: str,
    region_name: str,
    percent_change: Optional[float],
    trend: dict,
    mk_result: Optional[dict],
    start_year: int,
    end_year: int,
) -> str:
    """Generate a human-readable insight string."""
    if percent_change is None:
        return f"Insufficient data to determine {hazard} trend for {region_name}."

    direction = "increased" if percent_change > 0 else "decreased"
    abs_change = abs(percent_change)
    significance = ""

    if trend["p_value"] < 0.05:
        significance = " (statistically significant)"
    elif trend["p_value"] < 0.1:
        significance = " (marginally significant)"

    if mk_result and mk_result.get("h"):
        mk_note = f" The Mann-Kendall test confirms a {mk_result['trend']} trend."
    else:
        mk_note = ""

    return (
        f"{hazard.capitalize()}s have {direction} by {abs_change:.1f}% in {region_name} "
        f"between {start_year} and {end_year}{significance}.{mk_note}"
    )


def analyze_trends(
    events: list[dict],
    hazard: str,
    region_name: str,
    start_year: int,
    end_year: int,
) -> dict:
    """Full trend analysis pipeline. Returns structured result dict."""
    annual = compute_annual_frequency(events, start_year, end_year)
    rolling = compute_rolling_average(annual)
    trend = compute_linear_trend(annual)
    pct_change = compute_percent_change(annual)
    mk_result = run_mann_kendall(annual)

    insight = generate_insight(
        hazard, region_name, pct_change, trend, mk_result, start_year, end_year
    )

    direction = "increasing" if trend["slope"] > 0 else "decreasing" if trend["slope"] < 0 else "stable"

    return {
        "annual_frequency": annual,
        "rolling_average": rolling,
        "trend": {
            **trend,
            "percent_change": pct_change,
            "direction": direction,
            "significant": bool(trend["p_value"] < 0.05),
            "mann_kendall": mk_result,
        },
        "insight": insight,
        "insight_sentence": insight,
    }

"""
Weather data ingestion from Open-Meteo (primary) and NOAA NCEI (fallback).
Uses tenacity for retry with exponential backoff.
"""
import httpx
from datetime import date, timedelta
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
)
async def fetch_open_meteo(lat: float, lon: float, start_date: str, end_date: str) -> list[dict]:
    """
    Fetch daily weather from Open-Meteo archive API.
    Returns list of dicts with keys: date, tmax, tmin, precipitation
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "timezone": "auto",
        "temperature_unit": "celsius",
        "precipitation_unit": "mm",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        data = response.json()

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    tmax = daily.get("temperature_2m_max", [])
    tmin = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])

    records = []
    for i, d in enumerate(dates):
        records.append({
            "date": d,
            "tmax": tmax[i] if i < len(tmax) else None,
            "tmin": tmin[i] if i < len(tmin) else None,
            "precipitation": precip[i] if i < len(precip) else None,
            "source": "open-meteo",
        })

    return records


async def fetch_weather_data(
    lat: float, lon: float, start_year: int, end_year: int, region_id: str
) -> list[dict]:
    """
    Main entry point: fetch date range directly from Open-Meteo archive.
    Fast single-call approach with chunked fallback.
    """
    start_date = f"{start_year}-01-01"
    end_date = f"{end_year}-12-31"

    # Attempt fast single fetch
    try:
        records = await fetch_open_meteo(lat, lon, start_date, end_date)
        for r in records:
            r["region_id"] = region_id
        return records
    except Exception as e:
        print(f"[WARN] Batch fetch failed ({e}). Falling back to yearly chunks...")

    # Fallback: yearly chunks
    all_records = []
    for year in range(start_year, end_year + 1):
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        try:
            records = await fetch_open_meteo(lat, lon, start, end)
            for r in records:
                r["region_id"] = region_id
            all_records.extend(records)
        except Exception as err:
            print(f"[WARN] Failed to fetch {year} for {region_id}: {err}")
            continue

    return all_records

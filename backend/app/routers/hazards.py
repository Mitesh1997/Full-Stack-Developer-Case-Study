"""
Main hazards router.
GET /api/hazards?lat=&lon=&hazard=heatwave&start_year=1990&end_year=2020
"""
import pandas as pd
from fastapi import APIRouter, Query
from app.utils.validators import validate_lat, validate_lon, validate_year_range, validate_hazard_type, make_region_id
from app.services.weather_fetcher import fetch_weather_data
from app.services.hazard_detector import detect_hazards
from app.services.trend_analyzer import analyze_trends
from app.services.cache_service import make_cache_key, get_cached, set_cached
from app.utils.data_cleaner import clean_weather_df, compute_data_quality
from app.db import queries

router = APIRouter(prefix="/api/hazards", tags=["hazards"])


@router.get("")
async def get_hazards(
    lat: float = Query(..., description="Latitude (-90 to 90)"),
    lon: float = Query(..., description="Longitude (-180 to 180)"),
    hazard: str = Query("heatwave", description="Hazard type: heatwave, drought, rainfall"),
    start_year: int = Query(1990),
    end_year: int = Query(2020),
    region_name: str = Query("Selected Region"),
):
    # --- Validate inputs ---
    lat = validate_lat(lat)
    lon = validate_lon(lon)
    start_year, end_year = validate_year_range(start_year, end_year)
    hazard = validate_hazard_type(hazard)
    region_id = make_region_id(lat, lon)

    # --- Check Redis cache ---
    cache_key = make_cache_key({
        "lat": lat, "lon": lon, "hazard": hazard,
        "start_year": start_year, "end_year": end_year
    })
    cached = await get_cached(cache_key)
    if cached:
        cached["cached"] = True
        return cached

    # --- Check MongoDB for existing weather data ---
    start_date = f"{start_year}-01-01"
    end_date = f"{end_year}-12-31"

    existing_weather = await queries.get_cached_weather(region_id, start_date, end_date)
    
    # Determine if we need to fetch more data
    needed_days = (end_year - start_year + 1) * 365
    if len(existing_weather) < needed_days * 0.8:  # If less than 80% data available, re-fetch
        raw_records = await fetch_weather_data(lat, lon, start_year, end_year, region_id)
        if raw_records:
            await queries.upsert_weather_records(raw_records)
            existing_weather = await queries.get_cached_weather(region_id, start_date, end_date)

    if not existing_weather:
        return {
            "error": "No weather data available for this region/time range.",
            "region": {"lat": lat, "lon": lon, "name": region_name},
            "hazard": hazard,
        }

    # --- Clean data ---
    df = pd.DataFrame(existing_weather)
    original_len = len(df)
    df = clean_weather_df(df)
    data_quality = compute_data_quality(df, original_len)

    # --- Detect hazards ---
    events = detect_hazards(df, hazard, region_id)
    if events:
        await queries.upsert_hazard_events(events)

    # --- Compute trends ---
    analysis = analyze_trends(events, hazard, region_name, start_year, end_year)

    # --- Build response ---
    response = {
        "region": {"lat": lat, "lon": lon, "name": region_name},
        "hazard": hazard,
        "time_range": [start_year, end_year],
        "total_events": len(events),
        **analysis,
        "data_quality": data_quality,
        "cached": False,
    }

    def _sanitize(val):
        import numpy as np
        if isinstance(val, dict):
            return {k: _sanitize(v) for k, v in val.items()}
        elif isinstance(val, list):
            return [_sanitize(v) for v in val]
        elif isinstance(val, (np.bool_,)):
            return bool(val)
        elif isinstance(val, (np.integer,)):
            return int(val)
        elif isinstance(val, (np.floating,)):
            return float(val)
        elif isinstance(val, np.ndarray):
            return _sanitize(val.tolist())
        return val

    response = _sanitize(response)

    # --- Store in Redis ---
    await set_cached(cache_key, response)

    return response

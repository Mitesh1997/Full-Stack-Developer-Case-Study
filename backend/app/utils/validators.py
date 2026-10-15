"""Input validation utilities."""
from fastapi import HTTPException


def validate_lat(lat: float) -> float:
    if not (-90 <= lat <= 90):
        raise HTTPException(status_code=422, detail=f"Latitude must be between -90 and 90, got {lat}")
    return round(lat, 4)


def validate_lon(lon: float) -> float:
    if not (-180 <= lon <= 180):
        raise HTTPException(status_code=422, detail=f"Longitude must be between -180 and 180, got {lon}")
    return round(lon, 4)


def validate_year_range(start_year: int, end_year: int) -> tuple[int, int]:
    if start_year < 1940:
        raise HTTPException(status_code=422, detail="start_year must be >= 1940")
    if end_year > 2024:
        raise HTTPException(status_code=422, detail="end_year must be <= 2024")
    if start_year >= end_year:
        raise HTTPException(status_code=422, detail="start_year must be less than end_year")
    if (end_year - start_year) < 2:
        raise HTTPException(status_code=422, detail="Date range must span at least 3 years")
    return start_year, end_year


def validate_hazard_type(hazard: str) -> str:
    allowed = {"heatwave", "drought", "rainfall"}
    if hazard not in allowed:
        raise HTTPException(status_code=422, detail=f"hazard must be one of {allowed}")
    return hazard


def make_region_id(lat: float, lon: float) -> str:
    return f"lat_{lat:.4f}_lon_{lon:.4f}"

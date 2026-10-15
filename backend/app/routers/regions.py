"""
Regions router: geocoding city names to lat/lon via Nominatim.
GET /api/regions/search?q=Mumbai
"""
import httpx
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api/regions", tags=["regions"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "ClimateHazardApp/1.0 (academic project; contact@example.com)"}

# In-memory geocode cache to prevent redundant external calls and avoid rate limits
_GEOCODE_CACHE: dict[str, list[dict]] = {}

# Curated fallback cities for instant search & guaranteed uptime
POPULAR_CITIES = [
    {"name": "Mumbai", "display_name": "Mumbai, Maharashtra, India", "lat": 19.0760, "lon": 72.8777, "country": "India", "country_code": "IN"},
    {"name": "Delhi", "display_name": "New Delhi, Delhi, India", "lat": 28.6139, "lon": 77.2090, "country": "India", "country_code": "IN"},
    {"name": "Bengaluru", "display_name": "Bengaluru, Karnataka, India", "lat": 12.9716, "lon": 77.5946, "country": "India", "country_code": "IN"},
    {"name": "Kolkata", "display_name": "Kolkata, West Bengal, India", "lat": 22.5726, "lon": 88.3639, "country": "India", "country_code": "IN"},
    {"name": "Chennai", "display_name": "Chennai, Tamil Nadu, India", "lat": 13.0827, "lon": 80.2707, "country": "India", "country_code": "IN"},
    {"name": "Hyderabad", "display_name": "Hyderabad, Telangana, India", "lat": 17.3850, "lon": 78.4867, "country": "India", "country_code": "IN"},
    {"name": "Ahmedabad", "display_name": "Ahmedabad, Gujarat, India", "lat": 23.0225, "lon": 72.5714, "country": "India", "country_code": "IN"},
    {"name": "Pune", "display_name": "Pune, Maharashtra, India", "lat": 18.5204, "lon": 73.8567, "country": "India", "country_code": "IN"},
    {"name": "Jaipur", "display_name": "Jaipur, Rajasthan, India", "lat": 26.9124, "lon": 75.7873, "country": "India", "country_code": "IN"},
    {"name": "London", "display_name": "London, Greater London, United Kingdom", "lat": 51.5074, "lon": -0.1278, "country": "United Kingdom", "country_code": "GB"},
    {"name": "New York", "display_name": "New York City, New York, United States", "lat": 40.7128, "lon": -74.0060, "country": "United States", "country_code": "US"},
    {"name": "Phoenix", "display_name": "Phoenix, Arizona, United States", "lat": 33.4484, "lon": -112.0740, "country": "United States", "country_code": "US"},
    {"name": "Madrid", "display_name": "Madrid, Community of Madrid, Spain", "lat": 40.4168, "lon": -3.7038, "country": "Spain", "country_code": "ES"},
    {"name": "Paris", "display_name": "Paris, Île-de-France, France", "lat": 48.8566, "lon": 2.3522, "country": "France", "country_code": "FR"},
    {"name": "Tokyo", "display_name": "Tokyo, Kanto, Japan", "lat": 35.6762, "lon": 139.6503, "country": "Japan", "country_code": "JP"},
    {"name": "Sydney", "display_name": "Sydney, New South Wales, Australia", "lat": -33.8688, "lon": 151.2093, "country": "Australia", "country_code": "AU"},
    {"name": "Cairo", "display_name": "Cairo, Cairo Governorate, Egypt", "lat": 30.0444, "lon": 31.2357, "country": "Egypt", "country_code": "EG"},
    {"name": "Dubai", "display_name": "Dubai, United Arab Emirates", "lat": 25.2048, "lon": 55.2708, "country": "United Arab Emirates", "country_code": "AE"},
    {"name": "Singapore", "display_name": "Singapore, Central Region, Singapore", "lat": 1.3521, "lon": 103.8198, "country": "Singapore", "country_code": "SG"},
]


@router.get("/search")
async def search_region(q: str = Query(..., min_length=2, max_length=100)):
    """Search for a city/region and return lat/lon coordinates."""
    q_norm = q.strip().lower()
    if not q_norm:
        raise HTTPException(status_code=422, detail="Query cannot be empty")

    # Check cache
    if q_norm in _GEOCODE_CACHE:
        return {"results": _GEOCODE_CACHE[q_norm]}

    # Check popular cities first for instant response
    matched_local = [
        c for c in POPULAR_CITIES
        if q_norm in c["name"].lower() or q_norm in c["display_name"].lower()
    ]

    params = {"q": q, "format": "json", "limit": 5, "addressdetails": 1}
    results = []

    try:
        async with httpx.AsyncClient(timeout=4.0, headers=HEADERS) as client:
            resp = await client.get(NOMINATIM_URL, params=params)
            if resp.status_code == 200:
                results = resp.json()
    except Exception:
        # Gracefully handle timeouts or rate limits without failing
        pass

    formatted = []
    if results and isinstance(results, list):
        for r in results[:5]:
            addr = r.get("address", {})
            name = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("county")
                or r.get("display_name", "").split(",")[0]
            )
            formatted.append({
                "name": name,
                "display_name": r.get("display_name", ""),
                "lat": round(float(r["lat"]), 4),
                "lon": round(float(r["lon"]), 4),
                "country": addr.get("country", ""),
                "country_code": addr.get("country_code", "").upper(),
            })

    # If external service yielded no results or errored, return local matches
    if not formatted and matched_local:
        formatted = matched_local[:5]
    elif formatted and matched_local:
        # Prepend exact local match if it exists and isn't duplicated
        for m in matched_local:
            if not any(f["name"].lower() == m["name"].lower() for f in formatted):
                formatted.append(m)

    _GEOCODE_CACHE[q_norm] = formatted
    return {"results": formatted}


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Reverse geocode coordinates to an informative region/city name."""
    params = {"lat": lat, "lon": lon, "format": "json", "addressdetails": 1}
    async with httpx.AsyncClient(timeout=10.0, headers=HEADERS) as client:
        try:
            resp = await client.get("https://nominatim.openstreetmap.org/reverse", params=params)
            resp.raise_for_status()
            data = resp.json()
            addr = data.get("address", {})
            name = (
                addr.get("city")
                or addr.get("town")
                or addr.get("village")
                or addr.get("municipality")
                or addr.get("county")
                or addr.get("state")
                or data.get("display_name", "").split(",")[0]
            )
            return {
                "name": name,
                "display_name": data.get("display_name", f"{lat}, {lon}"),
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "country": addr.get("country", ""),
            }
        except Exception:
            return {
                "name": f"{lat:.2f}, {lon:.2f}",
                "display_name": f"{lat}, {lon}",
                "lat": round(lat, 4),
                "lon": round(lon, 4),
            }

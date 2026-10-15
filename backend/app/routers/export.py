"""
Export router: CSV and PDF export of hazard analysis results.
GET /api/export/csv?lat=&lon=&hazard=&start_year=&end_year=
"""
import io
import csv
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.utils.validators import validate_lat, validate_lon, validate_year_range, validate_hazard_type, make_region_id
from app.db import queries

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/csv")
async def export_csv(
    lat: float = Query(...),
    lon: float = Query(...),
    hazard: str = Query("heatwave"),
    start_year: int = Query(1990),
    end_year: int = Query(2020),
):
    lat = validate_lat(lat)
    lon = validate_lon(lon)
    start_year, end_year = validate_year_range(start_year, end_year)
    hazard = validate_hazard_type(hazard)
    region_id = make_region_id(lat, lon)

    events = await queries.get_hazard_events(region_id, hazard, start_year, end_year)

    output = io.StringIO()
    if events:
        writer = csv.DictWriter(
            output,
            fieldnames=["year", "start_date", "end_date", "duration_days", "peak_intensity", "avg_intensity", "threshold_used"],
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(events[:10000])  # Cap at 10k rows
    else:
        output.write("No events found for the selected parameters.\n")

    output.seek(0)
    filename = f"{hazard}_{region_id}_{start_year}_{end_year}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

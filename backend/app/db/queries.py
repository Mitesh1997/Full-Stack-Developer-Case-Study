from datetime import datetime
from typing import Optional
from app.db.mongo import get_db

# In-memory storage for graceful fallback if MongoDB is not running
_mem_weather: dict[tuple, dict] = {}       # key: (region_id, date) -> record
_mem_events: list[dict] = []              # list of event dicts
_mem_summaries: dict[tuple, dict] = {}    # key: (region_id, hazard_type, start_year, end_year) -> summary


async def get_cached_weather(region_id: str, start_date: str, end_date: str):
    """Return list of daily weather dicts for a region/date range if available."""
    db = get_db()
    if db is not None:
        try:
            cursor = db.weather_cache.find(
                {"region_id": region_id, "date": {"$gte": start_date, "$lte": end_date}},
                {"_id": 0},
            ).sort("date", 1)
            return await cursor.to_list(length=None)
        except Exception:
            pass

    # Fallback to in-memory
    results = [
        v for (rid, d), v in _mem_weather.items()
        if rid == region_id and start_date <= d <= end_date
    ]
    results.sort(key=lambda x: x["date"])
    return results


async def upsert_weather_records(records: list[dict]):
    """Bulk upsert daily weather records."""
    db = get_db()
    if db is not None:
        try:
            for rec in records:
                await db.weather_cache.update_one(
                    {"region_id": rec["region_id"], "date": rec["date"]},
                    {"$set": rec},
                    upsert=True,
                )
            return
        except Exception:
            pass

    # Fallback to in-memory
    for rec in records:
        key = (rec["region_id"], rec["date"])
        _mem_weather[key] = rec


async def get_hazard_events(region_id: str, hazard_type: str, start_year: int, end_year: int):
    db = get_db()
    if db is not None:
        try:
            cursor = db.hazard_events.find(
                {
                    "region_id": region_id,
                    "hazard_type": hazard_type,
                    "year": {"$gte": start_year, "$lte": end_year},
                },
                {"_id": 0},
            ).sort("start_date", 1)
            return await cursor.to_list(length=None)
        except Exception:
            pass

    # Fallback to in-memory
    results = [
        ev for ev in _mem_events
        if ev.get("region_id") == region_id
        and ev.get("hazard_type") == hazard_type
        and start_year <= ev.get("year", 0) <= end_year
    ]
    results.sort(key=lambda x: x.get("start_date", ""))
    return results


async def upsert_hazard_events(events: list[dict]):
    db = get_db()
    if db is not None:
        try:
            for ev in events:
                await db.hazard_events.update_one(
                    {"region_id": ev["region_id"], "hazard_type": ev["hazard_type"], "start_date": ev["start_date"]},
                    {"$set": ev},
                    upsert=True,
                )
            return
        except Exception:
            pass

    # Fallback to in-memory
    for ev in events:
        existing_idx = next(
            (i for i, x in enumerate(_mem_events)
             if x.get("region_id") == ev.get("region_id")
             and x.get("hazard_type") == ev.get("hazard_type")
             and x.get("start_date") == ev.get("start_date")),
            None
        )
        if existing_idx is not None:
            _mem_events[existing_idx] = ev
        else:
            _mem_events.append(ev)


async def get_trend_summary(region_id: str, hazard_type: str, start_year: int, end_year: int) -> Optional[dict]:
    db = get_db()
    if db is not None:
        try:
            return await db.trend_summaries.find_one(
                {"region_id": region_id, "hazard_type": hazard_type, "start_year": start_year, "end_year": end_year},
                {"_id": 0},
            )
        except Exception:
            pass

    return _mem_summaries.get((region_id, hazard_type, start_year, end_year))


async def upsert_trend_summary(summary: dict):
    db = get_db()
    if db is not None:
        try:
            await db.trend_summaries.update_one(
                {
                    "region_id": summary["region_id"],
                    "hazard_type": summary["hazard_type"],
                    "start_year": summary["start_year"],
                    "end_year": summary["end_year"],
                },
                {"$set": summary},
                upsert=True,
            )
            return
        except Exception:
            pass

    key = (summary["region_id"], summary["hazard_type"], summary["start_year"], summary["end_year"])
    _mem_summaries[key] = summary

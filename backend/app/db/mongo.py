from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=2000)
        await client.admin.command('ping')
        db = client[settings.mongodb_db]

        # Create indexes
        await db.weather_cache.create_index(
            [("region_id", 1), ("date", 1)], unique=True
        )
        await db.hazard_events.create_index(
            [("region_id", 1), ("hazard_type", 1), ("year", 1)]
        )
        await db.trend_summaries.create_index(
            [("region_id", 1), ("hazard_type", 1), ("start_year", 1), ("end_year", 1)],
            unique=True,
        )
        print("[OK] MongoDB connected and indexes created")
    except Exception as e:
        print(f"[WARN] MongoDB unavailable ({e}). Using in-memory fallback cache.")
        client = None
        db = None


async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


def get_db():
    return db

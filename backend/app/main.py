"""FastAPI application entry point."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.mongo import connect_db, close_db
from app.routers import hazards, regions, export

# --- Rate Limiter ---
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])

# --- App ---
app = FastAPI(
    title="Climate Hazard Analysis API",
    description="Analyze historical climate hazard trends (heatwaves, droughts, rainfall) for any region.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- Middleware ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# --- Lifecycle ---
@app.on_event("startup")
async def startup():
    await connect_db()
    print("[OK] Climate Hazard API is ready")


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# --- Routers ---
app.include_router(hazards.router)
app.include_router(regions.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

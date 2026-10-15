from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "climate_hazard"
    redis_url: str = "redis://localhost:6379"
    noaa_api_key: str = ""
    cache_ttl: int = 86400
    rate_limit: str = "30/minute"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()

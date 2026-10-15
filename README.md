# 🌡️ ClimateScope — Climate Hazard Analysis Web App

A full-stack web application that analyzes historical weather data and visualizes trends in climate hazards (heatwaves, droughts, heavy rainfall) for any selected region over time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Chart.js + Leaflet |
| Backend | Python + FastAPI + Pandas/NumPy/SciPy |
| Database | MongoDB (Motor async) |
| Cache | Redis |
| Weather Data | Open-Meteo (free, no auth) |
| Geocoding | OpenStreetMap Nominatim |
| Trend Analysis | SciPy + pymannkendall |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop (for MongoDB + Redis)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts MongoDB on port 27017 and Redis on port 6379.

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## 🔥 Key Features

### Climate Hazard Detection

| Hazard | Definition |
|---|---|
| **Heatwave** | 3+ consecutive days with `tmax` > 95th percentile for that region |
| **Drought** | 30+ consecutive days with precipitation < 10th percentile |
| **Heavy Rainfall** | Daily precipitation > 99th percentile |

### Data Pipeline

1. **Fetch** — Open-Meteo historical archive API (daily max/min temp + precipitation)
2. **Clean** — Gap filling (linear interpolation up to 7 days), outlier clipping (±3σ), unit normalization
3. **Cache** — MongoDB stores all raw daily records; Redis caches API responses (24h TTL)
4. **Detect** — Percentile-based thresholds applied to identify events
5. **Analyze** — Linear regression + Mann-Kendall trend test + rolling 5-year average
6. **Serve** — FastAPI returns structured JSON with insight sentences

### Security

- Input validation (Pydantic + custom validators for lat/lon/year)
- Rate limiting: 30 req/min per IP (slowapi)
- CORS: whitelist-only (frontend URL)
- Redis caching: prevents repeated external API calls
- No API keys exposed in frontend

---

## 📡 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/hazards` | Main analysis endpoint |
| `GET /api/regions/search?q=city` | Geocoding |
| `GET /api/export/csv` | CSV export of events |
| `GET /health` | Health check |
| `GET /docs` | Interactive API docs |

### Example Request

```bash
curl "http://localhost:8000/api/hazards?lat=19.076&lon=72.877&hazard=heatwave&start_year=1990&end_year=2020&region_name=Mumbai"
```

---

## 📁 Project Structure

```
climate-hazard-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings
│   │   ├── routers/             # API routes
│   │   ├── services/            # Business logic
│   │   ├── db/                  # MongoDB client & queries
│   │   └── utils/               # Validators, data cleaning
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/          # React UI components
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # Axios API client
│   │   └── utils/               # Constants, formatters
│   └── .env
└── docker-compose.yml
```

---

## 📊 Evaluation Coverage

| Dimension | Implementation |
|---|---|
| **Data Handling (20%)** | `data_cleaner.py`: interpolation, outlier clipping, MongoDB caching |
| **Climate Logic (20%)** | `hazard_detector.py`: 95th percentile, 3-day consecutive rule |
| **Backend Skills (20%)** | FastAPI + Pydantic validation + Redis + async MongoDB |
| **Frontend Skills (15%)** | Chart.js time-series + bar + regression + Leaflet map |
| **Critical Thinking (10%)** | R², p-value, Mann-Kendall badge, honest % change insight |
| **Security + Performance (15%)** | Rate limiting, CORS whitelist, input validation, Redis TTL |
| **Bonus** | Leaflet map UI, CSV export, Mann-Kendall test |
                     
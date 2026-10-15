import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2min — data fetch can take time for large ranges
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error normalization
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Unknown error';
    return Promise.reject(new Error(msg));
  }
);

export const fetchHazards = ({ lat, lon, hazard, startYear, endYear, regionName }) =>
  api.get('/api/hazards', {
    params: {
      lat,
      lon,
      hazard,
      start_year: startYear,
      end_year: endYear,
      region_name: regionName,
    },
  });

export const searchRegion = (q) =>
  api.get('/api/regions/search', { params: { q } });

export const reverseGeocode = (lat, lon) =>
  api.get('/api/regions/reverse', { params: { lat, lon } });

export const getExportCsvUrl = ({ lat, lon, hazard, startYear, endYear }) => {
  const params = new URLSearchParams({ lat, lon, hazard, start_year: startYear, end_year: endYear });
  return `${BASE_URL}/api/export/csv?${params}`;
};

export default api;

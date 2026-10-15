export const HAZARDS = [
  { id: 'heatwave', label: 'Heatwave', emoji: '🔥', colorClass: 'active-heat' },
  { id: 'drought',  label: 'Drought',  emoji: '🌵', colorClass: 'active-drought' },
  { id: 'rainfall', label: 'Heavy Rain', emoji: '🌧️', colorClass: 'active-rain' },
];

export const HAZARD_COLORS = {
  heatwave: { primary: '#f97316', secondary: '#dc2626', light: '#fdba74', glow: 'rgba(249,115,22,0.25)' },
  drought:  { primary: '#eab308', secondary: '#f97316', light: '#fde047', glow: 'rgba(234,179,8,0.2)' },
  rainfall: { primary: '#3b82f6', secondary: '#8b5cf6', light: '#93c5fd', glow: 'rgba(59,130,246,0.2)' },
};

export const HAZARD_UNITS = {
  heatwave: '°C',
  drought: 'mm/day',
  rainfall: 'mm/day',
};

export const DEFAULT_REGION = { name: 'Mumbai', lat: 19.076, lon: 72.8777, display_name: 'Mumbai, Maharashtra, India' };
export const DEFAULT_HAZARD = 'heatwave';
export const DEFAULT_START_YEAR = 1990;
export const DEFAULT_END_YEAR = 2020;

export const PRESET_LOCATIONS = [
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, country: 'IN', flag: '🇮🇳' },
  { name: 'Delhi', lat: 28.6139, lon: 77.2090, country: 'IN', flag: '🇮🇳' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, country: 'IN', flag: '🇮🇳' },
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB', flag: '🇬🇧' },
  { name: 'Phoenix', lat: 33.4484, lon: -112.0740, country: 'US', flag: '🇺🇸' },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, country: 'ES', flag: '🇪🇸' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'AU', flag: '🇦🇺' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP', flag: '🇯🇵' },
];


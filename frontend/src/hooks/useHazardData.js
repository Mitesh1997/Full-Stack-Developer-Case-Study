import { useState, useCallback } from 'react';
import { fetchHazards } from '../services/api';

export function useHazardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState('');

  const analyze = useCallback(async ({ lat, lon, hazard, startYear, endYear, regionName }) => {
    setLoading(true);
    setError(null);
    setData(null);

    const steps = [
      'Connecting to weather database...',
      'Fetching historical climate data...',
      'Cleaning and validating records...',
      'Detecting hazard events...',
      'Running trend analysis...',
      'Generating insights...',
    ];

    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setLoadingStep(steps[stepIdx]);
    }, 4000);

    try {
      const result = await fetchHazards({ lat, lon, hazard, startYear, endYear, regionName });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to fetch hazard data');
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
      setLoadingStep('');
    }
  }, []);

  return { data, loading, error, loadingStep, analyze };
}

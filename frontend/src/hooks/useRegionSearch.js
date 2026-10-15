import { useState, useRef, useEffect } from 'react';
import { searchRegion } from '../services/api';

export function useRegionSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchRegion(query);
        setSuggestions(res.results || []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query]);

  const selectSuggestion = (item) => {
    setSelected(item);
    setQuery(item.name);
    setSuggestions([]);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setSuggestions([]);
  };

  return { query, setQuery, suggestions, selected, searching, selectSuggestion, clearSelection };
}

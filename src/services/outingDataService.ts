import { PlanoraPreferences, OutingDataResponse } from '../types';
import { getLocalPlaces } from './placesService';
import { getLocalEvents } from './eventsService';

/**
 * High-level service function that retrieves both local places and events
 * in parallel for given user preferences.
 * 
 * Separates data retrieval from UI and recommendation logic.
 * The returned data is fully normalized and ready for future recommendation algorithms.
 */
export async function fetchOutingData(preferences: PlanoraPreferences): Promise<OutingDataResponse> {
  const [placesResult, eventsResult] = await Promise.all([
    getLocalPlaces({
      location: preferences.location,
      mood: preferences.mood,
      budget: preferences.budget,
      latitude: preferences.latitude,
      longitude: preferences.longitude,
    }),
    getLocalEvents({
      location: preferences.location,
      date: preferences.date,
      mood: preferences.mood,
    }),
  ]);

  const allNormalizedItems = [
    ...(placesResult.data || []),
    ...(eventsResult.data || []),
  ];

  const isConfigured = placesResult.status === 'live' || eventsResult.status === 'live';

  return {
    placesResult,
    eventsResult,
    allNormalizedItems,
    isConfigured,
  };
}

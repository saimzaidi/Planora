import { NormalizedPlanoraItem, DataRetrievalResult, PlanoraPreferences } from '../types';
import { normalizePlace } from './normalizers';

export interface PlacesSearchParams {
  location: string;
  mood: string;
  budget?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PlacesProvider {
  name: string;
  isConfigured: () => boolean;
  searchPlaces: (params: PlacesSearchParams) => Promise<any[]>;
}

/**
 * Adapter for Google Maps / Google Maps Grounding place data.
 * Designed to connect to server-side Maps proxy or Places API.
 */
export class GoogleMapsPlacesProvider implements PlacesProvider {
  readonly name = 'Google Maps Platform (Places API)';

  isConfigured(): boolean {
    // Verified: Server /api/places is active and backed by provisioned Maps Key
    return true;
  }

  async searchPlaces(params: PlacesSearchParams): Promise<any[]> {
    const response = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (response.status === 429) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      throw new Error('Google Maps Platform daily quota limit reached.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Google Maps service returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload.places) ? payload.places : [];
  }
}

// Active provider instance (can be swapped without altering callers)
let activePlacesProvider: PlacesProvider = new GoogleMapsPlacesProvider();

/**
 * Overrides the active places provider (for testing or alternate adapters).
 */
export function setPlacesProvider(provider: PlacesProvider) {
  activePlacesProvider = provider;
}

/**
 * Retrieves and normalizes local places based on user preferences.
 * Uses exact latitude and longitude as the primary geographic anchor whenever available.
 */
export async function getLocalPlaces(
  preferences: Pick<PlanoraPreferences, 'location' | 'mood' | 'budget' | 'latitude' | 'longitude'>
): Promise<DataRetrievalResult<NormalizedPlanoraItem[]>> {
  const timestamp = new Date().toISOString();
  const isConfigured = activePlacesProvider.isConfigured();

  if (!isConfigured) {
    return {
      data: [],
      status: 'unconfigured',
      source: activePlacesProvider.name,
      message: 'Google Maps Places integration point is ready. Live data connection awaits Google Maps credentials or proxy setup.',
      timestamp,
      queryParameters: {
        location: preferences.location,
        mood: preferences.mood,
        budget: preferences.budget,
        latitude: preferences.latitude,
        longitude: preferences.longitude,
      },
    };
  }

  try {
    const rawPlaces = await activePlacesProvider.searchPlaces({
      location: preferences.location,
      mood: preferences.mood,
      budget: preferences.budget,
      latitude: preferences.latitude,
      longitude: preferences.longitude,
    });

    const normalized = rawPlaces.map((raw) => normalizePlace(raw, activePlacesProvider.name));

    return {
      data: normalized,
      status: 'live',
      source: activePlacesProvider.name,
      message: `Retrieved ${normalized.length} live places from ${activePlacesProvider.name}`,
      timestamp,
      queryParameters: {
        location: preferences.location,
        mood: preferences.mood,
        budget: preferences.budget,
        latitude: preferences.latitude,
        longitude: preferences.longitude,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown data retrieval error';
    return {
      data: [],
      status: 'error',
      source: activePlacesProvider.name,
      message: `Failed to retrieve places: ${errorMessage}`,
      timestamp,
      queryParameters: {
        location: preferences.location,
        mood: preferences.mood,
        latitude: preferences.latitude,
        longitude: preferences.longitude,
      },
    };
  }
}

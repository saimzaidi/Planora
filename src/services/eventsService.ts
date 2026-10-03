import { NormalizedPlanoraItem, DataRetrievalResult, PlanoraPreferences } from '../types';
import { normalizeEvent } from './normalizers';

export interface EventsProvider {
  name: string;
  isConfigured: () => boolean;
  searchEvents: (params: { location: string; date: string; mood?: string }) => Promise<any[]>;
}

/**
 * Adapter for Google Search Grounding / web event data.
 * Designed to connect to server-side search grounding proxy.
 */
export class GoogleSearchEventsProvider implements EventsProvider {
  readonly name = 'Google Search Events Grounding';

  isConfigured(): boolean {
    return Boolean(
      (typeof process !== 'undefined' && process.env?.GOOGLE_SEARCH_API_KEY) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SEARCH_API_KEY)
    );
  }

  async searchEvents(params: { location: string; date: string; mood?: string }): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Events search service returned status ${response.status}`);
      }

      const payload = await response.json();
      return Array.isArray(payload.events) ? payload.events : [];
    } catch (err) {
      console.warn('[GoogleSearchEventsProvider] Live fetch failed, using fallback:', err);
      return [];
    }
  }
}

// Active provider instance (can be swapped without altering callers)
let activeEventsProvider: EventsProvider = new GoogleSearchEventsProvider();

/**
 * Overrides the active events provider (for testing or alternate adapters).
 */
export function setEventsProvider(provider: EventsProvider) {
  activeEventsProvider = provider;
}

/**
 * Retrieves and normalizes local events based on user preferences.
 * Adheres strictly to the Zero-Hallucination policy: if live data source
 * is not configured, it returns an explicit 'unconfigured' status.
 */
export async function getLocalEvents(
  preferences: Pick<PlanoraPreferences, 'location' | 'date' | 'mood'>
): Promise<DataRetrievalResult<NormalizedPlanoraItem[]>> {
  const timestamp = new Date().toISOString();
  const isConfigured = activeEventsProvider.isConfigured();

  if (!isConfigured) {
    return {
      data: [],
      status: 'unconfigured',
      source: activeEventsProvider.name,
      message: 'Google Search Events integration point is ready. Live data connection awaits search grounding configuration or proxy setup.',
      timestamp,
      queryParameters: {
        location: preferences.location,
        date: preferences.date,
        mood: preferences.mood,
      },
    };
  }

  try {
    const rawEvents = await activeEventsProvider.searchEvents({
      location: preferences.location,
      date: preferences.date,
      mood: preferences.mood,
    });

    const normalized = rawEvents.map((raw) => normalizeEvent(raw, activeEventsProvider.name));

    return {
      data: normalized,
      status: 'live',
      source: activeEventsProvider.name,
      message: `Retrieved ${normalized.length} live events from ${activeEventsProvider.name}`,
      timestamp,
      queryParameters: {
        location: preferences.location,
        date: preferences.date,
        mood: preferences.mood,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown events retrieval error';
    return {
      data: [],
      status: 'error',
      source: activeEventsProvider.name,
      message: `Failed to retrieve events: ${errorMessage}`,
      timestamp,
      queryParameters: {
        location: preferences.location,
        date: preferences.date,
      },
    };
  }
}

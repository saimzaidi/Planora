import { NormalizedPlanoraItem } from '../types';

function formatCategoryName(categoryStr: string): string {
  if (!categoryStr) return 'Venue / Activity';
  return categoryStr
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalizer utility to transform raw external place data
 * into canonical NormalizedPlanoraItem format.
 */
export function normalizePlace(raw: any, sourceName = 'Google Maps Platform (Places API)'): NormalizedPlanoraItem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid raw place object');
  }

  // Handle displayName from Google Maps Places API (New) which is { text: '...', languageCode: '...' }
  const rawName = typeof raw.displayName === 'object' && raw.displayName !== null
    ? raw.displayName.text
    : (raw.displayName || raw.name || raw.title || 'Untitled Place');

  // Handle editorialSummary from Google Maps Places API (New) which is { text: '...', languageCode: '...' }
  const rawDescription = typeof raw.editorialSummary === 'object' && raw.editorialSummary !== null
    ? raw.editorialSummary.text
    : (raw.editorialSummary || raw.description || raw.summary || '');

  // Handle location coordinates from Places API (New) which is { latitude: number, longitude: number }
  const latitude = typeof raw.location === 'object' && raw.location !== null && typeof raw.location.latitude === 'number'
    ? raw.location.latitude
    : (typeof raw.latitude === 'number' ? raw.latitude : (raw.geometry?.location?.lat ?? null));

  const longitude = typeof raw.location === 'object' && raw.location !== null && typeof raw.location.longitude === 'number'
    ? raw.location.longitude
    : (typeof raw.longitude === 'number' ? raw.longitude : (raw.geometry?.location?.lng ?? null));

  // Handle address string
  const locationString = String(raw.formattedAddress || raw.vicinity || raw.address || (typeof raw.location === 'string' ? raw.location : '')).trim();

  // Category cleanup
  const rawCategory = raw.primaryType || raw.category || raw.type || 'Activity / Venue';

  return {
    id: String(raw.id || raw.place_id || raw.placeId || `place_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    name: String(rawName).trim(),
    type: 'place',
    category: formatCategoryName(String(rawCategory)),
    description: String(rawDescription).trim(),
    location: locationString,
    latitude,
    longitude,
    price: typeof raw.price === 'number' ? raw.price : null,
    date: null, // Places are persistent venues, not calendar events
    sourceName: String(raw.sourceName || sourceName),
    sourceUrl: raw.googleMapsUri || raw.sourceUrl || raw.websiteUri || raw.url || null,
  };
}

/**
 * Normalizer utility to transform raw external event data
 * into canonical NormalizedPlanoraItem format.
 */
export function normalizeEvent(raw: any, sourceName = 'External Event Source'): NormalizedPlanoraItem {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid raw event object');
  }

  return {
    id: String(raw.id || raw.eventId || `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    name: String(raw.name || raw.title || 'Untitled Event').trim(),
    type: 'event',
    category: String(raw.category || raw.eventType || 'Local Event').trim(),
    description: String(raw.description || raw.snippet || '').trim(),
    location: String(raw.location || raw.venue || raw.address || '').trim(),
    latitude: typeof raw.latitude === 'number' ? raw.latitude : (raw.geo?.lat ?? null),
    longitude: typeof raw.longitude === 'number' ? raw.longitude : (raw.geo?.lng ?? null),
    price: typeof raw.price === 'number' ? raw.price : (raw.cost != null ? Number(raw.cost) || null : null),
    date: raw.date ? String(raw.date).trim() : (raw.startDate ? String(raw.startDate).trim() : null),
    sourceName: String(raw.sourceName || sourceName),
    sourceUrl: raw.sourceUrl || raw.url || raw.link || null,
  };
}

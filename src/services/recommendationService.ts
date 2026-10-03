import { PlanoraPreferences, NormalizedPlanoraItem, RecommendationResponse } from '../types';

/**
 * Client service that requests recommendations from the server-side Gemini engine.
 * Real-world places retrieved by the data layer are passed to Gemini so it only
 * reasons over, filters, and ranks authentic data without inventing places.
 */
export async function getRecommendations(
  preferences: PlanoraPreferences,
  items: NormalizedPlanoraItem[]
): Promise<RecommendationResponse> {
  if (!items || items.length === 0) {
    return {
      recommendations: [],
      status: 'empty',
      message: 'No real-world places available to recommend from.',
    };
  }

  try {
    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences,
        items,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        recommendations: [],
        status: 'error',
        message: errorData.message || `Recommendation service failed with status ${res.status}`,
      };
    }

    const data: RecommendationResponse = await res.json();
    return data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Network error';
    console.error('Failed to fetch recommendations:', error);
    return {
      recommendations: [],
      status: 'error',
      message: `Failed to connect to recommendation engine: ${msg}`,
    };
  }
}

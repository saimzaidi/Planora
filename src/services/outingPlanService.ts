import { PlanoraPreferences, NormalizedPlanoraItem, PlanoraRecommendation, OutingPlansResponse } from '../types';

/**
 * Requests complete outing plans from the server-side Gemini planning engine.
 * Real places retrieved by the data layer and verified individual recommendations
 * are supplied so that Gemini combines only authentic venues into coherent itineraries.
 */
export async function getOutingPlans(
  preferences: PlanoraPreferences,
  items: NormalizedPlanoraItem[],
  recommendations: PlanoraRecommendation[] = []
): Promise<OutingPlansResponse> {
  if (!items || items.length === 0) {
    return {
      plans: [],
      status: 'empty',
      message: 'No real-world places available to create outing plans from.',
    };
  }

  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences,
        items,
        recommendations,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        plans: [],
        status: 'error',
        message: errorData.message || `Outing planning service returned status ${res.status}`,
      };
    }

    const data: OutingPlansResponse = await res.json();
    return data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Network error';
    console.error('Failed to fetch outing plans:', error);
    return {
      plans: [],
      status: 'error',
      message: `Failed to connect to outing plan engine: ${msg}`,
    };
  }
}

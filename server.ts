import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// Initialize GoogleGenAI client securely on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. Search / Geocode a typed location (e.g. "Malir") to precise coordinates & human-readable name
app.post('/api/location/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ error: 'Google Maps API key not configured', results: [] });
    }

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({ results: [] });
    }

    const cleanQuery = query.trim();

    // Query Geocoding API with Pakistan component filter by default unless country is explicitly given
    const hasCountry = /pakistan|india|usa|uk|uae/i.test(cleanQuery);
    const geocodeUrl = hasCountry
      ? `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQuery)}&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQuery)}&components=country:PK&key=${apiKey}`;

    const geoRes = await fetch(geocodeUrl);
    const geoData = await geoRes.json();

    const results: Array<{
      displayName: string;
      shortName: string;
      latitude: number;
      longitude: number;
    }> = [];

    if (geoData.status === 'OK' && Array.isArray(geoData.results)) {
      for (const item of geoData.results.slice(0, 5)) {
        // Reject generic country fallback when user query did not explicitly mention pakistan
        const isGenericCountry = Array.isArray(item.types) && item.types.includes('country') && item.types.length <= 2 && !/pakistan/i.test(cleanQuery);
        if (isGenericCountry) {
          continue;
        }

        const lat = item.geometry?.location?.lat;
        const lng = item.geometry?.location?.lng;
        if (typeof lat === 'number' && typeof lng === 'number') {
          // Construct a clean, natural short name (e.g. "Malir, Karachi")
          const parts = item.formatted_address.split(',').map((p: string) => p.trim());
          const shortName = parts.length > 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
          
          results.push({
            displayName: item.formatted_address,
            shortName,
            latitude: lat,
            longitude: lng,
          });
        }
      }
    }

    return res.json({ results });
  } catch (error) {
    console.error('Location search error:', error);
    return res.status(500).json({ error: 'Failed to search location', results: [] });
  }
});

// 2. Reverse Geocode browser coordinates to human-readable address
app.post('/api/location/reverse', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ error: 'Google Maps API key not configured' });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude numbers are required' });
    }

    const revUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
    const revRes = await fetch(revUrl);
    const revData = await revRes.json();

    if (revData.status === 'OK' && Array.isArray(revData.results) && revData.results.length > 0) {
      const best = revData.results[0];
      const parts = best.formatted_address.split(',').map((p: string) => p.trim());
      // Clean up plus codes like "V6W7+RC8" if present at the start
      const cleanParts = parts.filter((p: string) => !/^[A-Z0-9]{4}\+[A-Z0-9]{2,}/i.test(p));
      const shortName = cleanParts.slice(0, 2).join(', ') || best.formatted_address;

      return res.json({
        displayName: cleanParts.join(', ') || best.formatted_address,
        shortName,
        latitude,
        longitude,
      });
    }

    // Fallback if reverse geocode yielded no name
    return res.json({
      displayName: `Near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
      shortName: `Current Location`,
      latitude,
      longitude,
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return res.status(500).json({ error: 'Failed to reverse geocode' });
  }
});

// 3. Proxy endpoint for Google Maps Places API (New) with locationBias
app.post('/api/places', async (req: Request, res: Response) => {
  try {
    const { location, mood, budget, groupType, latitude, longitude } = req.body;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'Place discovery service is currently unavailable.',
        places: [],
      });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({
        error: 'Location is required.',
        places: [],
      });
    }

    // Map user mood to authentic real-world discovery queries
    let moodKeywords = 'activities, entertainment, cafes, and popular spots';
    if (mood) {
      const m = String(mood).toLowerCase();
      if (m === 'bored') moodKeywords = 'activities, entertainment, gaming, cafes, and attractions';
      else if (m === 'adventurous') moodKeywords = 'outdoor activities, adventure parks, sports, and scenic spots';
      else if (m === 'relaxed') moodKeywords = 'quiet cafes, tea rooms, peaceful parks, and bookstores';
      else if (m === 'social') moodKeywords = 'popular hangout cafes, social venues, lively food streets, and lounges';
      else if (m === 'romantic') moodKeywords = 'cozy restaurants, scenic viewpoints, waterfronts, and fine dining';
      else if (m === 'curious') moodKeywords = 'museums, art galleries, historical landmarks, and cultural spots';
    }

    const textQuery = `${moodKeywords} in ${location.trim()}`;

    // Request payload for Places API (New)
    const requestBody: Record<string, unknown> = {
      textQuery,
      pageSize: 6,
    };

    // Geographic anchoring: ensure coordinates are established
    let finalLat = (typeof latitude === 'number' && !isNaN(latitude)) ? latitude : null;
    let finalLng = (typeof longitude === 'number' && !isNaN(longitude)) ? longitude : null;

    // If client did not send coordinates, attempt to resolve via geocoding
    if (finalLat === null || finalLng === null) {
      try {
        const hasCountry = /pakistan|india|usa|uk|uae/i.test(location);
        const geocodeUrl = hasCountry
          ? `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location.trim())}&key=${apiKey}`
          : `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location.trim())}&components=country:PK&key=${apiKey}`;
        const geoRes = await fetch(geocodeUrl);
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && Array.isArray(geoData.results) && geoData.results.length > 0) {
          const first = geoData.results[0];
          const isGenericCountry = Array.isArray(first.types) && first.types.includes('country') && first.types.length <= 2 && !/pakistan/i.test(location);
          if (!isGenericCountry && first.geometry?.location) {
            finalLat = first.geometry.location.lat;
            finalLng = first.geometry.location.lng;
          }
        }
      } catch (err) {
        console.warn('Geocoding fallback error in /api/places:', err);
      }
    }

    // STRICT GEOGRAPHIC INTEGRITY: If coordinates cannot be anchored,
    // do NOT run an unconstrained global search that returns random places across the globe.
    if (finalLat === null || finalLng === null) {
      return res.json({
        places: [],
        source: 'Google Maps Platform (Places API)',
        query: textQuery,
        anchoredCoordinates: null,
        message: 'No local options were found for this location.',
      });
    }

    // Apply locationBias to strictly anchor search around the selected spot
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: finalLat,
          longitude: finalLng,
        },
        radius: 15000.0, // 15 km search radius around the exact anchor
      },
    };

    const gmpResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount,places.googleMapsUri,places.priceLevel,places.editorialSummary',
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify(requestBody),
    });

    if (!gmpResponse.ok) {
      const errText = await gmpResponse.text();
      console.error('[Google Maps Places API error]:', gmpResponse.status, errText);
      return res.status(gmpResponse.status).json({
        error: 'Failed to retrieve local options right now. Please try again.',
        places: [],
      });
    }

    const data = await gmpResponse.json();
    return res.json({
      places: data.places || [],
      source: 'Google Maps Platform (Places API)',
      query: textQuery,
      anchoredCoordinates: { latitude: finalLat, longitude: finalLng },
    });
  } catch (error) {
    console.error('Failed to proxy places request:', error);
    return res.status(500).json({
      error: 'Unable to connect to place discovery service. Please try again.',
      places: [],
    });
  }
});

// 4. Recommendation Engine: calls Gemini to reason over real-world retrieved items
app.post('/api/recommendations', async (req: Request, res: Response) => {
  try {
    const { preferences, items } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        recommendations: [],
        status: 'error',
        message: 'Gemini API key is not configured in the environment.',
      });
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        recommendations: [],
        status: 'error',
        message: 'Preferences object is required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({
        recommendations: [],
        status: 'empty',
        message: 'No real-world places available to recommend from.',
      });
    }

    // Build lookup map of verified real-world items
    const itemMap = new Map<string, any>();
    for (const item of items) {
      if (item && item.id) {
        itemMap.set(String(item.id), item);
      }
    }

    if (itemMap.size === 0) {
      return res.json({
        recommendations: [],
        status: 'empty',
        message: 'No valid real-world items found in the supplied data.',
      });
    }

    // Prepare clean item representations for Gemini prompt
    const sanitizedItems = Array.from(itemMap.values()).map((it) => ({
      id: it.id,
      name: it.name,
      type: it.type || 'place',
      category: it.category || 'General',
      description: it.description || '',
      location: it.location || '',
      price: it.price !== undefined ? it.price : null,
      date: it.date || null,
      sourceName: it.sourceName || 'Google Maps',
      sourceUrl: it.sourceUrl || null,
      latitude: it.latitude || null,
      longitude: it.longitude || null,
    }));

    const prompt = `You are Planora's Outing Recommendation Engine.
Your task is to analyze the user's outing preferences and select up to 6 of the best matching options strictly from the supplied list of real-world items.

### STRICT RULES:
1. You may ONLY use items from the supplied list. NEVER invent, hallucinate, or assume a place, business, event, price, address, coordinate, date, or URL that is not present in the list.
2. Every recommended item MUST have an 'itemId' that exactly matches an 'id' from the supplied list.
3. If an item's price is null or unavailable, set 'estimatedCost' to null. Do NOT invent a price. Only calculate 'estimatedCost' if price information is explicitly supplied.
4. If an item has date information, respect it.
5. Provide a clear, natural 'reason' explaining why this specific place suits the user's mood, companions, budget, and location.
6. Provide a 'suitabilityScore' between 1 and 100 representing how strongly this item satisfies the criteria.
7. Return at most 6 recommendations, ordered from highest suitability to lowest.

### USER PREFERENCES:
- Mood: ${preferences.mood || 'Any'}
- Outing Budget: PKR ${preferences.budget ? Number(preferences.budget).toLocaleString() : 'Flexible'}
- Group Type: ${preferences.groupType || 'Solo'}
- Selected Location: ${preferences.location || 'Local area'}
${preferences.latitude && preferences.longitude ? `- Anchor Coordinates: (${preferences.latitude}, ${preferences.longitude})` : ''}
- Planned Date: ${preferences.date || 'Today'}

### AVAILABLE REAL-WORLD ITEMS (Total: ${sanitizedItems.length}):
${JSON.stringify(sanitizedItems, null, 2)}
`;

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      itemId: {
                        type: Type.STRING,
                        description: "The exact matching 'id' of the item from the supplied list.",
                      },
                      reason: {
                        type: Type.STRING,
                        description: "Friendly, natural explanation of why this real place matches the user's mood, group, budget, and area.",
                      },
                      estimatedCost: {
                        type: Type.NUMBER,
                        description: "Estimated cost in PKR only if calculable from supplied item prices; otherwise null.",
                      },
                      suitabilityScore: {
                        type: Type.NUMBER,
                        description: "Relevance score from 1 to 100 based strictly on match to mood, group, location, and budget.",
                      },
                    },
                    required: ['itemId', 'reason', 'suitabilityScore'],
                  },
                },
              },
              required: ['recommendations'],
            },
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini attempt on ${modelName} encountered issue]:`, err instanceof Error ? err.message : err);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All model attempts failed to return content');
    }

    const responseText = response.text ? response.text.trim() : '';
    if (!responseText) {
      return res.status(502).json({
        recommendations: [],
        status: 'error',
        message: 'Empty response received from recommendation engine.',
      });
    }

    let parsed: { recommendations?: any[] };
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini recommendations JSON:', parseError, responseText);
      return res.status(502).json({
        recommendations: [],
        status: 'error',
        message: 'Recommendation engine produced malformed output.',
      });
    }

    if (!parsed || !Array.isArray(parsed.recommendations)) {
      return res.status(502).json({
        recommendations: [],
        status: 'error',
        message: 'Invalid response format from recommendation engine.',
      });
    }

    // SERVER-SIDE VALIDATION:
    // Reject or remove any recommendation whose itemId does not exist in the supplied items!
    const validatedRecommendations: any[] = [];
    const seenItemIds = new Set<string>();

    for (const rec of parsed.recommendations) {
      if (!rec || typeof rec.itemId !== 'string') continue;
      const cleanId = rec.itemId.trim();

      // STRICT VALIDATION: Must exist in supplied items!
      if (!itemMap.has(cleanId)) {
        console.warn(`[Planora Security] Rejected hallucinated itemId from Gemini: "${cleanId}"`);
        continue;
      }

      // Avoid duplicates
      if (seenItemIds.has(cleanId)) continue;
      seenItemIds.add(cleanId);

      const realItem = itemMap.get(cleanId);

      // Validate reason
      const reason = typeof rec.reason === 'string' && rec.reason.trim().length > 0
        ? rec.reason.trim()
        : `Matches your ${preferences.mood || ''} mood and outing in ${preferences.location || ''}.`;

      // Validate suitabilityScore (clamp between 1 and 100)
      let score = typeof rec.suitabilityScore === 'number' && !isNaN(rec.suitabilityScore)
        ? Math.round(rec.suitabilityScore)
        : 85;
      score = Math.max(1, Math.min(100, score));

      // Validate estimatedCost: only allow if original item had a price or if number
      let cost: number | null = null;
      if (realItem.price !== null && typeof rec.estimatedCost === 'number' && !isNaN(rec.estimatedCost) && rec.estimatedCost > 0) {
        cost = rec.estimatedCost;
      } else if (realItem.price !== null && typeof realItem.price === 'number') {
        cost = realItem.price;
      } else {
        // Enforce null: do not allow Gemini to invent prices when data layer has none
        cost = null;
      }

      validatedRecommendations.push({
        itemId: cleanId,
        item: realItem,
        reason,
        estimatedCost: cost,
        suitabilityScore: score,
      });

      if (validatedRecommendations.length >= 6) {
        break;
      }
    }

    if (validatedRecommendations.length === 0) {
      return res.json({
        recommendations: [],
        status: 'empty',
        message: 'No strong matches found from the available local options.',
      });
    }

    // Sort by suitabilityScore descending
    validatedRecommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    return res.json({
      recommendations: validatedRecommendations,
      status: 'success',
      message: `Recommended ${validatedRecommendations.length} verified spots for your plan.`,
    });
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    return res.status(500).json({
      recommendations: [],
      status: 'error',
      message: 'Unable to curate recommendations at this time. Please try again.',
    });
  }
});

// 5. Complete Outing Plans Engine (Chunk 4B): Composes 2-3 complete multi-stop outing plans
app.post('/api/plans', async (req: Request, res: Response) => {
  try {
    const { preferences, items, recommendations } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        plans: [],
        status: 'error',
        message: 'Outing planning service is currently unavailable.',
      });
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        plans: [],
        status: 'error',
        message: 'Preferences object is required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({
        plans: [],
        status: 'empty',
        message: 'No real-world places available to create outing plans from.',
      });
    }

    // Build lookup map of verified real-world items
    const itemMap = new Map<string, any>();
    for (const item of items) {
      if (item && item.id) {
        itemMap.set(String(item.id), item);
      }
    }

    if (itemMap.size === 0) {
      return res.json({
        plans: [],
        status: 'empty',
        message: 'No valid real-world items found in the supplied data.',
      });
    }

    // Prepare clean item representations for Gemini prompt
    const sanitizedItems = Array.from(itemMap.values()).map((it) => ({
      id: it.id,
      name: it.name,
      type: it.type || 'place',
      category: it.category || 'Spot',
      description: it.description || '',
      location: it.location || '',
      price: it.price !== undefined ? it.price : null,
      latitude: it.latitude || null,
      longitude: it.longitude || null,
    }));

    // Optional top recommendations as contextual guidance
    const topRecContext = Array.isArray(recommendations) && recommendations.length > 0
      ? recommendations.slice(0, 6).map((r: any) => ({
          itemId: r.itemId,
          name: r.item?.name,
          suitabilityScore: r.suitabilityScore,
          reason: r.reason,
        }))
      : [];

    const prompt = `You are Planora's Outing Plan Architect.
Your task is to compose 2 to 3 complete, realistic, multi-stop outing plans for the user by combining items STRICTLY from the supplied list of real-world places.

### STRICT REAL-WORLD ACCURACY RULES:
1. You may ONLY use items from the supplied list of real-world items. NEVER invent, hallucinate, or assume a venue, business, event, price, address, coordinate, date, or URL that is not present in the list.
2. Every stop MUST have an 'itemId' that exactly matches an 'id' from the supplied list.
3. Each plan should preferably feature 2 to 3 stops (or 1 stop if only 1 suitable item exists in the supplied data). Do NOT force 3 stops if only 2 make sense.
4. Do NOT repeat the same 'itemId' within the same plan.
5. Make the 2 to 3 plans meaningfully different from each other (e.g. different themes, pacing, or types of activities tailored to the user's mood and companions).
6. Plan stops must be sequentially ordered (order: 1, 2, 3...) in a logical chronological outing sequence (e.g., afternoon activity followed by dinner/coffee, or entertainment followed by casual hangout).
7. For each plan, provide:
   - 'id': a simple unique string like "plan-1", "plan-2", "plan-3".
   - 'title': a catchy, attractive title summarizing the outing theme (e.g., "High-Energy Entertainment & Bites", "Relaxed Chill & Coffee Route").
   - 'description': a short 1-2 sentence overview of why this combination works together.
   - 'stops': list of stops with 'itemId', 'order' (1, 2, ...), and a short 'reason' explaining why this stop fits into this plan in sequence.

### USER PREFERENCES:
- Mood: ${preferences.mood || 'Any'}
- Outing Budget: PKR ${preferences.budget ? Number(preferences.budget).toLocaleString() : 'Flexible'}
- Group Type: ${preferences.groupType || 'Solo'}
- Selected Location: ${preferences.location || 'Local area'}
${preferences.latitude && preferences.longitude ? `- Anchor Coordinates: (${preferences.latitude}, ${preferences.longitude})` : ''}
- Planned Date: ${preferences.date || 'Today'}

${topRecContext.length > 0 ? `### TOP VERIFIED CANDIDATES IDENTIFIED EARLIER:\n${JSON.stringify(topRecContext, null, 2)}\n` : ''}

### AVAILABLE REAL-WORLD ITEMS (Total: ${sanitizedItems.length}):
${JSON.stringify(sanitizedItems, null, 2)}
`;

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                plans: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      stops: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            itemId: { type: Type.STRING },
                            order: { type: Type.INTEGER },
                            reason: { type: Type.STRING },
                          },
                          required: ['itemId', 'order', 'reason'],
                        },
                      },
                    },
                    required: ['id', 'title', 'description', 'stops'],
                  },
                },
              },
              required: ['plans'],
            },
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini plans attempt on ${modelName} encountered issue]:`, err instanceof Error ? err.message : err);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All model attempts failed to return content');
    }

    const responseText = response.text ? response.text.trim() : '';
    if (!responseText) {
      return res.status(502).json({
        plans: [],
        status: 'error',
        message: 'Empty response received from plan generation engine.',
      });
    }

    let parsed: { plans?: any[] };
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini plans JSON:', parseError, responseText);
      return res.status(502).json({
        plans: [],
        status: 'error',
        message: 'Outing plan engine produced malformed output.',
      });
    }

    if (!parsed || !Array.isArray(parsed.plans)) {
      return res.status(502).json({
        plans: [],
        status: 'error',
        message: 'Invalid response format from outing plan engine.',
      });
    }

    // SERVER-SIDE VALIDATION & AUTHORITATIVE TOTALS CALCULATION:
    const validatedPlans: any[] = [];

    for (let i = 0; i < parsed.plans.length && validatedPlans.length < 3; i++) {
      const plan = parsed.plans[i];
      if (!plan || typeof plan !== 'object') continue;

      const title = typeof plan.title === 'string' && plan.title.trim()
        ? plan.title.trim()
        : `Outing Plan ${validatedPlans.length + 1}`;
      const description = typeof plan.description === 'string' && plan.description.trim()
        ? plan.description.trim()
        : 'Curated combination of local venues.';

      if (!Array.isArray(plan.stops) || plan.stops.length === 0) continue;

      const validStops: any[] = [];
      const seenItemIdsInPlan = new Set<string>();

      // Sort raw stops by order if given
      const rawStops = [...plan.stops].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

      for (const stop of rawStops) {
        if (!stop || typeof stop.itemId !== 'string') continue;
        const cleanId = stop.itemId.trim();

        // STRICT VALIDATION: Every stop must exist in the real-world items supplied!
        if (!itemMap.has(cleanId)) {
          console.warn(`[Planora Security] Rejected hallucinated stop itemId in plan "${title}": "${cleanId}"`);
          continue;
        }

        // Avoid repeating the same venue within a plan
        if (seenItemIdsInPlan.has(cleanId)) continue;
        seenItemIdsInPlan.add(cleanId);

        const realItem = itemMap.get(cleanId);
        const reason = typeof stop.reason === 'string' && stop.reason.trim()
          ? stop.reason.trim()
          : `Enjoy ${realItem.name} as stop #${validStops.length + 1}.`;

        validStops.push({
          itemId: cleanId,
          order: validStops.length + 1,
          reason,
          item: realItem,
          estimatedCost: realItem.price !== null && typeof realItem.price === 'number' ? realItem.price : null,
        });

        if (validStops.length >= 3) break;
      }

      if (validStops.length === 0) continue;

      // Safe Server Calculation of Totals:
      // If ALL stops have non-null numeric prices, sum them up.
      // If ANY stop has null price, total is null.
      const allPricesKnown = validStops.every(s => s.estimatedCost !== null && typeof s.estimatedCost === 'number');
      const knownSum = validStops.reduce((sum, s) => sum + (typeof s.estimatedCost === 'number' ? s.estimatedCost : 0), 0);
      let estimatedTotalCost: number | null = null;
      let budgetStatus: 'within_budget' | 'unknown' | 'over_budget' = 'unknown';

      if (allPricesKnown) {
        estimatedTotalCost = knownSum;
        if (typeof preferences.budget === 'number' && preferences.budget > 0) {
          budgetStatus = knownSum > preferences.budget ? 'over_budget' : 'within_budget';
        } else {
          budgetStatus = 'within_budget';
        }
      } else {
        estimatedTotalCost = null;
        // Even if some prices are unlisted, if the known prices already exceed the budget, flag as over_budget
        if (typeof preferences.budget === 'number' && preferences.budget > 0 && knownSum > preferences.budget) {
          budgetStatus = 'over_budget';
        } else {
          budgetStatus = 'unknown';
        }
      }

      validatedPlans.push({
        id: typeof plan.id === 'string' && plan.id.trim() ? plan.id.trim() : `plan-${validatedPlans.length + 1}`,
        title,
        description,
        stops: validStops,
        estimatedTotalCost,
        budgetStatus,
      });
    }

    if (validatedPlans.length === 0) {
      return res.json({
        plans: [],
        status: 'empty',
        message: 'No complete outing could be created from the available local options.',
      });
    }

    return res.json({
      plans: validatedPlans,
      status: 'success',
      message: `Created ${validatedPlans.length} complete outing plans.`,
    });
  } catch (error) {
    console.error('Failed to generate outing plans:', error);
    return res.status(500).json({
      plans: [],
      status: 'error',
      message: 'Unable to build complete outing plans at this time. Please try again.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Planora server running on http://localhost:${port}`);
  });
}

startServer();

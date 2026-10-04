import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  ExternalLink, 
  Navigation, 
  Compass, 
  Layers, 
  Maximize2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { NormalizedPlanoraItem, OutingPlan, OutingPlanStop } from '../types';

export interface PlanoraMapProps {
  userLocation?: {
    latitude: number | null;
    longitude: number | null;
    label?: string;
  } | null;
  items?: NormalizedPlanoraItem[];
  selectedPlan?: OutingPlan | null;
  activeStopIndex?: number | null;
  onSelectStop?: (stopIndex: number, stop: OutingPlanStop) => void;
  className?: string;
  heightClass?: string;
}

interface CoordinatePoint {
  lat: number;
  lng: number;
  title: string;
  type: 'user' | 'stop' | 'place';
  order?: number;
  stop?: OutingPlanStop;
  item?: NormalizedPlanoraItem;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const PlanoraMap: React.FC<PlanoraMapProps> = ({
  userLocation,
  items = [],
  selectedPlan,
  activeStopIndex = null,
  onSelectStop,
  className = '',
  heightClass = 'h-[420px] sm:h-[480px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [validPointsCount, setValidPointsCount] = useState(0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    try {
      // Guard against lingering leaflet ID on container during fast component remounts
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      // Default initial center (neutral fallback before fitBounds)
      const initialLat = userLocation?.latitude ?? 24.8607;
      const initialLng = userLocation?.longitude ?? 67.0011;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: true,
      });

      // Standard OpenStreetMap tiles with required attribution
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Clean zoom control on bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      setMapReady(true);
    } catch (err) {
      console.error('Failed to initialize Leaflet map:', err);
      setMapError('Interactive map could not load. You can still view all places in the list.');
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Leaflet cleanup warning:', e);
        }
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        markersMapRef.current.clear();
      }
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Update Markers when selectedPlan, items, or userLocation change
  const updateMapPoints = useCallback(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersMapRef.current.clear();

    const points: CoordinatePoint[] = [];

    // 1. User Location Point
    if (
      userLocation &&
      typeof userLocation.latitude === 'number' &&
      !isNaN(userLocation.latitude) &&
      typeof userLocation.longitude === 'number' &&
      !isNaN(userLocation.longitude)
    ) {
      points.push({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        title: userLocation.label || 'Your Location',
        type: 'user',
      });
    }

    // 2. Stops from Selected Plan (Primary) OR General Items (Fallback)
    if (selectedPlan && Array.isArray(selectedPlan.stops) && selectedPlan.stops.length > 0) {
      selectedPlan.stops.forEach((stop, idx) => {
        const it = stop.item;
        if (
          it &&
          typeof it.latitude === 'number' &&
          !isNaN(it.latitude) &&
          typeof it.longitude === 'number' &&
          !isNaN(it.longitude)
        ) {
          points.push({
            lat: it.latitude,
            lng: it.longitude,
            title: it.name,
            type: 'stop',
            order: stop.order || idx + 1,
            stop,
            item: it,
          });
        }
      });
    } else if (Array.isArray(items) && items.length > 0) {
      items.forEach((it) => {
        if (
          it &&
          typeof it.latitude === 'number' &&
          !isNaN(it.latitude) &&
          typeof it.longitude === 'number' &&
          !isNaN(it.longitude)
        ) {
          points.push({
            lat: it.latitude,
            lng: it.longitude,
            title: it.name,
            type: 'place',
            item: it,
          });
        }
      });
    }

    setValidPointsCount(points.length);

    if (points.length === 0) {
      return;
    }

    const bounds = L.latLngBounds([]);

    points.forEach((pt) => {
      bounds.extend([pt.lat, pt.lng]);

      let icon: L.DivIcon;

      if (pt.type === 'user') {
        icon = L.divIcon({
          className: 'planora-user-marker',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -50%);">
              <div style="width:28px; height:28px; border-radius:9999px; background:#2563eb; border:3px solid #ffffff; box-shadow:0 4px 6px -1px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; color:#ffffff;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div style="background:#1e3a8a; color:#ffffff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.2);">
                ${pt.title}
              </div>
            </div>
          `,
          iconSize: [30, 48],
          iconAnchor: [15, 24],
        });
      } else if (pt.type === 'stop') {
        const isSelectedStop = activeStopIndex !== null && pt.order === (activeStopIndex + 1);
        const bg = isSelectedStop ? '#111827' : '#ea580c';
        const border = isSelectedStop ? '#f97316' : '#ffffff';

        icon = L.divIcon({
          className: 'planora-stop-marker',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); cursor:pointer;">
              <div style="width:${isSelectedStop ? 34 : 30}px; height:${isSelectedStop ? 34 : 30}px; border-radius:9999px; background:${bg}; border:2.5px solid ${border}; box-shadow:0 6px 12px -2px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:800; font-size:${isSelectedStop ? 14 : 12}px; font-family:inherit;">
                ${pt.order}
              </div>
              <div style="width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-top:6px solid ${bg};"></div>
            </div>
          `,
          iconSize: [36, 42],
          iconAnchor: [18, 40],
        });
      } else {
        icon = L.divIcon({
          className: 'planora-place-marker',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); cursor:pointer;">
              <div style="width:26px; height:26px; border-radius:9999px; background:#475569; border:2px solid #ffffff; box-shadow:0 4px 6px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; color:#ffffff;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div style="width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-top:5px solid #475569;"></div>
            </div>
          `,
          iconSize: [28, 34],
          iconAnchor: [14, 32],
        });
      }

      const marker = L.marker([pt.lat, pt.lng], { icon });

      // Build Rich HTML Popup
      if (pt.type === 'user') {
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
            <div style="font-weight: 700; color: #1e3a8a; font-size: 13px; margin-bottom: 2px;">
              📍 ${pt.title}
            </div>
            <div style="color: #64748b; font-size: 11px;">
              Your selected geographic anchor coordinates.
            </div>
          </div>
        `);
      } else {
        const item = pt.item;
        const stop = pt.stop;
        const placeName = item?.name || pt.title;
        const category = item?.category || 'Point of Interest';
        const address = item?.location || '';
        const price = stop?.estimatedCost !== null && stop?.estimatedCost !== undefined
          ? `PKR ${Number(stop.estimatedCost).toLocaleString()}`
          : item?.price !== null && item?.price !== undefined
          ? `PKR ${Number(item.price).toLocaleString()}`
          : null;
        const reason = stop?.reason || '';
        const mapsUrl = item?.sourceUrl || null;

        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'inherit';
        popupContent.style.minWidth = '220px';
        popupContent.style.maxWidth = '280px';
        popupContent.style.padding = '4px 2px';

        popupContent.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${pt.order ? `
              <div style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; text-transform:uppercase; color:#ea580c; background:#fff7ed; border:1px solid #ffedd5; padding:2px 6px; border-radius:4px; width:fit-content;">
                Stop #${pt.order} of Plan
              </div>
            ` : ''}

            <div>
              <div style="font-weight:700; color:#111827; font-size:14px; line-height:1.2;">
                ${escapeHtml(placeName)}
              </div>
              <div style="font-size:11px; color:#6b7280; margin-top:2px;">
                ${escapeHtml(category)} ${price ? `• <strong style="color:#059669;">${escapeHtml(price)}</strong>` : ''}
              </div>
            </div>

            ${address ? `
              <div style="font-size:11px; color:#4b5563; line-height:1.3; background:#f9fafb; padding:4px 6px; border-radius:4px; border:1px solid #f3f4f6;">
                ${escapeHtml(address)}
              </div>
            ` : ''}

            ${reason ? `
              <div style="font-size:11px; color:#7c2d12; background:#fff7ed; padding:4px 6px; border-radius:4px; border:1px solid #fed7aa; line-height:1.3;">
                <strong>Why this stop:</strong> ${escapeHtml(reason)}
              </div>
            ` : ''}

            ${mapsUrl ? `
              <div style="margin-top:4px; padding-top:6px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end;">
                <a 
                  href="${mapsUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style="display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:#ea580c; text-decoration:none;"
                >
                  <span>Open in Google Maps</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);

        if (pt.type === 'stop' && stop && onSelectStop && pt.order !== undefined) {
          marker.on('click', () => {
            onSelectStop(pt.order! - 1, stop);
          });
        }
      }

      layer.addLayer(marker);

      const markerKey = pt.type === 'stop' ? `stop-${pt.order}` : pt.type === 'user' ? 'user' : `place-${pt.item?.id}`;
      markersMapRef.current.set(markerKey, marker);
    });

    // Auto-fit bounds
    try {
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 14, { animate: true });
      } else if (points.length > 1) {
        map.fitBounds(bounds, {
          padding: [45, 45],
          maxZoom: 15,
          animate: true,
        });
      }
    } catch (e) {
      console.warn('Map fitBounds warning:', e);
    }
  }, [userLocation, items, selectedPlan, activeStopIndex, onSelectStop]);

  // Trigger marker refresh when inputs change
  useEffect(() => {
    if (mapReady) {
      updateMapPoints();
    }
  }, [mapReady, updateMapPoints]);

  // React to external activeStopIndex change: pan to marker and open popup
  useEffect(() => {
    if (!mapReady || activeStopIndex === null || !selectedPlan) return;
    const markerKey = `stop-${activeStopIndex + 1}`;
    const marker = markersMapRef.current.get(markerKey);
    const map = mapInstanceRef.current;

    if (marker && map) {
      const latLng = marker.getLatLng();
      map.panTo(latLng, { animate: true });
      marker.openPopup();
    }
  }, [activeStopIndex, selectedPlan, mapReady]);

  // Resize handler for tabs/containers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedPlan]);

  const handleRecenter = () => {
    updateMapPoints();
  };

  return (
    <div className={`relative bg-neutral-100 rounded-2xl border border-neutral-200 overflow-hidden shadow-xs flex flex-col ${className}`}>
      {/* Map Header / Legend Bar */}
      <div className="bg-white/95 backdrop-blur-xs px-4 py-2.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-neutral-900 font-display truncate max-w-[150px] sm:max-w-xs md:max-w-md">
            {selectedPlan ? `Route: ${selectedPlan.title}` : 'Geographic Map'}
          </span>
          {validPointsCount > 0 && (
            <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full shrink-0">
              {validPointsCount} {validPointsCount === 1 ? 'spot' : 'spots'} mapped
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Legend items */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-600">
            {userLocation?.latitude && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                <span>You</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block"></span>
              <span>Plan Stops</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleRecenter}
            title="Fit all markers in view"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3 text-neutral-500" />
            <span>Fit Map</span>
          </button>
        </div>
      </div>

      {/* Map Canvas / Fallback */}
      {mapError ? (
        <div className={`${heightClass} flex flex-col items-center justify-center p-6 text-center bg-neutral-50`}>
          <AlertCircle className="w-8 h-8 text-neutral-400 mb-2" />
          <p className="text-xs text-neutral-600 max-w-sm">{mapError}</p>
        </div>
      ) : validPointsCount === 0 && mapReady ? (
        <div className="relative">
          <div ref={mapContainerRef} className={`${heightClass} w-full opacity-60`} />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/70 backdrop-blur-xs pointer-events-none">
            <MapPin className="w-8 h-8 text-neutral-400 mb-2" />
            <h6 className="text-xs font-bold text-neutral-800">No Geographic Coordinates Available</h6>
            <p className="text-[11px] text-neutral-500 max-w-xs mt-1">
              The retrieved venues do not include coordinates for map rendering. You can still access them directly via Google Maps links.
            </p>
          </div>
        </div>
      ) : (
        <div ref={mapContainerRef} className={`${heightClass} w-full z-0`} />
      )}
    </div>
  );
};

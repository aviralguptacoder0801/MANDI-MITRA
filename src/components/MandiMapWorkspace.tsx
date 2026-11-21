import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  Sparkles,
  Store,
  Warehouse,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CROPS,
  UP_DISTRICTS,
  type CropId,
  type DistrictId,
  type LanguageCode,
} from '../data/upMandis';
import type { GroundingSource } from '../utils/grounding';
import { DISTRICT_GEO, type UiStrings } from '../utils/i18n';
import { formatINR, type RankedMandiProfit } from '../utils/mandiEngine';

interface MandiMapWorkspaceProps {
  mapsApiKey: string;
  cropId: CropId;
  originDistrict: DistrictId;
  userGps: { lat: number; lng: number } | null;
  rankedMandis: RankedMandiProfit[];
  language: LanguageCode;
  t: UiStrings;
}

interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  googleMapsUri?: string;
  category: 'mandi' | 'cold_store' | 'kvk';
}

interface ActiveRouteSummary {
  destinationName: string;
  distanceKm: number;
  durationMins: number;
  googleMapsDirUrl: string;
}

interface MapPolylineLike {
  setOptions: (opts: Record<string, unknown>) => void;
  setMap: (map: unknown) => void;
}

interface PlaceLatLngLike {
  lat: () => number;
  lng: () => number;
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceeded') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('429')
  );
}

interface InnerMapControllerProps {
  originLatLng: { lat: number; lng: number };
  originLabel: string;
  selectedMandi: RankedMandiProfit;
  topMandis: RankedMandiProfit[];
  onSelectMandi: (mandi: RankedMandiProfit) => void;
  searchTrigger: { category: 'mandi' | 'cold_store' | 'kvk'; seq: number } | null;
  districtName: string;
  discoveredPlaces: DiscoveredPlace[];
  onPlacesDiscovered: (places: DiscoveredPlace[]) => void;
  onPlacesLoading: (loading: boolean) => void;
  onPlacesError: (err: string | null) => void;
  selectedPlace: DiscoveredPlace | null;
  onSelectPlace: (place: DiscoveredPlace | null) => void;
  onRouteComputed: (summary: ActiveRouteSummary | null) => void;
  onRouteLoading: (loading: boolean) => void;
  onRouteError: (err: string | null) => void;
}

function InnerMapController({
  originLatLng,
  originLabel,
  selectedMandi,
  topMandis,
  onSelectMandi,
  searchTrigger,
  districtName,
  discoveredPlaces,
  onPlacesDiscovered,
  onPlacesLoading,
  onPlacesError,
  selectedPlace,
  onSelectPlace,
  onRouteComputed,
  onRouteLoading,
  onRouteError,
}: InnerMapControllerProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const placesLib = useMapsLibrary('places');
  const loadingStatus = useApiLoadingStatus();

  const polylinesRef = useRef<MapPolylineLike[]>([]);
  const [infoTarget, setInfoTarget] = useState<
    | { kind: 'mandi'; mandi: RankedMandiProfit; position: { lat: number; lng: number } }
    | { kind: 'place'; place: DiscoveredPlace }
    | null
  >(null);

  const destinationPoint = selectedPlace
    ? selectedPlace.location
    : {
        lat: DISTRICT_GEO[selectedMandi.mandi.district].lat,
        lng: DISTRICT_GEO[selectedMandi.mandi.district].lng,
      };
  const destinationName = selectedPlace ? selectedPlace.name : selectedMandi.mandi.name;

  // Modern Routes API: compute driving route via useMapsLibrary('routes') -> Route.computeRoutes
  useEffect(() => {
    if (!routesLib || !map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteError(null);

    const sameSpot =
      Math.abs(originLatLng.lat - destinationPoint.lat) < 0.004 &&
      Math.abs(originLatLng.lng - destinationPoint.lng) < 0.004;

    const googleMapsDirUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLatLng.lat},${originLatLng.lng}&destination=${destinationPoint.lat},${destinationPoint.lng}&travelmode=driving`;

    if (sameSpot) {
      map.panTo(originLatLng);
      map.setZoom(12);
      onRouteComputed({
        destinationName,
        distanceKm: 4,
        durationMins: 12,
        googleMapsDirUrl,
      });
      onRouteLoading(false);
      return;
    }

    let cancelled = false;
    onRouteLoading(true);

    const routeClass = (routesLib as unknown as {
      Route?: {
        computeRoutes: (req: Record<string, unknown>) => Promise<{
          routes?: Array<{
            distanceMeters?: number;
            durationMillis?: number;
            viewport?: unknown;
            createPolylines: () => MapPolylineLike[];
          }>;
        }>;
      };
    }).Route;

    if (!routeClass?.computeRoutes) {
      onRouteLoading(false);
      return;
    }

    routeClass
      .computeRoutes({
        origin: originLatLng,
        destination: destinationPoint,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      })
      .then((result) => {
        if (cancelled) return;
        onRouteLoading(false);
        const primaryRoute = result?.routes?.[0];
        if (!primaryRoute) {
          onRouteComputed({
            destinationName,
            distanceKm: selectedMandi.distanceKm,
            durationMins: Math.round(selectedMandi.distanceKm * 1.6),
            googleMapsDirUrl,
          });
          return;
        }

        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#047857',
            strokeWeight: 5,
            strokeOpacity: 0.9,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          (map as unknown as { fitBounds: (bounds: unknown, padding?: number) => void }).fitBounds(
            primaryRoute.viewport,
            48
          );
        }

        const distanceKm = Number(((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(1));
        const durationMins = Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000));

        onRouteComputed({
          destinationName,
          distanceKm,
          durationMins,
          googleMapsDirUrl,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        onRouteLoading(false);
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteError('Live route preview unavailable right now — use Open in Google Maps for turn-by-turn navigation.');
        onRouteComputed({
          destinationName,
          distanceKm: selectedMandi.distanceKm,
          durationMins: Math.round(selectedMandi.distanceKm * 1.6),
          googleMapsDirUrl,
        });
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    routesLib,
    map,
    originLatLng.lat,
    originLatLng.lng,
    destinationPoint.lat,
    destinationPoint.lng,
    destinationName,
    selectedMandi.distanceKm,
    onRouteComputed,
    onRouteLoading,
    onRouteError,
  ]);

  // Modern Places API (New): search real nearby Mandis, Cold Storages, or KVK Centers
  useEffect(() => {
    if (!searchTrigger || !placesLib || !map) return;

    let cancelled = false;
    onPlacesLoading(true);
    onPlacesError(null);

    const queryByCategory: Record<'mandi' | 'cold_store' | 'kvk', string> = {
      mandi: `APMC Krishi Utpadan Mandi Samiti near ${districtName} Uttar Pradesh`,
      cold_store: `Cold Storage potato warehouse near ${districtName} Uttar Pradesh`,
      kvk: `Krishi Vigyan Kendra agriculture center near ${districtName} Uttar Pradesh`,
    };

    const placeClass = (placesLib as unknown as {
      Place?: {
        searchByText: (req: Record<string, unknown>) => Promise<{
          places?: Array<{
            id?: string;
            displayName?: string;
            formattedAddress?: string;
            location?: PlaceLatLngLike;
            rating?: number;
            googleMapsURI?: string;
          }>;
        }>;
      };
    }).Place;

    if (!placeClass?.searchByText) {
      onPlacesLoading(false);
      return;
    }

    placeClass
      .searchByText({
        textQuery: queryByCategory[searchTrigger.category],
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'googleMapsURI'],
        locationBias: {
          center: originLatLng,
          radius: 45000,
        },
        maxResultCount: 6,
      })
      .then((res) => {
        if (cancelled) return;
        onPlacesLoading(false);
        const rawPlaces = res?.places ?? [];
        const mapped: DiscoveredPlace[] = rawPlaces
          .filter((p) => p.location)
          .map((p, idx) => ({
            id: p.id || `place-${idx}`,
            name: p.displayName || 'Nearby Agricultural Facility',
            address: p.formattedAddress || `${districtName}, Uttar Pradesh`,
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
            rating: p.rating,
            googleMapsUri: p.googleMapsURI,
            category: searchTrigger.category,
          }));

        onPlacesDiscovered(mapped);
        if (mapped.length > 0) {
          onSelectPlace(mapped[0]);
          setInfoTarget({ kind: 'place', place: mapped[0] });
          map.panTo(mapped[0].location);
          map.setZoom(11);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        onPlacesLoading(false);
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onPlacesError('Could not load nearby places right now. Please try again in a moment.');
      });

    return () => {
      cancelled = true;
    };
  }, [
    searchTrigger,
    placesLib,
    map,
    districtName,
    originLatLng.lat,
    originLatLng.lng,
    onPlacesDiscovered,
    onPlacesLoading,
    onPlacesError,
    onSelectPlace,
  ]);

  if (
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return null;
  }

  return (
    <>
      {/* Origin (Farmer Farm / GPS Location) Marker */}
      <AdvancedMarker position={originLatLng} title={originLabel}>
        <Pin background="#0f172a" borderColor="#ffffff" glyphColor="#ffffff" scale={1.15} />
      </AdvancedMarker>

      {/* Top Ranked UP Mandi Markers */}
      {topMandis.map((entry, idx) => {
        const geo = DISTRICT_GEO[entry.mandi.district];
        const isBest = idx === 0;
        const isSelected = !selectedPlace && selectedMandi.mandi.id === entry.mandi.id;
        return (
          <AdvancedMarker
            key={entry.mandi.id}
            position={{ lat: geo.lat, lng: geo.lng }}
            title={`${entry.mandi.name} — ${formatINR(entry.netProfitRs)}`}
            onClick={() => {
              onSelectPlace(null);
              onSelectMandi(entry);
              setInfoTarget({ kind: 'mandi', mandi: entry, position: { lat: geo.lat, lng: geo.lng } });
            }}
          >
            <Pin
              background={isBest ? '#047857' : isSelected ? '#0284c7' : '#d97706'}
              borderColor="#ffffff"
              glyphColor="#ffffff"
              scale={isBest || isSelected ? 1.25 : 1.0}
            />
          </AdvancedMarker>
        );
      })}

      {/* Live Discovered Places API (New) Markers */}
      {discoveredPlaces.map((place) => (
        <AdvancedMarker
          key={place.id}
          position={place.location}
          title={place.name}
          onClick={() => {
            onSelectPlace(place);
            setInfoTarget({ kind: 'place', place });
          }}
        >
          <Pin
            background={place.category === 'cold_store' ? '#0284c7' : '#7c3aed'}
            borderColor="#ffffff"
            glyphColor="#ffffff"
            scale={selectedPlace?.id === place.id ? 1.2 : 1.0}
          />
        </AdvancedMarker>
      ))}

      {/* InfoWindow */}
      {infoTarget && (
        <InfoWindow
          position={
            infoTarget.kind === 'mandi' ? infoTarget.position : infoTarget.place.location
          }
          onCloseClick={() => setInfoTarget(null)}
        >
          {infoTarget.kind === 'mandi' ? (
            <div className="p-1 max-w-[220px] space-y-1">
              <p className="font-bold text-xs text-slate-900">{infoTarget.mandi.mandi.name}</p>
              <p className="text-[11px] text-emerald-800 font-semibold">
                Net Take-Home: {formatINR(infoTarget.mandi.netProfitRs)}
              </p>
              <p className="text-[11px] text-slate-600">
                Fair Rate: ₹{infoTarget.mandi.gradeAdjustedPricePerQtl}/qtl ·{' '}
                {infoTarget.mandi.distanceKm} km
              </p>
            </div>
          ) : (
            <div className="p-1 max-w-[230px] space-y-1">
              <p className="font-bold text-xs text-slate-900">{infoTarget.place.name}</p>
              <p className="text-[11px] text-slate-600">{infoTarget.place.address}</p>
              {infoTarget.place.rating && (
                <p className="text-[11px] font-semibold text-amber-700">
                  ★ {infoTarget.place.rating.toFixed(1)}
                </p>
              )}
              {infoTarget.place.googleMapsUri && (
                <a
                  href={infoTarget.place.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 underline"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          )}
        </InfoWindow>
      )}
    </>
  );
}

export function MandiMapWorkspace({
  mapsApiKey,
  cropId,
  originDistrict,
  userGps,
  rankedMandis,
  language,
  t,
}: MandiMapWorkspaceProps) {
  const crop = CROPS[cropId];
  const districtInfo = UP_DISTRICTS.find((d) => d.id === originDistrict) ?? UP_DISTRICTS[0];
  const originGeo = DISTRICT_GEO[originDistrict];
  const originLatLng = userGps ?? { lat: originGeo.lat, lng: originGeo.lng };
  const topMandis = rankedMandis.slice(0, 5);

  const [selectedMandi, setSelectedMandi] = useState<RankedMandiProfit>(rankedMandis[0]);
  const [selectedPlace, setSelectedPlace] = useState<DiscoveredPlace | null>(null);
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [searchTrigger, setSearchTrigger] = useState<{
    category: 'mandi' | 'cold_store' | 'kvk';
    seq: number;
  } | null>(null);

  const [routeSummary, setRouteSummary] = useState<ActiveRouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Google Maps Grounding AI briefing state
  const [mapsBriefLoading, setMapsBriefLoading] = useState(false);
  const [mapsBriefError, setMapsBriefError] = useState<string | null>(null);
  const [mapsBrief, setMapsBrief] = useState<{
    summary: string;
    sources: GroundingSource[];
  } | null>(null);

  // Sync selected mandi when top mandi changes with crop/origin change
  useEffect(() => {
    setSelectedMandi(rankedMandis[0]);
    setSelectedPlace(null);
  }, [cropId, originDistrict]);

  const triggerPlaceSearch = useCallback((category: 'mandi' | 'cold_store' | 'kvk') => {
    setSearchTrigger((prev) => ({ category, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  async function handleFetchAiMapsBrief() {
    setMapsBriefLoading(true);
    setMapsBriefError(null);
    try {
      const res = await fetch('/api/live-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'maps',
          cropName: `${crop.nameEn} (${crop.nameHi})`,
          districtName: districtInfo.label,
          language,
          latLng: { latitude: originLatLng.lat, longitude: originLatLng.lng },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not fetch nearby Google Maps guide.');
      }
      setMapsBrief({
        summary: data.summary,
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (err) {
      setMapsBriefError(err instanceof Error ? err.message : 'Unable to fetch nearby guide.');
    } finally {
      setMapsBriefLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.map.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{t.map.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleFetchAiMapsBrief}
          disabled={mapsBriefLoading}
          data-testid="ai-maps-grounding-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          {mapsBriefLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          )}
          <span>{t.map.liveMapsBrief}</span>
        </button>
      </section>

      {/* One-Tap Category Finder Bar */}
      <section
        aria-label="Find nearby agricultural facilities"
        className="flex flex-wrap items-center gap-2.5"
      >
        <button
          type="button"
          onClick={() => {
            setSelectedPlace(null);
            setSelectedMandi(rankedMandis[0]);
          }}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            !selectedPlace
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <RouteIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.map.routeToBest}</span>
        </button>

        <button
          type="button"
          data-testid="find-nearby-mandis-btn"
          onClick={() => triggerPlaceSearch('mandi')}
          disabled={!mapsApiKey || placesLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-emerald-50 hover:border-emerald-400 transition-colors disabled:opacity-50"
        >
          <Store className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
          <span>{t.map.findMandis}</span>
        </button>

        <button
          type="button"
          data-testid="find-cold-stores-btn"
          onClick={() => triggerPlaceSearch('cold_store')}
          disabled={!mapsApiKey || placesLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-sky-50 hover:border-sky-400 transition-colors disabled:opacity-50"
        >
          <Warehouse className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
          <span>{t.map.findColdStores}</span>
        </button>

        <button
          type="button"
          onClick={() => triggerPlaceSearch('kvk')}
          disabled={!mapsApiKey || placesLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-purple-50 hover:border-purple-400 transition-colors disabled:opacity-50"
        >
          <Search className="w-3.5 h-3.5 text-purple-700" aria-hidden="true" />
          <span>{t.map.findKvk}</span>
        </button>

        {placesLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 ml-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" aria-hidden="true" />
            <span>Searching Google Maps...</span>
          </span>
        )}
      </section>

      {/* AI Google Maps Grounding Result Panel (when clicked) */}
      {(mapsBrief || mapsBriefError) && (
        <section
          aria-label="Google Maps AI Grounded Briefing"
          className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2.5"
        >
          {mapsBriefError ? (
            <p role="alert" className="text-xs text-red-700">
              {mapsBriefError}
            </p>
          ) : (
            mapsBrief && (
              <>
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Google Maps Grounded Guide · {districtInfo.label}</span>
                </p>
                <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                  {mapsBrief.summary}
                </p>
                {mapsBrief.sources.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap gap-2">
                    {mapsBrief.sources.map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors"
                      >
                        <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{src.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )
          )}
        </section>
      )}

      {/* Main Split: Interactive Google Map (8 cols) + Simple Route & Mandi Cards (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-3">
          {/* Live Route Summary Strip */}
          {routeSummary && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                <span className="font-bold text-slate-900">
                  {districtInfo.label} → {routeSummary.destinationName}
                </span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums font-semibold text-emerald-800">
                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                  {routeSummary.distanceKm} km
                </span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums font-medium text-slate-700">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  ~{routeSummary.durationMins} min
                </span>
              </div>

              <a
                href={routeSummary.googleMapsDirUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>{t.map.openGoogleMaps}</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          {routeLoading && (
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" aria-hidden="true" />
              <span>Calculating driving route via Google Maps Routes API...</span>
            </p>
          )}
          {routeError && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {routeError}
            </p>
          )}
          {placesError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {placesError}
            </p>
          )}

          {/* Explicit-Height Google Maps Container (CF2) */}
          <div
            data-testid="google-map-container"
            className="w-full h-[420px] sm:h-[480px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative"
          >
            {mapsApiKey ? (
              <APIProvider
                apiKey={mapsApiKey}
                libraries={['marker', 'routes', 'places']}
                language={language === 'en' ? 'en' : 'hi'}
                region="IN"
              >
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={originLatLng}
                  defaultZoom={8}
                  gestureHandling="greedy"
                  fullscreenControl
                  streetViewControl={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  <InnerMapController
                    originLatLng={originLatLng}
                    originLabel={`${districtInfo.label} (${districtInfo.labelHi})`}
                    selectedMandi={selectedMandi}
                    topMandis={topMandis}
                    onSelectMandi={setSelectedMandi}
                    searchTrigger={searchTrigger}
                    districtName={districtInfo.label}
                    discoveredPlaces={discoveredPlaces}
                    onPlacesDiscovered={setDiscoveredPlaces}
                    onPlacesLoading={setPlacesLoading}
                    onPlacesError={setPlacesError}
                    selectedPlace={selectedPlace}
                    onSelectPlace={setSelectedPlace}
                    onRouteComputed={setRouteSummary}
                    onRouteLoading={setRouteLoading}
                    onRouteError={setRouteError}
                  />
                </GoogleMap>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                <MapPin className="w-8 h-8 text-emerald-700" aria-hidden="true" />
                <p className="font-display text-sm font-bold text-slate-900">
                  Google Maps Platform is ready once an API key is active
                </p>
                <p className="text-xs text-slate-600 max-w-md">
                  You can still open turn-by-turn directions directly in Google Maps for any mandi listed on the right.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Top Profitable Mandis + Live Discovered Places */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
            <h2 className="font-display text-sm font-bold text-slate-900">
              {language === 'en'
                ? `Top Mandis for ${crop.nameEn}`
                : `${crop.nameHi} की सबसे फायदेमंद मंडियां (रास्ता चुनें)`}
            </h2>
            <div className="space-y-2">
              {topMandis.slice(0, 4).map((entry, idx) => {
                const active = !selectedPlace && selectedMandi.mandi.id === entry.mandi.id;
                const destGeo = DISTRICT_GEO[entry.mandi.district];
                const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLatLng.lat},${originLatLng.lng}&destination=${destGeo.lat},${destGeo.lng}&travelmode=driving`;
                return (
                  <div
                    key={entry.mandi.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      active
                        ? 'bg-emerald-50 border-emerald-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlace(null);
                        setSelectedMandi(entry);
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            #{idx + 1} {language === 'en' ? entry.mandi.name : entry.mandi.nameHi}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {entry.mandi.districtLabel} · {entry.distanceKm} km
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-sm font-bold text-emerald-800 shrink-0">
                          {formatINR(entry.netProfitRs)}
                        </span>
                      </div>
                    </button>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-mono tabular-nums">
                        ₹{entry.gradeAdjustedPricePerQtl}/qtl
                      </span>
                      <a
                        href={dirUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                      >
                        <span>Directions</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Google Places (New) Results */}
          {discoveredPlaces.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
              <h2 className="font-display text-sm font-bold text-slate-900">
                Google Maps Places Nearby ({discoveredPlaces.length})
              </h2>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {discoveredPlaces.map((place) => {
                  const isActive = selectedPlace?.id === place.id;
                  return (
                    <div
                      key={place.id}
                      className={`rounded-lg border p-2.5 text-xs transition-colors ${
                        isActive
                          ? 'bg-sky-50 border-sky-500'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlace(place)}
                        className="w-full text-left"
                      >
                        <p className="font-bold text-slate-900 leading-snug">{place.name}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{place.address}</p>
                      </button>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-amber-700 font-semibold">
                          {place.rating ? `★ ${place.rating.toFixed(1)}` : 'Verified Place'}
                        </span>
                        {place.googleMapsUri && (
                          <a
                            href={place.googleMapsUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                          >
                            <span>Maps</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

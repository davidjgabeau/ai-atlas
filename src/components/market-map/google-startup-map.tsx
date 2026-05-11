"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

import { categoryStyles } from "@/components/market-map/category-style";
import {
  buildCompanyMapLocations,
  categoryColors,
  getNormalizedMapPosition,
  type CompanyMapLocation,
  type LatLngLiteral,
} from "@/lib/map-layout";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import type { Company, ConsumptionIntensity } from "@/types/market";

type MapStyle = {
  featureType?: string;
  elementType?: string;
  stylers: Array<Record<string, string | number | boolean>>;
};

type MapOptions = Record<string, unknown> & {
  center: LatLngLiteral;
  zoom: number;
  styles?: MapStyle[];
};

type GoogleMap = {
  fitBounds(bounds: GoogleLatLngBounds, padding?: number): void;
  setCenter(center: LatLngLiteral): void;
  setZoom(zoom: number): void;
};

type GoogleMarker = {
  addListener(eventName: string, handler: () => void): { remove(): void };
  setMap(map: GoogleMap | null): void;
};

type GoogleInfoWindow = {
  close(): void;
  open(options: {
    anchor: GoogleMarker;
    map: GoogleMap;
    shouldFocus?: boolean;
  }): void;
  setContent(content: string): void;
};

type GoogleLatLngBounds = {
  extend(position: LatLngLiteral): void;
};

type MarkerOptions = {
  icon?: Record<string, unknown>;
  label?: {
    color: string;
    fontSize: string;
    fontWeight: string;
    text: string;
  };
  map: GoogleMap;
  optimized?: boolean;
  position: LatLngLiteral;
  title?: string;
  zIndex?: number;
};

type GoogleMaps = {
  maps: {
    InfoWindow: new (options?: {
      content?: string;
      maxWidth?: number;
    }) => GoogleInfoWindow;
    LatLngBounds: new () => GoogleLatLngBounds;
    Map: new (element: HTMLElement, options: MapOptions) => GoogleMap;
    Marker: new (options: MarkerOptions) => GoogleMarker;
    Point: new (x: number, y: number) => unknown;
    Size: new (width: number, height: number) => unknown;
    SymbolPath: { CIRCLE: number };
    event: {
      clearInstanceListeners(instance: unknown): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMaps;
    __nycAiGoogleMapsPromise?: Promise<GoogleMaps>;
    __nycAiGoogleMapsOptionsKey?: string;
  }
}

const intensityRank: Record<ConsumptionIntensity, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
};

const darkMapStyles: MapStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#17212f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d8e3f0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#34475f" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#142033" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1f3345" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#88a2bd" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d4966" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#102035" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ saturation: -20 }, { lightness: -10 }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#5f86ad" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1d324d" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#243b55" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#05101f" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7ea6ce" }],
  },
];

export function GoogleStartupMap({
  companies,
  onSelectCompany,
}: {
  companies: Company[];
  onSelectCompany?: (slug: string) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const infoWindowRef = useRef<GoogleInfoWindow | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "missing-key" | "error"
  >(() => (apiKey ? "idle" : "missing-key"));

  const pins = useMemo(() => buildCompanyMapLocations(companies), [companies]);

  function loadInteractiveMap() {
    setStatus("loading");
    setShouldLoadMap(true);
  }

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    if (!shouldLoadMap) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey, mapId)
      .then((googleMaps) => {
        if (cancelled || !mapRef.current) return;

        const map = new googleMaps.maps.Map(mapRef.current, {
          backgroundColor: "#081523",
          center: { lat: 40.7243, lng: -73.9918 },
          clickableIcons: false,
          disableDefaultUI: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
          ...(mapId ? { mapId } : {}),
          mapTypeControl: false,
          maxZoom: 15,
          minZoom: 10,
          rotateControl: false,
          scaleControl: true,
          streetViewControl: false,
          styles: darkMapStyles,
          zoom: 11,
          zoomControl: true,
        });
        const bounds = new googleMaps.maps.LatLngBounds();
        const infoWindow = new googleMaps.maps.InfoWindow({ maxWidth: 320 });
        infoWindowRef.current = infoWindow;

        markersRef.current = pins.map((pin, index) => {
          const markerScale = pin.company.is_breakout ? 7.5 : 5.8;
          const markerColor = categoryColors[pin.company.category];
          bounds.extend(pin.position);

          const marker = new googleMaps.maps.Marker({
            icon: {
              fillColor: markerColor,
              fillOpacity: pin.confidence === "confirmed" ? 0.98 : 0.74,
              path: googleMaps.maps.SymbolPath.CIRCLE,
              scale: markerScale,
              strokeColor: pin.company.is_breakout ? "#F8F6F1" : "#FBFAF7",
              strokeOpacity: 0.96,
              strokeWeight: pin.company.is_breakout ? 2.5 : 1.8,
            },
            map,
            optimized: true,
            position: pin.position,
            title: `${pin.company.name} - ${pin.neighborhood}, NYC`,
            zIndex:
              100 +
              intensityRank[pin.company.consumption_intensity] * 10 +
              index,
          });

          marker.addListener("click", () => {
            onSelectCompany?.(pin.company.slug);
            infoWindow.setContent(renderInfoWindow(pin));
            infoWindow.open({ anchor: marker, map, shouldFocus: false });
          });

          return marker;
        });

        if (pins.length > 1) {
          map.fitBounds(bounds, 70);
        } else if (pins[0]) {
          map.setCenter(pins[0].position);
          map.setZoom(12);
        }

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
    };
  }, [apiKey, mapId, onSelectCompany, pins, shouldLoadMap]);

  return (
    <div className="relative min-h-[320px] overflow-hidden bg-[#081523] sm:min-h-[420px]">
      {apiKey && shouldLoadMap ? (
        <div ref={mapRef} className="absolute inset-0" />
      ) : apiKey ? (
        <StaticMapPreview
          pins={pins}
          onLoadMap={loadInteractiveMap}
        />
      ) : (
        <GoogleEmbedFallback />
      )}

      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/25 text-sm font-medium text-white backdrop-blur-[1px]">
          Loading Google Maps...
        </div>
      ) : null}

      {status === "missing-key" ? <MissingKeyNotice /> : null}
      {status === "error" ? <MapErrorNotice /> : null}
    </div>
  );
}

function StaticMapPreview({
  pins,
  onLoadMap,
}: {
  pins: CompanyMapLocation[];
  onLoadMap: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#081523] text-white">
      <div className="absolute inset-0 opacity-35" aria-hidden="true">
        <div className="absolute left-[7%] top-[18%] h-px w-[86%] bg-white/20" />
        <div className="absolute left-[11%] top-[32%] h-px w-[78%] bg-white/15" />
        <div className="absolute left-[16%] top-[48%] h-px w-[72%] bg-white/15" />
        <div className="absolute left-[8%] top-[66%] h-px w-[84%] bg-white/15" />
        <div className="absolute left-[22%] top-[8%] h-[84%] w-px bg-white/12" />
        <div className="absolute left-[42%] top-[6%] h-[88%] w-px bg-white/12" />
        <div className="absolute left-[62%] top-[10%] h-[82%] w-px bg-white/12" />
        <div className="absolute left-[78%] top-[14%] h-[72%] w-px bg-white/12" />
      </div>

      <div className="absolute inset-x-[14%] top-[18%] h-[58%] rounded-[48%] border border-white/10" />
      <div className="absolute inset-x-[20%] top-[24%] h-[44%] rounded-[48%] border border-white/10" />

      <div className="absolute inset-0" aria-hidden="true">
        {pins.slice(0, 56).map((pin) => {
          const position = getNormalizedMapPosition(pin.position);
          const color = categoryColors[pin.company.category] ?? "#2D6BFF";

          return (
            <span
              key={pin.company.id}
              className="absolute rounded-full border border-[#FBFAF7]/90"
              style={{
                backgroundColor: color,
                height: pin.company.is_breakout ? 12 : 9,
                left: `${position.x * 100}%`,
                opacity: pin.confidence === "confirmed" ? 0.95 : 0.7,
                top: `${position.y * 100}%`,
                transform: "translate(-50%, -50%)",
                width: pin.company.is_breakout ? 12 : 9,
              }}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 grid place-items-center bg-[#081523]/30 px-6 text-center">
        <div className="max-w-[280px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Interactive NYC map
          </p>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Load Google Maps when you want to inspect company locations.
          </p>
          <button
            type="button"
            onClick={onLoadMap}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#081523] transition hover:bg-[#F8F6F1]"
          >
            Load interactive map
          </button>
        </div>
      </div>
    </div>
  );
}

function loadGoogleMaps(apiKey: string, mapId?: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (window.__nycAiGoogleMapsPromise) {
    return window.__nycAiGoogleMapsPromise;
  }

  window.__nycAiGoogleMapsPromise = (async () => {
    const optionsKey = `${apiKey}:${mapId ?? ""}`;

    if (!window.__nycAiGoogleMapsOptionsKey) {
      setOptions({
        authReferrerPolicy: "origin",
        key: apiKey,
        mapIds: mapId ? [mapId] : undefined,
        v: "weekly",
      });
      window.__nycAiGoogleMapsOptionsKey = optionsKey;
    }

    await importLibrary("maps");

    if (!window.google?.maps) {
      throw new Error("Google Maps SDK loaded without maps namespace.");
    }

    return window.google;
  })();

  return window.__nycAiGoogleMapsPromise;
}

function renderInfoWindow(pin: CompanyMapLocation) {
  const companyUrl = `/companies/${pin.company.slug}`;
  const categoryStyle = categoryStyles[pin.company.category];

  return `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 292px; color: #0f172a;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <div style="display:grid; place-items:center; width:34px; height:34px; border-radius:8px; border:1px solid #E7E1D8; background:#F8F4EF; overflow:hidden;">
          <img src="${categoryStyle.avatarSrc}" alt="" style="width:100%; height:100%; object-fit:contain; image-rendering:pixelated;" />
        </div>
        <div>
          <div style="font-weight:700; font-size:15px; line-height:1.25;">${escapeHtml(pin.company.name)}</div>
          <div style="font-size:12px; color:#64748b;">${escapeHtml(pin.neighborhood)}, NYC</div>
        </div>
      </div>
      <div style="display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#5F5A52; font-weight:600; margin-bottom:8px; border:1px solid #E7E1D8; border-radius:6px; padding:3px 7px;">
        <img src="${categoryStyle.avatarSrc}" alt="" style="width:15px; height:15px; object-fit:contain; image-rendering:pixelated;" />
        ${escapeHtml(pin.company.category)}
      </div>
      <p style="font-size:13px; line-height:1.5; margin:0 0 10px; color:#475569;">${escapeHtml(pin.company.short_description)}</p>
      <div style="font-size:12px; color:#64748b; margin-bottom:12px;">${escapeHtml(getCompanySignalLabel(pin.company))}</div>
      <a href="${companyUrl}" style="display:inline-flex; align-items:center; color:#0f172a; font-size:13px; font-weight:700; text-decoration:none;">
        Open profile →
      </a>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function GoogleEmbedFallback() {
  return (
    <iframe
      title="Google map of New York City"
      src="https://www.google.com/maps?q=New%20York%20City&z=11&output=embed"
      className="pointer-events-none absolute inset-0 h-full w-full border-0 grayscale invert contrast-125"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

function MissingKeyNotice() {
  return (
    <div className="absolute left-5 top-5 max-w-sm rounded-md border border-[#E7E1D8]/20 bg-slate-950/85 p-4 text-white shadow-xl backdrop-blur">
      <p className="text-sm font-semibold">Google Maps SDK needs an API key</p>
      <p className="mt-2 text-xs leading-5 text-slate-200">
        Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your local env and
        restart the dev server. Until then, this uses a read-only Google Maps
        embed instead of interactive company markers.
      </p>
    </div>
  );
}

function MapErrorNotice() {
  return (
    <div className="absolute left-5 top-5 max-w-sm rounded-md border border-[#E7E1D8]/20 bg-red-950/85 p-4 text-white shadow-xl backdrop-blur">
      <p className="text-sm font-semibold">Google Maps could not load</p>
      <p className="mt-2 text-xs leading-5 text-red-100">
        Check that the browser key allows the Maps JavaScript API on this
        domain.
      </p>
    </div>
  );
}

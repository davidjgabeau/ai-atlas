"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

import { categoryStyles } from "@/components/market-map/category-style";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import type { Category, Company, UsagePotential } from "@/types/market";

type LatLngLiteral = {
  lat: number;
  lng: number;
};

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

type StartupPin = {
  company: Company;
  confidence: "confirmed" | "estimated";
  neighborhood: string;
  position: LatLngLiteral;
};

export type CompanyMapLocation = StartupPin;

const categoryClusters: Record<
  Category,
  Array<{ position: LatLngLiteral; neighborhood: string }>
> = {
  "Fintech & Trading AI": [
    { neighborhood: "Financial District", position: { lat: 40.7075, lng: -74.0113 } },
    { neighborhood: "Midtown", position: { lat: 40.7549, lng: -73.984 } },
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
  ],
  "Legal & Compliance AI": [
    { neighborhood: "Tribeca", position: { lat: 40.7163, lng: -74.0086 } },
    { neighborhood: "Grand Central", position: { lat: 40.7527, lng: -73.9772 } },
    { neighborhood: "SoHo", position: { lat: 40.7243, lng: -74.0018 } },
  ],
  "Media, Ads & Creative AI": [
    { neighborhood: "Chelsea", position: { lat: 40.7465, lng: -74.0014 } },
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
    { neighborhood: "DUMBO", position: { lat: 40.7033, lng: -73.9881 } },
  ],
  "Health & Clinical AI": [
    { neighborhood: "Upper East Side", position: { lat: 40.7736, lng: -73.9566 } },
    { neighborhood: "Hudson Yards", position: { lat: 40.754, lng: -74.0022 } },
    { neighborhood: "Lower Manhattan", position: { lat: 40.709, lng: -74.01 } },
  ],
  "AI-Native Consumer & Social": [
    { neighborhood: "SoHo", position: { lat: 40.7243, lng: -74.0018 } },
    { neighborhood: "DUMBO", position: { lat: 40.7033, lng: -73.9881 } },
    { neighborhood: "Williamsburg", position: { lat: 40.7081, lng: -73.9571 } },
  ],
  "Agent Infrastructure": [
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
    { neighborhood: "Hudson Square", position: { lat: 40.726, lng: -74.0075 } },
    { neighborhood: "Brooklyn Navy Yard", position: { lat: 40.7021, lng: -73.9707 } },
  ],
  "Model Tools & Dev Platform": [
    { neighborhood: "Flatiron", position: { lat: 40.7411, lng: -73.9897 } },
    { neighborhood: "NoHo", position: { lat: 40.7287, lng: -73.9926 } },
    { neighborhood: "Union Square", position: { lat: 40.7359, lng: -73.9911 } },
  ],
  "Enterprise GTM & RevOps AI": [
    { neighborhood: "Bryant Park", position: { lat: 40.7536, lng: -73.9832 } },
    { neighborhood: "NoMad", position: { lat: 40.744, lng: -73.9884 } },
    { neighborhood: "Lower East Side", position: { lat: 40.715, lng: -73.9843 } },
  ],
  "Data & Memory Layer": [
    { neighborhood: "Chelsea", position: { lat: 40.7465, lng: -74.0014 } },
    { neighborhood: "Union Square", position: { lat: 40.7359, lng: -73.9911 } },
    { neighborhood: "Williamsburg", position: { lat: 40.7081, lng: -73.9571 } },
  ],
};

const knownOfficeCoordinates: Record<
  string,
  { position: LatLngLiteral; neighborhood: string }
> = {
  hebbia: {
    neighborhood: "SoHo",
    position: { lat: 40.7247, lng: -74.0004 },
  },
  "norm-ai": {
    neighborhood: "World Trade Center",
    position: { lat: 40.713, lng: -74.0117 },
  },
  "manifest-os": {
    neighborhood: "Flatiron",
    position: { lat: 40.741, lng: -73.9865 },
  },
  agentio: {
    neighborhood: "NoMad",
    position: { lat: 40.7461, lng: -73.9865 },
  },
  anterior: {
    neighborhood: "NoMad",
    position: { lat: 40.7457, lng: -73.9847 },
  },
  "emergence-ai": {
    neighborhood: "Bryant Park",
    position: { lat: 40.7525, lng: -73.9833 },
  },
  kalepa: {
    neighborhood: "Flatiron",
    position: { lat: 40.7399, lng: -73.9895 },
  },
  hyperscience: {
    neighborhood: "World Trade Center",
    position: { lat: 40.713, lng: -74.0132 },
  },
};

export const categoryColors: Record<Category, string> = {
  "Fintech & Trading AI": "#2563eb",
  "Legal & Compliance AI": "#7c3aed",
  "Media, Ads & Creative AI": "#e11d48",
  "Health & Clinical AI": "#059669",
  "AI-Native Consumer & Social": "#f59e0b",
  "Agent Infrastructure": "#0891b2",
  "Model Tools & Dev Platform": "#0f766e",
  "Enterprise GTM & RevOps AI": "#ea580c",
  "Data & Memory Layer": "#4f46e5",
};

const potentialRank: Record<UsagePotential, number> = {
  Emerging: 1,
  Promising: 2,
  "High Potential": 3,
  "Breakout Watch": 4,
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
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "missing-key" | "error"
  >(() => (apiKey ? "loading" : "missing-key"));

  const pins = useMemo(() => buildCompanyMapLocations(companies), [companies]);

  useEffect(() => {
    if (!apiKey) {
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
            zIndex: 100 + potentialRank[pin.company.usage_potential] * 10 + index,
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
  }, [apiKey, mapId, onSelectCompany, pins]);

  return (
    <div className="relative min-h-[420px] overflow-hidden bg-[#081523]">
      {apiKey ? (
        <div ref={mapRef} className="absolute inset-0" />
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

export function buildCompanyMapLocations(
  companies: Company[],
): CompanyMapLocation[] {
  const categoryIndexes = new Map<Category, number>();

  return companies.map((company) => {
    const categoryIndex = categoryIndexes.get(company.category) ?? 0;
    categoryIndexes.set(company.category, categoryIndex + 1);

    const knownOffice = knownOfficeCoordinates[company.slug];
    if (knownOffice) {
      return {
        company,
        confidence: "confirmed",
        neighborhood: knownOffice.neighborhood,
        position: knownOffice.position,
      };
    }

    const cluster =
      categoryClusters[company.category] ??
      categoryClusters["Fintech & Trading AI"];
    const base = cluster[categoryIndex % cluster.length];
    const ring = Math.floor(categoryIndex / cluster.length);
    const latOffset = ((categoryIndex % 5) - 2) * 0.0018 + ring * 0.0008;
    const lngOffset = ((categoryIndex % 7) - 3) * 0.0022 - ring * 0.0007;

    return {
      company,
      confidence: company.office_address ? "confirmed" : "estimated",
      neighborhood: base.neighborhood,
      position: {
        lat: base.position.lat + latOffset,
        lng: base.position.lng + lngOffset,
      },
    };
  });
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

function renderInfoWindow(pin: StartupPin) {
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

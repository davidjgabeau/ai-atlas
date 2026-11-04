"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Bookmark, LocateFixed, MapPin, X } from "lucide-react";
import { loadGoogleMaps, type GoogleMap, type GoogleMaps, type GoogleMarker } from "@/components/market-map/google-startup-map";
import { buildResearchMapGroups, researchMapToGeoJson, type ResearchMapGroup } from "@/lib/research/map";
import { isDocumentedOffice, type OfficeFilters } from "@/lib/research/evidence";
import type { ResearchCompany } from "@/lib/research/types";

const action = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DAD5CC] bg-white px-3 py-2 text-xs font-medium hover:bg-[#F1EEE7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3D2B]";

function checkedDate(value: string) {
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function ResearchMap({ companies, filters, saved, onSave }: {
  companies: ResearchCompany[]; filters: OfficeFilters; saved: string[]; onSave: (slug: string) => void;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const sdkRef = useRef<GoogleMaps | null>(null);
  const markersRef = useRef<Array<{ marker: GoogleMarker; group: ResearchMapGroup }>>([]);
  const [status, setStatus] = useState(key ? "loading" : "unavailable");
  const [attempt, setAttempt] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const groups = useMemo(() => buildResearchMapGroups(companies, filters), [companies, filters]);
  const mappedSlugs = new Set(groups.flatMap((g) => g.entries.map((e) => e.company.slug)));
  const unmapped = companies.filter((c) => !mappedSlugs.has(c.slug));
  const selected = groups.find((g) => g.key === selectedKey);
  const shownGroups = selected ? [selected] : groups;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    loadGoogleMaps(key, mapId).then((sdk) => {
      if (cancelled || !canvasRef.current) return;
      sdkRef.current = sdk;
      mapRef.current = new sdk.maps.Map(canvasRef.current, {
        center: { lat: 40.735, lng: -73.975 }, zoom: 12,
        minZoom: 9, maxZoom: 19, clickableIcons: false,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        gestureHandling: "cooperative", ...(mapId ? { mapId } : {}),
        ...(mapId ? {} : { styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#CFDAD4" }] },
          { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#F1EFE7" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
        ] }),
      });
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [key, mapId, attempt]);

  useEffect(() => {
    const sdk = sdkRef.current, map = mapRef.current;
    if (!sdk || !map || status !== "ready") return;
    markersRef.current = groups.map((group) => {
      const announced = group.entries.every((e) => e.office.occupancy_status === "announced");
      const reported = group.entries.every((e) => e.office.evidence_status === "reported");
      const marker = new sdk.maps.Marker({
        map, optimized: false,
        position: { lat: group.latitude, lng: group.longitude },
        title: `${group.entries.map((e) => e.company.name).join(", ")} at ${group.entries[0].office.address}`,
        icon: { path: sdk.maps.SymbolPath.CIRCLE, scale: group.entries.length > 1 ? 13 : 9,
          fillColor: announced ? "#B0782D" : reported ? "#9A6048" : "#263C2E",
          fillOpacity: .95, strokeColor: "#FFFFFF", strokeWeight: 2 },
        ...(group.entries.length > 1 ? { label: { text: String(group.entries.length), color: "#FFFFFF", fontWeight: "700", fontSize: "11px" } } : {}),
      });
      marker.addListener("click", () => setSelectedKey(group.key));
      return { marker, group };
    });
    if (groups.length) {
      const bounds = new sdk.maps.LatLngBounds();
      groups.forEach((g) => bounds.extend({ lat: g.latitude, lng: g.longitude }));
      if (groups.length > 1) map.fitBounds(bounds, 55);
      else { map.setCenter({ lat: groups[0].latitude, lng: groups[0].longitude }); map.setZoom(16); }
    }
    return () => { markersRef.current.forEach(({ marker }) => { sdk.maps.event.clearInstanceListeners(marker); marker.setMap(null); }); markersRef.current = []; };
  }, [groups, status]);

  useEffect(() => {
    if (!selected || status !== "ready") return;
    mapRef.current?.setCenter({ lat: selected.latitude, lng: selected.longitude });
    mapRef.current?.setZoom(16);
  }, [selected, status]);

  function fitAll() {
    setSelectedKey(null);
    const sdk = sdkRef.current, map = mapRef.current;
    if (!sdk || !map || !groups.length) return;
    const bounds = new sdk.maps.LatLngBounds();
    groups.forEach((g) => bounds.extend({ lat: g.latitude, lng: g.longitude }));
    if (groups.length > 1) map.fitBounds(bounds, 55);
    else { map.setCenter({ lat: groups[0].latitude, lng: groups[0].longitude }); map.setZoom(16); }
  }

  function exportMap() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(researchMapToGeoJson(groups), null, 2)], { type: "application/geo+json" }));
    const link = document.createElement("a"); link.href = url; link.download = "ai-atlas-nyc-offices.geojson"; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="mt-5" aria-labelledby="office-map-title">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="office-map-title" className="font-heading text-2xl">The offices behind the companies</h2>
        <p className="mt-1 text-sm text-[#777166]" aria-live="polite">{mappedSlugs.size} companies plotted at {groups.length} map locations · {unmapped.length} without a pin in this view</p></div>
      <div className="flex gap-2"><button className={action} onClick={fitAll}><LocateFixed size={14} />Fit locations</button><button className={action} onClick={exportMap}><ArrowDownToLine size={14} />Export GeoJSON</button></div>
    </div>
    <div className="overflow-hidden rounded-xl border border-[#DCD7CE] bg-[#FCFBF7] lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative min-h-[390px] bg-[#E7E9DF] lg:min-h-[620px]" role="region" aria-label="Map of sourced NYC AI company offices">
        <div ref={canvasRef} className="absolute inset-0" />
        {status !== "ready" && <div className="absolute inset-0 grid place-items-center p-8 text-center"><div className="max-w-sm rounded-xl border border-[#DCD7CE] bg-[#FCFBF7]/95 p-6 shadow-sm"><MapPin className="mx-auto text-[#64775A]" size={25} /><p className="mt-3 font-heading text-xl">{status === "loading" ? "Loading the office map" : "Map tiles are unavailable"}</p><p className="mt-2 text-sm leading-6 text-[#777166]">{status === "loading" ? "Each pin comes from a sourced business address. Shared locations show all companies at that pin." : "The sourced addresses and companies remain available in the list. You can also export the coordinates as GeoJSON."}</p>{status === "error" && <button className={`${action} mt-4`} onClick={() => { window.__nycAiGoogleMapsPromise = undefined; setStatus("loading"); setAttempt((n) => n + 1); }}>Retry map</button>}</div></div>}
        {status === "ready" && groups.length === 0 && <div className="absolute inset-0 grid place-items-center bg-[#FCFBF7]/75 p-6 text-center"><p className="max-w-sm rounded-lg bg-white p-5 text-sm leading-6 text-[#625E55]">No sourced coordinates match these filters. Companies without a public street address stay in the directory.</p></div>}
      </div>
      <div className="border-t border-[#DCD7CE] lg:border-l lg:border-t-0">
        <div className="flex min-h-14 items-center justify-between gap-2 border-b border-[#E3DED4] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wider text-[#625E55]">{selected ? `${selected.entries.length} ${selected.entries.length === 1 ? "company" : "companies"} at this pin` : "Explore the pins"}</p>{selected && <button onClick={fitAll} className="rounded p-1.5 hover:bg-[#EEECE4]" aria-label="Show all map locations"><X size={16} /></button>}</div>
        <div className="max-h-[480px] divide-y divide-[#E3DED4] overflow-y-auto overscroll-contain lg:max-h-[564px]">
          {shownGroups.length === 0 && <p className="p-5 text-sm leading-6 text-[#777166]">No locations to plot. Try widening a filter, or browse companies without pins below.</p>}
          {shownGroups.map((group) => <div key={group.key} className="p-4">
            {!selected && <button onClick={() => setSelectedKey(group.key)} className="mb-3 flex w-full items-start gap-2 text-left text-sm font-semibold leading-5 text-[#3E5944] hover:underline"><MapPin size={15} className="mt-0.5 shrink-0" />{group.entries[0].office.address}<ArrowUpRight size={14} className="mt-0.5 ml-auto shrink-0" /><span className="sr-only">Show on map</span></button>}
            {group.entries.map(({ company, office }) => <article key={company.slug} className="mb-4 last:mb-0">
              <div className="flex items-start justify-between gap-2"><Link href={`/companies/${company.slug}`} className="font-heading text-xl hover:text-[#9A3D2B]">{company.name}</Link><button onClick={() => onSave(company.slug)} aria-label={`${saved.includes(company.slug) ? "Remove" : "Save"} ${company.name} ${saved.includes(company.slug) ? "from" : "to"} shortlist`} aria-pressed={saved.includes(company.slug)} className="rounded p-1.5 text-[#7E4935] hover:bg-[#EEECE4]"><Bookmark size={15} fill={saved.includes(company.slug) ? "currentColor" : "none"} /></button></div>
              <p className="mt-1 text-[10px] leading-5 text-[#777166]">{company.stage}{company.parent_company ? ` · ${company.parent_company}` : ""} · {company.category}</p>
              {selected && <><p className="mt-2 text-sm leading-6 text-[#625E55]">{company.description}</p><p className="mt-2 text-xs leading-5 text-[#625E55]">{office.address}</p></>}
              <p className="mt-2 text-[11px] font-medium text-[#625E55]">{[office.neighborhood, office.borough].filter(Boolean).join(", ")}</p>
              {office.occupancy_status === "announced" && <p className="mt-2 rounded bg-[#F4E7CE] px-2 py-1 text-[10px] font-semibold text-[#875917]">Announced lease; move-in not established</p>}
              {office.occupancy_status === "unknown" && <p className="mt-1 text-[10px] text-[#777166]">Current occupancy unconfirmed</p>}
              <a href={office.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-medium text-[#7E4935] underline underline-offset-2">{office.evidence_status === "verified" ? "Primary source" : "Reported office"} ↗</a>
              <p className="mt-1 text-[10px] leading-4 text-[#777166]">{office.source_date ? `Source ${checkedDate(office.source_date)} · ` : ""}Checked {checkedDate(office.verified_at)}</p>
              {selected && <><p className="mt-2 text-[11px] leading-5 text-[#777166]">{office.notes}</p>{office.supporting_sources?.map((s) => <a key={s.source_url} href={s.source_url} target="_blank" rel="noreferrer" className="mt-2 block text-[11px] text-[#7E4935] underline underline-offset-2">{s.source_title} ↗</a>)}</>}
            </article>)}
          </div>)}
        </div>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#777166]">
      <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#263C2E]" />Primary-source office</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#9A6048]" />Reported office</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#B0782D]" />Announced location</span><span>Numbers show companies sharing a pin</span>
    </div>
    <p className="mt-2 max-w-[920px] text-xs leading-5 text-[#777166]">Pins show documented business locations, with approximate street coordinates. A lease announcement does not establish occupancy. Mailing addresses, historical offices, and guessed neighborhood centers are excluded. Click a pin or an address to inspect its tenants and original evidence.</p>
    {unmapped.length > 0 && <details className="mt-5 rounded-xl border border-[#DCD7CE] bg-[#FCFBF7] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#625E55]">{unmapped.length} companies without a pin in this view</summary><p className="mt-2 text-xs leading-5 text-[#777166]">An unknown address is a research gap, not evidence that a company has no NYC office. Some firms confirm only a neighborhood; some recorded addresses do not have a reliable coordinate match.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{unmapped.map((c) => <Link key={c.slug} href={`/companies/${c.slug}`} className="rounded-lg border border-[#E3DED4] px-3 py-2 text-xs hover:bg-[#F1EEE7]"><span className="font-semibold">{c.name}</span><span className="mt-1 block text-[10px] text-[#777166]">{c.offices.filter(isDocumentedOffice).find((o) => o.address)?.address || c.offices.filter(isDocumentedOffice).find((o) => o.neighborhood)?.neighborhood || "Street address needs research"}</span></Link>)}</div></details>}
  </section>;
}

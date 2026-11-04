"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Bookmark, Check, Link2, MapPin, Search } from "lucide-react";
import { buildResearchMapGroups } from "@/lib/research/map";
import { companiesToCsv, filterResearchCompanies, isDocumentedOffice } from "@/lib/research/evidence";
import type { ResearchDataset } from "@/lib/research/types";

type Filters = { query: string; borough: string; neighborhood: string; stage: string; category: string; evidence: string; outside: boolean };
const initial: Filters = { query: "", borough: "", neighborhood: "", stage: "", category: "", evidence: "", outside: false };
const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const control = "h-11 w-full rounded-lg border border-[#DAD5CC] bg-white px-3 text-sm text-[#282824] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3D2B]";
const secondary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DAD5CC] bg-white px-3 py-2 text-sm font-medium transition hover:bg-[#F1EEE7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3D2B]";
const CompanyFinder = dynamic(() => import("./CompanyFinder"), { loading: () => <p className="mt-6 text-sm text-[#777166]">Loading company finder...</p> });
const ResearchMap = dynamic(() => import("./ResearchMap"), { loading: () => <div className="mt-5 min-h-[390px] rounded-xl border border-[#DCD7CE] bg-[#E7E9DF]" /> });

function date(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not recorded";
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const isDay = value.length === 10;
  return new Date(isDay ? value + "T12:00:00Z" : value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: isDay ? "UTC" : "America/Los_Angeles" });
}
function domain(value: string) { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return "Source"; } }
function download(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([type.startsWith("text/csv") ? "\uFEFF" + text : text], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function ResearchWorkspace({ data }: { data: ResearchDataset }) {
  const [filters, setFilters] = useState<Filters>(initial);
  const [tab, setTab] = useState("map");
  const [saved, setSaved] = useState<string[]>([]);
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [days, setDays] = useState("90");
  const [signalType, setSignalType] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const p = new URLSearchParams(window.location.search);
      if (["map", "companies", "signals", "resources"].includes(p.get("view") ?? "")) setTab(p.get("view")!);
      if (["30", "90", "365", "all"].includes(p.get("days") ?? "")) setDays(p.get("days")!);
      setSignalType(p.get("signal_type") ?? "");
      setFilters({ query: p.get("q") ?? "", borough: p.get("borough") ?? "", neighborhood: p.get("neighborhood") ?? "", stage: p.get("stage") ?? "", category: p.get("category") ?? "", evidence: p.get("evidence") ?? "", outside: p.get("outside") === "1" });
      try { const stored: unknown = JSON.parse(localStorage.getItem("atlas-research-shortlist") ?? "[]"); if (Array.isArray(stored)) setSaved(stored.filter((s): s is string => typeof s === "string")); } catch { /* Storage is optional. */ }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k === "query" ? "q" : k, v === true ? "1" : String(v)); });
    if (tab !== "map") params.set("view", tab);
    if (days !== "90") params.set("days", days);
    if (signalType) params.set("signal_type", signalType);
    window.history.replaceState(null, "", `/research${params.size ? `?${params}` : ""}`);
  }, [filters, ready, tab, days, signalType]);
  const matching = useMemo(() => filterResearchCompanies(data.companies, filters), [data.companies, filters]);
  const visible = shortlistOnly ? matching.filter((c) => saved.includes(c.slug)) : matching;
  const documented = data.companies.filter((c) => c.offices.some(isDocumentedOffice));
  const outside = documented.filter((c) => c.offices.some((o) => isDocumentedOffice(o) && o.borough !== "Manhattan"));
  const williamsburg = documented.filter((c) => c.offices.some((o) => isDocumentedOffice(o) && o.neighborhood === "Williamsburg"));
  const mappedCount = useMemo(() => new Set(buildResearchMapGroups(data.companies).flatMap((g) => g.entries.map((e) => e.company.slug))).size, [data.companies]);
  const categories = [...new Set(data.companies.map((c) => c.category))].sort();
  const neighborhoods = [...new Set(data.companies.flatMap((c) => c.offices.filter(isDocumentedOffice).filter((o) => !filters.borough || o.borough === filters.borough).map((o) => o.neighborhood).filter((n): n is string => Boolean(n))))].sort();
  const slugs = new Set(visible.map((c) => c.slug));
  const now = Date.parse(data.generated_at);
  const signals = data.signals.filter((s) => slugs.has(s.company_slug) && (!signalType || s.type === signalType) && (days === "all" || now - Date.parse(s.occurred_at) <= Number(days) * 86_400_000));
  function change<K extends keyof Filters>(key: K, value: Filters[K]) { setFilters((f) => ({ ...f, [key]: value, ...(key === "borough" ? { neighborhood: "" } : {}) })); }
  function toggle(slug: string) {
    const next = saved.includes(slug) ? saved.filter((s) => s !== slug) : [...saved, slug];
    setSaved(next); try { localStorage.setItem("atlas-research-shortlist", JSON.stringify(next)); } catch { /* Still works for this visit. */ }
  }
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2500); }
    catch { setCopied(false); }
  }
  function openMap(nextFilters?: Filters) {
    if (nextFilters) setFilters(nextFilters);
    setTab("map"); setShortlistOnly(false);
    requestAnimationFrame(() => document.getElementById("research-sections")?.scrollIntoView({ block: "start" }));
  }

  return <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-10 sm:px-6 lg:px-10">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#736E64]">
      <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#547F65]" />AI Atlas / Research Desk</span><span>All stages. Five boroughs.</span>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_330px] lg:items-end">
      <div><h1 className="max-w-[800px] font-heading text-[clamp(40px,5.2vw,72px)] leading-[1.02] tracking-[-.035em] text-[#242720]">Find New York’s<br /><span className="text-[#79806C]">AI companies.</span></h1>
        <p className="mt-5 max-w-[680px] text-base leading-7 text-[#625E55]">Explore companies at every stage. Search the wider company index, map documented offices, and open the original sources.</p></div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button onClick={() => openMap()} className={secondary}><MapPin size={15} />Explore the office map</button>
        <button onClick={share} className={secondary}>{copied ? <Check size={15} /> : <Link2 size={15} />}{copied ? "Link copied" : shortlistOnly ? "Share filters" : "Share this view"}</button>
        <button onClick={() => download("ai-atlas-nyc-research.csv", companiesToCsv(visible))} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#263C2E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#3C5544]"><ArrowDownToLine size={15} />Export {visible.length} profiles</button>
      </div>
    </div>

    <div className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#DCD7CE] bg-[#DCD7CE] lg:grid-cols-4">
      {[{ n: data.companies.length.toLocaleString(), label: "NYC AI companies", note: "Active businesses, across stages" }, { n: mappedCount, label: "Companies on the map", note: "Sourced addresses, across stages" }, { n: outside.length, label: "Beyond Manhattan", note: "Companies with office evidence" }, { n: williamsburg.length, label: "Williamsburg companies", note: "Inspect sources and move dates" }].map((m) => <div key={m.label} className="bg-[#FCFBF7] p-5 sm:p-6"><p className="font-heading text-4xl tracking-tight text-[#263C2E]">{m.n}</p><p className="mt-2 text-sm font-semibold">{m.label}</p><p className="mt-1 text-xs leading-5 text-[#777166]">{m.note}</p></div>)}
    </div>

    <nav id="research-sections" aria-label="Research sections" className="mt-9 flex scroll-mt-5 gap-6 overflow-x-auto border-b border-[#DAD5CC]">
      {[["map", "Office map"], ["companies", "Company finder"], ["signals", "Signals & timeline"], ["resources", "People & public impact"]].map(([id, label]) => <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`shrink-0 border-b-2 pb-3 text-sm font-semibold ${tab === id ? "border-[#263C2E] text-[#263C2E]" : "border-transparent text-[#777166]"}`}>{label}</button>)}
    </nav>

    {tab !== "resources" && <section aria-label="Filter companies" className="mt-5 rounded-xl border border-[#DCD7CE] bg-[#FCFBF7] p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative sm:col-span-2"><span className="sr-only">Search companies, founders, or places</span><Search size={16} className="absolute left-3 top-3.5 text-[#8A8479]" /><input value={filters.query} onChange={(e) => change("query", e.target.value)} className={`${control} pl-9`} placeholder="Company, founder, product, or place" /></label>
        <label><span className="sr-only">Stage</span><select value={filters.stage} onChange={(e) => change("stage", e.target.value)} className={control}><option value="">All stages</option>{["Early", "Growth", "Public", "Acquired", "Bootstrapped", "Unknown", ...[...new Set(data.companies.map((c) => c.stage))].filter((s) => !["Public", "Acquired", "Growth", "Bootstrapped", "Unknown"].includes(s)).sort()].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="sr-only">Category</span><select value={filters.category} onChange={(e) => change("category", e.target.value)} className={control}><option value="">All categories</option>{categories.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="sr-only">Borough</span><select value={filters.borough} onChange={(e) => change("borough", e.target.value)} className={control}><option value="">All boroughs + unknown</option>{boroughs.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="sr-only">Neighborhood</span><select value={filters.neighborhood} onChange={(e) => change("neighborhood", e.target.value)} className={control}><option value="">All neighborhoods</option>{neighborhoods.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label><span className="sr-only">Office evidence</span><select value={filters.evidence} onChange={(e) => change("evidence", e.target.value)} className={control}><option value="">Any office evidence</option><option value="documented">Any documented office</option><option value="verified">Company-source office</option><option value="reported">Reported office</option><option value="unknown">Office not verified</option></select></label>
        <label className="flex items-center gap-2 px-1 text-sm"><input type="checkbox" checked={filters.outside} onChange={(e) => change("outside", e.target.checked)} className="size-4 accent-[#263C2E]" />Outside Manhattan only</label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E3D9] pt-3 text-sm"><p className="text-[#777166]">{visible.length} of {data.companies.length} profiles{filters.neighborhood ? ` · ${filters.neighborhood}` : ""}</p><div className="flex flex-wrap items-center gap-4"><button onClick={() => setShortlistOnly(!shortlistOnly)} aria-pressed={shortlistOnly} className={`inline-flex items-center gap-1.5 ${shortlistOnly ? "font-semibold text-[#263C2E]" : "text-[#6C665B]"}`}><Bookmark size={14} />Shortlist ({saved.length})</button><button className="text-[#7E4935] underline underline-offset-4" onClick={() => { setFilters(initial); setShortlistOnly(false); }}>Clear filters</button></div></div>
    </section>}

    {tab === "map" && <ResearchMap companies={visible} filters={filters} saved={saved} onSave={toggle} />}

    {tab === "companies" && <CompanyFinder companies={visible} saved={saved} onSave={toggle} shortlistOnly={shortlistOnly} />}

    {tab === "signals" && <section className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-heading text-2xl">What changed, and when</h2><p className="mt-1 text-sm text-[#777166]">{signals.length} dated signals for the companies in your filtered view. Reviewed records are distinguished from collected links.</p></div><div className="flex flex-wrap gap-2"><label><span className="sr-only">Signal window</span><select className={control} value={days} onChange={(e) => setDays(e.target.value)}><option value="30">Past 30 days</option><option value="90">Past 90 days</option><option value="365">Past year</option><option value="all">All dates</option></select></label><label><span className="sr-only">Signal type</span><select className={control} value={signalType} onChange={(e) => setSignalType(e.target.value)}><option value="">All signal types</option>{[...new Set(data.signals.map((s) => s.type))].sort().map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label><button className={secondary} onClick={() => download("ai-atlas-signals.json", JSON.stringify(signals, null, 2), "application/json")}><ArrowDownToLine size={14} />Export signals</button></div></div>
      <div className="mt-5 divide-y divide-[#E3DED4] rounded-xl border border-[#DCD7CE] bg-[#FCFBF7]">{signals.length === 0 && <p className="p-8 text-sm text-[#777166]">No dated signals in this window. Widen the date range. No recorded event does not mean no activity.</p>}{signals.map((s) => <article key={s.id} className="grid gap-3 p-5 sm:grid-cols-[125px_1fr]"><div><p className="text-sm font-semibold text-[#263C2E]">{date(s.occurred_at)}</p><span className="mt-1 inline-block rounded bg-[#EEECE4] px-2 py-1 text-[10px] uppercase tracking-wide text-[#777166]">{s.type.replaceAll("_", " ")}</span></div><div><p className="text-xs text-[#777166]"><Link href={`/companies/${s.company_slug}`} className="underline underline-offset-2">{s.company_name}</Link> · {s.review}{s.verified_at ? ` · source checked ${date(s.verified_at)}` : " · verify original source"}</p><a href={s.source_url} target="_blank" rel="noreferrer" className="mt-1 block text-base font-semibold leading-6 hover:text-[#9A3D2B]">{s.title} ↗</a><p className="mt-1 text-sm leading-6 text-[#625E55]">{s.summary}</p><p className="mt-2 text-xs text-[#777166]">{s.source_name || domain(s.source_url)}</p></div></article>)}</div>
    </section>}

    {tab === "resources" && <section className="mt-6 space-y-9">
      <div className="max-w-[760px]"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#8A6654]">Public-interest reporting</p><h2 className="mt-2 font-heading text-3xl">Who benefits. Who bears the cost.</h2><p className="mt-3 text-sm leading-7 text-[#625E55]">Sources for investigating AI’s effects on Black and brown New Yorkers: work, hiring, public services, schools, and civil rights. A company map cannot establish those impacts on its own. The resources below offer reporting leads and evidence to examine.</p></div>
      <div className="grid gap-4 md:grid-cols-2">{data.resources.resources.map((r) => <article key={r.id} className="rounded-xl border border-[#DCD7CE] bg-[#FCFBF7] p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#777166]">{r.type} / {r.topic}</p><a href={r.url} target="_blank" rel="noreferrer" className="mt-2 block font-heading text-xl leading-7 hover:text-[#9A3D2B]">{r.title} ↗</a><p className="mt-1 text-xs text-[#777166]">{r.organization}{r.published_at ? ` · ${date(r.published_at)}` : ""}</p><p className="mt-3 text-sm leading-6 text-[#625E55]">{r.description}</p><p className="mt-3 text-xs leading-5 text-[#777166]"><strong>Coverage:</strong> {r.coverage}</p><p className="mt-2 border-t border-[#E8E3D9] pt-2 text-xs leading-5 text-[#777166]"><strong>Reporting limit:</strong> {r.caveat}</p><p className="mt-2 text-[10px] text-[#777166]">Source checked {date(r.checked_at)}</p></article>)}</div>
      <div><h3 className="font-heading text-2xl">People and organizations to consult</h3><p className="mt-2 text-sm text-[#777166]">Public professional profiles selected for subject expertise. Listing is not an endorsement or an indication of availability.</p><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{data.resources.experts.map((e) => <article key={e.name} className="rounded-xl border border-[#DCD7CE] p-5"><a href={e.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-[#9A3D2B]">{e.name} ↗</a><p className="mt-1 text-xs leading-5 text-[#777166]">{e.role} · {e.organization}</p><p className="mt-3 text-sm leading-6 text-[#625E55]">{e.expertise}</p>{e.public_contact_url && <a href={e.public_contact_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#7E4935] underline underline-offset-4">Public professional contact</a>}</article>)}</div></div>
    </section>}

    <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <section className="rounded-xl border border-[#DCD7CE] bg-[#EFEFE5] p-5 sm:p-6" aria-labelledby="borough-title">
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#6C7563]">The geography question</p>
        <h2 id="borough-title" className="mt-2 font-heading text-2xl">Beyond Manhattan</h2>
        <div className="mt-4 space-y-2">{boroughs.map((b) => {
          const count = documented.filter((c) => c.offices.some((o) => isDocumentedOffice(o) && o.borough === b)).length;
          return <button key={b} onClick={() => { openMap({ ...initial, borough: b }); }} className="flex w-full items-center gap-3 rounded px-1 py-1 text-left text-sm hover:bg-white/60"><span className="w-24 shrink-0">{b}</span><span className="h-1.5 flex-1 overflow-hidden rounded bg-[#D8DDCF]"><span className="block h-full rounded bg-[#64775A]" style={{ width: `${documented.length ? count / documented.length * 100 : 0}%` }} /></span><strong className="w-6 text-right font-medium">{count}</strong></button>;
        })}</div>
        <p className="mt-3 text-xs leading-5 text-[#696C5E]">Counts show companies with documented offices in this atlas, not borough-wide totals. A zero means no evidence recorded in this sample. A company may appear in multiple boroughs.</p>
      </section>
      <section className="rounded-xl border border-[#DCD7CE] bg-[#FCFBF7] p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#8A6654]">An open reporting question</p>
        <h2 className="mt-2 font-heading text-2xl">Is Williamsburg becoming an AI hub?</h2>
        <p className="mt-3 text-sm leading-6 text-[#625E55]">This sourcebook has office evidence for <strong>{williamsburg.length} {williamsburg.length === 1 ? "company" : "companies"}</strong> in Williamsburg. Inspect the leases, careers pages, dates, and gaps before drawing a conclusion.</p>
        <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7E4935] underline decoration-[#C8AA98] underline-offset-4" onClick={() => { openMap({ ...initial, borough: "Brooklyn", neighborhood: "Williamsburg" }); }}>See the Williamsburg evidence <ArrowUpRight size={15} /></button>
        <p className="mt-4 border-t border-[#E4DED1] pt-3 text-xs leading-5 text-[#777166]">To test “hub,” compare occupied space, employment, move dates, and a consistent citywide denominator. Mailing addresses and investor announcements alone do not establish an office.</p>
      </section>
    </div>

    <section className="mt-10 border-t border-[#DAD5CC] pt-6" aria-labelledby="method-title">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><div><h2 id="method-title" className="font-heading text-2xl">A sourcebook, with its limits visible.</h2><p className="mt-3 text-sm leading-6 text-[#777166]">This directory covers active AI businesses with supported NYC presence, across stages. Closed businesses, duplicate identities, and unresolved company leads are excluded. Street addresses and neighborhoods require separate evidence; an unknown address remains a research gap. Source dates and the scope of each profile review stay visible.</p><p className="mt-3 text-sm leading-6 text-[#777166]">“Verified” means a company source supports the location. “Reported” means a third party documented it. Neither independently confirms occupancy today. Announced locations are labeled separately, and historical offices are excluded from pins. No office pin is placed without coordinates for the recorded address.</p><p className="mt-3 text-sm leading-6 text-[#777166]">Company social posts depend on external API access and may be stale. Use the dated sources and employer links for reporting. All claims should be checked with the original source before publication.</p><div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-[#7E4935]"><a className="underline underline-offset-4" href="/api/research">Structured JSON</a><a className="underline underline-offset-4" href="/api/research?format=csv">Full company CSV</a><a className="underline underline-offset-4" href="/api/research?format=geojson">Office map GeoJSON</a><Link className="underline underline-offset-4" href="/submit">Suggest a company or correction</Link></div></div><div className="rounded-xl border border-[#DCD7CE] bg-[#FCFBF7] p-5"><h3 className="text-sm font-semibold">Collection & source review</h3>{data.collection.map((c) => <div key={c.name} className="mt-4 border-t border-[#E8E3D9] pt-3"><p className="flex flex-wrap justify-between gap-2 text-xs font-semibold"><span>{c.name}</span><time>{date(c.latest)}</time></p><p className="mt-1 text-xs leading-5 text-[#777166]">{c.note}</p></div>)}</div></div>
    </section>
  </div>;
}

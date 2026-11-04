"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ResearchCompany } from "@/lib/research/types";
import { isDocumentedOffice } from "@/lib/research/evidence";

type Selection = { kind: "profile"; company: ResearchCompany };
const pageSize = 25;
const action = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DAD5CC] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F1EEE7] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3D2B]";

function date(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not recorded";
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return new Date(value.length === 10 ? value + "T12:00:00Z" : value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function CompanyFinder({ companies, saved, onSave, shortlistOnly }: {
  companies: ResearchCompany[]; saved: string[]; onSave: (slug: string) => void; shortlistOnly: boolean;
}) {
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const queryKey = companies.map((c) => c.slug).join("|");
  const page = pageState.key === queryKey ? pageState.page : 1;
  const start = (page - 1) * pageSize;
  const profileRows = companies.slice(start, start + pageSize);
  const total = companies.length;

  useEffect(() => {
    if (selection && !dialog.current?.open) dialog.current?.showModal();
    if (!selection && dialog.current?.open) dialog.current.close();
  }, [selection]);

  function turnPage(next: number) {
    setPageState({ key: queryKey, page: next });
    resultsRef.current?.scrollIntoView({ block: "start" });
  }

  return <section className="mt-5" aria-labelledby="company-finder-title">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="company-finder-title" className="scroll-mt-40 font-heading text-2xl">Explore the companies</h2><p className="mt-1 text-sm leading-6 text-[#777166]">Active AI businesses with supported NYC presence. Open a company’s evidence to see sources and review dates.</p></div><p className="text-xs text-[#777166]">{shortlistOnly ? "Your saved profiles" : "All stages · A–Z"}</p></div>
    <div ref={resultsRef} className="mt-4 scroll-mt-40">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#777166]" aria-live="polite"><p>{`${total.toLocaleString()} matching ${total === 1 ? "company" : "companies"}`}</p><span>25 results per page</span></div>
      <div className="overflow-hidden rounded-xl border border-[#DCD7CE] bg-[#FCFBF7]">
        <div className="hidden grid-cols-[minmax(0,1fr)_200px_130px_100px] gap-4 border-b border-[#DCD7CE] bg-[#F0EEE6] px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#777166] lg:grid"><span>Company</span><span>Location evidence</span><span>Record status</span><span className="text-right">Details</span></div>
        <ul className="divide-y divide-[#E3DED4]">
          {profileRows.map((c) => {
            const offices = c.offices.filter(isDocumentedOffice);
            const location = [...new Set(offices.map((o) => [o.neighborhood, o.borough].filter(Boolean).join(", ")))].join("; ");
            return <li key={c.slug} className="grid items-center gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_200px_130px_100px] lg:gap-4">
              <div className="min-w-0"><Link href={`/companies/${c.slug}`} className="font-heading text-xl leading-6 hover:text-[#9A3D2B]">{c.name}</Link><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#625E55]">{c.description}</p><p className="mt-1 text-[10px] text-[#8A8479]">{c.category} · {c.stage}{c.parent_company ? ` · ${c.parent_company}` : ""}</p></div>
              <p className="text-xs leading-5 text-[#625E55]">{location || "NYC; office needs research"}{offices.some((o) => o.occupancy_status === "announced") && <span className="mt-1 block text-[10px] text-[#875917]">Includes an announced location</span>}</p>
              <div><span className="inline-block rounded-full bg-[#E6EBDD] px-2.5 py-1 text-[10px] font-semibold text-[#3E5944]">Company profile</span><p className="mt-1 text-[10px] text-[#8A8479]">{c.checked_at ? `Reviewed ${date(c.checked_at)}` : "Legacy record; recheck"}</p></div>
              <div className="flex items-center gap-2 lg:justify-end"><button className={action} onClick={() => setSelection({ kind: "profile", company: c })} aria-label={`Evidence for ${c.name}`}>Evidence</button><button onClick={() => onSave(c.slug)} aria-label={`${saved.includes(c.slug) ? "Remove" : "Save"} ${c.name} ${saved.includes(c.slug) ? "from" : "to"} shortlist`} aria-pressed={saved.includes(c.slug)} className="rounded p-1.5 text-[#7E4935] hover:bg-[#EEECE4]"><Bookmark size={14} fill={saved.includes(c.slug) ? "currentColor" : "none"} /></button></div>
            </li>;
          })}
          {total === 0 && <li className="p-10 text-center text-sm leading-6 text-[#777166]">No companies match these filters. Clear a filter to widen the search.</li>}
        </ul>
      </div>
      <nav aria-label="Company result pages" className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#777166]">{total ? `${start + 1}–${Math.min(start + pageSize, total)} of ${total.toLocaleString()}` : "0 results"}</p><div className="flex gap-2"><button className={action} disabled={page === 1} onClick={() => turnPage(page - 1)}><ChevronLeft size={14} />Previous</button><button className={action} disabled={start + pageSize >= total} onClick={() => turnPage(page + 1)}>Next<ChevronRight size={14} /></button></div></nav>
      <p className="mt-4 text-xs leading-5 text-[#8A8479]">Shortlists stay in this browser. Export your selection to keep or share it. Missing street addresses remain visible as research gaps.</p>
    </div>
    <dialog ref={dialog} aria-labelledby="company-evidence-title" onCancel={() => setSelection(null)} onClose={() => setSelection(null)} onClick={(event) => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setSelection(null); } }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-[620px] overflow-y-auto rounded-2xl border border-[#DCD7CE] bg-[#FCFBF7] p-5 text-[#282824] shadow-2xl backdrop:bg-black/30 sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8479]">{"Company evidence"}</p><h3 id="company-evidence-title" className="mt-2 font-heading text-3xl">{selection?.company.name}</h3></div><button onClick={() => setSelection(null)} aria-label="Close evidence" className="rounded-lg border border-[#DCD7CE] p-2 hover:bg-[#EEECE4]"><X size={17} /></button></div>
      {selection?.kind === "profile" && <div className="mt-5 space-y-5"><p className="text-sm leading-6 text-[#625E55]">{selection.company.description}</p><div><p className="text-xs font-semibold">Profile review · {date(selection.company.checked_at)}</p><p className="mt-1 text-xs leading-5 text-[#777166]">{selection.company.review_scope}</p><p className="mt-2 text-xs leading-5 text-[#777166]">Recorded stage: {selection.company.stage}{selection.company.parent_company ? ` · Operating business of ${selection.company.parent_company}` : ""}{!selection.company.stage_reviewed ? " (not rechecked in this pass)" : ""}</p></div>{selection.company.offices.filter(isDocumentedOffice).map((office, i) => <div key={`${office.source_url}:${i}`} className="border-t border-[#E3DED4] pt-4"><p className="text-sm font-semibold">{office.address || [office.neighborhood, office.borough].filter(Boolean).join(", ")}</p><p className="mt-1 text-xs leading-5 text-[#777166]">{office.evidence_status === "verified" ? "Primary-source location" : "Reported location"} · {office.occupancy_status === "announced" ? "Announced; move-in not established" : office.occupancy_status === "unknown" ? "Current occupancy unconfirmed" : office.location_type}</p><p className="mt-2 text-xs leading-5 text-[#777166]">{office.notes}</p><a href={office.source_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-[#7E4935] underline underline-offset-2">{office.source_title || "Original office source"} ↗</a><p className="mt-1 text-[10px] text-[#8A8479]">{office.source_date ? `Source ${date(office.source_date)} · ` : ""}Checked {date(office.verified_at)}</p></div>)}<div className="border-t border-[#E3DED4] pt-4"><p className="text-xs font-semibold">Profile sources</p>{selection.company.sources.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-[#7E4935] underline underline-offset-2">{new URL(url).hostname} ↗</a>)}</div><Link href={`/companies/${selection.company.slug}`} className={action}>Open full profile<ArrowUpRight size={13} /></Link></div>}
    </dialog>
  </section>;
}

import Link from "next/link";
import profiles from "@/data/reporting/companies.json";
import { officeEvidence } from "@/lib/research/evidence";

export function CompanyEvidence({ slug }: { slug: string }) {
  const profile = (profiles as Array<{ slug: string; source_urls: string[]; verified_at?: string; notes?: string; review_scope?: string }>).find((c) => c.slug === slug);
  const offices = officeEvidence.filter((office) => office.company_slug === slug);
  if (!profile && !offices.length) return null;
  return <section className="rounded-xl border border-[#DCD7CE] bg-[#F0F1E8] p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-2xl">Sources & location evidence</h2><Link href={`/research?q=${encodeURIComponent(profiles.find((p) => p.slug === slug)?.name ?? slug.replaceAll("-", " "))}`} className="text-xs font-semibold text-[#7E4935] underline underline-offset-4">Open research desk ↗</Link></div>
    {profile && <><p className="mt-3 text-xs leading-6 text-[#696C5E]">Profile source review: {profile.verified_at?.slice(0, 10) || "Not recorded"}. {profile.review_scope} {profile.notes}</p><ul className="mt-2 space-y-1 text-xs">{profile.source_urls.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer" className="break-all text-[#7E4935] underline underline-offset-2">{url} ↗</a></li>)}</ul></>}
    {offices.map((office, index) => <div key={`${office.source_url}:${index}`} className="mt-4 border-t border-[#DADDD0] pt-3"><p className="text-sm font-semibold">{[office.neighborhood, office.borough].filter(Boolean).join(", ") || "Location unresolved"} · {office.evidence_status} {office.location_type}</p><p className="mt-1 text-xs leading-6 text-[#696C5E]">{office.address || "Street address not public"}. {office.occupancy_status === "announced" ? "Announced location; move-in not established. " : office.occupancy_status === "unknown" ? "Current occupancy not confirmed. " : ""}{office.notes}</p><a href={office.source_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#7E4935] underline underline-offset-2">{office.source_title} ↗</a><p className="mt-1 text-[10px] text-[#696C5E]">Source checked {office.verified_at.slice(0, 10)}{office.source_date ? ` · original source ${office.source_date}` : ""}</p></div>)}
  </section>;
}

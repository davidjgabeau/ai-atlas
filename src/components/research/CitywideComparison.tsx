import { ArrowUpRight, ArrowDownToLine } from "lucide-react";
import type { CitywideCoverage, OfficeFilters } from "@/lib/research/evidence";

export function CitywideComparison({ coverage, mappedCount, onBrowse }: {
  coverage: CitywideCoverage;
  mappedCount: number;
  onBrowse: (filters: OfficeFilters) => void;
}) {
  const brooklyn = coverage.boroughs.find((row) => row.borough === "Brooklyn")?.company_count ?? 0;
  const total = coverage.total_companies;
  return <section className="mt-6" aria-labelledby="comparison-title">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[740px]">
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#6C7563]">Whole atlas · all stages · unaffected by filters</p>
        <h2 id="comparison-title" className="mt-2 font-heading text-3xl tracking-tight">Williamsburg in the citywide picture</h2>
        <p className="mt-3 text-sm leading-6 text-[#625E55]">The directory covers <strong>{total} companies across NYC</strong>. Williamsburg accounts for <strong>{coverage.williamsburg_companies} companies with documented office evidence</strong>, included within Brooklyn’s {brooklyn}. The expansion covers the whole city.</p>
      </div>
      <a href="/api/research?format=comparison" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#DAD5CC] bg-white px-3 py-2 text-sm font-medium hover:bg-[#F1EEE7]"><ArrowDownToLine size={15} />Export comparison CSV</a>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <section className="rounded-xl border border-[#DCD7CE] bg-[#EFEFE5] p-5 sm:p-6" aria-labelledby="borough-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 id="borough-title" className="font-heading text-2xl">Company counts by borough</h3><span className="text-xs text-[#696C5E]">Documented office evidence</span></div>
        <p className="mt-3 text-sm leading-6 text-[#625E55]">A borough is established for <strong>{coverage.companies_with_borough} of {total}</strong> companies. Each row opens its source-backed company list.</p>
        <div className="mt-4 space-y-1">{coverage.boroughs.map(({ borough, company_count }) => <button key={borough} onClick={() => onBrowse({ borough })} aria-label={`View ${company_count} ${borough} companies`} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-[#263C2E]">
          <span className="w-24 shrink-0">{borough}</span><span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded bg-[#D8DDCF]"><span className="block h-full rounded bg-[#64775A]" style={{ width: `${total ? company_count / total * 100 : 0}%` }} /></span><strong className="w-7 text-right font-semibold tabular-nums">{company_count}</strong><ArrowUpRight size={13} className="text-[#777166]" />
        </button>)}</div>
        <button onClick={() => onBrowse({ evidence: "unknown" })} className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-dashed border-[#A9AB9B] bg-white/40 px-3 py-2 text-left text-sm hover:bg-white/70"><span>Borough not established</span><span className="flex items-center gap-3"><strong className="tabular-nums">{coverage.companies_without_borough}</strong><ArrowUpRight size={13} /></span></button>
        <p className="mt-3 text-xs leading-5 text-[#696C5E]">Those {coverage.companies_without_borough} companies have supported NYC presence, but no qualifying borough-level office evidence. They remain in the citywide total.</p>
        <p className="mt-3 border-t border-[#D5D9CB] pt-3 text-xs leading-5 text-[#696C5E]">{coverage.companies_in_multiple_boroughs > 0 ? `${coverage.companies_in_multiple_boroughs} ${coverage.companies_in_multiple_boroughs === 1 ? "company appears" : "companies appear"} in multiple boroughs; each is counted once in the citywide total. Borough rows therefore overlap. ` : "Companies are counted once per borough. "}A zero means no qualifying evidence recorded here.</p>
      </section>

      <div className="space-y-5">
        <section className="rounded-xl border border-[#DCD7CE] bg-[#FCFBF7] p-5 sm:p-6" aria-labelledby="brooklyn-title">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#8A6654]">Williamsburg is a subset of Brooklyn</p>
          <h3 id="brooklyn-title" className="mt-2 font-heading text-2xl">Inside Brooklyn’s {brooklyn} companies</h3>
          <div aria-hidden="true" className="mt-5 flex h-3 overflow-hidden rounded-full bg-[#E5E0D6]"><span className="bg-[#526F58]" style={{ width: `${brooklyn ? coverage.williamsburg_companies / brooklyn * 100 : 0}%` }} /></div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <button onClick={() => onBrowse({ borough: "Brooklyn", neighborhood: "Williamsburg" })} className="rounded-lg text-left hover:underline"><span className="font-heading text-4xl text-[#263C2E]">{coverage.williamsburg_companies}</span><span className="mt-1 block text-sm font-semibold">Williamsburg ↗</span><span className="mt-1 block text-xs leading-5 text-[#777166]">Documented office evidence</span></button>
            <div><p className="font-heading text-4xl text-[#777166]">{coverage.brooklyn_elsewhere_companies}</p><p className="mt-1 text-sm font-semibold">Other Brooklyn</p><p className="mt-1 text-xs leading-5 text-[#777166]">No Williamsburg office evidence recorded</p></div>
          </div>
          <button onClick={() => onBrowse({ borough: "Brooklyn" })} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#7E4935] underline underline-offset-4">Browse all {brooklyn} Brooklyn companies <ArrowUpRight size={15} /></button>
        </section>
        <section className="rounded-xl border border-[#DCD7CE] p-5 sm:p-6" aria-labelledby="counts-title">
          <h3 id="counts-title" className="text-sm font-semibold">What these numbers can tell you</h3>
          <p className="mt-3 text-sm leading-6 text-[#625E55]">These are counts within a curated directory, not a complete census or a measure of each borough’s share of NYC’s AI industry. Office evidence can include announced locations; it does not independently confirm occupancy today.</p>
          <p className="mt-3 text-sm leading-6 text-[#625E55]">Map pins are a further subset: <strong>{mappedCount} companies</strong> have a sourced street address with coordinates. Missing pins do not mean a company is outside NYC.</p>
          <p className="mt-3 text-xs leading-5 text-[#777166]">To investigate a growing hub, compare occupied space, employment and move dates over time. This snapshot alone does not establish growth.</p>
        </section>
      </div>
    </div>
  </section>;
}

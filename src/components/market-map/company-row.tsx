import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";

import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { CategoryBadge } from "@/components/market-map/category-badge";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { RecentActivity } from "@/components/market-map/recent-activity";
import { UsageBadge } from "@/components/market-map/usage-badge";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/market";

export function CompanyRow({ company }: { company: Company }) {
  return (
    <Link
      href={`/companies/${company.slug}`}
      className={cn(
        "grid gap-4 border-b border-[#E7E1D8] px-4 py-4 transition hover:bg-[rgb(154_61_43_/_0.06)] md:grid-cols-[minmax(260px,1.3fr)_minmax(170px,0.8fr)_110px_150px_minmax(190px,1fr)] md:items-center",
        company.is_breakout && "bg-amber-50/30 hover:bg-amber-50/50",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <CompanyLogo
          company={company}
          name={company.name}
          category={company.category}
          className="size-10 text-xs"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold tracking-tight text-[#181818]">
              {company.name}
            </p>
            {company.is_breakout ? (
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
            ) : null}
            <ArrowUpRight className="size-3.5 text-[#9B948A]" />
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#5F5A52] md:line-clamp-1">
            {company.short_description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={company.category} />
        <CompanyViewCount views={company.metrics?.views ?? 0} />
      </div>
      <p className="text-sm text-[#5F5A52]">{company.stage}</p>
      <div>
        <UsageBadge value={getCompanySignalLabel(company)} />
      </div>
      <RecentActivity
        text={company.recent_activity_text}
        date={company.recent_activity_date}
        compact
      />
    </Link>
  );
}

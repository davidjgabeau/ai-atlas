import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";

import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { CategoryBadge } from "@/components/market-map/category-badge";
import {
  categoryStyles,
  categorySurfaceStyle,
} from "@/components/market-map/category-style";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { RecentActivity } from "@/components/market-map/recent-activity";
import { UsageBadge } from "@/components/market-map/usage-badge";
import { SaveCompanyButton } from "@/components/profile/save-company-button";
import { Card, CardContent } from "@/components/ui/card";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/market";

export function CompanyCard({
  company,
  compact = false,
}: {
  company: Company;
  compact?: boolean;
}) {
  return (
    <Card
      style={categorySurfaceStyle(company.category)}
      className={cn(
        "h-full rounded-md py-0 shadow-none app-card-border app-card-hover",
        categoryStyles[company.category].surfaceClassName,
        company.is_breakout && "ring-1 ring-[#E7E1D8]",
      )}
    >
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start gap-3">
          <CompanyLogo company={company} name={company.name} category={company.category} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/companies/${company.slug}`}
              className="text-company-name group inline-flex max-w-full items-center gap-1 text-base"
            >
              <span className="min-w-0 truncate">{company.name}</span>
              <ArrowUpRight className="app-arrow size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
            </Link>
            <p className="text-company-hook mt-1 line-clamp-1 text-sm leading-6">
              {company.generated.hook}
            </p>
            <p className="text-body mt-1 line-clamp-2 text-sm leading-6">
              {company.short_description}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {company.is_breakout ? (
            <div
              className="grid size-7 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-600 ring-1 ring-amber-100"
              aria-label="Featured company"
              title="Featured company"
            >
              <Star className="size-3.5 fill-current" />
            </div>
          ) : null}
          <SaveCompanyButton
            companyId={company.id}
            companyName={company.name}
            size="sm"
            className="max-w-full"
          />
        </div>
        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
          <CategoryBadge category={company.category} className="max-w-full" />
          <span className="text-meta rounded-md bg-[rgb(248_246_241_/_0.80)] px-2 py-1 text-xs ring-1 ring-[#E7E1D8]">
            {company.stage}
          </span>
          <UsageBadge value={getCompanySignalLabel(company)} />
          <CompanyViewCount
            companyId={company.id}
            views={company.metrics?.views ?? 0}
            className="ml-0.5"
          />
        </div>
        <div
          className={cn(
            "mt-auto",
            compact ? "pt-3" : "border-t border-[#E7E1D8] pt-5",
          )}
        >
          <p className="text-label mb-1 text-[10.5px] text-[#9B948A]">
            Recent Activity
          </p>
          <RecentActivity
            text={company.recent_activity_text}
            date={company.recent_activity_date}
            compact
          />
        </div>
      </CardContent>
    </Card>
  );
}

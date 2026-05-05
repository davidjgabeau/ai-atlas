import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryBadge } from "@/components/market-map/category-badge";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { RecentActivity } from "@/components/market-map/recent-activity";
import { UsageBadge } from "@/components/market-map/usage-badge";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { SaveCompanyButton } from "@/components/profile/save-company-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/market";

type WatchingCompanyListProps = {
  companies: Company[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function WatchingCompanyList({
  companies,
  emptyTitle = "No saved companies yet",
  emptyDescription = "Save companies across the atlas to build a public saved companies list.",
  className,
}: WatchingCompanyListProps) {
  if (companies.length === 0) {
    return (
      <div className={cn("rounded-md bg-[var(--app-surface)] p-8 text-center app-card-border", className)}>
        <p className="text-base font-semibold text-[#181818]">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-[#5F5A52]">
          {emptyDescription}
        </p>
        <Button asChild className="mt-5 app-primary-button">
          <Link href="/companies">
            Browse companies
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", className)}>
      {companies.map((company) => (
        <article
          key={company.id}
          className="rounded-md bg-[var(--app-surface)] p-4 app-card-border app-card-hover"
        >
          <div className="flex items-start gap-3">
            <CompanyLogo
              company={company}
              name={company.name}
              category={company.category}
              className="size-11 text-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/companies/${company.slug}`}
                    className="text-base font-semibold tracking-tight text-[#181818] hover:text-[#9A3D2B]"
                  >
                    {company.name}
                  </Link>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold leading-6 text-[#181818]">
                    {company.generated.hook}
                  </p>
                </div>
                <SaveCompanyButton
                  companyId={company.id}
                  companyName={company.name}
                  size="icon-sm"
                  showLabel={false}
                />
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5F5A52]">
                {company.short_description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CategoryBadge category={company.category} />
                <span className="rounded-md bg-[rgb(17_17_17_/_0.035)] px-2 py-1 text-xs font-medium text-[#5F5A52]">
                  {company.stage}
                </span>
                <UsageBadge value={getCompanySignalLabel(company)} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <RecentActivity
                  text={company.recent_activity_text}
                  date={company.recent_activity_date}
                  compact
                />
                <Link
                  href={`/companies/${company.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#9A3D2B] hover:underline"
                >
                  Open brief
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

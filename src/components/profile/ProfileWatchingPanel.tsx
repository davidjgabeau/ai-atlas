import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Avatar } from "@/components/avatars/Avatar";
import { CategoryBadge } from "@/components/market-map/category-badge";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { Button } from "@/components/ui/button";
import type { Company } from "@/types/market";

type ProfileWatchingPanelProps = {
  avatarId: string;
  companies: Company[];
};

export function ProfileWatchingPanel({
  avatarId,
  companies,
}: ProfileWatchingPanelProps) {
  const visibleCompanies = companies.slice(0, 5);

  return (
    <section className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7]">
      <div className="border-b border-[#E7E1D8] px-5 py-4">
        <h2 className="font-heading text-[1.45rem] font-semibold leading-tight text-[#111111]">
          Saved Companies
        </h2>
      </div>

      {companies.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1]">
            <Avatar avatarId={avatarId} size="md" />
          </div>
          <h3 className="mt-5 font-heading text-[1.35rem] font-semibold leading-tight text-[#111111]">
            Start saving companies
          </h3>
          <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-[#66625C]">
            You haven&apos;t saved any companies yet. Save companies to build
            your personal view of the early-stage NYC AI map.
          </p>
          <Button asChild className="mt-5 app-primary-button">
            <Link href="/companies">
              Explore companies
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-[#E7E1D8]">
          {visibleCompanies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.slug}`}
              className="group flex gap-3 px-5 py-4 transition hover:bg-[#F8F6F1]"
            >
              <CompanyLogo
                company={company}
                name={company.name}
                category={company.category}
                className="size-10 ring-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#111111] group-hover:text-[#9A3D2B]">
                  {company.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#66625C]">
                  {company.generated.hook}
                </p>
                <CategoryBadge category={company.category} className="mt-3" />
              </div>
            </Link>
          ))}
          {companies.length > visibleCompanies.length ? (
            <div className="px-5 py-4">
              <Button asChild variant="outline" className="w-full border-[#E7E1D8] bg-[#FBFAF7]">
                <Link href="/profile">
                  View all {companies.length} saved companies
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

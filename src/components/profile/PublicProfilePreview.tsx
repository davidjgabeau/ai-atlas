import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

import { Avatar } from "@/components/avatars/Avatar";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { Button } from "@/components/ui/button";
import type { Company } from "@/types/market";

type PublicProfilePreviewProps = {
  avatarId: string;
  bio: string;
  companies: Company[];
  handle: string;
  hasProfile: boolean;
  name: string;
  publicPath: string;
};

export function PublicProfilePreview({
  avatarId,
  bio,
  companies,
  handle,
  hasProfile,
  name,
  publicPath,
}: PublicProfilePreviewProps) {
  const previewCompanies = companies.slice(0, 3);

  return (
    <section className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7]">
      <div className="flex flex-col gap-4 border-b border-[#E7E1D8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-[1.45rem] font-semibold leading-tight text-[#111111]">
            Public profile preview
          </h2>
          <p className="mt-1 text-sm text-[#66625C]">
            A quick look at what other readers will see.
          </p>
        </div>
        {hasProfile ? (
          <Button
            asChild
            variant="outline"
            className="border-[#E7E1D8] bg-[#FBFAF7]"
          >
            <Link href={publicPath}>
              View public profile
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled
            className="border-[#E7E1D8] bg-[#FBFAF7]"
          >
            View public profile
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,0.58fr)_minmax(260px,0.42fr)]">
        <div className="flex gap-4">
          <Avatar avatarId={avatarId} size="lg" />
          <div className="min-w-0">
            <h3 className="font-heading text-[2rem] font-medium leading-none text-[#111111]">
              {name}
            </h3>
            <p className="mt-2 text-sm font-medium text-[#9A3D2B]">
              @{handle}
            </p>
            <p className="mt-4 max-w-[620px] text-sm leading-6 text-[#66625C]">
              {bio}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#E7E1D8] bg-[#F8F6F1] px-3 py-1.5 text-sm font-medium text-[#111111]">
              <Heart className="size-4 text-[#9A3D2B]" />
              {companies.length} saved {companies.length === 1 ? "company" : "companies"}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-[#E7E1D8] bg-[#F8F6F1]">
          <div className="border-b border-[#E7E1D8] px-4 py-3">
            <p className="text-xs font-semibold text-[#66625C]">
              Saved companies preview
            </p>
          </div>
          {previewCompanies.length > 0 ? (
            <div className="divide-y divide-[#E7E1D8]">
              {previewCompanies.map((company) => (
                <div key={company.id} className="flex items-center gap-3 px-4 py-3">
                  <CompanyLogo
                    company={company}
                    name={company.name}
                    category={company.category}
                    className="size-9 ring-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111111]">
                      {company.name}
                    </p>
                    <p className="truncate text-xs text-[#66625C]">
                      {company.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm leading-6 text-[#66625C]">
              Saved companies will appear here once this profile starts saving
              companies.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

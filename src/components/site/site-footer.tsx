import Link from "next/link";

import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { isAdminEnabled } from "@/lib/admin";

export function SiteFooter() {
  const showAdmin = isAdminEnabled();

  return (
    <footer className="border-t border-[#E7E1D8] bg-[var(--app-surface)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#7A746C] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>A curated view of early-stage NYC AI startups from pre-seed through Series A.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/companies"
            className="inline-flex items-center gap-1.5 hover:text-[#9A3D2B]"
          >
            <PixelSiteIcon name="globe" size="xs" />
            Map
          </Link>
          <Link href="/categories" className="hover:text-[#9A3D2B]">
            Categories
          </Link>
          <Link href="/jobs" className="hover:text-[#9A3D2B]">
            Jobs
          </Link>
          <Link href="/submit" className="hover:text-[#9A3D2B]">
            Submit
          </Link>
          {showAdmin ? (
            <Link href="/admin" className="hover:text-[#9A3D2B]">
              Curation
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

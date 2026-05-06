import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { patterns } from "@/data/patterns";

export function HomePatterns() {
  const featuredPatterns = patterns.slice(0, 3);

  return (
    <section id="home-patterns" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container pb-10 pt-0 lg:pb-12">
        <div className="border-t border-[#DCD2C3] pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 text-[#9A3D2B]" aria-hidden="true" />
              <h2 className="text-section-title text-[26px] leading-none">
                Patterns
              </h2>
            </div>
            <Link
              href="/patterns"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
            >
              View all patterns
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-4 grid divide-y divide-[#E7E1D8] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {featuredPatterns.map((pattern) => (
            <Link
              key={pattern.slug}
              href={`/patterns/${pattern.slug}`}
              className="group py-4 transition hover:bg-[rgb(17_17_17_/_0.025)] lg:px-10 lg:py-0 first:lg:pl-0 last:lg:pr-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label text-[11px] text-[#9A3D2B]">
                  Pattern
                </span>
                <span className="text-meta text-xs">
                  {pattern.companies.length} companies
                </span>
              </div>
              <h3 className="text-company-name mt-2 text-[20px] leading-[1.18] transition group-hover:text-[#9A3D2B]">
                {pattern.title}
              </h3>
              <p className="text-body mt-2 line-clamp-3 text-sm lg:line-clamp-2">
                {pattern.framing}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

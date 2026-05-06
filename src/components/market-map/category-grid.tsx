import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { categoryStyles, categorySurfaceStyle } from "@/components/market-map/category-style";
import { categoryMeta, getCategoryCounts } from "@/data/market";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/market";

export function CategoryGrid({ companies }: { companies: Company[] }) {
  const counts = getCategoryCounts(companies);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {categoryMeta.map((category) => {
        const style = categoryStyles[category.name];

        return (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            style={categorySurfaceStyle(category.name)}
            className={cn(
              "group rounded-md p-4 app-card-hover",
              style.surfaceClassName,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <CategoryPixelIcon category={category.name} size="lg" labeled />
              <div className="live-count-pill px-2.5 py-1 text-xs">
                {counts[category.name]} startups to know
              </div>
            </div>
            <div className="mt-5">
              <h3 className="text-base font-semibold tracking-[0] text-[#181818]">
                {category.name}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5F5A52]">
                {category.description}
              </p>
            </div>
            <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#181818]">
              View category
              <ArrowRight className="app-arrow size-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

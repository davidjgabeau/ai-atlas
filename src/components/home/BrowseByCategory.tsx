import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import type { Category, CategoryMeta } from "@/types/market";

export function BrowseByCategory({
  categories,
  counts,
}: {
  categories: CategoryMeta[];
  counts: Record<Category, number>;
}) {
  return (
    <section id="categories" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="editorial-label">Market sections</p>
            <h2 className="mt-3 editorial-section-title">Browse by Category</h2>
            <p className="text-body mt-2 max-w-[680px] text-sm">
              Explore early-stage NYC AI by buyer, workflow, and product surface.
            </p>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B]"
          >
            All categories
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid border-t border-[#E7E1D8] md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group flex min-h-[166px] flex-col justify-between border-b border-[#E7E1D8] p-4 transition hover:bg-[rgb(17_17_17_/_0.025)] md:odd:border-r xl:border-r xl:[&:nth-child(3n)]:border-r-0"
            >
              <div>
                <CategoryPixelIcon category={category.name} size="md" labeled />
                <h3 className="text-company-name mt-3 text-[18px] leading-[1.2]">
                  {category.name}
                </h3>
                <p className="text-body mt-2 line-clamp-2 text-sm">
                  {category.description}
                </p>
              </div>
              <div className="text-meta mt-4 flex items-center justify-between text-sm">
                <span>{formatCategoryCount(counts[category.name] ?? 0)}</span>
                <ArrowRight className="size-3.5 text-[#9A3D2B] transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatCategoryCount(count: number) {
  return `${count} ${count === 1 ? "company" : "companies"}`;
}

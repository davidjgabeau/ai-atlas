import Link from "next/link";

import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import type { Category } from "@/types/market";

export type CategoryPulseItem = {
  category: Category;
  count: number;
  href: string;
  phrase: string;
};

export function CategoryPulse({ items }: { items: CategoryPulseItem[] }) {
  return (
    <section aria-labelledby="category-pulse">
      <h2
        id="category-pulse"
        className="text-section-title text-[26px] lg:text-[30px]"
      >
        Category Pulse
      </h2>
      <p className="text-body mt-2 text-sm lg:hidden">
        Where early-stage NYC AI companies are clustering.
      </p>

      <div className="mt-3 divide-y divide-[#E7E1D8] lg:mt-2 lg:border-0">
        {items.slice(0, 3).map((item) => (
          <Link
            key={item.category}
            href={item.href}
            className="group grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3 transition hover:bg-[rgb(17_17_17_/_0.025)] lg:py-2"
          >
            <CategoryPixelIcon category={item.category} size="sm" labeled />
            <div className="min-w-0">
              <h3 className="text-company-hook text-[14px] leading-[1.25]">
                {item.category}
              </h3>
              <p className="text-meta mt-1 text-xs leading-[1.35]">
                {formatCompanyCount(item.count)} · {formatPulsePhrase(item)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatCompanyCount(count: number) {
  return `${count} ${count === 1 ? "company" : "companies"}`;
}

function formatPulsePhrase(item: CategoryPulseItem) {
  const phrases: Partial<Record<Category, string>> = {
    "Enterprise GTM & RevOps AI": "back-office workflows",
    "AI-Native Consumer & Social": "daily behavior",
    "Health & Clinical AI": "care operations",
    "Fintech & Trading AI": "research and risk",
    "Agent Infrastructure": "runtime reliability",
    "Data & Memory Layer": "context layers",
  };

  return phrases[item.category] ?? item.phrase;
}

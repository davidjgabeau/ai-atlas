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
        className="font-heading text-[25px] font-medium leading-[1.05] tracking-[-0.025em] text-[#181818]"
      >
        Category Pulse
      </h2>
      <p className="mt-2 text-sm leading-[1.45] text-[#5F5A52]">
        Where early-stage NYC AI companies are clustering.
      </p>

      <div className="mt-4 divide-y divide-[#E7E1D8] border-y border-[#E7E1D8]">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.category}
            href={item.href}
            className="group grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3 transition hover:bg-[rgb(17_17_17_/_0.025)]"
          >
            <CategoryPixelIcon category={item.category} size="sm" labeled />
            <div className="min-w-0">
              <h3 className="truncate font-sans text-[14px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#181818]">
                {item.category}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs leading-[1.35] text-[#66625C]">
                {formatCompanyCount(item.count)} · {item.phrase}
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

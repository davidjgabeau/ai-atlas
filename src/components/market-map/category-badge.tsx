import { Badge } from "@/components/ui/badge";
import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/market";

export function CategoryBadge({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full shrink justify-start rounded-md border border-[#E7E1D8] bg-transparent px-2 py-1 text-xs font-medium text-[#5F5A52]",
        className,
      )}
    >
      <CategoryPixelIcon category={category} size="xs" />
      <span className="min-w-0 truncate">{category}</span>
    </Badge>
  );
}

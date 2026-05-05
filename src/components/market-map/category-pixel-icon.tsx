import Image from "next/image";

import { categoryStyles } from "@/components/market-map/category-style";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/market";

const sizeMap = {
  xs: "size-4",
  sm: "size-5",
  md: "size-8",
  lg: "size-12",
} as const;

export function CategoryPixelIcon({
  category,
  size = "sm",
  className,
  labeled = false,
}: {
  category: Category;
  size?: keyof typeof sizeMap;
  className?: string;
  labeled?: boolean;
}) {
  const style = categoryStyles[category];

  return (
    <span
      aria-label={labeled ? `${category} category` : undefined}
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden",
        sizeMap[size],
        className,
      )}
    >
      <Image
        src={style.avatarSrc}
        alt={labeled ? `${category} category` : ""}
        width={96}
        height={96}
        unoptimized
        className="h-full w-full object-contain [image-rendering:pixelated]"
        draggable={false}
      />
    </span>
  );
}

import { Eye } from "lucide-react";

import { formatViewCount } from "@/lib/metrics/formatViewCount";
import { cn } from "@/lib/utils";

type CompanyViewCountProps = {
  views?: number;
  className?: string;
  showTextLabel?: boolean;
};

export function CompanyViewCount({
  views = 0,
  className,
  showTextLabel = false,
}: CompanyViewCountProps) {
  const formattedViews = formatViewCount(views);

  return (
    <span
      aria-label={`${formattedViews} views`}
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium leading-none text-[#66625C] transition group-hover:text-[#4F4A43]",
        className,
      )}
    >
      <Eye className="size-3.5 opacity-65" aria-hidden="true" />
      <span>{formattedViews}</span>
      {showTextLabel ? (
        <span aria-hidden="true">{views === 1 ? "view" : "views"}</span>
      ) : (
        <span className="sr-only">views</span>
      )}
    </span>
  );
}

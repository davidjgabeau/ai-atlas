import { Clock3 } from "lucide-react";

import { formatActivity } from "@/lib/format";

export function RecentActivity({
  text,
  date,
  compact = false,
}: {
  text: string;
  date: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-[#5F5A52]">
      <Clock3 className="mt-0.5 size-3.5 shrink-0 text-[#9B948A]" />
      <span className={compact ? "line-clamp-1" : undefined}>
        {formatActivity(text, date)}
      </span>
    </div>
  );
}

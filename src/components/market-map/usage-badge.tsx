import { Badge } from "@/components/ui/badge";
import { normalizeSignalLabel } from "@/lib/signals/companySignal";
import { cn } from "@/lib/utils";
import type { GeneratedSignalLabel } from "@/types/market";

const signalClasses: Record<GeneratedSignalLabel, string> = {
  Featured: "bg-[rgb(154_61_43_/_0.12)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Worth watching": "bg-transparent text-[#5F5A52] ring-[#E7E1D8]",
  "Recently added": "bg-[rgb(154_61_43_/_0.07)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Clear buyer pull": "bg-[rgb(154_61_43_/_0.08)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Workflow signal": "bg-[rgb(17_17_17_/_0.035)] text-[#5F5A52] ring-[#E7E1D8]",
  "Infra signal": "bg-[rgb(17_17_17_/_0.035)] text-[#5F5A52] ring-[#E7E1D8]",
  "Consumer signal": "bg-[rgb(154_61_43_/_0.07)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Enterprise signal": "bg-[rgb(17_17_17_/_0.035)] text-[#5F5A52] ring-[#E7E1D8]",
  "Funding signal": "bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-[#E7E1D8]",
};

export function UsageBadge({
  value,
  label,
  className,
}: {
  value?: string;
  label?: string;
  className?: string;
}) {
  const signalLabel = normalizeSignalLabel(label ?? value);

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full shrink rounded-md border-0 px-2 py-1 text-xs font-medium ring-1",
        signalClasses[signalLabel],
        className,
      )}
    >
      <span className="min-w-0 truncate">{signalLabel}</span>
    </Badge>
  );
}

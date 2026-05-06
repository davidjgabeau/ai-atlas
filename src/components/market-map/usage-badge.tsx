import { Badge } from "@/components/ui/badge";
import { normalizeSignalLabel } from "@/lib/signals/companySignal";
import { cn } from "@/lib/utils";
import type { GeneratedSignalLabel } from "@/types/market";

const signalClasses: Record<GeneratedSignalLabel, string> = {
  Featured: "bg-[rgb(154_61_43_/_0.12)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Worth watching": "bg-transparent text-[#5F5A52] ring-[#E7E1D8]",
  "Recently added": "bg-[rgb(49_71_94_/_0.07)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
  "Clear buyer pull": "bg-[rgb(49_71_94_/_0.08)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
  "Workflow signal": "bg-[rgb(17_17_17_/_0.035)] text-[#5F5A52] ring-[#E7E1D8]",
  "Infra signal": "bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-[#E7E1D8]",
  "Consumer signal": "bg-[rgb(49_71_94_/_0.07)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
  "Enterprise signal": "bg-[rgb(17_17_17_/_0.035)] text-[#5F5A52] ring-[#E7E1D8]",
  "Funding signal": "bg-[rgb(49_71_94_/_0.08)] text-[var(--app-secondary-accent)] ring-[#DCE1DF]",
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
        "text-label max-w-full shrink rounded-md border-0 px-2 py-1 text-[10.5px] ring-1",
        signalClasses[signalLabel],
        className,
      )}
    >
      <span className="min-w-0 truncate">{signalLabel}</span>
    </Badge>
  );
}

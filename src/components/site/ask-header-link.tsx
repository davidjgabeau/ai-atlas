import Link from "next/link";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type AskHeaderLinkProps = {
  active?: boolean;
  className?: string;
};

export function AskHeaderLink({
  active = false,
  className,
}: AskHeaderLinkProps) {
  return (
    <Link
      href="/ask"
      aria-label="Ask Atlas"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#D8CFC1] bg-[#FBFAF7] px-3 text-sm font-semibold text-[#181818] transition hover:border-[#C8B8A8] hover:bg-[rgb(154_61_43_/_0.055)] hover:text-[#9A3D2B]",
        active && "border-[#C8B8A8] bg-[rgb(154_61_43_/_0.08)] text-[#9A3D2B]",
        className,
      )}
    >
      <Sparkles className="size-3.5 text-[#9A3D2B]" />
      Ask
    </Link>
  );
}

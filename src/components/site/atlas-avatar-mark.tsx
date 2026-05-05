import Image from "next/image";

import { cn } from "@/lib/utils";

type AtlasAvatarMarkProps = {
  size?: "sm" | "md";
  className?: string;
};

const sizeClassNames = {
  sm: "size-6",
  md: "size-7",
};

export function AtlasAvatarMark({
  size = "md",
  className,
}: AtlasAvatarMarkProps) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden",
        sizeClassNames[size],
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/logo/ai-atlas-bridge.png"
        alt="AI Atlas NYC"
        width={128}
        height={128}
        unoptimized
        className="h-full w-full object-contain [image-rendering:pixelated]"
        draggable={false}
      />
    </span>
  );
}

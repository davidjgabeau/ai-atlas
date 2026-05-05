import Image from "next/image";

import { cn } from "@/lib/utils";

const iconSources = {
  bridgeMini: "/icons/bridge-mini.png",
  compass: "/icons/compass.png",
  globe: "/icons/globe.png",
  grid: "/icons/grid.png",
  map: "/icons/map.png",
  pin: "/icons/pin.png",
  skyline: "/icons/skyline.png",
} as const;

export type PixelSiteIconName = keyof typeof iconSources;

const sizeClassNames = {
  xs: "size-4",
  sm: "size-5",
  md: "size-6",
} as const;

type PixelSiteIconProps = {
  name: PixelSiteIconName;
  size?: keyof typeof sizeClassNames;
  className?: string;
  alt?: string;
};

export function PixelSiteIcon({
  name,
  size = "sm",
  className,
  alt = "",
}: PixelSiteIconProps) {
  return (
    <span
      aria-hidden={alt ? undefined : "true"}
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden",
        sizeClassNames[size],
        className,
      )}
    >
      <Image
        src={iconSources[name]}
        alt={alt}
        width={64}
        height={64}
        unoptimized
        className="h-full w-full object-contain [image-rendering:pixelated]"
        draggable={false}
      />
    </span>
  );
}

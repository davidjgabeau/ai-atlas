import Link from "next/link";

import {
  PixelSiteIcon,
  type PixelSiteIconName,
} from "@/components/site/pixel-site-icon";
import { cn } from "@/lib/utils";

type SpriteHeaderLinkProps = {
  href: string;
  icon: PixelSiteIconName;
  label: string;
  active?: boolean;
  className?: string;
};

export function SpriteHeaderLink({
  href,
  icon,
  label,
  active = false,
  className,
}: SpriteHeaderLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group flex min-w-12 flex-col items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[#4F4A43] transition hover:bg-[rgb(17_17_17_/_0.035)] hover:text-[#181818]",
        active && "text-[#9A3D2B]",
        className,
      )}
    >
      <PixelSiteIcon
        name={icon}
        size="md"
        className="transition group-hover:scale-[1.04]"
      />
      <span className="text-[10px] font-semibold leading-none tracking-[0.02em]">
        {label.toLowerCase()}
      </span>
    </Link>
  );
}

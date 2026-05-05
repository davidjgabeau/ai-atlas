import Image from "next/image";

import { getAvatarById } from "@/lib/avatars/avatarCatalog";
import { cn } from "@/lib/utils";

type AvatarProps = {
  avatarId?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClassNames = {
  sm: "size-8",
  md: "size-11",
  lg: "size-16",
};

export function Avatar({ avatarId, size = "md", className }: AvatarProps) {
  const avatar = getAvatarById(avatarId);

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-md border border-[#E7E1D8] bg-[#F8F4EF]",
        sizeClassNames[size],
        className,
      )}
    >
      <Image
        src={avatar.src}
        alt={`${avatar.label} pixel avatar`}
        width={64}
        height={64}
        unoptimized
        className="h-full w-full object-contain [image-rendering:pixelated]"
        draggable={false}
      />
    </span>
  );
}

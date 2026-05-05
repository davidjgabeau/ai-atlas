import Link from "next/link";

import { AtlasAvatarMark } from "@/components/site/atlas-avatar-mark";

export function LogoMark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      aria-label="AI Atlas NYC home"
    >
      <AtlasAvatarMark size="sm" />
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight text-[#181818]">
          AI Atlas NYC
        </div>
      </div>
    </Link>
  );
}

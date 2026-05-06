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
        <div className="siteWordmark text-[18px]">
          AI Atlas NYC
        </div>
      </div>
    </Link>
  );
}

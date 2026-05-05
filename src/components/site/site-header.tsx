import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/logo-mark";
import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { ProfileHeaderLink } from "@/components/site/profile-header-link";
import { SpriteHeaderLink } from "@/components/site/sprite-header-link";
import { isAdminEnabled } from "@/lib/admin";

const publicNavItems = [
  { href: "/companies", label: "Map", icon: "globe" as const },
  { href: "/categories", label: "Categories", icon: "grid" as const },
  { href: "/feed", label: "Newsfeed", icon: "pin" as const },
  { href: "/jobs", label: "Jobs", icon: "skyline" as const },
  { href: "/insights", label: "Highlights", icon: "compass" as const },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const navItems = isAdminEnabled()
    ? [...publicNavItems, { href: "/admin", label: "Curation" }]
    : publicNavItems;

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E1D8] bg-[rgb(248_246_241_/_0.95)] backdrop-blur">
      <div className="mx-auto flex h-[74px] w-full max-w-[1120px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <LogoMark />
        <nav className="hidden items-center gap-4 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            "icon" in item && item.icon ? (
              <SpriteHeaderLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-[#181818] transition hover:text-[#9A3D2B]"
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild size="lg" className="app-primary-button">
            <Link href="/submit">
              <Plus className="size-3.5" />
              Submit Startup
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ProfileHeaderLink compact />
          <Button asChild variant="outline" size="sm">
            <Link href="/companies">
              <PixelSiteIcon name="globe" size="xs" />
              Map
            </Link>
          </Button>
          <Button asChild size="sm" className="app-primary-button">
            <Link href="/submit">
              <Plus className="size-3.5" />
              Submit
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

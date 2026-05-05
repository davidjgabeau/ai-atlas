"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AtlasAvatarMark } from "@/components/site/atlas-avatar-mark";
import { GlobalSearch } from "@/components/site/global-search";
import { MobileNavMenu } from "@/components/site/mobile-nav-menu";
import { ProfileHeaderLink } from "@/components/site/profile-header-link";
import { SpriteHeaderLink } from "@/components/site/sprite-header-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/market";

const navItems = [
  { label: "Map", href: "/companies", icon: "globe" as const },
  { label: "Categories", href: "/categories", icon: "grid" as const },
  { label: "Patterns", href: "/patterns", icon: "compass" as const },
  { label: "Newsfeed", href: "/feed", icon: "pin" as const },
  { label: "Jobs", href: "/jobs", icon: "skyline" as const },
];

type AppShellProps = {
  children: ReactNode;
  rightPanel?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  activeCategory?: Category | "all";
  onCategorySelect?: (category: Category) => void;
};

export function AppShell(props: AppShellProps) {
  const { children, rightPanel, search, onSearchChange } = props;
  const [localSearch, setLocalSearch] = useState("");
  const searchValue = search ?? localSearch;
  const setSearchValue = onSearchChange ?? setLocalSearch;

  return (
    <div className="min-h-screen bg-transparent text-[#181818]">
      <PublicationHeader search={searchValue} onSearchChange={setSearchValue} />
      <div
        className={cn(
          "min-w-0",
          rightPanel &&
            "mx-auto grid w-full max-w-[1280px] md:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]",
        )}
      >
        {children}
        {rightPanel}
      </div>
    </div>
  );
}

function PublicationHeader({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#E7E1D8] bg-[rgb(248_246_241_/_0.94)] backdrop-blur-md">
      <div className="editorial-container flex h-16 items-center gap-3 sm:gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="AI Atlas NYC home">
          <AtlasAvatarMark size="sm" />
          <span className="leading-tight">
            <span className="block font-heading text-[18px] font-medium tracking-[-0.025em] text-[#181818]">
              AI Atlas NYC
            </span>
          </span>
        </Link>

        <GlobalSearch
          id="app-search"
          value={search}
          onValueChange={onSearchChange}
          className="hidden min-w-[260px] flex-1 md:block lg:max-w-[420px]"
          inputClassName="h-10 rounded-md border-[#E7E1D8] bg-[#FBFAF7] pl-9 text-sm text-[#181818] shadow-none placeholder:text-[#9B948A] focus:border-[#CFC7BC] focus:ring-0"
        />

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-3 lg:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SpriteHeaderLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={active}
              />
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <ProfileHeaderLink className="inline-flex" compact />
          <MobileNavMenu />
        </div>

        <Button asChild className="hidden app-primary-button lg:inline-flex">
          <Link href="/submit">Submit</Link>
        </Button>
      </div>

      <GlobalSearch
        id="app-search-mobile"
        value={search}
        onValueChange={onSearchChange}
        className="mx-5 my-4 md:hidden"
        inputClassName="h-12 rounded-md border-[#E7E1D8] bg-[#FBFAF7] pl-9 text-[16px] text-[#181818] shadow-none placeholder:text-[#9B948A] focus:border-[#CFC7BC] focus:ring-0"
      />
    </header>
  );
}

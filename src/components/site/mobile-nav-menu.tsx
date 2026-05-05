"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LogOut, Menu } from "lucide-react";

import { PixelSiteIcon } from "@/components/site/pixel-site-icon";
import { Button } from "@/components/ui/button";
import { useLocalProfile } from "@/hooks/use-local-profile";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { label: "Map", href: "/companies", icon: "globe" as const },
  { label: "Categories", href: "/categories", icon: "grid" as const },
  { label: "Patterns", href: "/patterns", icon: "compass" as const },
  { label: "Newsfeed", href: "/feed", icon: "pin" as const },
  { label: "Jobs", href: "/jobs", icon: "skyline" as const },
  { label: "Highlights", href: "/insights", icon: "compass" as const },
];

export function MobileNavMenu({ className }: { className?: string }) {
  const pathname = usePathname();
  const { authBusy, isSignedIn, ready, signOut } = useLocalProfile();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className={cn(
            "border-[#E7E1D8] bg-[#FBFAF7] text-[#181818] shadow-none lg:hidden",
            className,
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="!w-[min(88vw,360px)] !max-w-[min(88vw,360px)] border-[#E7E1D8] bg-[#F8F6F1] p-0 shadow-none lg:hidden"
      >
        <div className="border-b border-[#E7E1D8] px-5 py-5">
          <SheetTitle className="font-heading text-2xl font-medium tracking-[-0.02em] text-[#181818]">
            AI Atlas NYC
          </SheetTitle>
          <SheetDescription className="mt-1 text-sm leading-6 text-[#66625C]">
            Map, news, jobs, highlights, and your profile.
          </SheetDescription>
        </div>

        <nav aria-label="Mobile primary" className="flex flex-col px-3 py-3">
          {mobileNavItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-base font-semibold text-[#181818] transition hover:bg-[rgb(17_17_17_/_0.035)]",
                    active && "bg-[rgb(154_61_43_/_0.08)] text-[#9A3D2B]",
                  )}
                >
                  <PixelSiteIcon name={item.icon} size="sm" />
                  <span className="flex-1">{item.label}</span>
                  <ArrowRight className="size-4 text-[#9B948A]" />
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#E7E1D8] p-5">
          <SheetClose asChild>
            <Link
              href="/submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#111111] px-4 text-sm font-semibold text-[#F8F6F1] transition hover:bg-[#2A2926]"
            >
              Submit startup
              <ArrowRight className="size-4" />
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              href="/profile"
              className="mt-3 flex items-center justify-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] px-4 py-3 text-sm font-semibold text-[#181818] transition hover:bg-[rgb(17_17_17_/_0.035)]"
            >
              Profile
            </Link>
          </SheetClose>
          {ready && isSignedIn ? (
            <SheetClose asChild>
              <button
                type="button"
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] px-4 text-sm font-semibold text-[#181818] transition hover:bg-[rgb(17_17_17_/_0.035)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={authBusy}
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
                {authBusy ? "Signing out..." : "Log out"}
              </button>
            </SheetClose>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

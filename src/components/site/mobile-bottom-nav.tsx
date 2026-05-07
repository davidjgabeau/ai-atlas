"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const mobileTabs = [
  { label: "Browse", href: "/companies" },
  { label: "Patterns", href: "/patterns" },
  { label: "Submit", href: "/submit" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E7E1D8] bg-white md:hidden"
    >
      <div className="grid h-16 grid-cols-3">
        {mobileTabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center justify-center text-sm font-semibold transition hover:text-[#9A3D2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#9A3D2B]",
                active ? "text-[#9A3D2B]" : "text-[#4F4A43]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

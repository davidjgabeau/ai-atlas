import {
  Banknote,
  BriefcaseBusiness,
  Dna,
  ShieldCheck,
  Database,
  Megaphone,
  Network,
  Cpu,
  Scale,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

import type { Category } from "@/types/market";

export type CategoryStyle = {
  icon: LucideIcon;
  avatarSrc: string;
  color: string;
  surfaceColor: string;
  iconClassName: string;
  badgeClassName: string;
  surfaceClassName: string;
};

export const categoryStyles: Record<Category, CategoryStyle> = {
  "Fintech & Trading AI": {
    icon: Banknote,
    avatarSrc: "/avatars/categories/fintech-trading-ai.png",
    color: "#1D4ED8",
    surfaceColor: "rgb(29 78 216 / 6%)",
    iconClassName: "bg-blue-100 text-[#1D4ED8] ring-[#1D4ED8]/20",
    badgeClassName: "bg-blue-50 text-[#1D4ED8] ring-[#1D4ED8]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Legal & Compliance AI": {
    icon: Scale,
    avatarSrc: "/avatars/categories/legal-compliance-ai.png",
    color: "#7C3AED",
    surfaceColor: "rgb(124 58 237 / 6%)",
    iconClassName: "bg-violet-100 text-[#7C3AED] ring-[#7C3AED]/20",
    badgeClassName: "bg-violet-50 text-[#7C3AED] ring-[#7C3AED]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Cybersecurity AI": {
    icon: ShieldCheck,
    avatarSrc: "/avatars/categories/cybersecurity-ai.png",
    color: "#0F766E",
    surfaceColor: "rgb(15 118 110 / 6%)",
    iconClassName: "bg-teal-100 text-[#0F766E] ring-[#0F766E]/20",
    badgeClassName: "bg-teal-50 text-[#0F766E] ring-[#0F766E]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Media, Ads & Creative AI": {
    icon: Megaphone,
    avatarSrc: "/avatars/categories/media-ads-creative-ai.png",
    color: "#E11D48",
    surfaceColor: "rgb(225 29 72 / 6%)",
    iconClassName: "bg-rose-100 text-[#E11D48] ring-[#E11D48]/20",
    badgeClassName: "bg-rose-50 text-[#E11D48] ring-[#E11D48]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Health & Clinical AI": {
    icon: Stethoscope,
    avatarSrc: "/avatars/categories/health-clinical-ai.png",
    color: "#059669",
    surfaceColor: "rgb(5 150 105 / 6%)",
    iconClassName: "bg-emerald-100 text-[#059669] ring-[#059669]/20",
    badgeClassName: "bg-emerald-50 text-[#059669] ring-[#059669]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Life Sciences AI": {
    icon: Dna,
    avatarSrc: "/avatars/categories/life-sciences-ai.png",
    color: "#047857",
    surfaceColor: "rgb(4 120 87 / 6%)",
    iconClassName: "bg-emerald-100 text-[#047857] ring-[#047857]/20",
    badgeClassName: "bg-emerald-50 text-[#047857] ring-[#047857]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "AI-Native Consumer & Social": {
    icon: UsersRound,
    avatarSrc: "/avatars/categories/ai-native-consumer-social.png",
    color: "#EC4899",
    surfaceColor: "rgb(236 72 153 / 6%)",
    iconClassName: "bg-pink-100 text-[#EC4899] ring-[#EC4899]/20",
    badgeClassName: "bg-pink-50 text-[#EC4899] ring-[#EC4899]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Agent Infrastructure": {
    icon: Network,
    avatarSrc: "/avatars/categories/agent-infrastructure.png",
    color: "#EA580C",
    surfaceColor: "rgb(234 88 12 / 6%)",
    iconClassName: "bg-orange-100 text-[#EA580C] ring-[#EA580C]/20",
    badgeClassName: "bg-orange-50 text-[#EA580C] ring-[#EA580C]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Model Tools & Dev Platform": {
    icon: Cpu,
    avatarSrc: "/avatars/categories/model-tools-dev-platform.png",
    color: "#0F766E",
    surfaceColor: "rgb(15 118 110 / 6%)",
    iconClassName: "bg-teal-100 text-[#0F766E] ring-[#0F766E]/20",
    badgeClassName: "bg-teal-50 text-[#0F766E] ring-[#0F766E]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Enterprise GTM & RevOps AI": {
    icon: BriefcaseBusiness,
    avatarSrc: "/avatars/categories/enterprise-gtm-revops-ai.png",
    color: "#F59E0B",
    surfaceColor: "rgb(245 158 11 / 7%)",
    iconClassName: "bg-amber-100 text-[#D97706] ring-[#F59E0B]/20",
    badgeClassName: "bg-amber-50 text-[#D97706] ring-[#F59E0B]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
  "Data & Memory Layer": {
    icon: Database,
    avatarSrc: "/avatars/categories/data-memory-layer.png",
    color: "#2563EB",
    surfaceColor: "rgb(37 99 235 / 6%)",
    iconClassName: "bg-indigo-100 text-[#2563EB] ring-[#2563EB]/20",
    badgeClassName: "bg-indigo-50 text-[#2563EB] ring-[#2563EB]/20",
    surfaceClassName: "app-card-border category-hover-card",
  },
};

export function categorySurfaceStyle(category: Category): CSSProperties {
  const style = categoryStyles[category];

  return {
    "--category-color": style.color,
    backgroundColor: style.surfaceColor,
  } as CSSProperties;
}

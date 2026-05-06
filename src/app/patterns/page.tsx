import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicShell } from "@/components/site/public-shell";
import { patterns, type Pattern } from "@/data/patterns";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import {
  absoluteUrl,
  createShareMetadata,
  getShareImageUrl,
} from "@/lib/seo/shareMetadata";
import {
  collectionPageSchema,
  patternCollectionItems,
} from "@/lib/seo/schema";
import {
  consumptionProfileLabels,
  type ConsumptionProfile,
} from "@/types/market";

export const metadata: Metadata = createShareMetadata({
  title: "NYC AI Startup Patterns",
  description:
    "Read market patterns and thesis notes from the early-stage NYC AI map, covering companies, categories, buyers, workflows, and emerging product surfaces.",
  path: "/patterns",
  image: getShareImageUrl({ page: "insights" }),
});

type PatternStats = {
  patternCount: number;
  uniqueCompanyCount: number;
  latestUpdatedAt?: string;
  themeCount: number;
};

type ThemeDistributionRow = {
  profile: ConsumptionProfile;
  label: string;
  description: string;
  count: number;
  share: number;
  kind: PatternKind;
};

type PatternKind =
  | "finance"
  | "vertical"
  | "tooling"
  | "voice"
  | "compliance"
  | "consumer"
  | "healthcare"
  | "default";

export default function PatternsPage() {
  const latestUpdatedAt = getLatestPatternUpdatedAt();
  const themeRows = getThemeDistributionRows(patterns);
  const stats: PatternStats = {
    patternCount: patterns.length,
    uniqueCompanyCount: getUniqueCompanyCount(patterns),
    latestUpdatedAt,
    themeCount: themeRows.length,
  };

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: "NYC AI Startup Patterns",
          description:
            "Read market patterns and thesis notes from the early-stage NYC AI map, covering companies, categories, buyers, workflows, and emerging product surfaces.",
          url: absoluteUrl("/patterns"),
          items: patternCollectionItems(patterns),
        })}
      />
      <PublicShell>
        <main className="bg-section overflow-x-hidden">
          <div className="mx-auto grid min-w-0 max-w-[min(1360px,100vw)] overflow-x-hidden px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-14 lg:px-12 lg:py-12 xl:gap-16 xl:px-16">
            <div className="min-w-0 max-w-[calc(100vw-40px)] sm:max-w-none">
              <PatternsPageHero stats={stats} />
              <PatternList patterns={patterns} />
              <div className="mt-8 text-center lg:hidden">
                <Link
                  href="#pattern-library"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#7F3023]"
                >
                  View all {stats.patternCount} patterns
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <aside className="mt-10 flex min-w-0 max-w-[calc(100vw-40px)] flex-col gap-4 sm:max-w-none lg:mt-0 lg:border-l lg:border-[#E7E1D8] lg:pl-10 xl:pl-12">
              <PatternSnapshot stats={stats} />
              <PatternEditorNote className="order-3 lg:order-none" />
              <ThemeDistribution
                rows={themeRows}
                className="order-2 lg:order-none"
              />
            </aside>
          </div>
        </main>
      </PublicShell>
    </>
  );
}

function PatternsPageHero({ stats }: { stats: PatternStats }) {
  return (
    <section className="border-b border-[#E7E1D8] pb-8 lg:pb-10">
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,0.62fr)_minmax(230px,0.38fr)] lg:gap-8 xl:grid-cols-[minmax(0,0.64fr)_minmax(260px,0.36fr)]">
        <div className="min-w-0">
          <p className="editorial-label">Pattern Recognition</p>
          <h1 className="mt-5 max-w-[640px] font-heading text-[clamp(44px,7vw,64px)] font-medium leading-[0.95] tracking-[0] text-[#181818] lg:text-[clamp(52px,4vw,64px)]">
            Patterns Across The NYC AI Map
          </h1>
          <p className="mt-5 max-w-[690px] text-[17px] leading-[1.55] text-[#5F5A52] sm:text-[18px]">
            Recurring shapes and signals across the early-stage NYC AI
            landscape, where companies, buyers, and workflows are moving, and
            why it matters.
          </p>
        </div>
        <PatternMapGarnish />
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium leading-[1.6] text-[#66625C]">
        <span className="inline-flex items-center gap-2 text-[#181818]">
          <PatternStatMark kind="patterns" />
          {stats.patternCount} patterns
        </span>
        {stats.latestUpdatedAt ? (
          <span className="inline-flex items-center gap-2">
            <Clock3 className="size-4 text-[#6F6A62]" />
            Updated {formatRelativeUpdate(stats.latestUpdatedAt)}
          </span>
        ) : null}
      </p>
    </section>
  );
}

function PatternList({ patterns }: { patterns: Pattern[] }) {
  return (
    <section id="pattern-library" className="min-w-0 scroll-mt-28">
      <div className="divide-y divide-[#E7E1D8]">
        {patterns.map((pattern) => (
          <PatternRow key={pattern.slug} pattern={pattern} />
        ))}
      </div>
    </section>
  );
}

function PatternRow({ pattern }: { pattern: Pattern }) {
  const kind = getPatternKind(pattern);
  const dek = getPatternDek(pattern);
  const supportingDetail = getPatternSupportingDetail(pattern);
  const tags = getPatternTags(pattern);

  return (
    <Link
      href={`/patterns/${pattern.slug}`}
      className="group grid min-w-0 overflow-hidden gap-4 py-6 transition hover:bg-[rgb(154_61_43_/_0.035)] sm:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[64px_minmax(190px,0.58fr)_minmax(300px,1fr)_150px] lg:gap-5 lg:py-6"
    >
      <PatternIconTile kind={kind} />

      <div className="min-w-0">
        <h2 className="font-heading text-[26px] font-medium leading-[1.05] tracking-[0] text-[#181818] sm:text-[28px] lg:text-[25px]">
          {pattern.title}
        </h2>
        <p className="mt-3 text-[15px] leading-[1.55] text-[#4F4B45] lg:hidden">
          {dek}
        </p>
      </div>

      <div className="min-w-0 text-[15px] leading-[1.55] text-[#4F4B45] sm:col-start-2 lg:col-start-auto">
        <p className="hidden lg:block">{dek}</p>
        {supportingDetail ? (
          <p className="mt-2 hidden text-[#6A655E] lg:block">
            {supportingDetail}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 text-sm sm:col-start-2 sm:flex-row sm:items-end sm:justify-between lg:col-start-auto lg:block">
        <div className="min-w-0 text-[#6A655E]">
          <p className="font-semibold text-[#181818]">
            {pattern.companies.length} companies
          </p>
          {tags.length > 0 ? (
            <p className="mt-1 leading-[1.45]">{tags.join(", ")}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 self-end font-semibold text-[#9A3D2B] transition group-hover:text-[#7F3023] sm:self-auto lg:mt-5">
          Read pattern
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function PatternSnapshot({ stats }: { stats: PatternStats }) {
  const recentlyUpdated = stats.latestUpdatedAt
    ? formatRelativeUpdate(stats.latestUpdatedAt)
    : "Pending";

  return (
    <section className="rounded-md border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.7)] p-6 lg:border-0 lg:bg-transparent lg:p-0">
      <h2 className="font-heading text-[30px] font-medium leading-tight tracking-[0] text-[#181818]">
        Pattern Snapshot
      </h2>
      <dl className="mt-6 grid grid-cols-2 border-y border-[#E7E1D8]">
        <SnapshotStat
          label="Patterns tracked"
          value={stats.patternCount.toString()}
          icon="patterns"
        />
        <SnapshotStat
          label="Companies referenced"
          value={stats.uniqueCompanyCount.toString()}
          icon="companies"
          borderLeft
        />
        <SnapshotStat
          label="Recently updated"
          value={recentlyUpdated}
          icon="updated"
          borderTop
        />
        <SnapshotStat
          label="Current themes"
          value={stats.themeCount.toString()}
          icon="themes"
          borderLeft
          borderTop
        />
      </dl>
    </section>
  );
}

function SnapshotStat({
  label,
  value,
  icon,
  borderLeft = false,
  borderTop = false,
}: {
  label: string;
  value: string;
  icon: PatternStatMarkKind;
  borderLeft?: boolean;
  borderTop?: boolean;
}) {
  return (
    <div
      className={[
        "min-h-[112px] px-4 py-5",
        borderLeft ? "border-l border-[#E7E1D8]" : "",
        borderTop ? "border-t border-[#E7E1D8]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <dt className="flex items-start gap-2 text-[11px] font-bold uppercase leading-[1.2] tracking-[0.08em] text-[#5F5A52]">
        <PatternStatMark kind={icon} />
        <span>{label}</span>
      </dt>
      <dd className="mt-4 font-heading text-[34px] font-medium leading-none tracking-[0] text-[#181818]">
        {value}
      </dd>
    </div>
  );
}

function PatternEditorNote({ className }: { className?: string }) {
  return (
    <section
      className={[
        "rounded-md border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.72)] p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="editorial-label">Editor&apos;s Note</p>
      <p className="mt-4 text-[15px] leading-[1.65] text-[#3F3B36]">
        These patterns are derived from signals across the early-stage NYC AI
        map. They reflect where value is being created, where buyers are leaning
        in, and where the highest-velocity bets are forming.
      </p>
      <Link
        href="#pattern-library"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#7F3023]"
      >
        How we identify patterns
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

function ThemeDistribution({
  rows,
  className,
}: {
  rows: ThemeDistributionRow[];
  className?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section
      id="theme-distribution"
      className={[
        "scroll-mt-28 rounded-md border border-[#E7E1D8] bg-[rgb(251_250_247_/_0.72)] p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-heading text-[24px] font-medium leading-tight tracking-[0] text-[#181818]">
          Theme Distribution
        </h2>
        <Link
          href="/categories"
          className="hidden items-center gap-2 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#7F3023] sm:inline-flex lg:hidden"
        >
          View all themes
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 divide-y divide-[#E7E1D8]">
        {rows.map((row) => (
          <div
            key={row.profile}
            className="grid grid-cols-[42px_minmax(0,1fr)_48px] items-start gap-4 py-4 first:pt-0 last:pb-0"
          >
            <PatternIconTile kind={row.kind} size="sm" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight text-[#181818]">
                {row.label}
              </h3>
              <p className="mt-1 text-sm leading-[1.45] text-[#6A655E]">
                {row.description}
              </p>
            </div>
            <p className="pt-1 text-right font-heading text-[22px] font-medium leading-none tracking-[0] text-[#181818]">
              {row.share}%
            </p>
          </div>
        ))}
      </div>

      <Link
        href="/categories"
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#7F3023]"
      >
        View all themes
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

function PatternMapGarnish() {
  return (
    <div
      aria-hidden="true"
      className="ml-auto w-full max-w-[320px] overflow-hidden opacity-80 md:pt-1"
    >
      <svg
        viewBox="0 0 360 250"
        className="h-auto w-full overflow-hidden"
        shapeRendering="crispEdges"
      >
        <defs>
          <pattern
            id="patterns-map-dot"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect width="2" height="2" fill="#3F3B36" opacity="0.52" />
          </pattern>
          <clipPath id="patterns-map-boroughs">
            <path d="M195 20 L250 46 L278 92 L260 146 L220 176 L166 152 L150 94 Z" />
            <path d="M112 136 L152 154 L156 198 L116 218 L72 190 L78 152 Z" />
            <path d="M226 155 L288 142 L332 164 L304 198 L238 198 Z" />
            <path d="M145 62 L174 40 L190 65 L162 98 Z" />
            <path d="M180 172 L213 188 L208 220 L176 212 Z" />
          </clipPath>
        </defs>

        <g clipPath="url(#patterns-map-boroughs)">
          <rect x="48" y="8" width="292" height="220" fill="url(#patterns-map-dot)" />
        </g>

        <g stroke="#D8D0C4" strokeWidth="1">
          <line x1="24" y1="72" x2="102" y2="72" />
          <line x1="63" y1="34" x2="63" y2="111" />
          <line x1="306" y1="34" x2="306" y2="106" />
          <line x1="270" y1="70" x2="342" y2="70" />
          <line x1="214" y1="202" x2="214" y2="246" />
        </g>

        <g fill="#9A3D2B">
          <rect x="218" y="54" width="6" height="6" />
          <rect x="247" y="88" width="7" height="7" />
          <rect x="198" y="118" width="6" height="6" />
          <rect x="132" y="174" width="7" height="7" />
          <rect x="282" y="164" width="6" height="6" />
          <rect x="164" y="78" width="5" height="5" />
        </g>

        <g fill="#181818">
          <rect x="307" y="113" width="4" height="4" />
          <rect x="94" y="119" width="4" height="4" />
          <rect x="288" y="42" width="4" height="4" />
        </g>

        <g fill="none" stroke="#9A3D2B" strokeWidth="1.4">
          <circle cx="222" cy="57" r="16" opacity="0.25" />
          <circle cx="247" cy="91" r="12" opacity="0.28" />
          <circle cx="132" cy="177" r="13" opacity="0.25" />
        </g>
      </svg>
    </div>
  );
}

function PatternIconTile({
  kind,
  size = "md",
}: {
  kind: PatternKind;
  size?: "sm" | "md";
}) {
  const sizeClassName = size === "sm" ? "size-10" : "size-16 sm:size-14";
  const iconSizeClassName = size === "sm" ? "size-7" : "size-10";

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-md border border-[#E7E1D8] bg-[#F8F6F1] ${sizeClassName}`}
    >
      <PatternGlyphIcon kind={kind} className={iconSizeClassName} />
    </span>
  );
}

type GlyphTone = "ink" | "accent" | "muted" | "soft";
type GlyphRect = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
  tone: GlyphTone,
];

const glyphToneFills: Record<GlyphTone, string> = {
  ink: "#181818",
  accent: "#9A3D2B",
  muted: "#7B746B",
  soft: "#D8D0C4",
};

const glyphRects: Record<PatternKind, GlyphRect[]> = {
  finance: [
    [4, 25, 24, 3, "ink"],
    [6, 18, 4, 7, "muted"],
    [11, 13, 4, 12, "ink"],
    [16, 8, 4, 17, "muted"],
    [21, 4, 4, 21, "ink"],
    [24, 4, 3, 21, "accent"],
    [7, 17, 2, 1, "soft"],
    [17, 7, 2, 1, "soft"],
  ],
  vertical: [
    [7, 10, 18, 18, "ink"],
    [10, 6, 12, 4, "muted"],
    [12, 14, 3, 4, "soft"],
    [18, 14, 3, 4, "soft"],
    [12, 21, 3, 4, "soft"],
    [18, 21, 3, 4, "accent"],
    [5, 26, 22, 2, "ink"],
  ],
  tooling: [
    [8, 5, 5, 5, "ink"],
    [12, 9, 5, 5, "ink"],
    [16, 13, 4, 4, "accent"],
    [19, 16, 4, 4, "ink"],
    [22, 19, 5, 5, "muted"],
    [5, 21, 8, 4, "ink"],
    [4, 18, 4, 4, "accent"],
    [12, 23, 4, 4, "muted"],
  ],
  voice: [
    [4, 14, 3, 5, "muted"],
    [8, 11, 3, 11, "soft"],
    [12, 8, 3, 17, "accent"],
    [16, 5, 3, 23, "ink"],
    [20, 9, 3, 15, "accent"],
    [24, 12, 3, 9, "soft"],
    [28, 15, 2, 3, "muted"],
  ],
  compliance: [
    [14, 4, 5, 24, "accent"],
    [5, 13, 24, 5, "accent"],
    [9, 8, 15, 15, "soft"],
    [14, 4, 5, 24, "accent"],
    [5, 13, 24, 5, "accent"],
    [12, 6, 9, 3, "ink"],
    [12, 23, 9, 3, "ink"],
  ],
  consumer: [
    [10, 6, 10, 3, "ink"],
    [7, 9, 16, 4, "soft"],
    [6, 13, 18, 5, "accent"],
    [8, 18, 14, 5, "soft"],
    [11, 23, 8, 4, "ink"],
    [5, 12, 3, 7, "muted"],
    [23, 12, 3, 7, "muted"],
  ],
  healthcare: [
    [13, 5, 7, 22, "accent"],
    [5, 13, 23, 7, "accent"],
    [12, 4, 9, 3, "ink"],
    [12, 27, 9, 2, "ink"],
  ],
  default: [
    [5, 8, 6, 6, "ink"],
    [13, 6, 5, 5, "muted"],
    [20, 9, 7, 7, "accent"],
    [8, 18, 6, 6, "muted"],
    [17, 20, 5, 5, "ink"],
    [25, 18, 3, 3, "soft"],
  ],
};

function PatternGlyphIcon({
  kind,
  className,
}: {
  kind: PatternKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      shapeRendering="crispEdges"
    >
      {glyphRects[kind].map(([x, y, width, height, tone], index) => (
        <rect
          key={`${kind}-${index}`}
          x={x}
          y={y}
          width={width}
          height={height}
          fill={glyphToneFills[tone]}
        />
      ))}
    </svg>
  );
}

type PatternStatMarkKind =
  | "patterns"
  | "companies"
  | "updated"
  | "themes";

function PatternStatMark({ kind }: { kind: PatternStatMarkKind }) {
  const rects: Record<PatternStatMarkKind, GlyphRect[]> = {
    patterns: [
      [2, 2, 4, 4, "ink"],
      [8, 2, 4, 4, "accent"],
      [5, 8, 4, 4, "muted"],
      [11, 8, 4, 4, "ink"],
    ],
    companies: [
      [2, 8, 3, 5, "muted"],
      [6, 5, 3, 8, "ink"],
      [10, 2, 3, 11, "accent"],
      [14, 13, 1, 1, "ink"],
    ],
    updated: [
      [7, 1, 2, 2, "ink"],
      [3, 3, 10, 2, "muted"],
      [2, 5, 2, 6, "muted"],
      [12, 5, 2, 6, "ink"],
      [5, 12, 6, 2, "accent"],
      [8, 7, 2, 4, "accent"],
    ],
    themes: [
      [2, 2, 3, 3, "accent"],
      [8, 2, 3, 3, "ink"],
      [5, 6, 3, 3, "muted"],
      [11, 6, 3, 3, "accent"],
      [2, 10, 3, 3, "ink"],
      [8, 10, 3, 3, "muted"],
    ],
  };

  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="mt-px size-4 shrink-0"
      shapeRendering="crispEdges"
    >
      {rects[kind].map(([x, y, width, height, tone], index) => (
        <rect
          key={`${kind}-${index}`}
          x={x}
          y={y}
          width={width}
          height={height}
          fill={glyphToneFills[tone]}
        />
      ))}
    </svg>
  );
}

function getLatestPatternUpdatedAt() {
  const latest = patterns.reduce((max, pattern) => {
    const time = new Date(pattern.updated_at).getTime();
    return Number.isNaN(time) ? max : Math.max(max, time);
  }, 0);

  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

function getUniqueCompanyCount(patternList: Pattern[]) {
  return new Set(
    patternList.flatMap((pattern) =>
      pattern.companies.map((company) => company.company_slug),
    ),
  ).size;
}

function getThemeDistributionRows(patternList: Pattern[]) {
  const counts = new Map<ConsumptionProfile, number>();

  patternList.forEach((pattern) => {
    if (!pattern.related_consumption_profile) return;
    counts.set(
      pattern.related_consumption_profile,
      (counts.get(pattern.related_consumption_profile) ?? 0) + 1,
    );
  });

  const total = Array.from(counts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  return Array.from(counts.entries())
    .map(([profile, count]) => ({
      profile,
      label: themeDisplayLabels[profile] ?? consumptionProfileLabels[profile],
      description:
        themeDescriptions[profile] ??
        "A recurring product surface across the current pattern library.",
      count,
      share: total > 0 ? Math.round((count / total) * 100) : 0,
      kind: themePatternKinds[profile] ?? "default",
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function getPatternDek(pattern: Pattern) {
  return shortenSentence(getSentences(pattern.framing)[0] ?? pattern.framing, 155);
}

function getPatternSupportingDetail(pattern: Pattern) {
  const supportingSentence = getSentences(pattern.framing)[1];
  return supportingSentence ? shortenSentence(supportingSentence, 135) : undefined;
}

function getSentences(text: string) {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  return (matches ?? [text]).map((sentence) => sentence.trim()).filter(Boolean);
}

function shortenSentence(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;

  const boundaryCandidates = [
    text.lastIndexOf(";", maxLength),
    text.lastIndexOf(",", maxLength),
    text.lastIndexOf(" and ", maxLength),
    text.lastIndexOf(" where ", maxLength),
    text.lastIndexOf(" while ", maxLength),
    text.lastIndexOf(" ", maxLength),
  ];
  const boundary = boundaryCandidates.find((index) => index > 80) ?? maxLength;
  const shortened = text.slice(0, boundary).trim().replace(/[,:;]$/, "");

  return `${shortened}.`;
}

function getPatternTags(pattern: Pattern) {
  const tags = new Set<string>();

  if (pattern.related_consumption_profile) {
    tags.add(
      themeDisplayLabels[pattern.related_consumption_profile] ??
        consumptionProfileLabels[pattern.related_consumption_profile],
    );
  }

  const text = `${pattern.title} ${pattern.framing}`.toLowerCase();

  if (/finance|fintech|analyst|fund|trading|accounting/.test(text)) {
    tags.add("Finance");
  }
  if (
    /operator|industrial|government|insurance|restaurant|healthcare/.test(text)
  ) {
    tags.add("Operators");
  }
  if (/voice|phone agent|call|conversation/.test(text)) {
    tags.add("Voice");
  }
  if (/legal|compliance|policy|regulation|kyc|aml/.test(text)) {
    tags.add("Compliance");
  }
  if (/consumer|social|personal|memory|graph|household/.test(text)) {
    tags.add("Consumer");
  }
  if (/tooling|deploy|developer|model|infrastructure|eval/.test(text)) {
    tags.add("Infrastructure");
  }
  if (/workflow|workbench|process|review|operations/.test(text)) {
    tags.add("Workflows");
  }

  return Array.from(tags).slice(0, 3);
}

function getPatternKind(pattern: Pattern): PatternKind {
  const title = pattern.title.toLowerCase();
  const text = `${pattern.title} ${pattern.framing}`.toLowerCase();

  if (/voice/.test(title)) return "voice";
  if (/vertical/.test(title)) return "vertical";
  if (
    /vertical|operator|industrial|government|insurance|restaurant/.test(text)
  ) {
    return "vertical";
  }
  if (/voice|phone agent|call|conversation/.test(text)) return "voice";
  if (/legal|compliance|policy|regulation|kyc|aml/.test(text)) {
    return "compliance";
  }
  if (/consumer|social|personal|memory|graph|household/.test(text)) {
    return "consumer";
  }
  if (/healthcare|clinical|doctor/.test(text)) return "healthcare";
  if (/tooling|llm|deploy|developer|model|eval|infrastructure/.test(text)) {
    return "tooling";
  }
  if (/finance|fintech|analyst|fund|trading|accounting/.test(text)) {
    return "finance";
  }

  return "default";
}

const themeDisplayLabels: Partial<Record<ConsumptionProfile, string>> = {
  agentic_loops: "Automation & Operations",
  batch_document_processing: "Document-Heavy Workflows",
  realtime_voice: "Real-Time Voice",
  code_generation: "Infrastructure & Tools",
  embeddings_semantic_search: "Search & Memory",
  consumer_inference: "Consumer & Productivity",
  multimodal_processing: "Multimodal Systems",
};

const themeDescriptions: Partial<Record<ConsumptionProfile, string>> = {
  agentic_loops:
    "Products that collect context, make repeat decisions, and leave an audit trail.",
  batch_document_processing:
    "High-volume documents and records turned into structured work.",
  realtime_voice:
    "Phone and conversation workflows for overloaded operating teams.",
  code_generation: "Developer platforms, LLM tooling, and model operations.",
  embeddings_semantic_search:
    "Retrieval, memory, and evidence layers for long business records.",
  consumer_inference:
    "Personal context and memory as the reason people return.",
  multimodal_processing:
    "Image, video, and sensor-rich work made easier to parse.",
};

const themePatternKinds: Partial<Record<ConsumptionProfile, PatternKind>> = {
  agentic_loops: "vertical",
  batch_document_processing: "finance",
  realtime_voice: "voice",
  code_generation: "tooling",
  embeddings_semantic_search: "tooling",
  consumer_inference: "consumer",
  multimodal_processing: "default",
};

"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Mail,
  MapPinned,
  Sparkles,
  X,
} from "lucide-react";

import { CategoryBadge } from "@/components/market-map/category-badge";
import { CategoryPixelIcon } from "@/components/market-map/category-pixel-icon";
import { FoundationModelUsage } from "@/components/company/FoundationModelUsage";
import { CompanyLogo } from "@/components/market-map/company-logo";
import {
  buildCompanyMapLocations,
  categoryColors,
  GoogleStartupMap,
  type CompanyMapLocation,
} from "@/components/market-map/google-startup-map";
import { RecentActivity } from "@/components/market-map/recent-activity";
import { UsageBadge } from "@/components/market-map/usage-badge";
import { SaveCompanyButton } from "@/components/profile/save-company-button";
import { AppShell } from "@/components/site/app-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { CompanyProfileViewCounter } from "@/components/company/CompanyProfileViewCounter";
import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { categoryMeta } from "@/data/market";
import { formatFundingHeadline } from "@/lib/funding";
import {
  getDisplayUrl,
  getExternalUrl,
  getIntroRequestMailto,
} from "@/lib/intro-request";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import { cn } from "@/lib/utils";
import {
  consumptionProfileLabels,
  consumptionProfiles,
  type Category,
  type Company,
  type ConsumptionProfile,
} from "@/types/market";

const companyDetails: Record<
  string,
  {
    teamSize: string;
    founded: string;
    hq: string;
    techStack: string[];
    lastContacted: string;
  }
> = {
  texture: {
    teamSize: "11-50",
    founded: "2024",
    hq: "New York, NY",
    techStack: ["Next.js", "TypeScript", "Tailwind", "Vercel"],
    lastContacted: "Last contacted 6 days ago",
  },
};

export function MarketMapClient({
  companies,
  initialSearch = "",
}: {
  companies: Company[];
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<Category | "all">("all");
  const [stage, setStage] = useState("all");
  const [neighborhood, setNeighborhood] = useState("all");
  const [usageProfiles, setUsageProfiles] = useState<ConsumptionProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  const companyLocations = useMemo(
    () => buildCompanyMapLocations(companies),
    [companies],
  );
  const latestUpdatedAt = useMemo(
    () => getLatestCompanyUpdatedAt(companies),
    [companies],
  );

  const locationBySlug = useMemo(
    () =>
      new Map(
        companyLocations.map((location) => [
          location.company.slug,
          location,
        ]),
      ),
    [companyLocations],
  );

  const stages = useMemo(
    () =>
      Array.from(
        new Set(companies.map((company) => company.stage).filter(Boolean)),
      ).sort(),
    [companies],
  );

  const neighborhoodSourceCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return companies.filter((company) => {
      const location = locationBySlug.get(company.slug);

      return (
        matchesCompanyQuery(company, location, query) &&
        (category === "all" || company.category === category) &&
        (stage === "all" || company.stage === stage)
      );
    });
  }, [category, companies, locationBySlug, search, stage]);

  const neighborhoods = useMemo(
    () =>
      Array.from(
        new Set(
          neighborhoodSourceCompanies
            .map((company) => locationBySlug.get(company.slug)?.neighborhood)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [locationBySlug, neighborhoodSourceCompanies],
  );
  const activeNeighborhood =
    neighborhood === "all" || neighborhoods.includes(neighborhood)
      ? neighborhood
      : "all";

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return companies.filter((company) => {
      const location = locationBySlug.get(company.slug);

      return (
        matchesCompanyQuery(company, location, query) &&
        (category === "all" || company.category === category) &&
        (stage === "all" || company.stage === stage) &&
        (activeNeighborhood === "all" ||
          location?.neighborhood === activeNeighborhood) &&
        (usageProfiles.length === 0 ||
          usageProfiles.some((profile) =>
            company.consumption_profile.includes(profile),
          ))
      );
    });
  }, [
    activeNeighborhood,
    category,
    companies,
    locationBySlug,
    search,
    stage,
    usageProfiles,
  ]);

  const filteredLocations = useMemo(
    () =>
      filteredCompanies
        .map((company) => locationBySlug.get(company.slug))
        .filter((location): location is CompanyMapLocation => Boolean(location)),
    [filteredCompanies, locationBySlug],
  );

  const selectedCompany = filteredCompanies.find(
    (company) => company.slug === selectedId,
  );

  const hasFilters =
    search.length > 0 ||
    category !== "all" ||
    stage !== "all" ||
    activeNeighborhood !== "all" ||
    usageProfiles.length > 0;

  const selectCompany = useCallback((slug: string) => {
    setSelectedId(slug);
    setDetailDrawerOpen(true);
  }, []);

  const closeCompanyDrawer = useCallback(() => {
    setDetailDrawerOpen(false);
    setSelectedId("");
  }, []);

  function resetView() {
    setSearch("");
    setCategory("all");
    setStage("all");
    setNeighborhood("all");
    setUsageProfiles([]);
    closeCompanyDrawer();
  }

  return (
    <AppShell
      search={search}
      onSearchChange={setSearch}
      activeCategory={category}
      onCategorySelect={(nextCategory) => {
        setCategory(nextCategory);
        closeCompanyDrawer();
      }}
    >
      <main className="min-w-0 bg-[var(--app-surface)]">
        <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-7">
          <MapTitleRow
            totalCompanies={companies.length}
            updatedAt={latestUpdatedAt}
          />

          <MapFilterRow
            category={category}
            stage={stage}
            neighborhood={activeNeighborhood}
            stages={stages}
            neighborhoods={neighborhoods}
            usageProfiles={usageProfiles}
            hasFilters={hasFilters}
            onCategoryChange={(value) => {
              setCategory(value);
              closeCompanyDrawer();
            }}
            onStageChange={(value) => {
              setStage(value);
              closeCompanyDrawer();
            }}
            onNeighborhoodChange={(value) => {
              setNeighborhood(value);
              closeCompanyDrawer();
            }}
            onUsageProfilesChange={(nextProfiles) => {
              setUsageProfiles(nextProfiles);
              closeCompanyDrawer();
            }}
            onReset={resetView}
          />

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(430px,0.8fr)] xl:items-start">
            <section className="order-1 min-w-0 space-y-6 xl:order-1">
              <MapInsights
                companies={filteredCompanies}
                locations={filteredLocations}
              />

              <NeighborhoodClusters
                locations={filteredLocations}
                activeNeighborhood={activeNeighborhood}
                onSelectNeighborhood={(value) => {
                  setNeighborhood(value);
                  closeCompanyDrawer();
                }}
              />

              <CompanyTable
                companies={filteredCompanies}
                locationBySlug={locationBySlug}
                selectedId={selectedCompany?.slug}
                onSelect={selectCompany}
              />
            </section>

            <aside className="order-2 space-y-4 xl:sticky xl:top-24 xl:order-2">
              <section className="overflow-hidden rounded-md border border-[#E7E1D8] bg-[#081523]">
                <div className="flex flex-col gap-3 border-b border-white/10 bg-[#081523] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-md bg-white/10 ring-1 ring-white/15">
                      <MapPinned className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold tracking-tight">
                        Interactive map
                      </h2>
                      <p className="text-sm text-white/65">
                        {formatMappedCompanies(filteredCompanies.length)} in view
                      </p>
                    </div>
                  </div>
                  <span className="w-fit rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-white/75 ring-1 ring-white/15">
                    Google Maps
                  </span>
                </div>
                <GoogleStartupMap
                  companies={filteredCompanies}
                  onSelectCompany={selectCompany}
                />
              </section>

              <MapDotKey locations={filteredLocations} />

              <div className="hidden xl:block">
                {selectedCompany ? (
                  <CompanyInspector
                    company={selectedCompany}
                    onClose={closeCompanyDrawer}
                  />
                ) : (
                  <SelectedCompanyDrawer />
                )}
              </div>
            </aside>
          </div>
        </div>

        <CompanyDetailSheet
          company={selectedCompany}
          open={detailDrawerOpen && Boolean(selectedCompany)}
          onOpenChange={(open) => {
            if (!open) {
              closeCompanyDrawer();
              return;
            }

            setDetailDrawerOpen(true);
          }}
        />
      </main>
    </AppShell>
  );
}

function MapTitleRow({
  totalCompanies,
  updatedAt,
}: {
  totalCompanies: number;
  updatedAt?: string;
}) {
  return (
    <section className="border-b border-[#E7E1D8] pb-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-[clamp(42px,5vw,68px)] font-medium leading-[0.95] tracking-[-0.035em] text-[#181818]">
            NYC AI Map
          </h1>
          <p className="mt-3 text-base font-medium text-[#5F5A52]">
            {formatMappedCompanies(totalCompanies)} mapped
            {updatedAt ? (
              <>
                <span aria-hidden="true"> · </span>
                Updated {formatRelativeUpdate(updatedAt)}
              </>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}

function MapFilterRow({
  category,
  stage,
  neighborhood,
  stages,
  neighborhoods,
  usageProfiles,
  hasFilters,
  onCategoryChange,
  onStageChange,
  onNeighborhoodChange,
  onUsageProfilesChange,
  onReset,
}: {
  category: Category | "all";
  stage: string;
  neighborhood: string;
  stages: string[];
  neighborhoods: string[];
  usageProfiles: ConsumptionProfile[];
  hasFilters: boolean;
  onCategoryChange: (value: Category | "all") => void;
  onStageChange: (value: string) => void;
  onNeighborhoodChange: (value: string) => void;
  onUsageProfilesChange: (value: ConsumptionProfile[]) => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-1 items-center gap-2.5 sm:grid-cols-[220px_170px_220px_220px_auto]">
      <Select
        value={category}
        onValueChange={(value) => onCategoryChange(value as Category | "all")}
      >
        <SelectTrigger className="h-10 w-full rounded-md border-[#E7E1D8] bg-[#FBFAF7] text-sm shadow-none">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="min-w-[260px]">
          <SelectItem value="all">Category</SelectItem>
          {categoryMeta.map((item) => (
            <SelectItem key={item.name} value={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={stage} onValueChange={onStageChange}>
        <SelectTrigger className="h-10 w-full rounded-md border-[#E7E1D8] bg-[#FBFAF7] text-sm shadow-none">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="all">Stage</SelectItem>
          {stages.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={neighborhood} onValueChange={onNeighborhoodChange}>
        <SelectTrigger className="h-10 w-full rounded-md border-[#E7E1D8] bg-[#FBFAF7] text-sm shadow-none">
          <SelectValue placeholder="Neighborhood" />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="all">Neighborhood</SelectItem>
          {neighborhoods.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <UsageProfileFilter
        selected={usageProfiles}
        onChange={onUsageProfilesChange}
      />

      <Button
        variant="ghost"
        className="h-10 justify-self-start text-[#7A746C]"
        onClick={onReset}
        disabled={!hasFilters}
      >
        Clear
      </Button>
    </div>
  );
}

function UsageProfileFilter({
  selected,
  onChange,
}: {
  selected: ConsumptionProfile[];
  onChange: (value: ConsumptionProfile[]) => void;
}) {
  const selectedLabel =
    selected.length === 0
      ? "Usage profile"
      : selected.length === 1
        ? consumptionProfileLabels[selected[0]]
        : `${selected.length} usage profiles`;

  function toggleProfile(profile: ConsumptionProfile) {
    onChange(
      selected.includes(profile)
        ? selected.filter((item) => item !== profile)
        : [...selected, profile],
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-between rounded-md border-[#E7E1D8] bg-[#FBFAF7] px-3 text-left text-sm font-normal shadow-none hover:bg-[#FBFAF7]"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="size-4 text-[#7A746C]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[260px] border border-[#E7E1D8] bg-[#FBFAF7] p-1 text-[#181818] shadow-none"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
          Usage profile
        </DropdownMenuLabel>
        {consumptionProfiles.map((profile) => (
          <DropdownMenuCheckboxItem
            key={profile}
            checked={selected.includes(profile)}
            onCheckedChange={() => toggleProfile(profile)}
            onSelect={(event) => event.preventDefault()}
            className="rounded-md px-2 py-2 text-sm text-[#181818] focus:bg-[rgb(154_61_43_/_0.08)]"
          >
            {consumptionProfileLabels[profile]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MapInsights({
  companies,
  locations,
}: {
  companies: Company[];
  locations: CompanyMapLocation[];
}) {
  const topSignal = getTopCount(
    companies.map((company) => getCompanySignalLabel(company)),
  );
  const topNeighborhood = getTopCount(
    locations.map((location) => location.neighborhood),
  );
  const topStage = getTopCount(
    companies.map((company) => company.stage).filter(Boolean),
  );
  const categoryCount = new Set(companies.map((company) => company.category)).size;

  return (
    <section className="border-y border-[#E7E1D8] py-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-[-0.02em] text-[#181818]">
            Map Insights
          </h2>
          <p className="mt-1 text-sm text-[#7A746C]">
            A quick read on the companies currently in view.
          </p>
        </div>
        <p className="text-sm font-medium text-[#9A3D2B]">
          {formatMappedCompanies(companies.length)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <InsightItem
          tone="lead"
          label="Top signal"
          value={topSignal?.value ?? "None"}
          detail={
            topSignal
              ? `${topSignal.count} companies share this signal`
              : "No signal yet"
          }
        />
        <InsightItem
          label="Categories"
          value={categoryCount.toString()}
          detail="Company categories in view"
        />
        <InsightItem
          label="Neighborhood cluster"
          value={topNeighborhood?.value ?? "None"}
          detail={
            topNeighborhood
              ? `${topNeighborhood.count} companies`
              : "No locations in view"
          }
        />
        <InsightItem
          label="Stage mix"
          value={topStage?.value ?? "None"}
          detail={
            topStage
              ? `${topStage.count} companies at this stage`
              : "No stage data in view"
          }
        />
      </div>
    </section>
  );
}

function InsightItem({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "lead";
}) {
  return (
    <div
      className={cn(
        "min-h-[132px] rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-3",
        tone === "lead" && "border-[#D8C7B7] bg-[rgb(154_61_43_/_0.045)]",
      )}
    >
      <p className="text-[10.5px] font-semibold uppercase leading-tight tracking-[0.08em] text-[#9A3D2B]">
        {label}
      </p>
      <p className="mt-3 line-clamp-2 font-heading text-[22px] font-medium leading-[1.02] tracking-[-0.025em] text-[#181818]">
        {value}
      </p>
      <p className="mt-2 line-clamp-2 text-xs leading-[1.45] text-[#7A746C]">
        {detail}
      </p>
    </div>
  );
}

function NeighborhoodClusters({
  locations,
  activeNeighborhood,
  onSelectNeighborhood,
}: {
  locations: CompanyMapLocation[];
  activeNeighborhood: string;
  onSelectNeighborhood: (value: string) => void;
}) {
  const clusters = getNeighborhoodClusters(locations);

  return (
    <section className="border-y border-[#E7E1D8] py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-[-0.02em] text-[#181818]">
            Neighborhood clusters
          </h2>
          <p className="mt-1 text-sm text-[#7A746C]">
            Company clusters across the city.
          </p>
        </div>
        {activeNeighborhood !== "all" ? (
          <button
            type="button"
            className="text-sm font-medium text-[#9A3D2B] hover:underline"
            onClick={() => onSelectNeighborhood("all")}
          >
            Show all
          </button>
        ) : null}
      </div>

      {clusters.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          {clusters.slice(0, 6).map((cluster) => (
            <button
              key={cluster.name}
              type="button"
              onClick={() => onSelectNeighborhood(cluster.name)}
              className={cn(
                "min-h-[112px] rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-3 text-left transition hover:bg-[rgb(154_61_43_/_0.05)]",
                activeNeighborhood === cluster.name &&
                  "bg-[rgb(154_61_43_/_0.06)]",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <CategoryPixelIcon
                  category={cluster.topCategory}
                  size="sm"
                  className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-0.5"
                />
                <span className="text-sm font-medium text-[#9A3D2B]">
                  {cluster.count}
                </span>
              </span>
              <span className="mt-3 block min-w-0">
                <span className="block truncate text-sm font-semibold text-[#181818]">
                  {cluster.name}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-[1.4] text-[#7A746C]">
                  {cluster.topCategory.replace(" AI", "")}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-[#E7E1D8] p-5 text-sm text-[#7A746C]">
          No neighborhood clusters match this view.
        </p>
      )}
    </section>
  );
}

function MapDotKey({ locations }: { locations: CompanyMapLocation[] }) {
  const categoryRows = getCategoryDotRows(locations).slice(0, 5);
  const clusters = getNeighborhoodClusters(locations).slice(0, 5);

  return (
    <section className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
            Map key
          </p>
          <h3 className="mt-1 font-heading text-xl font-medium tracking-[-0.02em] text-[#181818]">
            Dots show companies
          </h3>
        </div>
        <p className="text-sm font-medium text-[#5F5A52]">
          {formatMappedCompanies(locations.length)} in view
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#7A746C]">
        Dot color follows category. Larger dots mark featured companies.
      </p>

      {categoryRows.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {categoryRows.map((row) => (
            <span
              key={row.category}
              className="inline-flex max-w-full items-center gap-2 rounded-md border border-[#E7E1D8] bg-[#F8F6F1] px-2.5 py-1.5 text-xs font-medium text-[#5F5A52]"
            >
              <span
                className="size-2.5 shrink-0 rounded-full ring-2 ring-[#FBFAF7]"
                style={{ backgroundColor: categoryColors[row.category] }}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">
                {row.category.replace(" AI", "")}
              </span>
              <span className="text-[#9A3D2B]">{row.count}</span>
            </span>
          ))}
        </div>
      ) : null}

      {clusters.length > 0 ? (
        <div className="mt-4 border-t border-[#E7E1D8] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
            Top clusters
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {clusters.map((cluster) => (
              <div
                key={cluster.name}
                className="flex items-center justify-between gap-3 rounded-md bg-[rgb(17_17_17_/_0.025)] px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium text-[#181818]">
                  {cluster.name}
                </span>
                <span className="text-[#7A746C]">{cluster.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SelectedCompanyDrawer() {
  return (
    <section className="rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3D2B]">
        Selected company drawer
      </p>
      <h2 className="mt-2 font-heading text-2xl font-medium tracking-[-0.02em] text-[#181818]">
        Select a company
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5F5A52]">
        Choose a row from the company list to see its profile, recent activity,
        and save action here.
      </p>
    </section>
  );
}

function CompanyDetailSheet({
  company,
  open,
  onOpenChange,
}: {
  company?: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[min(100vw,620px)] !max-w-[min(100vw,620px)] border-[#E7E1D8] bg-[var(--app-surface)] p-0 shadow-none"
      >
        <SheetTitle className="sr-only">
          {company ? `${company.name} details` : "Company details"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Company profile, recent activity, and save action.
        </SheetDescription>
        {company ? (
          <CompanyInspector
            company={company}
            mode="drawer"
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CompanyTable({
  companies,
  locationBySlug,
  selectedId,
  onSelect,
}: {
  companies: Company[];
  locationBySlug: Map<string, CompanyMapLocation>;
  selectedId?: string;
  onSelect: (slug: string) => void;
}) {
  if (companies.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#E7E1D8] bg-[var(--app-surface)] p-10 text-center">
        <p className="text-base font-semibold text-[#181818]">
          No companies match this view.
        </p>
        <p className="mt-2 text-sm text-[#5F5A52]">
          Try a broader search or clear a filter.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden border-y border-[#E7E1D8] bg-[var(--app-surface)]">
      <div className="flex flex-col gap-2 border-b border-[#E7E1D8] px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-medium tracking-[-0.02em] text-[#181818]">
            Company list
          </h2>
          <p className="mt-1 text-sm text-[#7A746C]">
            Select a company to open the detail drawer.
          </p>
        </div>
        <p className="text-sm font-medium text-[#9A3D2B]">
          {formatMappedCompanies(companies.length)}
        </p>
      </div>
      <div className="hidden grid-cols-[minmax(240px,1.2fr)_minmax(150px,0.85fr)_96px_minmax(140px,0.85fr)_150px_132px] border-b border-[#E7E1D8] bg-[rgb(154_61_43_/_0.06)] px-4 py-3 text-xs font-medium text-[#7A746C] lg:grid">
        <span>Company</span>
        <span>Category</span>
        <span>Stage</span>
        <span>Neighborhood</span>
        <span>Signal</span>
        <span />
      </div>
      <div className="grid grid-cols-2 gap-2 p-2 lg:block lg:divide-y lg:divide-[#E7E1D8] lg:p-0">
        {companies.map((company) => {
          const location = locationBySlug.get(company.slug);

          return (
            <div
              key={company.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(company.slug)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(company.slug);
                }
              }}
              className={cn(
                "grid min-h-[212px] w-full gap-3 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-3 text-left transition hover:bg-[rgb(154_61_43_/_0.06)] lg:min-h-[86px] lg:rounded-none lg:border-0 lg:border-l-4 lg:border-l-transparent lg:bg-transparent lg:px-4 lg:py-4 lg:hover:border-l-[#E7E1D8] lg:grid-cols-[minmax(240px,1.2fr)_minmax(150px,0.85fr)_96px_minmax(140px,0.85fr)_150px_132px] lg:items-center",
                selectedId === company.slug &&
                  "border-[#9A3D2B] bg-[rgb(154_61_43_/_0.06)] shadow-[inset_0_0_0_1px_rgba(154,61,43,0.14)] hover:bg-[rgb(154_61_43_/_0.06)] lg:border-l-[#9A3D2B]",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <CompanyLogo
                  company={company}
                  name={company.name}
                  category={company.category}
                  className="size-10 text-xs"
                />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-[#181818]">
                      {company.name}
                    </p>
                    {company.is_breakout ? (
                      <Sparkles className="size-3.5 text-amber-500" />
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#5F5A52] lg:line-clamp-2">
                    {company.short_description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={company.category} />
                <CompanyViewCount
                  companyId={company.id}
                  views={company.metrics?.views ?? 0}
                />
              </div>
              <span className="text-sm text-[#5F5A52]">{company.stage}</span>
              <div>
                <p className="text-sm font-medium text-[#181818]">
                  {location?.neighborhood ?? "New York"}
                </p>
              </div>
              <div>
                <UsageBadge value={getCompanySignalLabel(company)} />
              </div>
              <SaveCompanyButton
                companyId={company.id}
                companyName={company.name}
                size="sm"
                stopPropagation
                className="w-full justify-center whitespace-nowrap lg:w-auto lg:justify-self-end"
              />
            </div>
          );
        })}
      </div>
      <CompanyListFooter count={companies.length} />
    </section>
  );
}

function CompanyListFooter({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#E7E1D8] bg-[var(--app-surface)] px-4 py-5 text-sm text-[#7A746C]">
      <span>End of current map view</span>
      <span className="font-medium text-[#5F5A52]">
        Showing {formatMappedCompanies(count)}
      </span>
    </div>
  );
}

function formatMappedCompanies(count: number) {
  return `${count} ${count === 1 ? "company" : "companies"}`;
}

function getLatestCompanyUpdatedAt(companies: Company[]) {
  const latest = companies.reduce((max, company) => {
    return Math.max(
      max,
      getDateTime(company.updated_at),
      getDateTime(company.recent_activity_date),
      getDateTime(company.created_at),
    );
  }, 0);

  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

function getDateTime(dateValue?: string) {
  if (!dateValue) return 0;

  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function matchesCompanyQuery(
  company: Company,
  location: CompanyMapLocation | undefined,
  query: string,
) {
  return (
    query.length === 0 ||
    [
      company.name,
      company.category,
      company.stage,
      company.short_description,
      company.one_line_thesis,
      company.why_it_matters,
      company.founder_name ?? "",
      company.openai_fit,
      company.consumption_note,
      ...company.consumption_profile.map(
        (profile) => consumptionProfileLabels[profile],
      ),
      company.recent_activity_text,
      getCompanySignalLabel(company),
      location?.neighborhood ?? "",
      company.office_address,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function getTopCount<T extends string>(values: T[]) {
  const counts = values.reduce((map, value) => {
    if (!value) return map;
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map<T, number>());

  const [top] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return top ? { value: top[0], count: top[1] } : null;
}

function getCategoryDotRows(locations: CompanyMapLocation[]) {
  return Array.from(
    locations.reduce((counts, location) => {
      counts.set(
        location.company.category,
        (counts.get(location.company.category) ?? 0) + 1,
      );
      return counts;
    }, new Map<Category, number>()),
  )
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function getNeighborhoodClusters(locations: CompanyMapLocation[]) {
  const clusters = locations.reduce(
    (map, location) => {
      const cluster =
        map.get(location.neighborhood) ??
        ({
          name: location.neighborhood,
          count: 0,
          categoryCounts: new Map<Category, number>(),
        } satisfies {
          name: string;
          count: number;
          categoryCounts: Map<Category, number>;
        });

      cluster.count += 1;
      cluster.categoryCounts.set(
        location.company.category,
        (cluster.categoryCounts.get(location.company.category) ?? 0) + 1,
      );
      map.set(location.neighborhood, cluster);
      return map;
    },
    new Map<
      string,
      {
        name: string;
        count: number;
        categoryCounts: Map<Category, number>;
      }
    >(),
  );

  return Array.from(clusters.values())
    .map((cluster) => {
      const [topCategory] = Array.from(cluster.categoryCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      );

      return {
        name: cluster.name,
        count: cluster.count,
        topCategory:
          topCategory?.[0] ?? ("Fintech & Trading AI" satisfies Category),
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function CompanyInspector({
  company,
  mode = "inline",
  onClose,
}: {
  company?: Company;
  mode?: "inline" | "drawer";
  onClose: () => void;
}) {
  if (!company) {
    return (
      <aside className="bg-[var(--app-surface)] p-6">
        <p className="text-sm text-[#7A746C]">Select a company to inspect.</p>
      </aside>
    );
  }

  const detail =
    companyDetails[company.slug] ??
    ({
      teamSize: company.stage === "Series A" ? "11-50" : "2-10",
      founded: "2025",
      hq: "New York, NY",
      techStack: ["Next.js", "TypeScript", "OpenAI"],
      lastContacted: "Last contacted 6 days ago",
    } satisfies (typeof companyDetails)[string]);
  const companyWebsiteUrl = getExternalUrl(company.website_url);
  const introRequestHref = getIntroRequestMailto(company);
  const isDrawer = mode === "drawer";
  const signalLabel = getCompanySignalLabel(company);

  return (
    <aside
      className={cn(
        "overflow-y-auto bg-[var(--app-surface)]",
        isDrawer
          ? "h-full max-h-none rounded-none border-0"
          : "max-h-[calc(100vh-7rem)] rounded-md border border-[#E7E1D8]",
      )}
    >
      <div className="sticky top-0 border-b border-[#E7E1D8] bg-[var(--app-surface)] px-5 py-5 sm:px-7 sm:py-7">
        <div className="flex items-start gap-4">
          <CompanyLogo
            company={company}
            name={company.name}
            category={company.category}
            className="size-14 text-base"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold leading-tight tracking-tight text-[#181818]">
              {company.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <CategoryBadge category={company.category} />
              <UsageBadge value={getCompanySignalLabel(company)} />
              <CompanyProfileViewCounter
                companyId={company.id}
                initialViews={company.metrics?.views ?? 0}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Close company inspector"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
        <p className="mt-4 max-w-[46rem] text-sm leading-6 text-[#5F5A52]">
          {company.short_description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SaveCompanyButton
            companyId={company.id}
            companyName={company.name}
            size="sm"
          />
          {companyWebsiteUrl ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-[#E7E1D8] bg-[#FBFAF7]"
            >
              <a href={companyWebsiteUrl} target="_blank" rel="noreferrer">
                Website
                <ArrowUpRight className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
        <div className="mt-5 flex gap-6 border-b border-[#E7E1D8] text-sm font-medium text-[#7A746C]">
          <button className="-mb-px border-b-2 border-[#E7E1D8] pb-3 text-[#9A3D2B]">
            Overview
          </button>
          <Link
            href={`/companies/${company.slug}#notes`}
            className="pb-3 transition hover:text-[#9A3D2B]"
          >
            Notes
          </Link>
        </div>
      </div>

      <div className="space-y-7 px-7 py-6">
        <InspectorSection title="Foundation model usage">
          <FoundationModelUsage company={company} compact />
        </InspectorSection>

        <InspectorSection
          title="Why people are saving it"
          action={<UsageBadge value={signalLabel} />}
        >
          <p className="text-sm leading-6 text-[#5F5A52]">
            {company.why_it_matters}
          </p>
          <p className="mt-3 text-xs leading-5 text-[#7A746C]">
            {company.category} · {company.stage}
          </p>
        </InspectorSection>

        <InspectorSection title="Startup Snapshot">
          <dl className="grid gap-4 text-sm">
            <SnapshotRow label="Stage" value={company.stage} />
            <SnapshotRow label="Team Size" value={detail.teamSize} />
            <SnapshotRow label="Founded" value={detail.founded} />
            <SnapshotRow label="NYC footprint" value={detail.hq} />
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[#7A746C]">Website</dt>
              <dd className="min-w-0 text-right">
                <a
                  href={companyWebsiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#9A3D2B] hover:underline"
                >
                  {getDisplayUrl(company.website_url)}
                  <ExternalLink className="size-3.5" />
                </a>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-[#7A746C]">Tech Stack</dt>
              <dd className="flex max-w-56 flex-wrap justify-end gap-1.5">
                {detail.techStack.map((item) => (
                  <span
                    key={item}
                    className="rounded-md bg-[var(--app-surface)] px-2 py-1 text-xs text-[#5F5A52] ring-1 ring-[#E7E1D8]"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
            <SnapshotRow label="Funding" value={formatFundingHeadline(company)} />
          </dl>
        </InspectorSection>

        <InspectorSection title="Recent Activity">
          <div className="rounded-md bg-[var(--app-surface)] p-4 app-card-border">
            <RecentActivity
              text={company.recent_activity_text}
              date={company.recent_activity_date}
            />
          </div>
        </InspectorSection>

        <InspectorSection title="Request intro">
          <div className="flex flex-col gap-3 rounded-md bg-[var(--app-surface)] p-4 app-card-border sm:flex-row sm:items-center">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-1 ring-[#E7E1D8]">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#181818]">
                Want to connect with {company.name}?
              </p>
              <p className="mt-1 text-xs text-[#7A746C]">
                Send a quick intro request to AI Atlas and add context for why
                the connection should happen.
              </p>
            </div>
            <Button asChild size="sm" className="app-primary-button">
              <a href={introRequestHref}>
                Request intro
                <Mail className="size-3.5" />
              </a>
            </Button>
          </div>
        </InspectorSection>

        <Button asChild variant="outline" className="w-full bg-[var(--app-surface)]">
          <Link href={`/companies/${company.slug}`}>
            Open full profile
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>
    </aside>
  );
}

function InspectorSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#E7E1D8] pb-7 last:border-b-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight text-[#181818]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#7A746C]">{label}</dt>
      <dd className="text-right font-medium text-[#5F5A52]">{value}</dd>
    </div>
  );
}

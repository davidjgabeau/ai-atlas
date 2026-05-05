import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ExternalLink, Mail } from "lucide-react";
import { notFound } from "next/navigation";

import { CompanyProfileViewCounter } from "@/components/company/CompanyProfileViewCounter";
import { CompanyViewCount } from "@/components/company/CompanyViewCount";
import { LinkedCompanyText } from "@/components/company/linked-company-text";
import { CategoryBadge } from "@/components/market-map/category-badge";
import { CompanyCard } from "@/components/market-map/company-card";
import { CompanyLogo } from "@/components/market-map/company-logo";
import { RecentActivity } from "@/components/market-map/recent-activity";
import { UsageBadge } from "@/components/market-map/usage-badge";
import { SaveCompanyButton } from "@/components/profile/save-company-button";
import { CompanySocialPostCard } from "@/components/social/company-social-post-card";
import { PublicShell } from "@/components/site/public-shell";
import { Button } from "@/components/ui/button";
import {
  getCategorySlug,
  marketMapCompanies,
} from "@/data/market";
import { formatDate } from "@/lib/format";
import { formatFundingBody, getFundingRows } from "@/lib/funding";
import {
  getDisplayUrl,
  getExternalUrl,
  getIntroRequestMailto,
} from "@/lib/intro-request";
import { getCompanySignalLabel } from "@/lib/signals/companySignal";
import {
  createShareMetadata,
  getShareImageUrl,
  shareCta,
  truncateMeta,
} from "@/lib/seo/shareMetadata";
import {
  getCompanyBySlugFromData,
  getPublishedCompanies,
} from "@/lib/supabase/market-data";
import { getCompanySocialFeed } from "@/lib/supabase/social-feed";
import { getCompanyProfileBriefs } from "@/lib/editorial/companyProfileBriefs";
import type { Company } from "@/types/market";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return marketMapCompanies.map((company) => ({ slug: company.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlugFromData(slug);

  if (!company) {
    return createShareMetadata({
      title: "Company profile | AI Atlas NYC",
      description:
        "Explore companies, categories, signals, jobs, and market notes from AI Atlas NYC.",
      path: `/companies/${slug}`,
      image: getShareImageUrl({ page: "companies" }),
    });
  }

  return createShareMetadata({
    title: `${company.name} | AI Atlas NYC`,
    description: truncateMeta(
      `${company.generated?.hook || company.one_line_thesis || company.short_description} ${company.category}. ${shareCta}.`,
    ),
    path: `/companies/${company.slug}`,
    image: getShareImageUrl({ company: company.slug }),
    type: "article",
  });
}

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [company, companies] = await Promise.all([
    getCompanyBySlugFromData(slug),
    getPublishedCompanies(),
  ]);

  if (!company) {
    notFound();
  }

  const relatedCompanies = companies
    .filter(
      (item) => item.category === company.category && item.id !== company.id,
    )
    .slice(0, 3);
  const footprintBody = `${company.name} is part of the New York City AI startup scene, with a profile focused on its market category, stage, and product signal.`;
  const fundingRows = getFundingRows(company);
  const companyWebsiteUrl = getExternalUrl(company.website_url);
  const introRequestHref = getIntroRequestMailto(company);
  const signalLabel = getCompanySignalLabel(company);
  const profileBriefs = getCompanyProfileBriefs(company);
  const companyPosts = await getCompanySocialFeed({
    companyId: company.id,
    limit: 4,
  });

  return (
    <PublicShell>
      <section className="hero">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="mb-8">
            <Link href="/companies">
              <ArrowLeft className="size-4" />
              Back to directory
            </Link>
          </Button>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <CompanyLogo
              company={company}
              name={company.name}
              category={company.category}
              className="size-16 text-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={company.category} />
                <span className="rounded-md bg-[rgb(154_61_43_/_0.08)] px-2 py-1 text-xs font-medium text-[#5F5A52] ring-1 ring-[#E7E1D8]">
                  {company.stage}
                </span>
                <UsageBadge value={signalLabel} />
                <CompanyProfileViewCounter
                  companyId={company.id}
                  initialViews={company.metrics?.views ?? 0}
                  className="ml-1 text-xs text-[#66625C]"
                />
              </div>
              <h1 className="mt-4 font-heading text-[clamp(40px,5vw,64px)] font-medium leading-[0.95] tracking-[-0.04em] text-[#181818]">
                {company.name}
              </h1>
              <p className="mt-5 max-w-[680px] text-base leading-[1.6] text-[#5F5A52]">
                {company.one_line_thesis}
              </p>
            </div>
            <SaveCompanyButton
              companyId={company.id}
              companyName={company.name}
              showLabel
              className="self-start"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
          <div className="space-y-8">
            <ProfileSection
              title="Why people are saving it"
              body={profileBriefs.whySaving}
              companies={companies}
              excludeCompanyId={company.id}
            />
            <ProfileSection
              title="What they're building"
              body={profileBriefs.whatBuilding}
              companies={companies}
              excludeCompanyId={company.id}
            />
            <ProfileSection
              title="How they use AI/models"
              body={profileBriefs.aiModelUse}
              companies={companies}
              excludeCompanyId={company.id}
            />
            <ProfileSection
              title="NYC footprint"
              body={footprintBody}
              companies={companies}
              excludeCompanyId={company.id}
            />
            <ProfileSection
              title="Funding"
              body={formatFundingBody(company)}
              companies={companies}
              excludeCompanyId={company.id}
            />
            <ProfileSection
              title="Platform / OpenAI fit"
              body={company.openai_fit}
              companies={companies}
              excludeCompanyId={company.id}
            />
            <ProfileSection
              id="notes"
              title="Notes"
              body={`${company.name} is tagged ${signalLabel.toLowerCase()} based on buyer clarity, repeat workflow signal, public activity, and fit with the AI Atlas map.`}
              companies={companies}
              excludeCompanyId={company.id}
            />
          </div>
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="overflow-hidden rounded-md bg-[var(--app-surface)] shadow-sm app-card-border">
              <div className="border-b border-[#E7E1D8] bg-[rgb(154_61_43_/_0.06)] p-5">
                <div className="flex items-start gap-3">
                  <CompanyLogo
                    company={company}
                    name={company.name}
                    category={company.category}
                    className="size-12 text-sm"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold tracking-tight text-[#181818]">
                      {company.name}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#5F5A52]">
                      {company.short_description}
                    </p>
                  </div>
                </div>
              </div>
              <PanelSection title="Recent Activity">
                <RecentActivity
                  text={company.recent_activity_text}
                  date={company.recent_activity_date}
                />
              </PanelSection>
              <PanelSection
                title="Company posts"
                action={
                  company.x_handle ? (
                    <a
                      href={`https://x.com/${company.x_handle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#9A3D2B]"
                    >
                      @{company.x_handle}
                    </a>
                  ) : null
                }
              >
                <div className="grid gap-3">
                  {companyPosts.length > 0 ? (
                    companyPosts.map((post) => (
                      <CompanySocialPostCard
                        key={post.id}
                        post={post}
                        compact
                      />
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-[#5F5A52]">
                      {company.x_handle
                        ? "Company posts will appear here after the next sync."
                        : "No official company social handle is connected yet."}
                    </p>
                  )}
                </div>
              </PanelSection>
              <PanelSection
                title="Signal"
                action={<UsageBadge value={signalLabel} />}
              >
                <p className="text-sm leading-6 text-[#5F5A52]">
                  Based on product wedge, buyer clarity, repeat workflow signal,
                  and visible market momentum.
                </p>
              </PanelSection>
              <PanelSection title="Funding">
                {fundingRows.length > 0 ? (
                  <dl className="grid gap-4 text-sm">
                    {fundingRows.map(([label, value]) => (
                      <SnapshotRow key={label} label={label} value={value} />
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm leading-6 text-[#5F5A52]">
                    Public funding details are not disclosed yet.
                  </p>
                )}
              </PanelSection>
              <PanelSection title="Startup snapshot">
                <dl className="grid gap-4 text-sm">
                  <SnapshotRow label="Stage" value={company.stage} />
                  <SnapshotRow label="Status" value={company.status} />
                  <SnapshotRow
                    label="Updated"
                    value={formatDate(company.updated_at)}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[#7A746C]">Views</dt>
                    <dd className="text-right font-medium text-[#181818]">
                      <CompanyViewCount
                        views={company.metrics?.views ?? 0}
                        showTextLabel
                        className="justify-end"
                      />
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[#7A746C]">Category</dt>
                    <dd>
                      <Link
                        href={`/categories/${getCategorySlug(company.category)}`}
                        className="inline-flex items-center gap-1 text-right font-medium text-[#181818] hover:underline"
                      >
                        <CategoryBadge category={company.category} />
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[#7A746C]">Website</dt>
                    <dd>
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
                  {company.x_handle ? (
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-[#7A746C]">X</dt>
                      <dd>
                        <a
                          href={`https://x.com/${company.x_handle}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#9A3D2B] hover:underline"
                        >
                          @{company.x_handle}
                          <ExternalLink className="size-3.5" />
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </PanelSection>
              <PanelSection title="Request intro">
                <div className="flex items-center gap-3 rounded-md bg-[var(--app-surface)] p-3 app-card-border">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[rgb(154_61_43_/_0.10)] text-[#9A3D2B] ring-1 ring-[#E7E1D8]">
                    <Mail className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#181818]">
                      Want to connect with {company.name}?
                    </p>
                    <p className="mt-1 text-xs text-[#7A746C]">
                      Send a quick intro request to AI Atlas and include any
                      context that would make the connection useful.
                    </p>
                  </div>
                  <Button asChild size="sm" className="app-primary-button">
                    <a href={introRequestHref}>
                      Request intro
                      <Mail className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </PanelSection>
              <div className="p-5">
                <Button asChild className="w-full app-primary-button">
                  <a href={companyWebsiteUrl} target="_blank" rel="noreferrer">
                    Visit website
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {relatedCompanies.length > 0 ? (
        <section className="border-t border-[#E7E1D8] bg-[var(--app-surface)]">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-heading text-[1.5rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[#181818] md:text-[1.75rem]">
              Related NYC startups
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {relatedCompanies.map((item) => (
                <CompanyCard key={item.id} company={item} compact />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}

function PanelSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#E7E1D8] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-[#181818]">
          {title}
        </h2>
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
      <dd className="text-right font-medium text-[#181818]">
        {value}
      </dd>
    </div>
  );
}

function ProfileSection({
  id,
  title,
  body,
  companies,
  excludeCompanyId,
}: {
  id?: string;
  title: string;
  body: string;
  companies?: Company[];
  excludeCompanyId?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-md bg-[var(--app-surface)] p-6 app-card-border"
    >
      <h2 className="text-lg font-semibold tracking-tight text-[#181818]">
        {title}
      </h2>
      <p className="mt-3 text-base leading-8 text-[#5F5A52]">
        {companies ? (
          <LinkedCompanyText
            text={body}
            companies={companies}
            excludeCompanyId={excludeCompanyId}
          />
        ) : (
          body
        )}
      </p>
    </section>
  );
}

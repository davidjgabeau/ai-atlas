"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Newspaper } from "lucide-react";

import { NewsItemRow } from "@/components/news/news-item-card";
import { Button } from "@/components/ui/button";
import { formatRelativeUpdate } from "@/lib/date/formatRelativeUpdate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { NewsItem } from "@/types/market";
import type { Company } from "@/types/market";

type LinkableCompany = Pick<Company, "id" | "name" | "slug">;

export function NewsBriefModal({
  items,
  companies,
}: {
  items: NewsItem[];
  companies?: LinkableCompany[];
}) {
  if (items.length < 5) {
    return null;
  }

  const previewItems = items.slice(0, 5);

  return (
    <section id="news-brief" className="border-b border-[#E7E1D8] bg-section">
      <div className="editorial-container py-8">
        <div className="grid gap-5 border-y border-[#E7E1D8] py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md border border-[#E7E1D8] bg-[#FBFAF7] text-[#9A3D2B]">
                <Newspaper className="size-4" />
              </span>
              <p className="editorial-label">News brief</p>
            </div>
            <h2 className="mt-3 font-heading text-[clamp(28px,3vw,40px)] font-medium leading-[1] tracking-[0] text-[#181818]">
              News Brief
            </h2>
            <p className="mt-2 max-w-[560px] text-sm leading-[1.5] text-[#5F5A52]">
              Early-stage NYC AI news links worth scanning.
            </p>
            <Link
              href="/feed"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#9A3D2B] transition hover:text-[#181818]"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
            <div className="mt-4 flex flex-col gap-2 text-sm leading-[1.5] text-[#5F5A52] md:flex-row md:flex-wrap md:gap-x-4">
              {previewItems.map((item) => (
                <a
                  key={item.id}
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex max-w-[360px] items-center gap-1.5 hover:text-[#181818]"
                >
                  <span className="shrink-0 text-xs font-semibold text-[#9A3D2B]">
                    {formatNewsBriefDate(item)}
                  </span>
                  <span className="line-clamp-1">{item.title}</span>
                  <ExternalLink className="size-3 shrink-0 text-[#9A3D2B]" />
                </a>
              ))}
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="app-primary-button justify-self-start lg:justify-self-end">
                Open news brief
                <ArrowRight className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[86vh] overflow-y-auto rounded-md border border-[#E7E1D8] bg-[#F8F6F1] p-0 sm:max-w-[760px]">
              <DialogHeader className="border-b border-[#E7E1D8] px-5 py-5">
                <p className="editorial-label">News brief</p>
                <DialogTitle className="font-heading text-[34px] font-medium leading-[1] tracking-[0] text-[#181818]">
                  News Brief
                </DialogTitle>
                <DialogDescription className="max-w-[560px] text-sm leading-[1.6] text-[#5F5A52]">
                  Early-stage NYC AI news links worth scanning, with broader
                  context labeled inside the feed when useful.
                </DialogDescription>
              </DialogHeader>
              <div className="divide-y divide-[#E7E1D8] px-5">
                {items.slice(0, 8).map((item, index) => (
                  <NewsItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    companies={companies}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t border-[#E7E1D8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-[1.5] text-[#7A746C]">
                  Links open at the original publisher.
                </p>
                <Button asChild variant="outline">
                  <Link href="/feed">
                    Open Newsfeed
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}

function formatNewsBriefDate(item: NewsItem) {
  return formatRelativeUpdate(
    item.published_at ?? item.discovered_at ?? item.created_at,
  );
}

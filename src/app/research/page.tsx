import type { Metadata } from "next";
import { PublicShell } from "@/components/site/public-shell";
import { ResearchWorkspace } from "@/components/research/ResearchWorkspace";
import { getResearchDataset } from "@/lib/research/dataset";
import { createShareMetadata, getShareImageUrl } from "@/lib/seo/shareMetadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = createShareMetadata({
  title: "NYC AI Research Desk - Companies, Offices & Evidence",
  description: "Research New York AI companies at every stage. Compare boroughs, inspect office evidence, track dated signals, export sources, and find public-interest reporting resources.",
  path: "/research",
  image: getShareImageUrl({ page: "research" }),
});

export default async function ResearchPage() {
  return <PublicShell><ResearchWorkspace data={await getResearchDataset()} /></PublicShell>;
}

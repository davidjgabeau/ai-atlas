import type { Metadata } from "next";
import { PublicShell } from "@/components/site/public-shell";
import { ResearchWorkspace } from "@/components/research/ResearchWorkspace";
import { getResearchDataset } from "@/lib/research/dataset";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "NYC AI Research Desk - Companies, Offices & Evidence",
  description: "Research New York AI companies at every stage. Compare boroughs, inspect office evidence, track dated signals, export sources, and find public-interest reporting resources.",
  alternates: { canonical: "https://aiatlas.nyc/research" },
};

export default async function ResearchPage() {
  return <PublicShell><ResearchWorkspace data={await getResearchDataset()} /></PublicShell>;
}

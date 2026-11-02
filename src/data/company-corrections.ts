import type { Company } from "@/types/market";

// Reviewed 2026-11-02. Narrow corrections to malformed imported public records.
// Sources: https://www.probook.ai/ and https://www.probook.ai/company
// https://a16z.com/announcement/investing-in-probook/ (June 23, 2026)
export function applyVerifiedCompanyCorrections<T extends Partial<Company>>(row: T): T {
  if (row.slug !== "probook") return row;
  return {
    ...row,
    website_url: "https://www.probook.ai",
    category: "Enterprise GTM & RevOps AI",
    stage: "Series A",
    funding_round: "Series A",
    funding_amount: "$34M",
    funding_date: "2026-06-23",
    total_raised: "$40M",
    lead_investor: "Andreessen Horowitz",
    short_description: "Probook automates dispatch, booking cleanup, and customer messages for HVAC, plumbing, and electrical service companies.",
    one_line_thesis: "AI dispatching for home service teams",
    why_it_matters: "Dispatch sits at the center of a home service business: matching technicians to jobs while keeping bookings and customer communication in sync.",
    recent_activity_text: "Announced a $34M Series A led by Andreessen Horowitz.",
    recent_activity_date: "2026-06-23",
    founders: [
      { name: "George Eliadis", title: "Co-founder & CEO" },
      { name: "Lewis Zhang", title: "Co-founder & CTO" },
      { name: "Ben Cervantez", title: "Co-founder" },
    ],
    generated: row.generated ? { ...row.generated, hook: "AI dispatching for home service teams" } : row.generated,
  };
}

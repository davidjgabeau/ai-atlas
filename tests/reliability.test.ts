import assert from "node:assert/strict";
import { test } from "node:test";
import { forEachConcurrent } from "../src/lib/agent/concurrency";
import { getLatestCompanyAdditions, getRecentCompanyAdditions } from "../src/lib/companies/recentAdditions";
import { getRecentEditorialSignals } from "../src/lib/editorial/recentSignals";
import { formatRelativeDate, formatDate } from "../src/lib/format";
import { submissionSchema } from "../src/lib/submissions";
import type { Company } from "../src/types/market";
import type { EditorialItem } from "../src/types/agent";
import { sortCompanies } from "../src/lib/companies/sort";
import { hasPublishableDescription } from "../src/lib/agent/companyCandidateValidation";
import { applyVerifiedCompanyCorrections } from "../src/data/company-corrections";
import { buildCompanyMapLocations } from "../src/lib/map-layout";
import { SearchProvider } from "../src/lib/agent/sources/SearchProvider";
import { getExternalUrl } from "../src/lib/intro-request";

test("source workers cap concurrent requests and settle all work", async () => {
  let active = 0;
  let maximum = 0;
  const visited: number[] = [];
  const result = await forEachConcurrent([0, 1, 2, 3, 4, 5], 2, async (value) => {
    maximum = Math.max(maximum, ++active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    visited.push(value);
    active--;
  });
  assert.equal(maximum, 2);
  assert.equal(active, 0);
  assert.deepEqual(visited.sort(), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(result, { completed: 6, remaining: 0 });
});

test("a spent source budget stops starting requests and reports deferred work", async (t) => {
  let clock = 100;
  t.mock.method(Date, "now", () => clock);
  const seen: number[] = [];
  const result = await forEachConcurrent([1, 2, 3], 1, async (item) => {
    seen.push(item);
    clock = 201;
  }, 200);
  assert.deepEqual(seen, [1]);
  assert.deepEqual(result, { completed: 1, remaining: 2 });
});

test("a failed worker waits for in-flight work before rejecting", async () => {
  let settled = false;
  await assert.rejects(forEachConcurrent([1, 2], 2, async (item) => {
    if (item === 1) throw new Error("source failed");
    await new Promise<void>((resolve) => setImmediate(resolve));
    settled = true;
  }), /source failed/);
  assert.equal(settled, true);
});

test("relative dates use the supplied clock instead of the original launch date", () => {
  const now = new Date("2026-11-01T18:00:00Z");
  assert.equal(formatRelativeDate("2026-11-01T16:00:00Z", now), "2h ago");
  assert.equal(formatRelativeDate("2026-10-30T18:00:00Z", now), "2d ago");
  assert.equal(formatRelativeDate("2026-11-02T18:00:00Z", now), "in 1d");
  assert.equal(formatRelativeDate("not-a-date", now), "Date unavailable");
  assert.equal(formatDate(""), "Date unavailable");
  assert.equal(formatDate("2026-06-23"), "Jun 23, 2026");
});

test("profile links hide missing or unsafe websites", () => {
  assert.equal(getExternalUrl(""), "");
  assert.equal(getExternalUrl("javascript:alert(1)"), "");
  assert.equal(getExternalUrl("example.com"), "https://example.com/");
});

test("latest additions remain useful after a quiet week without labeling old entries new", () => {
  const now = Date.parse("2026-11-01T18:00:00Z");
  const companies = [
    { id: "a", name: "Alpha", created_at: "2026-05-01T00:00:00Z" },
    { id: "b", name: "Beta", created_at: "2026-06-01T00:00:00Z" },
    { id: "c", name: "Future", created_at: "2027-01-01T00:00:00Z" },
    { id: "d", name: "Invalid", created_at: "invalid" },
  ] as Company[];
  assert.equal(getRecentCompanyAdditions(companies, 6, now).length, 0);
  assert.deepEqual(getLatestCompanyAdditions(companies, 6, now).map((c) => c.id), ["b", "a"]);
});

test("regenerating a surface cannot make stale or future signals recent", () => {
  const now = Date.parse("2026-11-01T18:00:00Z");
  const signal = (id: string, occurredAt: string, companyId = "mapped") => ({ id, companyId, occurredAt, body: "A documented company update." }) as EditorialItem;
  const items = [signal("old", "2026-05-01"), signal("new", "2026-10-30"), signal("future", "2026-12-01"), signal("missing", "2026-10-31", "removed")];
  assert.deepEqual(getRecentEditorialSignals(items, new Set(["mapped"]), now).map((s) => s.id), ["new"]);
});

test("submissions reject malformed input and unsafe website protocols", () => {
  const valid = { company_name: " Example ", website_url: "https://example.com", email: "founder@example.com" };
  assert.equal(submissionSchema.parse(valid).company_name, "Example");
  for (const patch of [{ company_name: 123 }, { company_name: "  " }, { website_url: "javascript:alert(1)" }, { email: "not-email" }, { description: "x".repeat(5001) }]) {
    assert.equal(submissionSchema.safeParse({ ...valid, ...patch }).success, false);
  }
});

test("sorting by addition date uses the original date, not a later sync", () => {
  const companies = [
    { id: "a", name: "Alpha", created_at: "2026-01-01", updated_at: "2026-11-01" },
    { id: "b", name: "Beta", created_at: "2026-06-01", updated_at: "2026-06-01" },
  ] as Company[];
  assert.deepEqual(sortCompanies(companies, "recent").map((c) => c.id), ["b", "a"]);
  assert.deepEqual(sortCompanies(companies, "name").map((c) => c.id), ["a", "b"]);
  assert.equal(companies[0].id, "a");
});

test("a press announcement excerpt is held for review", () => {
  assert.equal(hasPublishableDescription("Investing in Probook | Andreessen Horowitz Probook a16z company announcement."), false);
  assert.equal(hasPublishableDescription("Probook automates technician dispatch and customer communication for home service companies."), true);
});

test("verified profile corrections preserve identity and original addition dates", () => {
  const row = { id: "original-id", slug: "probook", created_at: "2026-06-23", category: "Media, Ads & Creative AI" } as Company;
  const corrected = applyVerifiedCompanyCorrections(row);
  assert.equal(corrected.id, row.id);
  assert.equal(corrected.created_at, row.created_at);
  assert.equal(corrected.category, "Enterprise GTM & RevOps AI");
  assert.match(corrected.short_description, /dispatch/);
  assert.equal(row.category, "Media, Ads & Creative AI");
});

test("a category or an ungeocoded street address cannot invent a map location", () => {
  const companies = [
    { slug: "unknown-finance", category: "Fintech & Trading AI", office_address: "" },
    { slug: "unknown-agents", category: "Agent Infrastructure", office_address: "123 Example Street, NYC" },
    { slug: "unknown-data-company", category: "Data & Memory Layer", office_address: "" },
  ] as Company[];
  assert.deepEqual(buildCompanyMapLocations(companies), []);
});

test("discovery search checks sources concurrently instead of serially", async (t) => {
  let active = 0;
  let maximum = 0;
  const previous = process.env.DISCOVERY_QUERY_LIMIT;
  process.env.DISCOVERY_QUERY_LIMIT = "1";
  t.mock.method(globalThis, "fetch", async () => {
    maximum = Math.max(maximum, ++active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    active--;
    return Response.json([]);
  });
  try {
    assert.deepEqual(await new SearchProvider().discoverCandidates(), []);
    assert.equal(maximum, 4);
    assert.equal(active, 0);
  } finally {
    if (previous === undefined) delete process.env.DISCOVERY_QUERY_LIMIT;
    else process.env.DISCOVERY_QUERY_LIMIT = previous;
  }
});

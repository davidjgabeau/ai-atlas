import assert from 'node:assert/strict';

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
async function get(path) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response;
}
const embed = await (await get('/api/embed/atlas')).json();
assert.ok(embed.companies.length > 0, 'The public directory is empty');
const home = await (await get('/')).text();
assert.match(home, /Latest Additions/);
assert.match(home, /Profiles synced/);
assert.doesNotMatch(home, /No recent additions yet/);
const paths = [...new Set([
  '/companies?sort=recent', '/categories', '/patterns', '/feed', '/jobs', '/ask', '/submit', '/mcp', '/sitemap.xml',
  ...embed.companies.map((company) => `/companies/${company.slug}`),
  ...embed.categories.map((category) => `/categories/${category.slug}`),
  ...embed.patterns.map((pattern) => `/patterns/${pattern.slug}`),
])];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < paths.length) await get(paths[cursor++]);
}));
const search = await (await get('/api/search?q=probook')).json();
assert.ok(search.results.some((result) => result.href === '/companies/probook'));
const invalidSubmission = await fetch(`${base}/api/submissions`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ company_name: 123, website_url: 'javascript:alert(1)', email: 'invalid' }),
  signal: AbortSignal.timeout(10_000),
});
assert.equal(invalidSubmission.status, 400);
console.log(`Verified ${paths.length} public routes, homepage freshness, search, and invalid-submission handling at ${base}`);

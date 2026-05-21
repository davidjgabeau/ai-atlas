import "./load-env";

import { refreshCompanyJobs } from "../src/lib/jobs/refreshCompanyJobs";

const companyLimitArg = process.argv.find((arg) =>
  arg.startsWith("--company-limit="),
);
const jobsPerCompanyArg = process.argv.find((arg) =>
  arg.startsWith("--jobs-per-company="),
);
const companySlugs = process.argv.flatMap((arg) => {
  if (
    !arg.startsWith("--company-slug=") &&
    !arg.startsWith("--company-slugs=")
  ) {
    return [];
  }

  return arg
    .split("=")[1]
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
});
const dryRun = process.argv.includes("--dry-run");

refreshCompanyJobs({
  companyLimit: companyLimitArg
    ? Number(companyLimitArg.split("=")[1])
    : undefined,
  jobsPerCompany: jobsPerCompanyArg
    ? Number(jobsPerCompanyArg.split("=")[1])
    : undefined,
  companySlugs,
  dryRun,
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

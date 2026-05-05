import "./load-env";

import { refreshCompanyJobs } from "../src/lib/jobs/refreshCompanyJobs";

const companyLimitArg = process.argv.find((arg) =>
  arg.startsWith("--company-limit="),
);
const jobsPerCompanyArg = process.argv.find((arg) =>
  arg.startsWith("--jobs-per-company="),
);

refreshCompanyJobs({
  companyLimit: companyLimitArg
    ? Number(companyLimitArg.split("=")[1])
    : undefined,
  jobsPerCompany: jobsPerCompanyArg
    ? Number(jobsPerCompanyArg.split("=")[1])
    : undefined,
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

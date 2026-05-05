import "./load-env";

import { refreshCompanyProfileBriefs } from "../src/lib/agent/refreshCompanyProfileBriefs";

const force = process.argv.includes("--force");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

refreshCompanyProfileBriefs({
  force,
  limit,
  persistJson: true,
})
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

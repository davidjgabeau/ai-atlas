import "./load-env";

import { runRefreshKnownCompanies } from "../src/lib/agent/pipeline";

runRefreshKnownCompanies()
  .then((run) => {
    console.log(JSON.stringify(run, null, 2));
    if (run.status === "failed") process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

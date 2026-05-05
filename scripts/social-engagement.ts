import "./load-env";

import { runConservativeSocialEngagement } from "../src/lib/social-automation/engagement";

runConservativeSocialEngagement()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

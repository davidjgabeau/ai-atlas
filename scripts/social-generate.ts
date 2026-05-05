import "./load-env";

import { generateSocialDrafts } from "../src/lib/social-automation/generator";

generateSocialDrafts()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

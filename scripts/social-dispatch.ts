import "./load-env";

import { dispatchScheduledSocialPosts } from "../src/lib/social-automation/dispatch";

dispatchScheduledSocialPosts()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

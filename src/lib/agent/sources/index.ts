import { CuratedPageProvider } from "./CuratedPageProvider";
import { LinkedInProvider } from "./LinkedInProvider";
import { ManualInboxProvider } from "./ManualInboxProvider";
import { RSSProvider } from "./RSSProvider";
import { SearchProvider } from "./SearchProvider";
import type { SourceProvider } from "./SourceProvider";
import { WebsiteProvider } from "./WebsiteProvider";
import { XProvider } from "./XProvider";

export function createSourceProviders(): SourceProvider[] {
  return [
    new ManualInboxProvider(),
    new WebsiteProvider(),
    new CuratedPageProvider(),
    new RSSProvider(),
    new SearchProvider(),
    new XProvider(),
    new LinkedInProvider(),
  ];
}

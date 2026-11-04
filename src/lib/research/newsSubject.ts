/** A company name appearing in an article is not enough to attribute an event.
 * Require the named company to be the subject of an identifiable action. */
export function hasCompanyNewsSubject(title: string, companyName: string) {
  const name = companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const action = "raises?|raised|secures?|secured|announces?|announced|launches?|launched|opens?|opened|moves?|moved|hires?|hired|releases?|released|unveils?|unveiled|acquires?|acquired|partners?|partnered|expands?|expanded";
  return new RegExp(`^${name}\\b(?:['’]s)?(?:\\s+(?:has|AI))?\\s+(?:${action})\\b`, "i").test(title.trim());
}

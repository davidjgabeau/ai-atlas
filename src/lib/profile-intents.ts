export type PendingCompanySave = {
  companyId: string;
  companyName: string;
};

const pendingCompanySaveKey = "ai-atlas.pending-company-save.v1";

function cleanIntent(intent: PendingCompanySave | null): PendingCompanySave | null {
  if (!intent?.companyId.trim()) return null;

  return {
    companyId: intent.companyId.trim(),
    companyName: intent.companyName.trim(),
  };
}

export function storePendingCompanySave(intent: PendingCompanySave) {
  if (typeof window === "undefined") return;

  const nextIntent = cleanIntent(intent);
  if (!nextIntent) return;

  window.sessionStorage.setItem(
    pendingCompanySaveKey,
    JSON.stringify(nextIntent),
  );
}

export function readPendingCompanySave(): PendingCompanySave | null {
  if (typeof window === "undefined") return null;

  try {
    const rawIntent = window.sessionStorage.getItem(pendingCompanySaveKey);
    if (!rawIntent) return null;

    return cleanIntent(JSON.parse(rawIntent) as PendingCompanySave);
  } catch {
    return null;
  }
}

export function clearPendingCompanySave() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(pendingCompanySaveKey);
}

export function readPendingCompanySaveFromUrl(): PendingCompanySave | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const companyId = params.get("saveCompany") ?? "";
  const companyName = params.get("companyName") ?? "this company";

  return cleanIntent({ companyId, companyName });
}

function clearPendingCompanySaveParamsFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("saveCompany");
  url.searchParams.delete("companyName");

  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function readInitialPendingCompanySave(): PendingCompanySave | null {
  const urlIntent = readPendingCompanySaveFromUrl();

  if (urlIntent) {
    storePendingCompanySave(urlIntent);
    clearPendingCompanySaveParamsFromUrl();
    return urlIntent;
  }

  return readPendingCompanySave();
}

export function getProfileCreationUrlForCompanySave(
  intent: PendingCompanySave,
) {
  const params = new URLSearchParams({
    saveCompany: intent.companyId,
    companyName: intent.companyName,
  });

  return `/profile?${params.toString()}#profile-details`;
}

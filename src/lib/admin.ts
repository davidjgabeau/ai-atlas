const defaultAdminEmails = ["davidgabeau92@gmail.com"];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAdminEmails() {
  const configuredEmails = process.env.AI_ATLAS_ADMIN_EMAILS?.split(",") ?? [];
  const emails = [...defaultAdminEmails, ...configuredEmails]
    .map(normalizeEmail)
    .filter(Boolean);

  return Array.from(new Set(emails));
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;

  return getAdminEmails().includes(normalizeEmail(email));
}

export function isAdminEnabled() {
  return (
    process.env.AI_ATLAS_ADMIN_ENABLED !== "false" &&
    getAdminEmails().length > 0
  );
}

export function isAutoApproveNewCompaniesEnabled() {
  return process.env.AUTO_APPROVE_NEW_COMPANIES !== "false";
}

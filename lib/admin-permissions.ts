export const adminPermissions = ["pharmacies", "accounts", "audit", "analytics", "operations"] as const;
export type AdminPermission = typeof adminPermissions[number];
export function parseAdminPermissions(value: string): AdminPermission[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? adminPermissions.filter(p => parsed.includes(p)) : [];
  } catch { return []; }
}
export type AdminAccess = { isOwner: boolean; permissions: AdminPermission[] };

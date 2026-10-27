import type { AppData } from "./domain";

export type AdminMetricKey = "users" | "searches" | "pending" | "accounts" | "requests" | "reservations" | "activity";
export function adminWorkspaceMetrics(admin: NonNullable<AppData["admin"]>): { key: AdminMetricKey; value: number }[] {
  const can = (permission: typeof admin.access.permissions[number]) => admin.access.isOwner || admin.access.permissions.includes(permission);
  const metrics: { key: AdminMetricKey; value: number }[] = [];
  if (can("analytics")) metrics.push({ key: "users", value: admin.users }, { key: "searches", value: admin.searches });
  if (can("pharmacies") && admin.workload?.pendingPharmacies !== undefined) metrics.push({ key: "pending", value: admin.workload.pendingPharmacies });
  if (can("accounts") && !can("analytics") && admin.workload?.accounts !== undefined) metrics.push({ key: "accounts", value: admin.workload.accounts });
  if (can("operations") && !can("analytics")) {
    if (admin.workload?.requests !== undefined) metrics.push({ key: "requests", value: admin.workload.requests });
    if (admin.workload?.reservations !== undefined) metrics.push({ key: "reservations", value: admin.workload.reservations });
  }
  if (can("audit") && !metrics.length) metrics.push({ key: "activity", value: admin.activity.length });
  return metrics;
}

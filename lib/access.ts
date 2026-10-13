import { env } from "cloudflare:workers";
import { database } from "@/db";
import { getAppUser } from "@/lib/auth";
import { initialPersonalDetails } from "@/lib/profile-details";
import { adminPermissions, parseAdminPermissions, type AdminPermission, type AdminAccess } from "@/lib/admin-permissions";

export class HttpError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function rootAdminIds() { return (env.APP_ADMIN_IDS?.split(",").map(v => v.trim()).filter(Boolean) || []); }
export function isRootAdmin(owner: string) { return rootAdminIds().includes(owner) || (import.meta.env.DEV && owner === "local_seedy"); }
export async function adminAccess(owner: string, db = database()): Promise<AdminAccess | null> {
  if (isRootAdmin(owner)) return { isOwner: true, permissions: [...adminPermissions] };
  const row = await db.prepare("SELECT permissions FROM admin_members WHERE owner = ?").bind(owner).first<{ permissions: string }>();
  const permissions = row ? parseAdminPermissions(row.permissions) : [];
  return permissions.length ? { isOwner: false, permissions } : null;
}
export async function isAdmin(owner: string, db = database()) { return Boolean(await adminAccess(owner, db)); }
export async function hasAdminPermission(owner: string, permission: AdminPermission, db = database()) { return Boolean((await adminAccess(owner, db))?.permissions.includes(permission)); }
export async function tokenHash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), n => n.toString(16).padStart(2, "0")).join(""); }
export async function identity(request?: Request, options: { allowClosed?: boolean; allowSuspended?: boolean } = {}) {
  const session = request?.headers.get("x-lqadwa-session");
  let user = request?.headers.has("x-lqadwa-session") ? null : await getAppUser();
  if (session && /^[0-9a-f-]{73}$/.test(session)) {
    const row = await database().prepare("SELECT s.owner, p.name FROM mobile_sessions s LEFT JOIN profiles p ON p.id = s.owner WHERE s.hash = ? AND s.expires > ?").bind(await tokenHash(session), Date.now()).first<{ owner: string; name: string }>();
    if (row) user = { userId: row.owner, fullName: row.name, displayName: row.name, email: "", personalDetails:initialPersonalDetails(undefined) };
  }
  if (!user) throw new HttpError("سجّل الدخول لحفظ طلباتك بأمان.", 401);
  if (!options.allowClosed && await database().prepare("SELECT hash FROM closed_accounts WHERE hash = ?").bind(await tokenHash(user.userId)).first()) throw new HttpError("Account deleted. Visit /account-data to join again. / الحساب محذوف.", 410);
  if (!options.allowSuspended && !isRootAdmin(user.userId) && await database().prepare("SELECT owner FROM account_controls WHERE owner = ? AND suspended = 1").bind(user.userId).first()) throw new HttpError("تم تعليق الحساب. تواصل مع إدارة المنصة.", 403);
  return user;
}
export function audit(actor: string, action: string, target: string, detail: string) {
  return database().prepare("INSERT INTO audit_log (id, actor, action, target, detail, created) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), actor, action, target, detail, Date.now());
}

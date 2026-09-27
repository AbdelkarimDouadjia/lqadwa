import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), name: text("name").notNull(), city: text("city").notNull().default("algiers"),
});
export const pharmacySettings = sqliteTable("pharmacy_settings", {
  owner: text("owner").notNull(), pharmacy: text("pharmacy").notNull(), duty: integer("duty").notNull(),
}, (t) => [primaryKey({ columns: [t.owner, t.pharmacy] })]);
export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), medicine: text("medicine").notNull(),
  city: text("city").notNull(), created: integer("created").notNull(),
}, (t) => [index("idx_requests_owner_created").on(t.owner, t.created)]);
export const responses = sqliteTable("responses", {
  request: text("request").notNull().references(() => requests.id), pharmacy: text("pharmacy").notNull(),
  status: text("status").notNull().default("pending"), updated: integer("updated"),
}, (t) => [primaryKey({ columns: [t.request, t.pharmacy] }), index("idx_responses_pharmacy_status").on(t.pharmacy, t.status)]);
export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), request: text("request").notNull().references(() => requests.id),
  pharmacy: text("pharmacy").notNull(), code: text("code").notNull(),
  created: integer("created").notNull(), expires: integer("expires").notNull(),
  status: text("status").notNull().default("active"),
}, (t) => [uniqueIndex("idx_reservations_request").on(t.request), index("idx_reservations_owner").on(t.owner), index("idx_reservations_pharmacy_status").on(t.pharmacy, t.status, t.expires)]);
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), title: text("title").notNull(),
  created: integer("created").notNull(), read: integer("read").notNull().default(0),
}, (t) => [index("idx_notifications_owner_created").on(t.owner, t.created)]);

export const registeredPharmacies = sqliteTable("registered_pharmacies", {
  id: text("id").primaryKey(), owner: text("owner").notNull().unique(),
  name: text("name").notNull(), address: text("address").notNull(), city: text("city").notNull(),
  latitude: integer("latitude").notNull(), longitude: integer("longitude").notNull(),
  phone: text("phone").notNull(), license: text("license").notNull(),
  status: text("status").notNull().default("pending"), duty: integer("duty").notNull().default(0),
  hours: text("hours").notNull().default("08:00 — 20:00"),
  created: integer("created").notNull(), updated: integer("updated").notNull(),
}, (t) => [index("idx_registered_pharmacies_city_status").on(t.city, t.status), index("idx_pharmacies_status_name").on(t.status, t.name)]);

export const stockItems = sqliteTable("stock_items", {
  id: text("id").primaryKey(), pharmacy: text("pharmacy").notNull().references(() => registeredPharmacies.id),
  name: text("name").notNull(), quantity: integer("quantity").notNull(), updated: integer("updated").notNull(),
}, (t) => [uniqueIndex("idx_stock_items_pharmacy_name").on(t.pharmacy, t.name)]);

export const adminMembers = sqliteTable("admin_members", {
  owner: text("owner").primaryKey(), invitedBy: text("invited_by").notNull(), created: integer("created").notNull(),
});
export const adminInvites = sqliteTable("admin_invites", {
  hash: text("hash").primaryKey(), createdBy: text("created_by").notNull(), created: integer("created").notNull(),
  expires: integer("expires").notNull(), usedBy: text("used_by"),
});
export const reservationLocations = sqliteTable("reservation_locations", {
  reservation: text("reservation").primaryKey().references(() => reservations.id),
  latitude: integer("latitude").notNull(), longitude: integer("longitude").notNull(), updated: integer("updated").notNull(),
}, (t) => [index("idx_reservation_locations_updated").on(t.updated)]);

export const accountControls = sqliteTable("account_controls", {
  owner: text("owner").primaryKey(), suspended: integer("suspended").notNull().default(0), reason: text("reason").notNull().default(""),
});
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(), actor: text("actor").notNull(), action: text("action").notNull(), target: text("target").notNull(), detail: text("detail").notNull(), created: integer("created").notNull(),
}, t => [index("idx_audit_created").on(t.created)]);
export const deviceLinks = sqliteTable("device_links", {
  id: text("id").primaryKey(), challenge: text("challenge").notNull(), code: text("code").notNull(), requestKey: text("request_key").notNull(),
  created: integer("created").notNull(), expires: integer("expires").notNull(), owner: text("owner"), consumed: integer("consumed").notNull().default(0), attempts: integer("attempts").notNull().default(0),
}, t => [index("idx_device_key_created").on(t.requestKey, t.created)]);
export const mobileSessions = sqliteTable("mobile_sessions", {
  hash: text("hash").primaryKey(), owner: text("owner").notNull(), created: integer("created").notNull(), expires: integer("expires").notNull(),
}, t => [index("idx_mobile_owner").on(t.owner), index("idx_mobile_expiry").on(t.expires)]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expires: integer("expires").notNull(),
}, t => [index("idx_rate_expiry").on(t.expires)]);
export const maintenance = sqliteTable("maintenance", { key: text("key").primaryKey(), lastRun: integer("last_run").notNull() });
export const closedAccounts = sqliteTable("closed_accounts", { hash: text("hash").primaryKey(), created: integer("created").notNull() });

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Creates two labelled test requests in the LOCAL pilot only; never targets a live site.
const base = new URL(process.argv[2] || "http://localhost:5173");
assert(["localhost", "127.0.0.1"].includes(base.hostname), "Smoke tests are local-only");
const origin = base.origin;
const anonymous = await fetch(`${origin}/api/app`);
assert.equal(anonymous.status, 401, "anonymous access rejected");
const signIn = await fetch(`${origin}/signin-with-chatgpt?return_to=/`, { redirect: "manual" });
assert.equal(signIn.status, 302);
const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
assert(cookie, "local development sign-in cookie");
async function post(action, expected = 200, overrideHeaders = {}) {
  const response = await fetch(`${origin}/api/app`, {
    method: "POST", headers: { "content-type": "application/json", origin, cookie, ...overrideHeaders },
    body: JSON.stringify(action),
  });
  const body = await response.text();
  const data = response.headers.get("content-type")?.includes("application/json") ? JSON.parse(body) : { error: body };
  assert.equal(response.status, expected, `${action.action}: ${JSON.stringify(data.error || "")}`);
  return data;
}
await post({ action: "read-notifications" }, 403, { origin: "https://invalid.example" });
await post({ action: "profile", name: "x", city: "invalid" }, 400);
const token = randomUUID();
const search = { action: "search", medicine: "اختبار آلي · منتج توضيحي", city: "algiers", night: false, demo: true, token };
let data = await post(search);
assert.equal(data.responses.filter(r => r.request === token).length, 3);
assert(data.responses.filter(r => r.request === token).every(r => r.status === "yes"), "synthetic demo responds instantly");
data = await post(search);
assert.equal(data.requests.filter(r => r.id === token).length, 1, "search retry is idempotent");
const reserve = { action: "reserve", request: token, pharmacy: "algiers-1", consent: true };
await post({ ...reserve, consent: false }, 400);
const race = await Promise.all([200, 200].map(async () => {
  const response = await fetch(`${origin}/api/app`, { method: "POST", headers: { "content-type": "application/json", origin, cookie }, body: JSON.stringify(reserve) });
  return response.status;
}));
assert.deepEqual(race.sort(), [200, 409], "only one concurrent reservation succeeds");
data = await (await fetch(`${origin}/api/app`, { headers: { cookie } })).json();
const booking = data.reservations.find(r => r.request === token);
assert(booking && booking.status === "active");
assert.equal(booking.expires - booking.created, 7_200_000);
const collect = { action: "collect", reservation: booking.id, pharmacy: booking.pharmacy, code: booking.code, checked: true };
await post({ ...collect, code: booking.code === "DZ-00000000" ? "DZ-FFFFFFFF" : "DZ-00000000" }, 409);
await post({ ...collect, checked: false }, 400);
data = await post(collect);
assert.equal(data.reservations.find(r => r.id === booking.id).status, "collected");
await post(collect, 409);
await post({ action: "cancel", reservation: booking.id }, 409);
const cancelToken = randomUUID();
await post({ ...search, token: cancelToken });
data = await post({ ...reserve, request: cancelToken, pharmacy: "algiers-2" });
const cancelBooking = data.reservations.find(r => r.request === cancelToken);
data = await post({ action: "cancel", reservation: cancelBooking.id });
assert.equal(data.reservations.find(r => r.id === cancelBooking.id).status, "cancelled");
await post({ ...collect, reservation: cancelBooking.id, pharmacy: cancelBooking.pharmacy, code: cancelBooking.code }, 409);
console.log("PASS: authentication, CSRF, validation, pending availability, consent, idempotency, concurrent reservation, persistence, 2-hour expiry timestamp, pickup code, collection and cancellation guards.");

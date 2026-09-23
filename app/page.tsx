"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Bell, BookmarkCheck, Camera, Check, CheckCheck, Clock3, Copy, FileCheck2, Globe2, LocateFixed, MapPin, Moon, MoonStar, Navigation, Package, QrCode, RefreshCw, Search, ShieldCheck, Store, Sun, Trash2, UserRound, WifiOff, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DawaMap } from "@/components/dawa-map";
import { BookingQr } from "@/components/booking-qr";
import { cities, medicines, normalize, distanceLabel, timeLeft, isFreshReply, type AppData, type Booking, type Pharmacy, type StaffBooking } from "@/lib/domain";
import { tr, type Language, type TranslationKey } from "@/lib/i18n";

type View = "search" | "bookings" | "map" | "account" | "pharmacy" | "admin";
type Modal = { kind: "reserve"; pharmacy: Pharmacy } | { kind: "booking"; booking: Booking } | { kind: "pharmacy"; pharmacy: Pharmacy } | { kind: "collect"; booking: StaffBooking } | null;
const blank: AppData = { profile: { name: "", city: "algiers" }, pharmacies: [], requests: [], responses: [], reservations: [], notifications: [], role: "client", ownPharmacy: null, staffRequests: [], staffBookings: [], stock: [], admin: null };
const localeTag = { ar: "ar-DZ", fr: "fr-DZ", en: "en-DZ" };
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180, deltaLat = (a.lat - b.lat) * rad, deltaLng = (a.lng - b.lng) * rad;
  const arc = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(12_742_000 * Math.asin(Math.sqrt(arc)));
}
function localizedDistance(meters: number, language: Language) { return language === "ar" ? distanceLabel(meters) : meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`; }

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("ar");
  const [view, setView] = useState<View>("search");
  const [data, setData] = useState<AppData>(blank);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [dark, setDark] = useState(false);
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("algiers");
  const [night, setNight] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [consent, setConsent] = useState(false);
  const [collectCode, setCollectCode] = useState("");
  const [stockName, setStockName] = useState("");
  const [stockQuantity, setStockQuantity] = useState("1");
  const [profileName, setProfileName] = useState("");
  const [registration, setRegistration] = useState({ name: "", address: "", phone: "", license: "", city: "algiers", latitude: "", longitude: "" });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const latest = useRef(0), inFlight = useRef(false), first = useRef(true), fileRef = useRef<HTMLInputElement>(null), qrFileRef = useRef<HTMLInputElement>(null);
  const t = useCallback((key: TranslationKey) => tr(language, key), [language]);
  const cityName = useCallback((id: string) => { const found = cities.find((item) => item.id === id); return found ? language === "ar" ? found.name : found.latin : id; }, [language]);

  const navigate = useCallback((next: View) => { setView(next); window.location.hash = next; window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  const load = useCallback(async () => {
    if (inFlight.current) return;
    const sequence = ++latest.current;
    try {
      const response = await fetch("/api/app", { cache: "no-store" });
      const result = await response.json() as AppData & { error?: string };
      if (sequence !== latest.current) return;
      if (response.status === 401) { setSignedOut(true); setLoading(false); return; }
      if (!response.ok) throw new Error(result.error || "Load failed");
      setData(result); setSignedOut(false); setError("");
      if (first.current) {
        setCity(result.profile.city); setProfileName(result.profile.name);
        if (result.ownPharmacy) setRegistration({ name: result.ownPharmacy.name, address: result.ownPharmacy.address, phone: result.ownPharmacy.phone, license: result.ownPharmacy.license, city: result.ownPharmacy.city, latitude: String(result.ownPharmacy.latitude / 1e6), longitude: String(result.ownPharmacy.longitude / 1e6) });
        first.current = false;
      }
    } catch { if (sequence === latest.current) setError(tr(language, "error")); }
    finally { if (sequence === latest.current) setLoading(false); }
  }, [language]);
  useEffect(() => {
    const stored = localStorage.getItem("dawa-language");
    if (stored === "ar" || stored === "fr" || stored === "en") queueMicrotask(() => setLanguage(stored));
    const preferred = localStorage.getItem("dawa-theme") === "dark";
    queueMicrotask(() => setDark(preferred)); document.documentElement.dataset.theme = preferred ? "dark" : "light";
    const hash = () => { const next = window.location.hash.slice(1); if (["search", "bookings", "map", "account", "pharmacy", "admin"].includes(next)) setView(next as View); };
    queueMicrotask(hash); window.addEventListener("hashchange", hash);
    const connection = () => setOffline(!navigator.onLine);
    queueMicrotask(connection); window.addEventListener("online", connection); window.addEventListener("offline", connection);
    return () => { window.removeEventListener("hashchange", hash); window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = `${t("welcome")} | DAWA DZ`;
    localStorage.setItem("dawa-language", language);
  }, [language, t]);
  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) void load(); }, 8000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearInterval(clock); };
  }, [load]);
  useEffect(() => {
    type Context = { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void };
    const context = (document as Document & { modelContext?: Context }).modelContext;
    if (!context) return;
    const controller = new AbortController();
    try { context.registerTool({ name: "view_dawa_section", description: "Navigate to a visible Dawa section without submitting medicine or reservation data.", inputSchema: { type: "object", properties: { section: { enum: ["search", "bookings", "map", "account", "pharmacy", "admin"] } }, required: ["section"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: { section: View }) => { if (!["search", "bookings", "map", "account", "pharmacy", "admin"].includes(input.section)) throw new Error("Invalid section"); navigate(input.section); return { section: input.section }; } }, { signal: controller.signal }); } catch { /* Optional browser integration. */ }
    return () => controller.abort();
  }, [navigate]);

  async function mutate(action: Record<string, unknown>, success = "") {
    if (inFlight.current) return null;
    inFlight.current = true; ++latest.current; setBusy(String(action.action));
    try {
      const response = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": language }, body: JSON.stringify(action) });
      const result = await response.json() as AppData & { error?: string };
      if (response.status === 401) { setSignedOut(true); throw new Error(t("login")); }
      if (!response.ok) throw new Error(language === "ar" ? result.error || t("error") : t("error"));
      setData(result); setError(""); if (success) toast.success(success); return result;
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : t("error")); return null; }
    finally { inFlight.current = false; setBusy(""); setLoading(false); }
  }
  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { toast.error(t("medicine")); return; }
    const token = crypto.randomUUID();
    const result = await mutate({ action: "search", medicine: query.trim(), city, night, token }, t("waitResponse"));
    if (result) { setActiveRequest(token); setOnlyAvailable(false); }
  }
  function locate() {
    if (!navigator.geolocation) { toast.error(t("error")); return; }
    setBusy("location");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const point = { lat: coords.latitude, lng: coords.longitude }; setPosition(point);
      const closest = [...cities].sort((a, b) => distanceMeters(a, point) - distanceMeters(b, point))[0];
      setCity(closest.id); setBusy(""); toast.success(`${t("location")}: ${cityName(closest.id)}`);
    }, () => { setBusy(""); toast.error(t("error")); }, { timeout: 10000, maximumAge: 300000 });
  }
  async function scanMedicine(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8_000_000) { toast.error(t("error")); return; }
    setBusy("ocr");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["ara", "fra", "eng"]);
      try {
        const result = await worker.recognize(file);
        const lines = result.data.text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length >= 2);
        const known = medicines.find((medicine) => lines.some((line) => normalize(line).includes(normalize(medicine.latin.split(" ")[0])) || normalize(line).includes(normalize(medicine.name.split(" ")[0]))));
        setQuery(known ? language === "ar" ? known.name : known.latin : lines[0]?.slice(0, 100) || "");
        if (!lines.length) toast.error(t("error"));
      } finally { await worker.terminate(); }
    } catch { toast.error(t("error")); }
    finally { setBusy(""); }
  }
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; localStorage.setItem("dawa-theme", next ? "dark" : "light"); }
  function openModal(value: Modal) { setConsent(false); setCollectCode(""); setModal(value); }
  async function scanReservationQr(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8_000_000) { toast.error(t("error")); return; }
    try {
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(image, 0, 0);
        const { default: jsQR } = await import("jsqr");
        const decoded = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (!decoded || !/^DAWA:[0-9a-f-]{36}:DZ-[A-F0-9]{8}$/.test(decoded.data)) { toast.error(t("error")); return; }
        const [, reservation, code] = decoded.data.split(":");
        const booking = staffBookings.find((item) => item.id === reservation);
        if (!booking) { toast.error(t("error")); return; }
        setModal({ kind: "collect", booking }); setCollectCode(code);
      } finally { image.close(); }
    } catch { toast.error(t("error")); }
  }

  const selectedCity = cities.find((item) => item.id === city) || cities[0];
  const active = data.requests.find((item) => item.id === activeRequest);
  const replies = data.responses.filter((item) => item.request === activeRequest);
  const activeBookings = data.reservations.filter((item) => item.status === "active" && item.expires > now);
  const unread = data.notifications.filter((item) => !item.read).length;
  const latitude = position?.lat ?? selectedCity.lat, longitude = position?.lng ?? selectedCity.lng;
  const nearby = useMemo(() => data.pharmacies.filter((item) => item.city === city && (!night || item.duty)).map((item) => ({ ...item, distance: distanceMeters({ lat: latitude, lng: longitude }, item) })).sort((a, b) => a.distance - b.distance), [data.pharmacies, city, night, latitude, longitude]);
  const results = nearby.filter((item) => (!active || replies.some((reply) => reply.pharmacy === item.id)) && (!onlyAvailable || isFreshReply(replies.find((reply) => reply.pharmacy === item.id), now)));
  const seen = data.responses.filter((item) => item.request === activeRequest && isFreshReply(item, now)).length;
  const own = data.ownPharmacy;
  const staffRequests = own?.status === "approved" ? data.staffRequests.filter((item) => item.pharmacy === own.id) : [];
  const staffBookings = own?.status === "approved" ? data.staffBookings.filter((item) => item.pharmacy === own.id) : [];
  const selectedBooking = modal?.kind === "booking" ? data.reservations.find((item) => item.id === modal.booking.id) || modal.booking : null;
  const registrationSet = (key: keyof typeof registration, value: string) => setRegistration((previous) => ({ ...previous, [key]: value }));

  return <div className="app-shell">
    <a className="skip-link" href="#main">{t("search")}</a>
    <header className="topbar"><div className="topbar-inner"><button className="brand" onClick={() => navigate("search")} aria-label="DAWA"><img src="/brand/dawa-symbol.png" alt="" width="55" height="55" /><span><strong>دوائي<span className="brand-dot">.</span></strong><small>DAWA · ALGÉRIE</small></span></button><nav className="desktop-nav" aria-label="Primary"><button aria-current={view === "search" ? "page" : undefined} onClick={() => navigate("search")}>{t("search")}</button><button aria-current={view === "bookings" ? "page" : undefined} onClick={() => navigate("bookings")}>{t("bookings")}</button><button aria-current={view === "map" ? "page" : undefined} onClick={() => navigate("map")}>{t("map")}</button></nav><div className="header-actions"><label className="language-picker"><Globe2 /><select aria-label={t("language")} value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label><button className="icon-btn theme-button" onClick={toggleTheme} aria-label={t("theme")}>{dark ? <Sun /> : <Moon />}</button><button className="icon-btn notification-button" onClick={() => { setNotificationsOpen(true); if (unread) void mutate({ action: "read-notifications" }); }} aria-label={t("notifications")}><Bell />{unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}</button><button className="account-button" onClick={() => navigate("account")} aria-label={t("account")}><UserRound /></button></div></div></header>
    <div className="context-bar"><div className="context-inner"><span className="pilot-label"><span /> {t("pilot")}</span><span className="context-explainer">{t("pilotNote")}</span><div className="space-links"><button onClick={() => navigate("search")} className={!["pharmacy", "admin"].includes(view) ? "selected" : ""}><UserRound />{t("account")}</button><button onClick={() => navigate("pharmacy")} className={view === "pharmacy" ? "selected" : ""}><Store />{t("pharmacy")}</button>{data.role === "admin" && <button onClick={() => navigate("admin")} className={view === "admin" ? "selected" : ""}><ShieldCheck />{t("admin")}</button>}</div></div></div>
    {offline && <div className="connection-banner" role="status"><WifiOff />{t("offline")}</div>}
    <main id="main" className="main-layout">
      {signedOut && <div className="auth-banner"><div><strong>{t("signupInfo")}</strong><p>{t("adminOnly")}</p></div><div className="row"><Button asChild><a href="/signin-with-chatgpt?return_to=/" target="_top">{t("signup")}</a></Button><Button asChild variant="outline"><a href="/signin-with-chatgpt?return_to=/" target="_top">{t("login")}</a></Button></div></div>}
      {error && <div className="error-banner" role="alert">{error}<Button variant="outline" onClick={() => void load()}><RefreshCw />{t("retry")}</Button></div>}
      {view === "search" && <><div className="page-intro"><div className="intro-copy"><div className="overline"><span />DAWA DZ · CLICK & COLLECT</div><h1>{t("welcome")}</h1><p>{t("welcomeSub")}</p></div><span className="free-label"><ShieldCheck /><span>{t("free")}<strong>{t("pickupOnly")}</strong></span></span></div>
        <section className="search-panel" aria-label={t("searchHeading")}><div className="search-topline"><h2><Search />{t("searchHeading")}</h2><span>{t("noDelivery")}</span></div><form className="search-form" onSubmit={submitSearch}><div className="medicine-field"><label htmlFor="medicine">{t("medicine")}</label><div className="input-with-icon"><Search /><Input id="medicine" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder={t("medicinePlaceholder")} autoComplete="off" /></div></div><div><label htmlFor="search-city">{t("city")}</label><NativeSelect id="search-city" value={city} onChange={(event) => { setCity(event.target.value); setActiveRequest(null); }}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect></div><Button className="primary-search" type="submit" disabled={!!busy || signedOut || offline}><Search />{t("searchButton")}</Button></form><div className="search-foot"><span><ShieldCheck />{t("privacy")}</span><div className="row"><input ref={fileRef} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => void scanMedicine(event)} /><button type="button" disabled={!!busy} onClick={() => fileRef.current?.click()}><Camera />{busy === "ocr" ? t("scanning") : t("scanMedicine")}</button><button type="button" disabled={!!busy} onClick={locate}><LocateFixed />{t("location")}</button></div></div><p className="scan-hint">{t("scanHint")}</p></section>
        <div className="workspace-grid"><div className="results-column"><div className="results-heading"><div><h2>{active ? `${t("resultFor")} «${active.medicine}»` : t("nearby")}</h2><p>{cityName(city)} · {results.length}</p></div><button className="icon-btn" onClick={() => void load()} aria-label={t("refresh")}><RefreshCw className={loading ? "spin" : ""} /></button></div><div className="filters"><label className="filter-switch"><MoonStar />{t("night")}<Switch checked={night} onCheckedChange={setNight} /></label>{active && <button className={`filter-chip ${onlyAvailable ? "selected" : ""}`} onClick={() => setOnlyAvailable(!onlyAvailable)}><CheckCheck />{t("availableOnly")}</button>}<span className="sort-label">{t("closest")}</span></div>{active && <div className={`request-progress ${seen ? "confirmed" : ""}`}><Clock3 /><div><strong>{seen ? `${seen} · ${t("yes")}` : t("pending")}</strong><p>{t("reserveHelp")}</p></div></div>}
          <div className="pharmacy-list">{results.map((pharmacy, index) => { const reply = replies.find((item) => item.pharmacy === pharmacy.id), fresh = isFreshReply(reply, now), booking = data.reservations.find((item) => item.request === active?.id); return <article className="pharmacy-row" key={pharmacy.id}><div className={`store-avatar tone-${index % 3}`}><Store /></div><div className="pharmacy-info"><div className="pharmacy-title"><button onClick={() => openModal({ kind: "pharmacy", pharmacy })}>{pharmacy.name}</button>{!pharmacy.pilot && <span className="nearest">{t("registered")}</span>}</div><p><MapPin />{pharmacy.area} · {cityName(pharmacy.city)}</p><div className="pharmacy-tags"><span><Navigation />{localizedDistance(pharmacy.distance, language)} {t("approx")}</span><span className={pharmacy.duty ? "duty" : ""}>{pharmacy.duty ? <MoonStar /> : <Clock3 />}{pharmacy.duty ? t("night") : pharmacy.hours}</span>{pharmacy.pilot && <span>{t("demo")}</span>}</div></div><div className="pharmacy-action">{reply && <span className={`availability ${fresh ? "yes" : reply.status === "no" ? "no" : "pending"}`}>{fresh ? t("yes") : reply.status === "no" ? t("no") : reply.status === "yes" ? t("stale") : t("pending")}</span>}{fresh && !booking ? <Button onClick={() => openModal({ kind: "reserve", pharmacy })}>{t("reserve")}</Button> : booking?.pharmacy === pharmacy.id ? <Button variant="outline" onClick={() => openModal({ kind: "booking", booking })}>{t("details")}</Button> : <Button variant="outline" onClick={() => openModal({ kind: "pharmacy", pharmacy })}>{t("details")}</Button>}</div></article>; })}</div>{!results.length && <div className="panel empty-panel">{t("noResults")}</div>}<div className="result-footnote"><ShieldCheck />{t("pilotNote")}</div></div><aside className="support-column"><section className="night-card"><span className="night-icon"><MoonStar /></span><span className="card-eyebrow">DAWA DZ</span><h2>{t("night")}</h2><p>{t("pickupOnly")}</p><Button onClick={() => setNight(!night)}>{night ? t("nearby") : t("night")}</Button></section>{activeBookings[0] && <section className="mini-booking"><h3>{t("activeBookings")}</h3><strong>{activeBookings[0].medicine}</strong><p dir="ltr">{timeLeft(activeBookings[0].expires, now)}</p><Button variant="outline" onClick={() => openModal({ kind: "booking", booking: activeBookings[0] })}>{t("showQr")}</Button></section>}</aside></div>
      </>}
      {view === "bookings" && <><div className="page-heading"><div className="overline">DAWA DZ</div><h1>{t("bookings")}</h1><p>{t("welcomeSub")}</p></div><div className="portal-grid"><section className="panel"><h2>{t("activeBookings")} · {activeBookings.length}</h2><div className="item-stack">{activeBookings.length ? activeBookings.map((booking) => <article className="portal-item" key={booking.id}><div className="row between"><span className="badge success">{t("active")}</span><Clock3 /></div><h3>{booking.medicine}</h3><p>{data.pharmacies.find((item) => item.id === booking.pharmacy)?.name}</p><strong dir="ltr">{timeLeft(booking.expires, now)}</strong><Button variant="outline" onClick={() => openModal({ kind: "booking", booking })}>{t("showQr")}</Button></article>) : <p className="muted empty-copy">{t("noBookings")}</p>}</div></section><section className="panel"><h2>{t("mySearches")} · {data.requests.length}</h2><div className="item-stack">{data.requests.length ? data.requests.map((request) => <button className="portal-item item-button" key={request.id} onClick={() => { setQuery(request.medicine); setCity(request.city); setActiveRequest(request.id); setNight(false); navigate("search"); }}><strong>{request.medicine}</strong><small>{cityName(request.city)} · {new Date(request.created).toLocaleString(localeTag[language])}</small><span className="muted">{t("responses")}: {data.responses.filter((reply) => reply.request === request.id && reply.status !== "pending").length}</span></button>) : <p className="muted empty-copy">{t("noRequests")}</p>}</div><h3 className="history-title">{t("history")}</h3><div className="item-stack">{data.reservations.filter((booking) => booking.status !== "active" || booking.expires <= now).map((booking) => <article className="past-item" key={booking.id}><b>{booking.medicine}</b><span>{t(booking.expires <= now && booking.status === "active" ? "expired" : booking.status)}</span></article>)}</div></section></div></>}
      {view === "map" && <><div className="page-heading"><div className="overline">OPENSTREETMAP</div><h1>{t("mapTitle")}</h1><p>{t("mapDescription")}</p></div><div className="map-controls"><NativeSelect value={city} onChange={(event) => setCity(event.target.value)} aria-label={t("city")}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect><Button variant="outline" onClick={locate}><LocateFixed />{t("location")}</Button><label className="filter-switch"><MoonStar />{t("night")}<Switch checked={night} onCheckedChange={setNight} /></label></div><DawaMap city={city} pharmacies={nearby} position={position} onSelect={(pharmacy) => openModal({ kind: "pharmacy", pharmacy })} /><p className="map-credit">{t("mapsCredit")} · {t("pilotNote")}</p><div className="map-list">{nearby.map((pharmacy) => <button key={pharmacy.id} className="portal-item item-button" onClick={() => openModal({ kind: "pharmacy", pharmacy })}><strong>{pharmacy.name}</strong><span>{pharmacy.area} · {localizedDistance(pharmacy.distance, language)} {t("approx")}</span><small>{pharmacy.pilot ? t("demo") : t("registered")}</small></button>)}</div></>}
      {view === "account" && <><div className="page-heading"><div className="overline">DAWA DZ</div><h1>{t("accountHeading")}</h1><p>{t("privacy")}</p></div><div className="account-grid"><form className="panel account-form" onSubmit={async (event) => { event.preventDefault(); await mutate({ action: "profile", name: profileName, city }, t("save")); }}><span className="large-avatar"><UserRound /></span><h2>{t("account")}</h2><label htmlFor="profile-name">{t("name")}</label><Input id="profile-name" required minLength={2} maxLength={60} value={profileName} onChange={(event) => setProfileName(event.target.value)} /><label htmlFor="profile-city">{t("defaultCity")}</label><NativeSelect id="profile-city" value={city} onChange={(event) => setCity(event.target.value)}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect><Button type="submit" disabled={!!busy || signedOut}><Check />{t("save")}</Button></form><div className="account-side"><section className="panel"><ShieldCheck /><h2>{t("privacy")}</h2><p>{t("pickupOnly")} · {t("noDelivery")}</p></section><section className="panel setting-panel"><span>{t("theme")}</span><Switch checked={dark} onCheckedChange={toggleTheme} /></section><section className="panel setting-panel"><span>{t("language")}</span><NativeSelect value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t("language")}><NativeSelectOption value="ar">العربية</NativeSelectOption><NativeSelectOption value="fr">Français</NativeSelectOption><NativeSelectOption value="en">English</NativeSelectOption></NativeSelect></section>{!signedOut && <a className="signout-link" href="/signout-with-chatgpt?return_to=/" target="_top">{t("logout")}</a>}</div></div></>}
      {view === "pharmacy" && <><div className="page-heading"><div className="overline">DAWA DZ · PHARMACY</div><h1>{own?.status === "approved" ? t("pharmacyTitle") : t("joinTitle")}</h1><p>{own?.status === "approved" ? t("pharmacySub") : t("joinSub")}</p></div>
        {own?.status === "approved" ? <><div className="staff-summary"><div><span className="square-icon"><Bell /></span><span>{t("inbox")}<strong>{staffRequests.length}</strong></span></div><div><span className="square-icon"><BookmarkCheck /></span><span>{t("pickup")}<strong>{staffBookings.length}</strong></span></div><label className="staff-duty"><span className="square-icon"><MoonStar /></span><span>{t("duty")}</span><Switch checked={!!own.duty} disabled={!!busy} onCheckedChange={(enabled) => void mutate({ action: "duty", pharmacy: own.id, enabled }, t("save"))} /></label></div><div className="portal-grid"><section className="panel"><h2>{t("inbox")}</h2><div className="item-stack">{staffRequests.length ? staffRequests.map((request) => <article className="portal-item" key={request.id}><h3>{request.medicine}</h3><p>{cityName(request.city)} · {new Date(request.created).toLocaleTimeString(localeTag[language])}</p><div className="row"><Button disabled={!!busy} onClick={() => void mutate({ action: "reply", request: request.id, pharmacy: own.id, available: true }, t("yes"))}><Check />{t("markYes")}</Button><Button variant="outline" disabled={!!busy} onClick={() => void mutate({ action: "reply", request: request.id, pharmacy: own.id, available: false }, t("no"))}><X />{t("markNo")}</Button></div></article>) : <p className="muted empty-copy">{t("noInbox")}</p>}</div></section><section className="panel"><h2>{t("pickup")}</h2><div className="item-stack">{staffBookings.length ? staffBookings.map((booking) => <article className="portal-item" key={booking.id}><h3>{booking.medicine}</h3><p>{t("timeLeft")}: <b dir="ltr">{timeLeft(booking.expires, now)}</b></p><Button variant="outline" onClick={() => openModal({ kind: "collect", booking })}><FileCheck2 />{t("verify")}</Button></article>) : <p className="muted empty-copy">{t("noBookings")}</p>}</div></section></div><section className="panel stock-panel"><div><h2>{t("stock")}</h2><p className="muted">{t("stockHelp")}</p></div><form className="stock-form" onSubmit={async (event) => { event.preventDefault(); const result = await mutate({ action: "stock-upsert", pharmacy: own.id, name: stockName.trim(), quantity: Number(stockQuantity) }, t("save")); if (result) { setStockName(""); setStockQuantity("1"); } }}><label>{t("medicine")}<Input value={stockName} required minLength={2} maxLength={100} onChange={(event) => setStockName(event.target.value)} /></label><label>{t("quantity")}<Input type="number" min="0" max="9999" required value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} /></label><Button type="submit" disabled={!!busy}><Package />{t("addStock")}</Button></form><div className="stock-list">{data.stock.length ? data.stock.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{t("stockUpdated")}: {new Date(item.updated).toLocaleString(localeTag[language])}</small></div><b>{item.quantity}</b><button className="icon-btn" aria-label={t("remove")} onClick={() => void mutate({ action: "stock-delete", pharmacy: own.id, item: item.id }, t("remove"))}><Trash2 /></button></article>) : <p className="muted empty-copy">{t("noStock")}</p>}</div></section></> : <div className="portal-grid"><form className="panel registration-form" onSubmit={async (event) => { event.preventDefault(); await mutate({ action: "register-pharmacy", name: registration.name.trim(), address: registration.address.trim(), city: registration.city, phone: registration.phone, license: registration.license.trim(), latitude: Number(registration.latitude), longitude: Number(registration.longitude) }, t("submitApplication")); }}><h2>{t("joinTitle")}</h2><label>{t("pharmacyName")}<Input required minLength={3} maxLength={100} value={registration.name} onChange={(event) => registrationSet("name", event.target.value)} /></label><label>{t("address")}<Input required minLength={8} maxLength={160} value={registration.address} onChange={(event) => registrationSet("address", event.target.value)} /></label><label>{t("city")}<NativeSelect value={registration.city} onChange={(event) => registrationSet("city", event.target.value)}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect></label><label>{t("phone")}<Input type="tel" inputMode="tel" pattern="0[0-9]{8,9}" required value={registration.phone} onChange={(event) => registrationSet("phone", event.target.value)} /></label><label>{t("license")}<Input required minLength={5} maxLength={100} value={registration.license} onChange={(event) => registrationSet("license", event.target.value)} /></label><div className="row between"><strong>{t("coordinates")}</strong><Button type="button" variant="outline" onClick={() => { if (!navigator.geolocation) { toast.error(t("error")); return; } navigator.geolocation.getCurrentPosition(({ coords }) => setRegistration((old) => ({ ...old, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) })), () => toast.error(t("error"))); }}><LocateFixed />{t("getCoordinates")}</Button></div><div className="coordinates"><Input required type="number" min="18.9" max="38" step="any" aria-label="Latitude" placeholder="Latitude" value={registration.latitude} onChange={(event) => registrationSet("latitude", event.target.value)} /><Input required type="number" min="-9" max="12" step="any" aria-label="Longitude" placeholder="Longitude" value={registration.longitude} onChange={(event) => registrationSet("longitude", event.target.value)} /></div><Button type="submit" disabled={!!busy || signedOut || own?.status === "suspended"}>{t("submitApplication")}</Button></form><aside className="panel join-aside"><Store /><h2>{own?.status === "pending" ? t("applicationPending") : own?.status === "rejected" ? t("applicationRejected") : own?.status === "suspended" ? t("applicationSuspended") : t("joinSub")}</h2><p>{t("pickupOnly")}</p><p>{t("stockHelp")}</p></aside></div>}
      </>}
      {view === "admin" && (data.role === "admin" && data.admin ? <><div className="page-heading"><div className="overline">DAWA DZ · OPERATIONS</div><h1>{t("adminTitle")}</h1><p>{t("adminSub")}</p></div><div className="admin-stats"><article><UserRound /><span>{t("users")}</span><strong>{data.admin.users}</strong></article><article><Search /><span>{t("searches")}</span><strong>{data.admin.searches}</strong></article><article><BookmarkCheck /><span>{t("reservations")}</span><strong>{data.admin.bookings}</strong></article><article><Store /><span>{t("applications")}</span><strong>{data.admin.applications.length}</strong></article></div><section className="panel"><h2>{t("applications")}</h2><div className="item-stack">{data.admin.applications.length ? data.admin.applications.map((application) => <article className="admin-application" key={application.id}><div><h3>{application.name}</h3><p>{application.address} · {cityName(application.city)}</p><p dir="ltr">{application.phone} · {application.license}</p><small>{t("coordinates")}: {application.latitude / 1e6}, {application.longitude / 1e6}</small></div><span className={`badge ${application.status === "approved" ? "success" : "neutral"}`}>{application.status === "approved" ? t("approved") : application.status === "pending" ? t("applicationPending") : application.status === "rejected" ? t("applicationRejected") : t("applicationSuspended")}</span><div className="row"><Button disabled={!!busy || application.status === "approved"} onClick={() => void mutate({ action: "admin-review", pharmacy: application.id, status: "approved" }, t("approve"))}>{application.status === "suspended" ? t("reactivate") : t("approve")}</Button>{application.status === "pending" && <Button variant="outline" disabled={!!busy} onClick={() => void mutate({ action: "admin-review", pharmacy: application.id, status: "rejected" }, t("reject"))}>{t("reject")}</Button>}{application.status === "approved" && <Button variant="outline" disabled={!!busy} onClick={() => void mutate({ action: "admin-review", pharmacy: application.id, status: "suspended" }, t("suspend"))}>{t("suspend")}</Button>}</div></article>) : <p className="muted empty-copy">{t("noApplications")}</p>}</div></section></> : <div className="panel empty-panel">{t("adminOnly")}</div>)}
      <footer className="footer"><span>DAWA DZ · ALGÉRIE</span><span>{t("pickupOnly")} · {t("noDelivery")}</span></footer>
    </main>
    <nav className="mobile-navigation" aria-label="Navigation">{(["search", "bookings", "map", "account"] as const).map((item) => { const Icon = item === "search" ? Search : item === "bookings" ? BookmarkCheck : item === "map" ? MapPin : UserRound; return <button key={item} aria-current={view === item ? "page" : undefined} onClick={() => navigate(item)}><Icon /><span>{t(item)}</span></button>; })}</nav>
    <Dialog open={!!modal} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="app-dialog" dir={language === "ar" ? "rtl" : "ltr"} showCloseButton={false}><button className="dialog-close icon-btn" onClick={() => setModal(null)} aria-label={t("close")}><X /></button>
      {modal?.kind === "reserve" && active && <><span className="dialog-symbol"><BookmarkCheck /></span><DialogTitle>{t("reserveTitle")}</DialogTitle><DialogDescription>{t("reserveHelp")}</DialogDescription><div className="reservation-summary"><strong>{active.medicine}</strong><span>{modal.pharmacy.name} · {modal.pharmacy.area}</span><div><Clock3 />{t("pickupOnly")}</div></div>{modal.pharmacy.pilot && <p className="soft-note">{t("demoDisclaimer")}</p>}<label className="consent"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} /><span>{t("prescription")}</span></label><Button disabled={!consent || !!busy} onClick={async () => { const result = await mutate({ action: "reserve", request: active.id, pharmacy: modal.pharmacy.id, consent: true }, t("active")); const booking = result?.reservations.find((item) => item.request === active.id); if (booking) setModal({ kind: "booking", booking }); }}><Check />{t("confirm")}</Button></>}
      {modal?.kind === "booking" && selectedBooking && <><span className="dialog-symbol"><QrCode /></span><DialogTitle>{t("showQr")}</DialogTitle><DialogDescription>{selectedBooking.medicine} · {data.pharmacies.find((item) => item.id === selectedBooking.pharmacy)?.name}</DialogDescription><span className={`badge ${selectedBooking.status === "active" && selectedBooking.expires > now ? "success" : "neutral"}`}>{t(selectedBooking.status === "active" && selectedBooking.expires <= now ? "expired" : selectedBooking.status)}</span><div className="ticket"><BookingQr reservation={selectedBooking.id} code={selectedBooking.code} label={t("showQr")} /><span>{t("pickupCode")}</span><strong dir="ltr">{selectedBooking.code}</strong><button className="text-link" onClick={() => void navigator.clipboard.writeText(selectedBooking.code).then(() => toast.success(t("copy"))).catch(() => toast.info(selectedBooking.code))}><Copy />{t("copy")}</button>{selectedBooking.status === "active" && <div className="ticket-timer"><Clock3 />{t("timeLeft")}<b dir="ltr">{timeLeft(selectedBooking.expires, now)}</b></div>}</div><p className="muted">{t("prescription")} · {t("pickupOnly")}</p>{selectedBooking.status === "active" && selectedBooking.expires > now && <Button variant="outline" onClick={async () => { if (!window.confirm(t("cancelQuestion"))) return; const result = await mutate({ action: "cancel", reservation: selectedBooking.id }, t("cancelled")); if (result) setModal(null); }}>{t("cancelBooking")}</Button>}</>}
      {modal?.kind === "pharmacy" && <><span className="dialog-symbol"><Store /></span><DialogTitle>{modal.pharmacy.name}</DialogTitle><DialogDescription>{modal.pharmacy.area} · {cityName(modal.pharmacy.city)}</DialogDescription><div className="pharmacy-modal-details"><span><MapPin />{localizedDistance(modal.pharmacy.distance, language)} {t("approx")}</span><span><Clock3 />{modal.pharmacy.hours}</span><span><ShieldCheck />{t("pickupOnly")}</span></div><p className="soft-note">{modal.pharmacy.pilot ? t("demoDisclaimer") : t("exactDisclaimer")}</p>{!modal.pharmacy.pilot && <div className="row">{modal.pharmacy.phone && <Button asChild variant="outline"><a href={`tel:${modal.pharmacy.phone}`}>{t("phone")}</a></Button>}<Button asChild><a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${modal.pharmacy.lat},${modal.pharmacy.lng}`}><Navigation />{t("route")}</a></Button></div>}</>}
      {modal?.kind === "collect" && <form className="collect-form" onSubmit={async (event) => { event.preventDefault(); const result = await mutate({ action: "collect", reservation: modal.booking.id, pharmacy: modal.booking.pharmacy, code: collectCode.trim().toUpperCase(), checked: consent }, t("collected")); if (result) setModal(null); }}><span className="dialog-symbol"><FileCheck2 /></span><DialogTitle>{t("verify")}</DialogTitle><DialogDescription>{modal.booking.medicine} · {t("pickupOnly")}</DialogDescription><label htmlFor="collection-code">{t("pickupCode")}</label><Input id="collection-code" dir="ltr" required placeholder="DZ-XXXXXXXX" maxLength={11} value={collectCode} onChange={(event) => setCollectCode(event.target.value)} /><input className="visually-hidden" ref={qrFileRef} type="file" accept="image/*" capture="environment" onChange={(event) => void scanReservationQr(event)} /><Button type="button" variant="outline" onClick={() => qrFileRef.current?.click()}><Camera />{t("scanQr")}</Button><label className="consent"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} /><span>{t("verifyPrescription")}</span></label><Button type="submit" disabled={!consent || collectCode.trim().length !== 11 || !!busy}><Check />{t("confirm")}</Button></form>}
    </DialogContent></Dialog>
    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}><DialogContent className="app-dialog" dir={language === "ar" ? "rtl" : "ltr"} showCloseButton={false}><button className="dialog-close icon-btn" onClick={() => setNotificationsOpen(false)} aria-label={t("close")}><X /></button><DialogTitle>{t("notifications")}</DialogTitle><DialogDescription>{t("notifications")}</DialogDescription><div className="notice-list">{data.notifications.length ? data.notifications.map((notice) => <article key={notice.id}><span className="square-icon"><Bell /></span><div><p>{language === "ar" ? notice.title : notice.title.startsWith("طلب توفر جديد") ? t("inbox") : t("notifications")}</p><small>{new Date(notice.created).toLocaleString(localeTag[language])}</small></div></article>) : <p className="muted">{t("noNotifications")}</p>}</div></DialogContent></Dialog>
    <Toaster position="top-center" dir={language === "ar" ? "rtl" : "ltr"} theme={dark ? "dark" : "light"} richColors />
  </div>;
}

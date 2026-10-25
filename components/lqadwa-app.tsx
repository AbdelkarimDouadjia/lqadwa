"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Bell, BookmarkCheck, Camera, Check, CheckCheck, Clock3, Copy, FileCheck2, LocateFixed, MapPin, MoonStar, Navigation, QrCode, RefreshCw, Search, ShieldCheck, Store, UserRound, WifiOff, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileDetails } from "@/components/profile-details";
import { LandingPage } from "@/components/landing-page";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InventoryWorkspace } from "@/components/inventory-workspace";
import { ClientTracker } from "@/components/client-tracker";
import { ClientFilters } from "@/components/client-filters";
import { PreferencesPanel,usePreferences } from "@/components/preferences";
import { filterPharmacies } from "@/lib/experience";
import { ex } from "@/lib/experience-copy";
import { Heart } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DawaMap } from "@/components/dawa-map";
import { RouteNavigator } from "@/components/route-navigator";
import { AppInstall } from "@/components/app-install";
import { PrescriptionScan } from "@/components/prescription-scan";
import { DeviceSecurity } from "@/components/device-security";
import { AdminControls, AdminIdentity } from "@/components/admin-controls";
import { AdminManagement } from "@/components/admin-management";
import { AdminEditorLauncher } from "@/components/admin-editor-launcher";
import { BookingQr } from "@/components/booking-qr";
import { cities, distanceLabel, timeLeft, isFreshReply, type AppData, type Booking, type Pharmacy, type StaffBooking } from "@/lib/domain";
import { tr, type Language, type TranslationKey } from "@/lib/i18n";
import { emptyLandingContent, type LandingContent } from "@/lib/landing-content";

import { workspaceNavigation, workspaceView, canSubmitPharmacy, type View } from "@/lib/workspace";
type Modal = { kind: "reserve"; pharmacy: Pharmacy } | { kind: "booking"; booking: Booking } | { kind: "pharmacy"; pharmacy: Pharmacy } | { kind: "collect"; booking: StaffBooking } | null;
const blank: AppData = { profile: { name: "", city: "algiers" }, pharmacies: [], requests: [], responses: [], reservations: [], notifications: [], role: "client", ownPharmacy: null, staffRequests: [], staffBookings: [], stock: [], admin: null };
const localeTag = { ar: "ar-DZ", fr: "fr-DZ", en: "en-DZ", kab: "fr-DZ" };
type CatalogEntry = { name: string; brand: string; dose: string; ingredient: string; registration: string };
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180, deltaLat = (a.lat - b.lat) * rad, deltaLng = (a.lng - b.lng) * rad;
  const arc = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(12_742_000 * Math.asin(Math.sqrt(arc)));
}
function localizedDistance(meters: number, language: Language) { return language === "ar" ? distanceLabel(meters) : meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`; }
export default function HomePage({ initialView = "search", initialLandingContent }: { initialView?: View; initialLandingContent?: LandingContent }) {
  const [language, setLanguage] = useState<Language>("ar");
  const [requestedView, setView] = useState<View>(initialView);
  const [data, setData] = useState<AppData>(blank);
  const preferences=usePreferences(data.profile.id);
  const [pharmacyQuery,setPharmacyQuery]=useState(""),[savedOnly,setSavedOnly]=useState(false);
  const [signedOut, setSignedOut] = useState(true);
  const view = workspaceView(requestedView, data.role, signedOut);
  const navigation = workspaceNavigation(data.role);
  const [pharmacyTab, setPharmacyTab] = useState<"inbox" | "pickup" | "stock">("inbox");
  const [appMode, setAppMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [dark, setDark] = useState(false);
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogNotice, setCatalogNotice] = useState(false);
  const [catalogVerified, setCatalogVerified] = useState(false);
  const [city, setCity] = useState("algiers");
  const [night, setNight] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [mapTracking, setMapTracking] = useState(false);
  const mapWatch = useRef<number | null>(null);
  const locationEpoch = useRef(0);
  const [modal, setModal] = useState<Modal>(null);
  const [consent, setConsent] = useState(false);
  const [collectCode, setCollectCode] = useState("");
  const [registration, setRegistration] = useState({ name: "", address: "", phone: "", license: "", city: "algiers", latitude: "", longitude: "" });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sharingBooking, setSharingBooking] = useState<string | null>(null);
  const latest = useRef(0), inFlight = useRef(false), first = useRef(true), inviteClaimed = useRef(false), qrFileRef = useRef<HTMLInputElement>(null);
  const tripWatch = useRef<number | null>(null), tripBooking = useRef<string | null>(null), tripLastSent = useRef(0);
  const t = useCallback((key: TranslationKey) => tr(language, key), [language]);
  const cityName = useCallback((id: string) => { const found = cities.find((item) => item.id === id); return found ? language === "ar" ? found.name : found.latin : id; }, [language]);

  const navigate = useCallback((next: View) => { setModal(null); setNotificationsOpen(false); setView(next); window.location.hash = next; window.scrollTo({ top: 0, behavior: "instant" }); }, [setModal, setNotificationsOpen]);
  const load = useCallback(async () => {
    if (inFlight.current) return;
    const sequence = ++latest.current;
    try {
      const response = await fetch("/api/app", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const result = await response.json() as AppData & { error?: string };
      if (sequence !== latest.current) return;
      if ([401,403,410].includes(response.status)) { setData(blank); setModal(null); setPosition(null); setNotificationsOpen(false); setSignedOut(true); first.current = true; setLoading(false); setError(response.status === 403 ? tr(language, "applicationSuspended") : response.status === 410 ? tr(language, "signInRequired") : ""); return; }
      if (!response.ok) throw new Error(result.error || "Load failed");
      setData(result); setSignedOut(false); setError("");
      if (first.current) {
        setCity(result.profile.city);
        if (result.ownPharmacy) setRegistration({ name: result.ownPharmacy.name, address: result.ownPharmacy.address, phone: result.ownPharmacy.phone, license: result.ownPharmacy.license, city: result.ownPharmacy.city, latitude: String(result.ownPharmacy.latitude / 1e6), longitude: String(result.ownPharmacy.longitude / 1e6) });
        first.current = false;
      }
    } catch { if (sequence === latest.current) setError(tr(language, "error")); }
    finally { if (sequence === latest.current) setLoading(false); }
  }, [language, setModal, setNotificationsOpen]);
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    queueMicrotask(() => setAppMode(new URLSearchParams(window.location.search).get("app") === "1" || window.matchMedia("(display-mode: standalone)").matches));
    const invite = new URLSearchParams(window.location.search).get("admin_invite");
    if (invite) sessionStorage.setItem("dawa-admin-invite", invite);
    const stored = localStorage.getItem("dawa-language");
    if (stored === "ar" || stored === "fr" || stored === "en" || stored === "kab") queueMicrotask(() => setLanguage(stored));
    const preferred = localStorage.getItem("dawa-theme") === "dark";
    queueMicrotask(() => setDark(preferred)); document.documentElement.dataset.theme = preferred ? "dark" : "light";
    const hash = () => { const next = window.location.hash.slice(1) || new URLSearchParams(window.location.search).get("space") || initialView; if (["search", "bookings", "map", "account", "pharmacy", "admin"].includes(next)) setView(next as View); };
    queueMicrotask(hash); window.addEventListener("hashchange", hash);
    const connection = () => setOffline(!navigator.onLine);
    queueMicrotask(connection); window.addEventListener("online", connection); window.addEventListener("offline", connection);
    return () => { window.removeEventListener("hashchange", hash); window.removeEventListener("online", connection); window.removeEventListener("offline", connection); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = `${t(view === "search" ? "welcome" : view)} | LQADWA`;
    localStorage.setItem("dawa-language", language);
  }, [language, t, view]);
  useEffect(() => {
    if (loading) return;
    let active = true;
    queueMicrotask(() => { if (active) { setModal(null); setNotificationsOpen(false); setBusy(previous => previous === "location" ? "" : previous); } });
    document.getElementById("main")?.focus({ preventScroll: true });
    if (!signedOut && requestedView !== view) window.history.replaceState(null, "", window.location.pathname + window.location.search + "#" + view);
    return () => { active = false; };
  }, [loading, view, data.role, data.ownPharmacy?.status, signedOut]);
  useEffect(() => {
    if (query.trim().length < 2) { queueMicrotask(() => setCatalog([])); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try { const response = await fetch(`/api/medicines?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal }); const result = await response.json() as { items: CatalogEntry[] }; setCatalog(result.items); }
      catch { if (!controller.signal.aborted) setCatalog([]); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = preferences.value.refresh && !signedOut ? window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) void load(); }, preferences.value.refresh*1000) : undefined;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearInterval(clock); };
  }, [load,preferences.value.refresh,signedOut]);
  useEffect(() => {
    if (loading || signedOut || inviteClaimed.current) return;
    const token = sessionStorage.getItem("dawa-admin-invite");
    if (!token) return;
    inviteClaimed.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin-invite-redeem", token }) });
        const result = await response.json() as AppData & { error?: string };
        if (!response.ok) throw new Error(result.error || t("error"));
        setData(result); toast.success(t("inviteAccepted")); navigate("admin");
      } catch (cause) { toast.error(cause instanceof Error ? cause.message : t("error")); }
      finally { sessionStorage.removeItem("dawa-admin-invite"); window.history.replaceState(null, "", window.location.pathname + window.location.hash); }
    })();
  }, [loading, signedOut, t, navigate]);
  useEffect(() => {
    type Context = { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void };
    const context = (document as Document & { modelContext?: Context }).modelContext;
    if (!context) return;
    const controller = new AbortController();
    const sections: View[] = signedOut ? ["search", "pharmacy"] : workspaceNavigation(data.role);
    try { context.registerTool({ name: "view_dawa_section", description: "Navigate to a visible LQADWA section without submitting medicine or reservation data.", inputSchema: { type: "object", properties: { section: { enum: sections } }, required: ["section"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: { section: View }) => { if (!sections.includes(input.section)) throw new Error("Invalid section"); navigate(input.section); return { section: input.section }; } }, { signal: controller.signal }); } catch { /* Optional browser integration. */ }
    return () => controller.abort();
  }, [navigate, data.role, signedOut]);

  async function mutate(action: Record<string, unknown>, success = "") {
    if (signedOut) { toast.error(t("signInRequired")); return null; }
    if (inFlight.current) return null;
    inFlight.current = true; ++latest.current; setBusy(String(action.action));
    try {
      const response = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": language }, body: JSON.stringify(action) });
      const result = await response.json() as AppData & { error?: string };
      if ([401, 403, 410].includes(response.status)) { if (response.status !== 403) { setSignedOut(true); setData(blank); setModal(null); setPosition(null); setNotificationsOpen(false); first.current = true; } else { queueMicrotask(() => void load()); } throw new Error(response.status === 401 ? t("login") : t("error")); }
      if (!response.ok) throw new Error(language === "ar" ? result.error || t("error") : t("error"));
      setData(result); setError(""); if (success) toast.success(success); return result;
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : t("error")); return null; }
    finally { inFlight.current = false; setBusy(""); setLoading(false); }
  }
  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { toast.error(t("medicine")); return; }
    const token = crypto.randomUUID();
    const result = await mutate({ action: "search", medicine: query.trim(), city, night, demo: false, token }, t("waitResponse"));
    if (result) { setActiveRequest(token); setOnlyAvailable(false); }
  }
  function locate() {
    if (signedOut || !navigator.geolocation) { toast.error(t("error")); return; }
    const epoch = locationEpoch.current;
    if (view === "map") {
      if (mapWatch.current !== null) { navigator.geolocation.clearWatch(mapWatch.current); mapWatch.current = null; setMapTracking(false); return; }
      setMapTracking(true);
      mapWatch.current = navigator.geolocation.watchPosition(({coords})=>{
        if (epoch !== locationEpoch.current) return;
        setPosition({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
      },()=>{if(mapWatch.current!==null)navigator.geolocation.clearWatch(mapWatch.current);mapWatch.current=null;setMapTracking(false);toast.error(t("routeError"));},{enableHighAccuracy:true,timeout:15000,maximumAge:5000});
      return;
    }
    setBusy("location");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (epoch !== locationEpoch.current) return;
      const point = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }; setPosition(point);
      const closest = [...cities].sort((a, b) => distanceMeters(a, point) - distanceMeters(b, point))[0];
      setCity(closest.id); setBusy(""); toast.success(`${t("location")}: ${cityName(closest.id)}`);
    }, () => { setBusy(""); toast.error(t("error")); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  }
  useEffect(() => {
    const stop = () => { if(mapWatch.current!==null)navigator.geolocation.clearWatch(mapWatch.current);mapWatch.current=null;setMapTracking(false); };
    const pause = () => { if(document.visibilityState === "hidden")stop(); };
    document.addEventListener("visibilitychange",pause);
    if(view!=="map" || signedOut)stop();
    return ()=>{locationEpoch.current++; document.removeEventListener("visibilitychange",pause);stop();};
  }, [view, signedOut]);
  function stopTrip() {
    if (tripWatch.current !== null) navigator.geolocation.clearWatch(tripWatch.current);
    tripWatch.current = null;
    const reservation = tripBooking.current;
    tripBooking.current = null; setSharingBooking(null);
    if (reservation) void fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share-location", reservation, enabled: false }), keepalive: true }).catch(() => {});
  }
  function startTrip(booking: Booking) {
    if (!navigator.geolocation) { toast.error(t("error")); return; }
    if (tripWatch.current !== null) stopTrip();
    tripBooking.current = booking.id; setSharingBooking(booking.id); tripLastSent.current = 0;
    tripWatch.current = navigator.geolocation.watchPosition(async ({ coords }) => {
      if (tripBooking.current !== booking.id || Date.now() - tripLastSent.current < 15_000) return;
      tripLastSent.current = Date.now();
      try {
        const response = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share-location", reservation: booking.id, enabled: true, latitude: coords.latitude, longitude: coords.longitude }) });
        if (!response.ok) throw new Error();
      } catch { toast.error(t("error")); stopTrip(); }
    }, () => { toast.error(t("error")); stopTrip(); }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10_000 });
  }
  useEffect(() => {
    const pause = () => { if (document.visibilityState === "hidden") stopTrip(); };
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("pagehide", stopTrip);
    return () => { document.removeEventListener("visibilitychange", pause); window.removeEventListener("pagehide", stopTrip); stopTrip(); };
  }, []);
  useEffect(() => { if (sharingBooking && !data.reservations.some((booking) => booking.id === sharingBooking && booking.status === "active" && booking.expires > now)) queueMicrotask(stopTrip); }, [sharingBooking, data.reservations, now]);
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? "dark" : "light"; localStorage.setItem("dawa-theme", next ? "dark" : "light"); }
  function openModal(value: Modal) { setConsent(false); setCollectCode(""); setModal(value); }
  async function scanReservationQr(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || data.ownPharmacy?.status !== "approved") return;
    const epoch = locationEpoch.current;
    if (!file.type.startsWith("image/") || file.size > 8_000_000) { toast.error(t("error")); return; }
    try {
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas"); const scale = Math.min(1, 2000 / Math.max(image.width, image.height)); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const { default: jsQR } = await import("jsqr");
        const decoded = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (!decoded || !/^DAWA:[0-9a-f-]{36}:DZ-[A-F0-9]{8}$/.test(decoded.data)) { toast.error(t("error")); return; }
        const [, reservation, code] = decoded.data.split(":");
        const booking = staffBookings.find((item) => item.id === reservation);
        if (epoch !== locationEpoch.current) return;
        if (!booking || booking.expires <= Date.now()) { toast.error(t("expired")); return; }
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
  const nearby = useMemo(() => filterPharmacies(data.pharmacies.filter((item) => item.city === city && !item.pilot && (!night || item.duty)).map((item) => ({ ...item, distance: distanceMeters({ lat: latitude, lng: longitude }, item) })),{radius:preferences.value.radius,query:pharmacyQuery,savedOnly},preferences.value.favorites), [data.pharmacies, city, night, latitude, longitude,preferences.value.radius,preferences.value.favorites,pharmacyQuery,savedOnly]);
  const results = nearby.filter((item) => (!active || replies.some((reply) => reply.pharmacy === item.id)) && (!onlyAvailable || isFreshReply(replies.find((reply) => reply.pharmacy === item.id), now)));
  const seen = data.responses.filter((item) => item.request === activeRequest && isFreshReply(item, now)).length;
  const own = data.ownPharmacy;
  const staffRequests = own?.status === "approved" ? data.staffRequests.filter((item) => item.pharmacy === own.id) : [];
  const staffBookings = own?.status === "approved" ? data.staffBookings.filter((item) => item.pharmacy === own.id && item.status === "active" && item.expires > now) : [];
  const approaching = staffBookings.filter(b => b.approachLat != null && b.approachLng != null && (b.approachUpdated || 0) > now - 60_000);
  const selectedBooking = modal?.kind === "booking" ? data.reservations.find((item) => item.id === modal.booking.id) || null : null;
  const registrationSet = (key: keyof typeof registration, value: string) => setRegistration((previous) => ({ ...previous, [key]: value }));

  if (error && signedOut && loading === false) return <main className="auth-page"><section className="auth-card"><h1>{t("error")}</h1><p role="alert">{error}</p><Button onClick={() => void load()}>{t("retry")}</Button><a href="/login">{t("login")}</a><a href="/privacy">{t("privacy")}</a></section></main>;
  if (loading && !error) return <div className="startup-screen" role="status"><img src="/brand/luqya.png" alt="" width="104" height="104" /><strong>LQADWA</strong><p>{t("loadingApp")}</p><span className="startup-loader" /></div>;
  return <div className={`app-shell${signedOut ? " is-signed-out" : ""}${appMode ? " app-mode" : ""}`}>
    <a className="skip-link" href="#main">{t(view)}</a>
    <SiteHeader signedOut={signedOut} role={data.role} view={view} language={language} dark={dark} name={data.profile.name} unread={unread} navigate={navigate} onLanguage={setLanguage} onTheme={toggleTheme} onNotifications={()=>{setNotificationsOpen(true);if(unread)void mutate({action:"read-notifications"});}}/>
    {!signedOut && <div className="context-bar"><div className="context-inner"><span className="service-label"><span />{t(data.role === "admin" ? "adminTitle" : data.role === "pharmacist" ? "pharmacyTitle" : "patientSpace")}</span><span className="context-explainer">{t("pickupOnly")}</span></div></div>}
    {offline && <div className="connection-banner" role="status"><WifiOff />{t("offline")}</div>}
    <main id="main" tabIndex={-1} className="main-layout">
      {!signedOut && data.service && (data.service.requests_paused || data.service.pickups_paused || data.service.message) ? <aside className="service-banner" role="status"><strong>{language === "ar" ? "تنبيه الخدمة" : language === "fr" ? "Information du service" : language === "kab" ? "Talɣut n umeẓlu" : "Service notice"}</strong>{data.service.message && <p>{data.service.message}</p>}{!!data.service.requests_paused && <p>{language === "ar" ? "الطلبات والحجوزات الجديدة متوقفة مؤقتاً. يمكنك إدارة حسابك وإلغاء حجوزاتك الحالية." : language === "fr" ? "Nouvelles demandes et réservations suspendues. Votre compte et les annulations restent disponibles." : language === "kab" ? "Tuttriwin timaynutin ttwaḥebsent. Amiḍan-ik yeqqim yeldi." : "New requests and reservations are temporarily paused. Account access and cancellation remain available."}</p>}{!!data.service.pickups_paused && <p>{language === "ar" ? "تأكيد الاستلام متوقف مؤقتاً. تواصل مع الصيدلية أو الدعم." : language === "fr" ? "Confirmation de retrait suspendue. Contactez la pharmacie ou le support." : language === "kab" ? "Asentem n uḥraz yeḥbes. Nermes tasaymit." : "Pickup confirmation is paused. Contact the pharmacy or support."}</p>}</aside> : null}
      {signedOut && <LandingPage language={language} content={initialLandingContent ?? emptyLandingContent} />}
      {(!signedOut && view === "pharmacy" && !own) && <div className="pricing-strip"><div><span>{t("free")}</span><strong>{t("alwaysFreePatient")}</strong></div><div><del>300 {language === "ar" ? "دج/شهر" : language === "kab" ? "DA/aggur" : language === "fr" ? "DA/mois" : "DA/month"}</del><strong>{language === "ar" ? "باطل" : language === "kab" ? "Baṭel" : language === "fr" ? "Gratuit" : "Free"}</strong><small>{t("freeUntil")} · {t("pharmacistPrice")}</small></div></div>}
      {error && <div className="error-banner" role="alert">{error}<Button variant="outline" onClick={() => void load()}><RefreshCw />{t("retry")}</Button></div>}
      {!signedOut && view === "search" && <><div className="page-intro"><div className="intro-copy"><div className="overline"><span />LQADWA · CLICK & COLLECT</div><h1>{t("welcome")}</h1><p>{t("welcomeSub")}</p></div><span className="free-label"><ShieldCheck /><span>{t("free")}<strong>{t("pickupOnly")}</strong></span></span></div>
        <section className="search-panel" aria-label={t("searchHeading")}>
          <div className="search-topline"><h2><Search />{t("searchHeading")}</h2><span>{t("noDelivery")}</span></div>
          <form className="search-form" onSubmit={submitSearch}>
            <div className="medicine-field"><label htmlFor="medicine">{t("medicine")}</label><div className="input-with-icon"><Search /><Input id="medicine" value={query} maxLength={100} onChange={(event) => { setQuery(event.target.value); setCatalogNotice(false); setCatalogVerified(false); }} placeholder={t("medicinePlaceholder")} autoComplete="off" /></div></div>
            <div><label htmlFor="search-city">{t("city")}</label><NativeSelect id="search-city" value={city} onChange={(event) => { setCity(event.target.value); setActiveRequest(null); }}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect></div>
            <Button className="primary-search" type="submit" disabled={!!busy || signedOut || offline}><Search />{t("searchButton")}</Button>
          </form>
          {catalog.length > 0 && <div className="catalog-list" aria-label={t("catalogMatch")}>{catalog.map((item) => <button key={item.registration} type="button" onClick={() => { setQuery(item.name); setCatalog([]); setCatalogVerified(true); setCatalogNotice(true); }}><strong>{item.name}</strong><small>{item.ingredient}</small></button>)}</div>}
          {catalogNotice && <p className="catalog-note">{catalogVerified ? t("catalogMatch") : t("noCatalogMatch")} · {t("catalogCaution")}</p>}
          <div className="search-foot"><span><ShieldCheck />{t("privacy")}</span><div className="row"><PrescriptionScan language={language} disabled={!!busy || signedOut} onSelect={(name) => { setQuery(name); setCatalogVerified(true); setCatalogNotice(true); setActiveRequest(null); }} /><button type="button" disabled={!!busy} onClick={locate}><LocateFixed />{t("location")}</button></div></div>
          <p className="scan-hint">{t("scanHint")}</p>
          <ClientFilters language={language} radius={preferences.value.radius} query={pharmacyQuery} saved={savedOnly} onRadius={radius=>preferences.update({radius})} onQuery={setPharmacyQuery} onSaved={setSavedOnly} onReset={()=>{preferences.update({radius:0});setPharmacyQuery("");setSavedOnly(false);setNight(false);setOnlyAvailable(false);}}/>
          {signedOut && <p className="auth-hint">{t("signInRequired")}</p>}
        </section>
        <div className="workspace-grid"><div className="results-column"><div className="results-heading"><div><h2>{active ? `${t("resultFor")} «${active.medicine}»` : t("nearby")}</h2><p>{cityName(city)} · {results.length}</p></div><button className="icon-btn" onClick={() => void load()} aria-label={t("refresh")}><RefreshCw className={loading ? "spin" : ""} /></button></div><div className="filters"><label className="filter-switch"><MoonStar />{t("night")}<Switch checked={night} onCheckedChange={setNight} /></label>{active && <button className={`filter-chip ${onlyAvailable ? "selected" : ""}`} onClick={() => setOnlyAvailable(!onlyAvailable)}><CheckCheck />{t("availableOnly")}</button>}<span className="sort-label">{t("closest")}</span></div>{active && <div className={`request-progress ${seen ? "confirmed" : ""}`}><Clock3 /><div><strong>{seen ? `${seen} · ${t("yes")}` : t("pending")}</strong><p>{t("reserveHelp")}</p></div></div>}
          <div className="pharmacy-list">{results.map((pharmacy, index) => { const reply = replies.find((item) => item.pharmacy === pharmacy.id), fresh = isFreshReply(reply, now), booking = data.reservations.find((item) => item.request === active?.id); return <article className="pharmacy-row" key={pharmacy.id}><div className={`store-avatar tone-${index % 3}`}><Store /></div><div className="pharmacy-info"><div className="pharmacy-title"><button onClick={() => openModal({ kind: "pharmacy", pharmacy })}>{pharmacy.name}</button>{!pharmacy.pilot && <span className="nearest">{t("registered")}</span>}</div><p><MapPin />{pharmacy.area} · {cityName(pharmacy.city)}</p><div className="pharmacy-tags"><span><Navigation />{localizedDistance(pharmacy.distance, language)} {t("approx")}</span><span className={pharmacy.duty ? "duty" : ""}>{pharmacy.duty ? <MoonStar /> : <Clock3 />}{pharmacy.duty ? t("night") : pharmacy.hours}</span>{pharmacy.pilot && <span>{t("demo")}</span>}</div></div><div className="pharmacy-action"><button className="icon-btn favorite-button" aria-pressed={preferences.value.favorites.includes(pharmacy.id)} aria-label={ex(language,preferences.value.favorites.includes(pharmacy.id)?"unfavorite":"favorite")} onClick={()=>preferences.update({favorites:preferences.value.favorites.includes(pharmacy.id)?preferences.value.favorites.filter(id=>id!==pharmacy.id):[...preferences.value.favorites,pharmacy.id].slice(-300)})}><Heart/></button>{reply && <span className={`availability ${fresh ? "yes" : reply.status === "no" ? "no" : "pending"}`}>{fresh ? t("yes") : reply.status === "no" ? t("no") : reply.status === "yes" ? t("stale") : t("pending")}</span>}{fresh && !booking ? <Button onClick={() => openModal({ kind: "reserve", pharmacy })}>{t("reserve")}</Button> : booking?.pharmacy === pharmacy.id ? <Button variant="outline" onClick={() => openModal({ kind: "booking", booking })}>{t("details")}</Button> : <Button variant="outline" onClick={() => openModal({ kind: "pharmacy", pharmacy })}>{t("details")}</Button>}</div></article>; })}</div>{!results.length && <div className="panel empty-panel">{t("noResults")}</div>}<div className="result-footnote"><ShieldCheck />{t("pickupOnly")}</div></div><aside className="support-column"><section className="night-card"><span className="night-icon"><MoonStar /></span><span className="card-eyebrow">LQADWA</span><h2>{t("night")}</h2><p>{t("pickupOnly")}</p><Button onClick={() => setNight(!night)}>{night ? t("nearby") : t("night")}</Button></section>{activeBookings[0] && <section className="mini-booking"><h3>{t("activeBookings")}</h3><strong>{activeBookings[0].medicine}</strong><p dir="ltr">{timeLeft(activeBookings[0].expires, now)}</p><Button variant="outline" onClick={() => openModal({ kind: "booking", booking: activeBookings[0] })}>{t("showQr")}</Button></section>}</aside></div>
      </>}
      {!signedOut && view === "bookings" && <ClientTracker data={data} language={language} now={now} sharing={sharingBooking} onRefresh={()=>void load()} onBooking={booking=>openModal({kind:"booking",booking})} onPharmacy={pharmacy=>openModal({kind:"pharmacy",pharmacy})} onRequest={request=>{setQuery(request.medicine);setCity(request.city);setActiveRequest(request.id);setNight(false);navigate("search");}}/>}
      {!signedOut && view === "map" && <><div className="page-heading"><div className="overline">OPENSTREETMAP</div><h1>{t("mapTitle")}</h1><p>{t("mapDescription")}</p></div><ClientFilters language={language} radius={preferences.value.radius} query={pharmacyQuery} saved={savedOnly} onRadius={radius=>preferences.update({radius})} onQuery={setPharmacyQuery} onSaved={setSavedOnly} onReset={()=>{preferences.update({radius:0});setPharmacyQuery("");setSavedOnly(false);setNight(false);setOnlyAvailable(false);}}/><div className="map-controls"><NativeSelect value={city} onChange={(event) => setCity(event.target.value)} aria-label={t("city")}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect><Button variant="outline" onClick={locate} aria-pressed={mapTracking}><LocateFixed />{t(mapTracking ? "stopTracking" : "location")}</Button><label className="filter-switch"><MoonStar />{t("night")}<Switch checked={night} onCheckedChange={setNight} /></label></div><DawaMap city={city} pharmacies={nearby} position={position} onSelect={(pharmacy) => openModal({ kind: "pharmacy", pharmacy })} /><p className="map-credit">{t("mapsCredit")} · {t("pickupOnly")}</p><div className="map-list">{nearby.map((pharmacy) => <button key={pharmacy.id} className="portal-item item-button" onClick={() => openModal({ kind: "pharmacy", pharmacy })}><strong>{pharmacy.name}</strong><span>{pharmacy.area} · {localizedDistance(pharmacy.distance, language)} {t("approx")}</span><small>{pharmacy.pilot ? t("demo") : t("registered")}</small></button>)}</div></>}
      {!signedOut && view === "account" && <><div className="page-heading"><div className="overline">LQADWA</div><h1>{t("accountHeading")}</h1><p>{t("privacy")}</p></div><div className="account-grid"><form className="panel account-form" onSubmit={async (event) => { event.preventDefault(); await mutate({ action: "profile", name: data.profile.name, city }, t("save")); }}><span className="large-avatar"><UserRound /></span><h2>{t("account")}</h2><p className="muted">{data.profile.name}</p><label htmlFor="profile-city">{t("defaultCity")}</label><NativeSelect id="profile-city" value={city} onChange={(event) => setCity(event.target.value)}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect><Button type="submit" disabled={!!busy || signedOut}><Check />{t("save")}</Button></form><div className="account-side"><section className="panel"><ShieldCheck /><h2>{t("privacy")}</h2><p>{t("pickupOnly")} · {t("noDelivery")}</p></section><section className="panel setting-panel"><span>{t("theme")}</span><Switch aria-label={t("theme")} checked={dark} onCheckedChange={toggleTheme} /></section><section className="panel setting-panel"><span>{t("language")}</span><NativeSelect value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t("language")}><NativeSelectOption value="ar">العربية</NativeSelectOption><NativeSelectOption value="fr">Français</NativeSelectOption><NativeSelectOption value="en">English</NativeSelectOption><NativeSelectOption value="kab">Taqbaylit</NativeSelectOption></NativeSelect></section>{!signedOut && <DeviceSecurity language={language} />}{data.role === "client" && <Button variant="outline" onClick={() => navigate("pharmacy")}><Store />{t("joinTitle")}</Button>}{!signedOut && <a className="signout-link" href="/logout" target="_top">{t("logout")}</a>}</div></div></>}
      {!signedOut && view === "account" && <ProfileDetails language={language} client={data.role === "client"} onSaved={() => void load()} />}
      {!signedOut && view === "account" && <PreferencesPanel language={language} value={preferences.value} update={preferences.update}/>}
      {!signedOut && view === "pharmacy" && own && own.status !== "suspended" && <ProfileDetails language={language} client={false} pharmacy onSaved={() => void load()} />}
      {!signedOut && view === "pharmacy" && <><div className="page-heading"><div className="overline">LQADWA · PHARMACY</div><h1>{own?.status === "approved" ? t("pharmacyTitle") : t("joinTitle")}</h1><p>{own?.status === "approved" ? t("pharmacySub") : t("joinSub")}</p></div>
        {own?.status === "approved" ? <><div className="staff-summary"><div><span className="square-icon"><Bell /></span><span>{t("inbox")}<strong>{staffRequests.length}</strong></span></div><div><span className="square-icon"><BookmarkCheck /></span><span>{t("pickup")}<strong>{staffBookings.length}</strong></span></div><label className="staff-duty"><span className="square-icon"><MoonStar /></span><span>{t("duty")}</span><Switch checked={!!own.duty} disabled={!!busy} onCheckedChange={(enabled) => void mutate({ action: "duty", pharmacy: own.id, enabled }, t("save"))} /></label></div><div className="workspace-tabs" role="group" aria-label={t("pharmacy")} >{(["inbox", "pickup", "stock"] as const).map(tab => <Button key={tab} variant={pharmacyTab === tab ? "default" : "outline"} aria-pressed={pharmacyTab === tab} onClick={() => setPharmacyTab(tab)}>{t(tab)} · {tab === "inbox" ? staffRequests.length : tab === "pickup" ? staffBookings.length : data.stock.length}</Button>)}</div><div className="pharmacy-workspace">{pharmacyTab === "inbox" && <section className="panel"><h2>{t("inbox")}</h2><div className="item-stack">{staffRequests.length ? staffRequests.map((request) => <article className="portal-item" key={request.id}><h3>{request.medicine}</h3><p>{cityName(request.city)} · {new Date(request.created).toLocaleTimeString(localeTag[language])}</p><div className="row"><Button disabled={!!busy} onClick={() => void mutate({ action: "reply", request: request.id, pharmacy: own.id, available: true }, t("yes"))}><Check />{t("markYes")}</Button><Button variant="outline" disabled={!!busy} onClick={() => void mutate({ action: "reply", request: request.id, pharmacy: own.id, available: false }, t("no"))}><X />{t("markNo")}</Button></div></article>) : <p className="muted empty-copy">{t("noInbox")}</p>}</div></section>}{pharmacyTab === "pickup" && <section className="panel"><h2>{t("pickup")}</h2><div className="item-stack">{staffBookings.length ? staffBookings.map((booking) => <article className="portal-item" key={booking.id}><h3>{booking.medicine}</h3><p>{t("timeLeft")}: <b dir="ltr">{timeLeft(booking.expires, now)}</b></p><Button variant="outline" onClick={() => openModal({ kind: "collect", booking })}><FileCheck2 />{t("verify")}</Button></article>) : <p className="muted empty-copy">{t("noBookings")}</p>}</div></section>}</div>{pharmacyTab === "stock" && <InventoryWorkspace language={language} threshold={preferences.value.threshold} onThreshold={threshold=>preferences.update({threshold})} onChanged={()=>void load()}/>}</> : !canSubmitPharmacy(own?.status) ? <section className="panel application-status"><span className="dialog-symbol"><Store /></span><h2>{t(own?.status === "suspended" ? "applicationSuspended" : "applicationPending")}</h2><strong>{own?.name}</strong><p className="muted">{own?.address}</p><div className="row"><Button variant="outline" disabled={!!busy} onClick={() => void load()}><RefreshCw />{t("refresh")}</Button><Button asChild variant="outline"><a href="/privacy">{t("privacy")}</a></Button></div></section> : <div className="portal-grid"><form className="panel registration-form" onSubmit={async (event) => { event.preventDefault(); await mutate({ action: "register-pharmacy", name: registration.name.trim(), address: registration.address.trim(), city: registration.city, phone: registration.phone, license: registration.license.trim(), latitude: Number(registration.latitude), longitude: Number(registration.longitude) }, t("submitApplication")); }}><h2>{t("joinTitle")}</h2><label>{t("pharmacyName")}<Input required minLength={3} maxLength={100} value={registration.name} onChange={(event) => registrationSet("name", event.target.value)} /></label><label>{t("address")}<Input required minLength={8} maxLength={160} value={registration.address} onChange={(event) => registrationSet("address", event.target.value)} /></label><label>{t("city")}<NativeSelect value={registration.city} onChange={(event) => registrationSet("city", event.target.value)}>{cities.map((item) => <NativeSelectOption key={item.id} value={item.id}>{cityName(item.id)}</NativeSelectOption>)}</NativeSelect></label><label>{t("phone")}<Input type="tel" inputMode="tel" pattern="0[0-9]{8,9}" required value={registration.phone} onChange={(event) => registrationSet("phone", event.target.value)} /></label><label>{t("license")}<Input required minLength={5} maxLength={100} value={registration.license} onChange={(event) => registrationSet("license", event.target.value)} /></label><div className="row between"><strong>{t("coordinates")}</strong><Button type="button" variant="outline" onClick={() => { if (!navigator.geolocation) { toast.error(t("error")); return; } navigator.geolocation.getCurrentPosition(({ coords }) => setRegistration((old) => ({ ...old, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) })), () => toast.error(t("error"))); }}><LocateFixed />{t("getCoordinates")}</Button></div><div className="coordinates"><Input required type="number" min="18.9" max="38" step="any" aria-label="Latitude" placeholder="Latitude" value={registration.latitude} onChange={(event) => registrationSet("latitude", event.target.value)} /><Input required type="number" min="-9" max="12" step="any" aria-label="Longitude" placeholder="Longitude" value={registration.longitude} onChange={(event) => registrationSet("longitude", event.target.value)} /></div><Button type="submit" disabled={!!busy || signedOut || own?.status === "suspended"}>{t("submitApplication")}</Button></form><aside className="panel join-aside"><Store /><h2>{own?.status === "pending" ? t("applicationPending") : own?.status === "rejected" ? t("applicationRejected") : own?.status === "suspended" ? t("applicationSuspended") : t("joinSub")}</h2><p>{t("pickupOnly")}</p><p>{t("stockHelp")}</p></aside></div>}
      </>}
      {!signedOut && view === "pharmacy" && pharmacyTab === "pickup" && own?.status === "approved" && approaching.length > 0 && <section className="panel approach-panel"><h2>{t("approaching")}</h2><div className="item-stack">{approaching.map((booking) => <div className="approach-row" key={booking.id}><Navigation /><span>{booking.medicine}</span><strong>{localizedDistance(distanceMeters({ lat: booking.approachLat!, lng: booking.approachLng! }, { lat: own.latitude / 1e6, lng: own.longitude / 1e6 }), language)} {t("approx")}</strong></div>)}</div><DawaMap city={own.city} pharmacies={data.pharmacies.filter((p) => p.id === own.id)} position={null} approaches={approaching.map((b) => ({ lat: b.approachLat!, lng: b.approachLng!, label: `${t("approaching")} · ${b.medicine}` }))} onSelect={(pharmacy) => openModal({ kind: "pharmacy", pharmacy })} /></section>}
      {view === "admin" && (data.role === "admin" && data.admin ? <><div className="page-heading"><div className="overline">LQADWA · OPERATIONS</div><h1>{t("adminTitle")}</h1><p>{t("adminSub")}</p></div><AdminIdentity admin={data.admin} language={language} />{data.admin.access.isOwner && <AdminEditorLauncher language={language} />}<AdminManagement key={JSON.stringify(data.admin.access)} admin={data.admin} language={language} mutate={mutate} onChanged={() => void load()} /></> : <div className="panel empty-panel">{t("adminOnly")}</div>)}
      {!signedOut && view === "admin" && data.admin && <AdminControls teamOnly key={JSON.stringify(data.admin.access)} admin={data.admin} language={language} busy={!!busy} mutate={mutate} />}
      {!signedOut && view === "account" && <AppInstall language={language}/>}
      <SiteFooter language={language} signedOut={signedOut} role={data.role}/>
    </main>
    {!signedOut && <nav className="mobile-navigation" aria-label={t("account")}>{navigation.map(item => { const Icon = item === "search" ? Search : item === "bookings" ? BookmarkCheck : item === "map" ? MapPin : item === "pharmacy" ? Store : item === "admin" ? ShieldCheck : UserRound; return <button key={item} aria-current={view === item ? "page" : undefined} onClick={() => navigate(item)}><Icon /><span>{t(item)}</span></button>; })}</nav>}
    <Dialog open={!signedOut && !!modal && (modal.kind !== "collect" || staffBookings.some(b => b.id === modal.booking.id))} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="app-dialog" dir={language === "ar" ? "rtl" : "ltr"} showCloseButton={false}><button className="dialog-close icon-btn" onClick={() => setModal(null)} aria-label={t("close")}><X /></button>
      {modal?.kind === "reserve" && active && <><span className="dialog-symbol"><BookmarkCheck /></span><DialogTitle>{t("reserveTitle")}</DialogTitle><DialogDescription>{t("reserveHelp")}</DialogDescription><div className="reservation-summary"><strong>{active.medicine}</strong><span>{modal.pharmacy.name} · {modal.pharmacy.area}</span><div><Clock3 />{t("pickupOnly")}</div></div>{modal.pharmacy.pilot && <p className="soft-note">{t("demoDisclaimer")}</p>}<label className="consent"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} /><span>{t("prescription")}</span></label><Button disabled={!consent || !!busy} onClick={async () => { const result = await mutate({ action: "reserve", request: active.id, pharmacy: modal.pharmacy.id, consent: true }, t("active")); const booking = result?.reservations.find((item) => item.request === active.id); if (booking) setModal({ kind: "booking", booking }); }}><Check />{t("confirm")}</Button></>}
      {modal?.kind === "booking" && selectedBooking && <><span className="dialog-symbol"><QrCode /></span><DialogTitle>{t("showQr")}</DialogTitle><DialogDescription>{selectedBooking.medicine} · {data.pharmacies.find((item) => item.id === selectedBooking.pharmacy)?.name}</DialogDescription><span className={`badge ${selectedBooking.status === "active" && selectedBooking.expires > now ? "success" : "neutral"}`}>{t(selectedBooking.status === "active" && selectedBooking.expires <= now ? "expired" : selectedBooking.status)}</span><div className="ticket"><BookingQr reservation={selectedBooking.id} code={selectedBooking.code} label={t("showQr")} /><span>{t("pickupCode")}</span><strong dir="ltr">{selectedBooking.code}</strong><button className="text-link" onClick={() => void navigator.clipboard.writeText(selectedBooking.code).then(() => toast.success(t("copy"))).catch(() => toast.info(selectedBooking.code))}><Copy />{t("copy")}</button>{selectedBooking.status === "active" && <div className="ticket-timer"><Clock3 />{t("timeLeft")}<b dir="ltr">{timeLeft(selectedBooking.expires, now)}</b></div>}</div><p className="muted">{t("prescription")} · {t("pickupOnly")}</p>{selectedBooking.status === "active" && selectedBooking.expires > now && <Button variant="outline" onClick={async () => { if (!window.confirm(t("cancelQuestion"))) return; const result = await mutate({ action: "cancel", reservation: selectedBooking.id }, t("cancelled")); if (result) setModal(null); }}>{t("cancelBooking")}</Button>}</>}
      {modal?.kind === "pharmacy" && <><span className="dialog-symbol"><Store /></span><DialogTitle>{modal.pharmacy.name}</DialogTitle><DialogDescription>{modal.pharmacy.area} · {cityName(modal.pharmacy.city)}</DialogDescription><div className="pharmacy-modal-details"><span><MapPin />{localizedDistance(modal.pharmacy.distance, language)} {t("approx")}</span><span><Clock3 />{modal.pharmacy.hours}</span><span><ShieldCheck />{t("pickupOnly")}</span></div><p className="soft-note">{modal.pharmacy.pilot ? t("demoDisclaimer") : t("exactDisclaimer")}</p>{!modal.pharmacy.pilot && <>{modal.pharmacy.phone && <Button asChild variant="outline"><a href={`tel:${modal.pharmacy.phone}`}>{t("phone")}</a></Button>}<RouteNavigator pharmacy={modal.pharmacy} language={language} /></>}</>}
      {modal?.kind === "booking" && selectedBooking && data.pharmacies.find((item) => item.id === selectedBooking.pharmacy) && <RouteNavigator pharmacy={data.pharmacies.find((item) => item.id === selectedBooking.pharmacy)!} language={language} />}
      {modal?.kind === "booking" && selectedBooking?.status === "active" && selectedBooking.expires > now && !data.pharmacies.find((item) => item.id === selectedBooking.pharmacy)?.pilot && <div className="share-trip"><p>{t("shareTripNote")}</p><Button variant="outline" onClick={() => sharingBooking === selectedBooking.id ? stopTrip() : startTrip(selectedBooking)}><LocateFixed />{sharingBooking === selectedBooking.id ? t("stopSharing") : t("shareTrip")}</Button></div>}
      {modal?.kind === "collect" && <form className="collect-form" onSubmit={async (event) => { event.preventDefault(); const result = await mutate({ action: "collect", reservation: modal.booking.id, pharmacy: modal.booking.pharmacy, code: collectCode.trim().toUpperCase(), checked: consent }, t("collected")); if (result) setModal(null); }}><span className="dialog-symbol"><FileCheck2 /></span><DialogTitle>{t("verify")}</DialogTitle><DialogDescription>{modal.booking.medicine} · {t("pickupOnly")}</DialogDescription><label htmlFor="collection-code">{t("pickupCode")}</label><Input id="collection-code" dir="ltr" required placeholder="DZ-XXXXXXXX" maxLength={11} value={collectCode} onChange={(event) => setCollectCode(event.target.value)} /><input className="visually-hidden" ref={qrFileRef} type="file" accept="image/*" capture="environment" onChange={(event) => void scanReservationQr(event)} /><Button type="button" variant="outline" onClick={() => qrFileRef.current?.click()}><Camera />{t("scanQr")}</Button><label className="consent"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} /><span>{t("verifyPrescription")}</span></label><Button type="submit" disabled={!consent || collectCode.trim().length !== 11 || !!busy}><Check />{t("confirm")}</Button></form>}
    </DialogContent></Dialog>
    <Dialog open={!signedOut && notificationsOpen} onOpenChange={setNotificationsOpen}><DialogContent className="app-dialog" dir={language === "ar" ? "rtl" : "ltr"} showCloseButton={false}><button className="dialog-close icon-btn" onClick={() => setNotificationsOpen(false)} aria-label={t("close")}><X /></button><DialogTitle>{t("notifications")}</DialogTitle><DialogDescription>{t("notifications")}</DialogDescription><div className="notice-list">{data.notifications.length ? data.notifications.map((notice) => <article key={notice.id}><span className="square-icon"><Bell /></span><div><p>{language === "ar" ? notice.title : notice.title.startsWith("طلب توفر جديد") ? t("inbox") : t("notifications")}</p><small>{new Date(notice.created).toLocaleString(localeTag[language])}</small></div></article>) : <p className="muted">{t("noNotifications")}</p>}</div></DialogContent></Dialog>
    <Toaster position="top-center" dir={language === "ar" ? "rtl" : "ltr"} theme={dark ? "dark" : "light"} richColors />
  </div>;
}

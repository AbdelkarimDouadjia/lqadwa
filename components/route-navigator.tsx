"use client";
import { useEffect, useRef, useState } from "react";
import { Car, Footprints, Bus, LocateFixed, Navigation, X } from "lucide-react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { Button } from "@/components/ui/button";
import type { Pharmacy } from "@/lib/domain";
import { tr, type Language } from "@/lib/i18n";

type Point = { lat: number; lng: number };
type Route = { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { steps: { name: string; distance: number; maneuver: { type: string; modifier?: string } }[] }[] };
export function RouteNavigator({ pharmacy, language }: { pharmacy: Pharmacy; language: Language }) {
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  const [mode, setMode] = useState<"car" | "foot">("car");
  const [position, setPosition] = useState<Point | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [tracking, setTracking] = useState(false);
  const element = useRef<HTMLDivElement>(null), map = useRef<LeafletMap | null>(null), layers = useRef<LayerGroup | null>(null);
  const request = useRef<AbortController | null>(null), watch = useRef<number | null>(null), lastRequest = useRef(0);
  useEffect(() => () => { request.current?.abort(); if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); }, []);
  useEffect(() => {
    if (!route || !element.current) return;
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !element.current) return;
      const instance = L.map(element.current, { scrollWheelZoom: false }); map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://routing.openstreetmap.de/about.html">FOSSGIS / OSRM</a>' }).addTo(instance);
      const line = L.polyline(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), { color: "#087f79", weight: 7, opacity: .9 }).addTo(instance);
      L.circleMarker([pharmacy.lat, pharmacy.lng], { radius: 11, color: "#123344", fillColor: "#57e4be", fillOpacity: 1, weight: 4 }).addTo(instance);
      layers.current = L.layerGroup().addTo(instance); instance.fitBounds(line.getBounds(), { padding: [28, 28], maxZoom: 16 });
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; layers.current = null; };
  }, [route, pharmacy.lat, pharmacy.lng]);
  useEffect(() => {
    if (!position || !route) return;
    void import("leaflet").then((L) => { if (!layers.current) return; layers.current.clearLayers(); L.circleMarker([position.lat, position.lng], { radius: 9, color: "white", weight: 4, fillColor: "#306df1", fillOpacity: 1 }).addTo(layers.current); });
  }, [position, route]);
  async function calculate() {
    if (busy || Date.now() - lastRequest.current < 1500) return;
    lastRequest.current = Date.now(); setBusy(true); setError(""); request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try {
      const point = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }));
      const start = { lat: point.coords.latitude, lng: point.coords.longitude }; setPosition(start);
      const timeout = setTimeout(() => controller.abort(), 20000);
      let response: Response;
      try { response = await fetch(`https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${start.lng},${start.lat};${pharmacy.lng},${pharmacy.lat}?overview=full&geometries=geojson&steps=true`, { signal: controller.signal }); } finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error("route");
      const result = await response.json() as { code: string; routes?: Route[] }; if (result.code !== "Ok" || !result.routes?.[0]?.geometry?.coordinates?.length || !Number.isFinite(result.routes[0].duration) || !Number.isFinite(result.routes[0].distance)) throw new Error("route");
      setRoute(result.routes[0]);
    } catch { setError(t("routeError")); } finally { setBusy(false); }
  }
  function toggleTracking() {
    if (watch.current !== null) { navigator.geolocation.clearWatch(watch.current); watch.current = null; setTracking(false); return; }
    if (!navigator.geolocation) { setError(t("routeError")); return; }
    watch.current = navigator.geolocation.watchPosition((p) => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); setTracking(true); }, () => { setError(t("routeError")); if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; setTracking(false); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
    setTracking(true);
  }
  if (pharmacy.pilot) return <p className="soft-note">{t("demoDisclaimer")}</p>;
  return <section className="journey-card">
    <div className="journey-heading"><Navigation /><strong>{t("journeyTitle")}</strong></div>
    <div className="journey-modes"><button aria-pressed={mode === "car"} onClick={() => { setMode("car"); setRoute(null); }}><Car />{t("driving")}</button><button aria-pressed={mode === "foot"} onClick={() => { setMode("foot"); setRoute(null); }}><Footprints />{t("walking")}</button><a href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}&travelmode=transit`} target="_blank" rel="noopener noreferrer"><Bus />{t("transit")}</a></div>
    <p className="journey-note">{t("routingConsent")}</p>
    <Button onClick={() => void calculate()} disabled={busy}><LocateFixed />{busy ? t("routeLoading") : route ? t("refreshRoute") : t("calculateRoute")}</Button>
    {error && <p role="alert" className="journey-error">{error}</p>}
    {route && <><div className="journey-stats"><strong>{Math.max(1, Math.ceil(route.duration / 60))}<small>{t("minutes")}</small></strong><strong>{(route.distance / 1000).toFixed(1)}<small>km</small></strong><span>{t("routeEstimate")}</span></div><div ref={element} className="journey-map" aria-label={t("route")} /><Button variant="outline" onClick={toggleTracking}>{tracking ? <X /> : <LocateFixed />}{tracking ? t("stopTracking") : t("followPosition")}</Button><p className="journey-note">{t("localTrackingNote")}</p><details><summary>{t("routeSteps")}</summary><ol className="journey-steps">{route.legs.flatMap((leg) => leg.steps).map((step, i) => <li key={i}><Navigation /><span>{step.name || t("continueRoute")}</span><b>{Math.round(step.distance)} m</b></li>)}</ol></details></>}
    <a className="text-link" href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}&travelmode=${mode === "car" ? "driving" : "walking"}&dir_action=navigate`} target="_blank" rel="noopener noreferrer"><Navigation />{t("openNavigation")}</a><small className="journey-note">{t("directionsNote")}</small>
  </section>;
}

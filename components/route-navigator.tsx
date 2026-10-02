"use client";
import { useEffect, useRef, useState } from "react";
import { Car, Footprints, Bus, LocateFixed, Navigation, X, MapPin, Copy } from "lucide-react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { Button } from "@/components/ui/button";
import type { Pharmacy } from "@/lib/domain";
import { googleMapsDirections, type MapPoint } from "@/lib/maps-url";
import { tr, type Language } from "@/lib/i18n";

type Route = { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { steps: { name: string; distance: number; maneuver: { type: string; modifier?: string } }[] }[] };
export function RouteNavigator({ pharmacy, language }: { pharmacy: Pharmacy; language: Language }) {
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  const [mode, setMode] = useState<"car" | "foot">("car"), [position, setPosition] = useState<MapPoint | null>(null);
  const [route, setRoute] = useState<Route | null>(null), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [tracking, setTracking] = useState(false), [copied, setCopied] = useState(false);
  const element = useRef<HTMLDivElement>(null), map = useRef<LeafletMap | null>(null);
  const routeLayer = useRef<LayerGroup | null>(null), positionLayer = useRef<LayerGroup | null>(null);
  const request = useRef<AbortController | null>(null), watch = useRef<number | null>(null), lastRequest = useRef(0);
  useEffect(() => {
    const pause = () => { if (document.visibilityState === "hidden") { if(watch.current!==null)navigator.geolocation.clearWatch(watch.current); watch.current=null; setTracking(false); } };
    document.addEventListener("visibilitychange", pause);
    return () => { document.removeEventListener("visibilitychange", pause); request.current?.abort(); if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); };
  }, []);
  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !element.current) return;
      const instance = L.map(element.current, { scrollWheelZoom: false }).setView([pharmacy.lat, pharmacy.lng], 15);
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://routing.openstreetmap.de/about.html">FOSSGIS / OSRM</a>' }).addTo(instance);
      const label = document.createElement("strong"); label.textContent = pharmacy.name;
      L.circleMarker([pharmacy.lat, pharmacy.lng], { radius: 11, color: "#123344", fillColor: "#57e4be", fillOpacity: 1, weight: 4 }).addTo(instance).bindPopup(label);
      routeLayer.current = L.layerGroup().addTo(instance); positionLayer.current = L.layerGroup().addTo(instance); setReady(true);
    }).catch(()=>setError(t("routeError")));
    return () => { disposed = true; map.current?.remove(); map.current = null; routeLayer.current = null; positionLayer.current = null; };
  }, [pharmacy.lat, pharmacy.lng, pharmacy.name]);
  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if(disposed || !ready || !routeLayer.current || !map.current) return;
      routeLayer.current.clearLayers();
      if(!route) return;
      const line = L.polyline(route.geometry.coordinates.map(([lng,lat])=>[lat,lng]), { color: "#087f79", weight: 7, opacity: .9 }).addTo(routeLayer.current);
      map.current.fitBounds(line.getBounds(), { padding: [28,28], maxZoom: 16 });
    });
    return ()=>{disposed=true;};
  }, [ready, route]);
  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if(disposed || !ready || !positionLayer.current) return;
      positionLayer.current.clearLayers();
      if(!position) return;
      L.circle([position.lat,position.lng], { radius: Math.min(position.accuracy || 0, 10000), color: "#306df1", weight: 1, fillOpacity: .1 }).addTo(positionLayer.current);
      const label = document.createElement("span"); label.textContent = t("yourLocation");
      L.circleMarker([position.lat,position.lng], { radius: 9, color: "white", weight: 4, fillColor: "#306df1", fillOpacity: 1 }).addTo(positionLayer.current).bindPopup(label);
    });
    return ()=>{disposed=true;};
  }, [ready, position, language]);
  async function calculate() {
    if (busy || Date.now() - lastRequest.current < 1500) return;
    lastRequest.current = Date.now(); setBusy(true); setError(""); setRoute(null); request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try {
      if(!navigator.geolocation) throw new Error("location");
      const point = await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:5000}));
      if(controller.signal.aborted) return;
      const start = { lat: point.coords.latitude, lng: point.coords.longitude, accuracy: point.coords.accuracy }; setPosition(start);
      const timeout = setTimeout(()=>controller.abort(),20000);
      let response: Response;
      try { response = await fetch(`https://routing.openstreetmap.de/routed-${mode}/route/v1/${mode === "foot" ? "foot" : "driving"}/${start.lng},${start.lat};${pharmacy.lng},${pharmacy.lat}?overview=full&geometries=geojson&steps=true`,{signal:controller.signal}); } finally { clearTimeout(timeout); }
      if(!response.ok) throw new Error("route");
      const result = await response.json() as { code:string; routes?:Route[] }, planned = result.routes?.[0];
      if(result.code!=="Ok" || !planned?.geometry?.coordinates?.length || !Number.isFinite(planned.duration) || !Number.isFinite(planned.distance)) throw new Error("route");
      if(!controller.signal.aborted) setRoute(planned);
    } catch { if(request.current===controller) setError(t("routeError")); } finally { if(request.current===controller) setBusy(false); }
  }
  function toggleTracking() {
    if(watch.current!==null){navigator.geolocation.clearWatch(watch.current);watch.current=null;setTracking(false);return;}
    if(!navigator.geolocation){setError(t("routeError"));return;}
    watch.current=navigator.geolocation.watchPosition(p=>{setPosition({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy});setTracking(true);},()=>{setError(t("routeError"));if(watch.current!==null)navigator.geolocation.clearWatch(watch.current);watch.current=null;setTracking(false);},{enableHighAccuracy:true,timeout:20000,maximumAge:5000});setTracking(true);
  }
  function changeMode(next: "car" | "foot") { request.current?.abort(); request.current=null; setBusy(false); setMode(next); setRoute(null); setError(""); }
  if(pharmacy.pilot) return null;
  return <section className="journey-card">
    <div className="journey-heading"><Navigation aria-hidden="true"/><strong>{t("journeyTitle")}</strong></div>
    <div className="journey-address"><MapPin aria-hidden="true"/><div><strong>{pharmacy.name}</strong><p>{pharmacy.area}</p></div><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(`${pharmacy.name} — ${pharmacy.area}`).then(()=>setCopied(true)).catch(()=>setError(t("error")))}><Copy aria-hidden="true"/>{t(copied?"copied":"copyAddress")}</Button></div>
    <div className="journey-modes"><button type="button" aria-pressed={mode==="car"} disabled={busy} onClick={()=>changeMode("car")}><Car/>{t("driving")}</button><button type="button" aria-pressed={mode==="foot"} disabled={busy} onClick={()=>changeMode("foot")}><Footprints/>{t("walking")}</button><a href={googleMapsDirections(pharmacy,"transit",position)} target="_blank" rel="noopener noreferrer"><Bus/>{t("transitRail")}</a></div>
    <p className="journey-note">{t("routingConsent")}</p><Button onClick={()=>void calculate()} disabled={busy}><LocateFixed/>{busy?t("routeLoading"):route?t("refreshRoute"):t("calculateRoute")}</Button>
    {error&&<p role="alert" className="journey-error">{error}</p>}
    <div ref={element} className="journey-map" aria-label={t("route")}/>
    <div className="journey-actions"><Button variant="outline" onClick={toggleTracking}>{tracking?<X/>:<LocateFixed/>}{t(tracking?"stopTracking":"followPosition")}</Button><Button variant="outline" disabled={!position||!ready} onClick={()=>position&&map.current?.setView([position.lat,position.lng],16)}><LocateFixed/>{t("recenter")}</Button></div>
    <p className="journey-note">{t("localTrackingNote")}</p>
    {route&&<><div className="journey-stats"><strong>{Math.max(1,Math.ceil(route.duration/60))}<small>{t("minutes")}</small></strong><strong>{(route.distance/1000).toFixed(1)}<small>km</small></strong><span>{t("routeEstimate")}</span></div><details><summary>{t("routeSteps")}</summary><ol className="journey-steps">{route.legs.flatMap(leg=>leg.steps).map((step,i)=><li key={i}><Navigation/><span>{step.name||t("continueRoute")}</span><b>{Math.round(step.distance)} m</b></li>)}</ol></details></>}
    <a className="text-link" href={googleMapsDirections(pharmacy,mode==="car"?"driving":"walking",position)} target="_blank" rel="noopener noreferrer"><Navigation/>{t("openNavigation")}</a><small className="journey-note">{t("transitCoverage")}</small>
  </section>;
}

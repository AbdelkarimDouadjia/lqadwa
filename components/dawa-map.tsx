"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Pharmacy } from "@/lib/domain";
import { cities } from "@/lib/domain";

export function DawaMap({ city, pharmacies, position, onSelect }: { city: string; pharmacies: Pharmacy[]; position: { lat: number; lng: number } | null; onSelect: (pharmacy: Pharmacy) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<LayerGroup | null>(null);
  const callback = useRef(onSelect);
  const [ready, setReady] = useState(false);
  callback.current = onSelect;
  useEffect(() => {
    let disposed = false;
    let current: LeafletMap | null = null;
    void import("leaflet").then((L) => {
      if (disposed || !element.current) return;
      const center = cities.find((item) => item.id === city) || cities[0];
      current = L.map(element.current, { zoomControl: true, scrollWheelZoom: false }).setView([center.lat, center.lng], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(current);
      map.current = current;
      markers.current = L.layerGroup().addTo(current);
      setReady(true);
    });
    return () => { disposed = true; current?.remove(); map.current = null; markers.current = null; };
    // Mount the tile map once. Later effects update center and markers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready || !map.current || !markers.current) return;
    const center = cities.find((item) => item.id === city) || cities[0];
    map.current.setView([center.lat, center.lng], 12);
    markers.current.clearLayers();
    void import("leaflet").then((L) => {
      if (!markers.current) return;
      pharmacies.forEach((pharmacy) => {
        const marker = L.circleMarker([pharmacy.lat, pharmacy.lng], { radius: pharmacy.pilot ? 8 : 10, color: pharmacy.pilot ? "#667b91" : "#087f79", weight: 3, fillColor: pharmacy.pilot ? "#9caebc" : "#16b8a6", fillOpacity: .9 }).addTo(markers.current!);
        const label = document.createElement("div");
        const strong = document.createElement("strong"); strong.textContent = pharmacy.name;
        const detail = document.createElement("p"); detail.textContent = pharmacy.area;
        label.appendChild(strong); label.appendChild(detail);
        marker.bindPopup(label);
        marker.on("click", () => callback.current(pharmacy));
      });
      if (position) L.circleMarker([position.lat, position.lng], { radius: 7, color: "#3566a1", fillColor: "#7196df", fillOpacity: 1 }).addTo(markers.current!);
    });
  }, [ready, city, pharmacies, position]);
  return <div ref={element} className="dawa-map" role="application" aria-label="OpenStreetMap" />;
}

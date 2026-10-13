"use client";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cities, type Pharmacy } from "@/lib/domain";
import { tr, type Language } from "@/lib/i18n";
import { ex } from "@/lib/experience-copy";

export function PublicDirectory({ language }: { language: Language }) {
  const [city, setCity] = useState("algiers"), [night, setNight] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null), [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState({ key: "", items: [] as Pharmacy[], next: null as string | null });
  const [failed, setFailed] = useState("");
  const key = JSON.stringify([city, night, cursor, revision]), loading = loaded.key !== key && failed !== key;
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ city, night: String(night), limit: "20" });
    if (cursor) params.set("cursor", cursor);
    void fetch(`/api/v1/pharmacies?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error("Directory unavailable");
      const page = await response.json() as { items: Pharmacy[]; availability: string; nextCursor: string | null };
      if (!Array.isArray(page.items) || page.availability !== "not-confirmed" || (page.nextCursor !== null && typeof page.nextCursor !== "string")) throw Error("Invalid directory");
      if (!controller.signal.aborted) setLoaded(previous => ({ key, items: cursor ? [...previous.items, ...page.items.filter((item: Pharmacy) => !previous.items.some(old => old.id === item.id))] : page.items, next: page.nextCursor }));
    }).catch(() => { if (!controller.signal.aborted) setFailed(key); });
    return () => controller.abort();
  }, [city, night, cursor, key]);
  const items = loaded.key === key || cursor ? loaded.items : [];
  const heading = language === "ar" ? "استكشف الصيدليات" : language === "fr" ? "Explorer les pharmacies" : language === "kab" ? "Nadi tisaymin" : "Explore pharmacies";
  const distanceNote = language === "ar" ? "المسافات تقريبية من مركز الولاية، وليست من موقعك." : language === "fr" ? "Distances approximatives depuis le centre de la wilaya, pas votre position." : language === "kab" ? "Ameccaq seg tlemmast n lwilaya, mačči seg wadig-ik." : "Approximate distances from the wilaya centre, not your location.";
  return <section id="find-a-pharmacy" className="public-directory" aria-labelledby="directory-title" data-ui="pharmacy-directory">
    <h2 id="directory-title">{heading}</h2><p>{ex(language, "confirmHelp")}</p>
    <div className="directory-controls"><label htmlFor="directory-city">{tr(language, "city")}</label><NativeSelect id="directory-city" value={city} onChange={event => { setCity(event.target.value); setCursor(null); }}>{cities.map(item => <NativeSelectOption key={item.id} value={item.id}>{language === "ar" ? item.name : item.latin}</NativeSelectOption>)}</NativeSelect><label className="filter-switch">{tr(language, "night")}<Switch checked={night} onCheckedChange={value => { setNight(value); setCursor(null); }} /></label></div>
    <p className="muted">{distanceNote}</p>
    <div aria-live="polite" aria-busy={loading}>{failed === key ? <><p role="alert">{ex(language, "error")}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>{ex(language, "retry")}</Button></> : <>
      {items.map(pharmacy => <article className="directory-row" key={pharmacy.id}><div><h3>{pharmacy.name}</h3><p>{pharmacy.area}</p><p>{pharmacy.hours} · {(pharmacy.distance / 1000).toFixed(1)} km</p></div><a href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}&travelmode=walking`} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />{ex(language, "route")}</a></article>)}
      {loading && <p>{language === "ar" ? "جارٍ البحث…" : language === "fr" ? "Recherche…" : language === "kab" ? "Anadi…" : "Searching…"}</p>}{!loading && !items.length && <p>{tr(language, "noResults")}</p>}
      {loaded.next && <Button variant="outline" disabled={loading} onClick={() => setCursor(loaded.next)}>{ex(language, "next")}</Button>}
    </>}</div><a className="directory-signin" href="/login?return_to=%2F%3Fspace%3Dsearch">{tr(language, "signInRequired")}</a>
  </section>;
}

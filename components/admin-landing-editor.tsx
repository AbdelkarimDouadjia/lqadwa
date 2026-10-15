"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Globe2, History, Plus, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LandingPage } from "@/components/landing-page";
import { emptyLandingContent, type LandingContent, type LandingCopyKey, type LandingSectionKey } from "@/lib/landing-content";
import { landingDefaultCopy } from "@/lib/landing-copy";
import type { Language } from "@/lib/i18n";

type Revision = { id: string; actor: string; created_at: number };
type LandingState = { draft: LandingContent; published: LandingContent; draftVersion: number; publishedVersion: number; updatedAt: number; publishedAt: number; revisions: Revision[] };
const words = {
  title: ["محتوى الصفحة الرئيسية", "Contenu de la page d’accueil", "Landing page content", "Agbur n usebter agejdan"],
  help: ["عدّل النصوص والأقسام التي يراها الزوار. تحفظ المسودة أولاً، ولا تظهر للعموم حتى تضغط نشر.", "Modifiez les textes et sections visibles. Enregistrez d’abord le brouillon ; il ne sera public qu’après publication.", "Edit the visitor-facing copy and sections. Save a draft first; it stays private until you publish.", "Beddel aḍris d yiḥricen. Sekles aqbel, sakin sissen-it i yimdanen."],
  loading: ["جارٍ تحميل المحرر…", "Chargement de l’éditeur…", "Loading editor…", "Asali n umaẓrag…"],
  failed: ["تعذر تحميل محتوى الصفحة. تحقق من اتصالك ثم أعد المحاولة.", "Impossible de charger le contenu. Vérifiez la connexion puis réessayez.", "Could not load page content. Check your connection and retry.", "Ur yezmir ara ad yali ugbur. Senqed tuqqna, sakin ales."],
  retry: ["إعادة المحاولة", "Réessayer", "Retry", "Ales"],
  language: ["لغة التحرير", "Langue d’édition", "Editing language", "Tutlayt n ubeddel"],
  save: ["حفظ المسودة", "Enregistrer le brouillon", "Save draft", "Sekles aqerru"],
  publish: ["نشر للزوار", "Publier pour les visiteurs", "Publish for visitors", "Sissen i yimdanen"],
  preview: ["معاينة المسودة", "Prévisualiser le brouillon", "Preview draft", "Wali aqerru"],
  saved: ["حُفظت المسودة. ما تزال غير منشورة.", "Brouillon enregistré. Il n’est pas encore publié.", "Draft saved. It is not public yet.", "Aqerru yettwasekles; ur d-iban ara i yimdanen."],
  publishedToast: ["نُشر محتوى الصفحة بنجاح.", "Le contenu de la page est publié.", "The landing page is now published.", "Agbur n usebter yettwassen."],
  unchanged: ["المحتوى نفسه منشور بالفعل.", "Ce contenu est déjà publié.", "This content is already published.", "Agbur-a yella yakan."],
  publishing: ["جارٍ النشر…", "Publication…", "Publishing…", "Asissen…"],
  unsaved: ["هناك تغييرات غير محفوظة. احفظ المسودة قبل نشرها.", "Des modifications ne sont pas enregistrées. Enregistrez avant de publier.", "You have unsaved changes. Save the draft before publishing.", "Llan ibeddilen ur nettwasekles ara. Sekles uqbel asissen."],
  sections: ["ترتيب الأقسام", "Ordre des sections", "Section order", "Amizwer n yiḥricen"],
  visible: ["يظهر للزوار", "Visible aux visiteurs", "Visible to visitors", "Yettban i yimdanen"],
  reset: ["الأصل", "Texte d’origine", "Reset to default", "Ales amezwaru"],
  add: ["إضافة قسم محتوى", "Ajouter une section", "Add a content section", "Rnu aḥric"],
  addHelp: ["قسم نصي بسيط مع زر اختياري. أضف النص لكل لغة ليظهر بها.", "Section de texte simple avec bouton facultatif. Ajoutez le texte dans chaque langue souhaitée.", "A simple text section with an optional button. Add copy per language where it should appear.", "Aḥric n uḍris d tqeffalt s ufran. Rnu aḍris i tutlayin i tebɣiḍ."],
  heading: ["العنوان", "Titre", "Heading", "Azwel"], body: ["النص", "Texte", "Body text", "Aḍris"], buttonText: ["نص الزر (اختياري)", "Texte du bouton (facultatif)", "Button label (optional)", "Aḍris n tqeffalt (s ufran)"],
  buttonDestination: ["وجهة الزر", "Destination du bouton", "Button destination", "Anida ara truḥ tqeffalt"],
  noButton: ["بدون زر", "Sans bouton", "No button", "War taqeffalt"], search: ["مساحة البحث", "Espace de recherche", "Search workspace", "Adeg n unadi"], pharmacy: ["تسجيل الصيدلية", "Inscription pharmacie", "Pharmacy signup", "Asekles n tsaymit"], directory: ["دليل الصيدليات", "Annuaire des pharmacies", "Pharmacy directory", "Amahraz n tsaymitin"], journey: ["كيف تعمل", "Fonctionnement", "How it works", "Amek i iteddu"],
  remove: ["حذف القسم", "Supprimer la section", "Remove section", "Kkes aḥric"], deleteQuestion: ["حذف هذا القسم؟ لا يمكن التراجع عن الحذف بعد حفظ المسودة.", "Supprimer cette section ? Cette suppression sera enregistrée dans le brouillon.", "Remove this section? Saving the draft will keep it removed.", "Kkes aḥric-a?"],
  restore: ["استعادة هذه النسخة المنشورة", "Restaurer cette version publiée", "Restore this published version", "Err-d lversion-a"], history: ["النسخ السابقة", "Versions précédentes", "Previous published versions", "Lversions yezrin"], noHistory: ["تظهر هنا النسخ السابقة بعد أول نشر.", "Les versions précédentes apparaîtront après la première publication.", "Previous versions appear here after the first publish.", "Lversions yezrin ad d-banen seld asissen amezwaru."],
  published: ["المنشور", "Publié", "Published", "Yettwassen"], draft: ["مسودة", "Brouillon", "Draft", "Aqerru"], unpublished: ["غير منشور", "Non publié", "Not published", "Ur yettwassen ara"],
  confirmPublish: ["سيصبح هذا النص مرئياً لكل زوار الموقع. هل تريد المتابعة؟", "Ce contenu sera visible par tous les visiteurs. Continuer ?", "This copy will be visible to every site visitor. Continue?", "Aḍris-a ad d-yban i yal amdan. Kemmel?"], confirmRestore: ["سيحل هذا المحتوى محل المنشور الحالي فوراً. هل تريد المتابعة؟", "Cette version remplacera immédiatement le contenu publié. Continuer ?", "This will immediately replace the current published page. Continue?", "Lversion-a ad ibeddel agbur yettwassen tura. Kemmel?"],
  hero: ["المقدمة", "Introduction", "Introduction", "Tazwart"], tools: ["المزايا", "Fonctionnalités", "Features", "Tiwuriwin"], offer: ["العرض", "Offre", "Offer", "L’offre"], android: ["تطبيق Android", "Application Android", "Android app", "Asnas Android"], faq: ["الأسئلة", "Questions", "FAQ", "Isteqsiyen"],
} as const;
const groups: { title: string; fields: { key: LandingCopyKey; multiline?: boolean }[] }[] = [
  { title: "hero", fields: [{ key: "titleA" }, { key: "titleB" }, { key: "lead", multiline: true }, { key: "explore" }, { key: "clientFree" }] },
  { title: "journey", fields: [{ key: "journey" }, { key: "search" }, { key: "scanHelp", multiline: true }, { key: "confirm" }, { key: "confirmHelp", multiline: true }, { key: "collect" }, { key: "collectHelp", multiline: true }] },
  { title: "tools", fields: [{ key: "tools" }, { key: "scan" }, { key: "scanBody", multiline: true }, { key: "scanAction" }, { key: "route" }, { key: "routeBody", multiline: true }] },
  { title: "pharmacy", fields: [{ key: "stock" }, { key: "stockBody", multiline: true }, { key: "join" }] },
  { title: "offer", fields: [{ key: "offer" }, { key: "offerBody", multiline: true }, { key: "free" }, { key: "month" }] },
  { title: "android", fields: [{ key: "android" }, { key: "androidBody", multiline: true }] },
  { title: "faq", fields: [{ key: "questions" }, { key: "delivery" }, { key: "aDelivery", multiline: true }, { key: "coverage" }, { key: "aCoverage", multiline: true }, { key: "reserve" }, { key: "aReserve", multiline: true }] },
];
const sectionLabels: Record<LandingSectionKey, keyof typeof words> = { journey: "journey", tools: "tools", pharmacy: "pharmacy", offer: "offer", android: "android", faq: "faq" };
const fieldLabels: Record<LandingCopyKey, readonly [string, string, string, string]> = {
  titleA: ["العنوان - السطر الأول", "Titre - première ligne", "Headline - first line", "Azwel - izir amezwaru"], titleB: ["العنوان - السطر الثاني", "Titre - deuxième ligne", "Headline - second line", "Azwel - izir wis sin"],
  lead: ["النص التعريفي", "Texte d’introduction", "Introductory copy", "Aḍris n tazwart"], explore: ["نص زر الاستكشاف", "Bouton de découverte", "Explore button", "Taqeffalt n unadi"], clientFree: ["ملاحظة مجانية المريض", "Mention de gratuité patient", "Patient-free note", "Tazmilt n baṭel i umuḍin"],
  journey: ["عنوان خطوات الخدمة", "Titre des étapes", "Steps heading", "Azwel n yimecwar"], search: ["خطوة البحث", "Étape de recherche", "Search step", "Amecwar n unadi"], scanHelp: ["شرح البحث", "Description de la recherche", "Search description", "Asegzi n unadi"], confirm: ["خطوة التأكيد", "Étape de confirmation", "Confirmation step", "Amecwar n usentem"], confirmHelp: ["شرح التأكيد", "Description de la confirmation", "Confirmation description", "Asegzi n usentem"], collect: ["خطوة الاستلام", "Étape du retrait", "Collection step", "Amecwar n wawey"], collectHelp: ["شرح الاستلام", "Description du retrait", "Collection description", "Asegzi n wawey"],
  tools: ["عنوان المزايا", "Titre des fonctionnalités", "Features heading", "Azwel n twuriwin"], scan: ["عنوان المسح الضوئي", "Titre du scan", "Scan heading", "Azwel n uskan"], scanBody: ["شرح المسح الضوئي", "Description du scan", "Scan description", "Asegzi n uskan"], scanAction: ["زر مساحة البحث", "Bouton de recherche", "Search workspace button", "Taqeffalt n unadi"], route: ["عنوان المسار", "Titre de l’itinéraire", "Directions heading", "Azwel n ubrid"], routeBody: ["شرح المسار", "Description de l’itinéraire", "Directions description", "Asegzi n ubrid"],
  stock: ["عنوان قسم الصيدليات", "Titre espace pharmacie", "Pharmacy section heading", "Azwel n tsaymit"], stockBody: ["شرح قسم الصيدليات", "Description espace pharmacie", "Pharmacy section description", "Asegzi n tsaymit"], join: ["زر تسجيل الصيدلية", "Bouton d’inscription pharmacie", "Pharmacy signup button", "Taqeffalt n usekles n tsaymit"],
  offer: ["عنوان العرض", "Titre de l’offre", "Offer heading", "Azwel n l’offre"], offerBody: ["تفاصيل العرض", "Détails de l’offre", "Offer details", "Talqayt n l’offre"], free: ["شارة السعر المجاني", "Badge de gratuité", "Free-price label", "Tabzimt n baṭel"], month: ["السعر المرجعي", "Prix de référence", "Reference price", "Azal n usmekti"],
  android: ["عنوان تطبيق Android", "Titre de l’application Android", "Android app heading", "Azwel n usnas Android"], androidBody: ["شرح تحميل التطبيق", "Texte de téléchargement", "App download description", "Asegzi n usider n usnas"],
  questions: ["عنوان الأسئلة", "Titre FAQ", "FAQ heading", "Azwel n yisteqsiyen"], delivery: ["السؤال عن التوصيل", "Question sur la livraison", "Delivery question", "Asteqsi ɣef usiweḍ"], aDelivery: ["إجابة التوصيل", "Réponse sur la livraison", "Delivery answer", "Tiririt ɣef usiweḍ"], coverage: ["السؤال عن التغطية", "Question sur la couverture", "Coverage question", "Asteqsi ɣef ussiwel"], aCoverage: ["إجابة التغطية", "Réponse sur la couverture", "Coverage answer", "Tiririt ɣef ussiwel"], reserve: ["السؤال عن الحجز", "Question sur la réservation", "Reservation question", "Asteqsi ɣef uḥraz"], aReserve: ["إجابة الحجز", "Réponse sur la réservation", "Reservation answer", "Tiririt ɣef uḥraz"],
};
const localeName = { ar: "العربية", fr: "Français", en: "English", kab: "Taqbaylit" } as const;
const indexOf = (language: Language) => language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3;
function defaultCopy(language: Language, key: LandingCopyKey): string {
  return landingDefaultCopy(language, key);
}
function newBlock(): LandingContent["blocks"][number] {
  return { id: crypto.randomUUID(), enabled: true, target: "none", copy: {} };
}

export function AdminLandingEditor({ language }: { language: Language }) {
  const i = indexOf(language), t = (key: keyof typeof words) => words[key][i];
  const [draft, setDraft] = useState<LandingContent>(emptyLandingContent), [published, setPublished] = useState<LandingContent>(emptyLandingContent);
  const [savedDraft, setSavedDraft] = useState<LandingContent>(emptyLandingContent), [version, setVersion] = useState(0), [publishedVersion, setPublishedVersion] = useState(0), [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null), [working, setWorking] = useState(false), [loaded, setLoaded] = useState(false), [loadError, setLoadError] = useState(false), [preview, setPreview] = useState(false);
  const contentLanguage = selectedLanguage ?? language;
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const hasUnpublished = dirty || JSON.stringify(savedDraft) !== JSON.stringify(published);
  const w = (key: keyof typeof words) => words[key][i];
  const call = useCallback(async <T extends object = Record<string, unknown>,>(body: Record<string, unknown>): Promise<T> => {
    const response = await fetch("/api/landing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(result.error || "Landing request failed.");
    return result;
  }, []);
  const reload = useCallback(async () => {
    try {
      const result = await call<LandingState>({ action: "load" });
      setLoadError(false); setDraft(result.draft); setSavedDraft(result.draft); setPublished(result.published); setVersion(result.draftVersion); setPublishedVersion(result.publishedVersion); setRevisions(result.revisions); setLoaded(true);
    } catch { setLoadError(true); }
  }, [call]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  function updateCopy(key: LandingCopyKey, value: string) {
    setDraft(current => ({ ...current, copy: { ...current.copy, [contentLanguage]: { ...current.copy[contentLanguage], [key]: value } } }));
  }
  function resetCopy(key: LandingCopyKey) {
    setDraft(current => {
      const locale = { ...current.copy[contentLanguage] }; delete locale[key];
      return { ...current, copy: { ...current.copy, [contentLanguage]: locale } };
    });
  }
  function reorder(key: LandingSectionKey, delta: number) {
    setDraft(current => {
      const order = [...current.order], from = order.indexOf(key), to = Math.max(0, Math.min(order.length - 1, from + delta));
      if (to === from) return current;
      order.splice(from, 1); order.splice(to, 0, key); return { ...current, order };
    });
  }
  async function save() {
    setWorking(true);
    try {
      const result = await call<{ draftVersion: number }>({ action: "save", draftVersion: version, content: draft });
      setVersion(result.draftVersion); setSavedDraft(draft); toast.success(t("saved"));
    } catch (error) { toast.error(error instanceof Error ? error.message : t("failed")); }
    finally { setWorking(false); }
  }
  async function publish() {
    if (dirty || !window.confirm(w("confirmPublish"))) return;
    setWorking(true);
    try {
      const result = await call<{ draftVersion?: number; publishedVersion?: number; unchanged?: boolean }>({ action: "publish", draftVersion: version });
      setVersion(result.draftVersion ?? version); setPublishedVersion(result.publishedVersion ?? publishedVersion);
      setPublished(savedDraft); await reload(); toast.success(result.unchanged ? w("unchanged") : w("publishedToast"));
    } catch (error) { toast.error(error instanceof Error ? error.message : w("failed")); }
    finally { setWorking(false); }
  }
  async function restore(revision: Revision) {
    if (dirty || !window.confirm(w("confirmRestore"))) return;
    setWorking(true);
    try {
      await call({ action: "restore", draftVersion: version, revision: revision.id }); await reload(); toast.success(w("publishedToast"));
    } catch (error) { toast.error(error instanceof Error ? error.message : w("failed")); }
    finally { setWorking(false); }
  }
  function updateBlock(id: string, update: (block: LandingContent["blocks"][number]) => LandingContent["blocks"][number]) {
    setDraft(current => ({ ...current, blocks: current.blocks.map(block => block.id === id ? update(block) : block) }));
  }
  function moveBlock(index: number, delta: number) {
    setDraft(current => { const blocks = [...current.blocks], to = Math.max(0, Math.min(blocks.length - 1, index + delta)); [blocks[index], blocks[to]] = [blocks[to], blocks[index]]; return { ...current, blocks }; });
  }

  return <section className="panel landing-editor" dir={language === "ar" ? "rtl" : "ltr"} aria-labelledby="landing-editor-title">
    <div className="landing-editor-heading"><span className="landing-editor-icon"><Globe2 aria-hidden="true" /></span><div><h2 id="landing-editor-title">{w("title")}</h2><p>{w("help")}</p></div></div>
    {!loaded ? <div className="landing-editor-load" role={loadError ? "alert" : "status"}>{loadError ? <><p>{w("failed")}</p><Button variant="outline" onClick={() => void reload()}><RotateCcw />{w("retry")}</Button></> : <p>{w("loading")}</p>}</div> : <>
      <div className="landing-editor-status"><span className={`landing-status-dot ${hasUnpublished ? "is-draft" : "is-live"}`} />{hasUnpublished ? w("unpublished") : w("published")}<span className="landing-editor-version">v{publishedVersion}</span></div>
      <div className="landing-editor-toolbar"><label>{w("language")}<select className="landing-editor-select" value={contentLanguage} onChange={event => setSelectedLanguage(event.target.value as Language)} disabled={working}>{Object.entries(localeName).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><div className="landing-editor-actions"><Button type="button" variant="outline" disabled={working} onClick={() => setPreview(true)}><Eye />{w("preview")}</Button><Button type="button" disabled={working || !dirty} onClick={() => void save()}><Save />{w("save")}</Button><Button type="button" variant="secondary" disabled={working || dirty || !hasUnpublished} onClick={() => void publish()}><Send />{working ? w("publishing") : w("publish")}</Button></div></div>
      {dirty && <p className="landing-editor-unsaved" role="status">{w("unsaved")}</p>}
      <div className="landing-editor-layout">
        <section className="landing-editor-fields" aria-label={w("title")}>
          {groups.map(group => <fieldset className="landing-editor-group" key={group.title}>
            <legend>{w(group.title as keyof typeof words)}</legend>
            <div className="landing-editor-field-grid">{group.fields.map(({ key, multiline }) => {
              const label = fieldLabels[key][i], value = draft.copy[contentLanguage]?.[key] ?? defaultCopy(contentLanguage, key);
              return <label className={multiline ? "landing-editor-field is-wide" : "landing-editor-field"} key={key}>{label}<div className="landing-editor-input-row">{multiline ? <Textarea maxLength={600} rows={3} value={value} disabled={working} onChange={event => updateCopy(key, event.target.value)} /> : <Input maxLength={600} value={value} disabled={working} onChange={event => updateCopy(key, event.target.value)} />}<Button type="button" variant="ghost" className="landing-reset-field" title={w("reset")} aria-label={`${w("reset")}: ${label}`} disabled={working || draft.copy[contentLanguage]?.[key] === undefined} onClick={() => resetCopy(key)}><RotateCcw aria-hidden="true" /></Button></div></label>;
            })}</div>
          </fieldset>)}
        </section>
        <aside className="landing-editor-side"><section className="landing-section-order"><h3>{w("sections")}</h3><ol>{draft.order.map((key, index) => <li key={key}><Checkbox checked={draft.sections[key] !== false} disabled={working} aria-label={`${w(sectionLabels[key])}: ${w("visible")}`} onCheckedChange={checked => setDraft(current => ({ ...current, sections: { ...current.sections, [key]: checked === true } }))} /><span>{w(sectionLabels[key])}</span><Button type="button" variant="outline" disabled={working || index === 0} aria-label={`↑ ${w(sectionLabels[key])}`} onClick={() => reorder(key, -1)}><ArrowUp /></Button><Button type="button" variant="outline" disabled={working || index === draft.order.length - 1} aria-label={`↓ ${w(sectionLabels[key])}`} onClick={() => reorder(key, 1)}><ArrowDown /></Button></li>)}</ol></section>
          <section className="landing-custom-blocks"><div className="landing-custom-title"><h3>{w("add")}</h3><Button type="button" variant="outline" disabled={working || draft.blocks.length >= 8} onClick={() => setDraft(current => ({ ...current, blocks: [...current.blocks, newBlock()] }))}><Plus />{w("add")}</Button></div><p>{w("addHelp")}</p>
            {draft.blocks.map((block, index) => <fieldset className="landing-custom-block" key={block.id}><legend>{w("add")} {index + 1}</legend><div className="landing-custom-toolbar"><label className="landing-visible-toggle"><Checkbox checked={block.enabled} disabled={working} onCheckedChange={checked => updateBlock(block.id, value => ({ ...value, enabled: checked === true }))} />{w("visible")}</label><Button type="button" variant="outline" disabled={working || index === 0} aria-label={`${w("add")} ${index + 1} ↑`} onClick={() => moveBlock(index, -1)}><ArrowUp /></Button><Button type="button" variant="outline" disabled={working || index === draft.blocks.length - 1} aria-label={`${w("add")} ${index + 1} ↓`} onClick={() => moveBlock(index, 1)}><ArrowDown /></Button><Button type="button" variant="outline" disabled={working} aria-label={w("remove")} onClick={() => { if (window.confirm(w("deleteQuestion"))) setDraft(current => ({ ...current, blocks: current.blocks.filter(value => value.id !== block.id) })); }}><Trash2 /></Button></div><label>{w("heading")}<Input maxLength={100} value={block.copy[contentLanguage]?.heading || ""} disabled={working} onChange={event => updateBlock(block.id, value => ({ ...value, copy: { ...value.copy, [contentLanguage]: { ...value.copy[contentLanguage], heading: event.target.value } } }))} /></label><label>{w("body")}<Textarea maxLength={600} rows={3} value={block.copy[contentLanguage]?.body || ""} disabled={working} onChange={event => updateBlock(block.id, value => ({ ...value, copy: { ...value.copy, [contentLanguage]: { ...value.copy[contentLanguage], body: event.target.value } } }))} /></label><label>{w("buttonText")}<Input maxLength={80} value={block.copy[contentLanguage]?.button || ""} disabled={working} onChange={event => updateBlock(block.id, value => ({ ...value, copy: { ...value.copy, [contentLanguage]: { ...value.copy[contentLanguage], button: event.target.value } } }))} /></label><label>{w("buttonDestination")}<select className="landing-editor-select" value={block.target} disabled={working} onChange={event => updateBlock(block.id, value => ({ ...value, target: event.target.value as typeof value.target }))}><option value="none">{w("noButton")}</option><option value="search">{w("search")}</option><option value="pharmacy">{w("pharmacy")}</option><option value="directory">{w("directory")}</option><option value="journey">{w("journey")}</option></select></label></fieldset>)}
          </section>
          <section className="landing-revision-history"><h3><History />{w("history")}</h3>{revisions.length ? revisions.map(revision => <article key={revision.id}><span>{new Date(revision.created_at).toLocaleString(language === "ar" ? "ar-DZ" : language === "kab" ? "fr-DZ" : `${language}-DZ`)}</span><Button type="button" variant="outline" disabled={working || dirty} onClick={() => void restore(revision)}><RotateCcw />{w("restore")}</Button></article>) : <p>{w("noHistory")}</p>}</section>
        </aside>
      </div>
    </>}
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="landing-preview-dialog" dir={contentLanguage === "ar" ? "rtl" : "ltr"}><DialogTitle>{w("preview")}</DialogTitle><DialogDescription>{dirty ? w("unsaved") : w("help")}</DialogDescription><div className="landing-preview-scroll"><LandingPage language={contentLanguage} content={draft} hideDirectory /></div></DialogContent></Dialog>
  </section>;
}

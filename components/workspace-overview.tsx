"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookmarkCheck, ChartNoAxesCombined, ClipboardList, Package, Search, ShieldCheck, Sparkles, Store, Users } from "lucide-react";
import type { AppData } from "@/lib/domain";
import type { Language } from "@/lib/i18n";
import { tr } from "@/lib/i18n";
import type { View } from "@/lib/workspace";

const words = {
  client: ["كل خطواتك في مكان واحد", "Vos démarches, au même endroit", "Your next step, in one place", "Imecwaren-ik deg yiwen n wadeg"],
  pharmacist: ["نظرة على عمل صيدليتك", "Votre pharmacie en un coup d’œil", "Your pharmacy at a glance", "Agzul n tsaymit-ik"],
  admin: ["نظرة على المنصة", "Vue de la plateforme", "Your platform at a glance", "Agzul n usmel"],
  searches: ["طلباتك", "Vos demandes", "Your requests", "Tuttriwin-ik"],
  pending: ["طلبات تنتظر المراجعة", "Dossiers à examiner", "Applications to review", "Tuttriwin ara tettwasneqden"],
  users: ["المستخدمون", "Utilisateurs", "Users", "Iseqdacen"],
  activity: ["العمليات المتاحة لك", "Activité accessible", "Accessible activity", "Armud yellan"],
  stock: ["أصناف المخزون اليدوي", "Références du stock manuel", "Manual stock items", "Iferdisen n uxezzen"],
  motion: ["تأثير مرئي", "Effet visuel", "Visual effect", "Timeẓri"],
  empty: ["ابدأ بالبحث باسم دواء ومنطقتك.", "Commencez par un médicament et votre zone.", "Start with a medicine name and your area.", "Bdu s yisem n ddwa d temnaḍt-ik."],
} as const;

/** Optional decoration only: no patient data, coordinates, textures or network calls. */
function AmbientField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, gl = element?.getContext("webgl", { alpha: true, antialias: false, preserveDrawingBuffer: false });
    if (!element || !gl) return;
    const compile = (type: number, source: string) => { const shader = gl.createShader(type); if (!shader) return null; gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; } return shader; };
    const vertex = compile(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"), fragment = compile(gl.FRAGMENT_SHADER, "precision mediump float;uniform float t;uniform vec2 r;void main(){vec2 p=gl_FragCoord.xy/r;float a=.05+.07*sin(p.x*7.+t*.35)*cos(p.y*6.-t*.2);gl_FragColor=vec4(.22,.64,.47,max(0.,a));}");
    if (!vertex || !fragment) { if (vertex) gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment); return; }
    const program = gl.createProgram(), buffer = gl.createBuffer();
    if (!program || !buffer) { if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer); gl.deleteShader(vertex); gl.deleteShader(fragment); return; }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); return; }
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p"), time = gl.getUniformLocation(program, "t"), resolution = gl.getUniformLocation(program, "r");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, last = 0, lost = false;
    const draw = (stamp: number) => { if (lost || document.hidden || reduced.matches) return; if (stamp - last >= 50) { last = stamp; gl.uniform1f(time, stamp / 1000); gl.drawArrays(gl.TRIANGLES, 0, 6); } frame = requestAnimationFrame(draw); };
    const restart = () => { cancelAnimationFrame(frame); if (!document.hidden && !reduced.matches && !lost) frame = requestAnimationFrame(draw); };
    const resize = new ResizeObserver(entries => { const rect = entries[0].contentRect; element.width = Math.max(1, Math.round(rect.width)); element.height = Math.max(1, Math.round(rect.height)); gl.viewport(0, 0, element.width, element.height); gl.uniform2f(resolution, element.width, element.height); }); resize.observe(element);
    const onLost = () => { lost = true; cancelAnimationFrame(frame); }; element.addEventListener("webglcontextlost", onLost); document.addEventListener("visibilitychange", restart); reduced.addEventListener("change", restart); restart();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); element.removeEventListener("webglcontextlost", onLost); document.removeEventListener("visibilitychange", restart); reduced.removeEventListener("change", restart); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); gl.getExtension("WEBGL_lose_context")?.loseContext(); };
  }, []);
  return <canvas ref={canvas} aria-hidden="true" className="workspace-ambient" />;
}

export function WorkspaceOverview({ data, language, now, view, lessMotion, navigate, onPharmacyTab }: { data: AppData; language: Language; now: number; view: View; lessMotion: boolean; navigate: (view: View) => void; onPharmacyTab: (tab: "inbox" | "pickup" | "stock") => void }) {
  const [effect, setEffect] = useState(false), role = data.role, i = language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3;
  const t = (key: keyof typeof words) => words[key][i], count = (value: number) => value.toLocaleString(language === "kab" ? "fr-DZ" : language);
  if (!((role === "client" && view === "search") || (role === "pharmacist" && view === "pharmacy" && data.ownPharmacy?.status === "approved") || (role === "admin" && view === "admin" && data.admin))) return null;
  const active = data.reservations.filter(item => item.status === "active" && item.expires > now).length;
  const analytics = data.admin?.access.isOwner || data.admin?.access.permissions.includes("analytics");
  const metrics = role === "client" ? [
    { label: t("searches"), value: data.requests.length, icon: Search, action: () => navigate("bookings") },
    { label: tr(language, "bookings"), value: active, icon: BookmarkCheck, action: () => navigate("bookings") },
  ] : role === "pharmacist" ? [
    { label: tr(language, "inbox"), value: data.staffRequests.filter(item => item.status === "pending").length, icon: ClipboardList, action: () => onPharmacyTab("inbox") },
    { label: tr(language, "pickup"), value: data.staffBookings.filter(item => item.status === "active" && item.expires > now).length, icon: BookmarkCheck, action: () => onPharmacyTab("pickup") },
    { label: t("stock"), value: data.stock.length, icon: Package, action: () => onPharmacyTab("stock") },
  ] : analytics ? [
    { label: t("users"), value: data.admin!.users, icon: Users },
    { label: tr(language, "search"), value: data.admin!.searches, icon: ChartNoAxesCombined },
    ...(data.admin!.access.isOwner || data.admin!.access.permissions.includes("pharmacies") ? [{ label: t("pending"), value: data.admin!.applicationsCount, icon: Store }] : []),
  ] : [{ label: t("activity"), value: data.admin!.activity.length, icon: ShieldCheck }];
  return <section className="workspace-overview" aria-label={t(role)}>{effect && !lessMotion && <AmbientField />}<div className="workspace-overview-heading"><h2>{t(role)}</h2>{!lessMotion && <button className="workspace-effect-toggle" aria-label={t("motion")} aria-pressed={effect} onClick={() => setEffect(value => !value)}><Sparkles aria-hidden="true" /><span>{t("motion")}</span></button>}</div><div className="workspace-metric-grid">{metrics.map(metric => { const Icon = metric.icon; const body = <><span className="workspace-metric-icon"><Icon aria-hidden="true" /></span><span className="workspace-metric-copy"><span>{metric.label}</span><strong>{count(metric.value)}</strong></span>{"action" in metric && <ArrowUpRight aria-hidden="true" />}</>; return "action" in metric ? <button key={metric.label} onClick={metric.action}>{body}</button> : <div key={metric.label}>{body}</div>; })}</div>{role === "client" && !data.requests.length && <p>{t("empty")}</p>}</section>;
}

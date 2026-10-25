"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Language } from "@/lib/i18n";

const frameDocument = '<!doctype html><html><head><title>LQADWA page preview</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="canvas-root"></div></body></html>';

/** A real viewport makes the preview use the same responsive rules as the public site. */
export function LandingEditorCanvas({ width, zoom, theme, language, title, children, onEscape }: {
  width: number; zoom: number | "fit"; theme: "light" | "dark"; language: Language; title: string; children: ReactNode; onEscape:()=>void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 640, height: 800 });
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!mount) return;
    const html = frame.current?.contentDocument?.documentElement;
    if (!html) return;
    html.lang = language; html.dir = language === "ar" ? "rtl" : "ltr"; html.dataset.theme = theme;
  }, [mount, language, theme]);
  useEffect(()=>{
    const doc=frame.current?.contentDocument;if(!mount||!doc)return;
    const handle=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();onEscape();}};
    doc.addEventListener("keydown",handle,true);document.addEventListener("keydown",handle,true);
    return()=>{doc.removeEventListener("keydown",handle,true);document.removeEventListener("keydown",handle,true);};
  },[mount,onEscape]);
  const scale = zoom === "fit" ? Math.min(1, Math.max(0.15, (size.width - 40) / width)) : zoom;
  const height = Math.max(640, (size.height - 40) / scale);
  return <div className="builder-canvas-stage" ref={stage} data-editor-scroll>
    <div className="builder-canvas-scaler" style={{ width: width * scale, height: height * scale }}>
      {/* This is a viewport for trusted React components, never arbitrary CMS HTML.
          WebKit suppresses parent-registered handlers in a script-disabled frame. */}
      <iframe ref={frame} title={title} srcDoc={frameDocument} sandbox="allow-same-origin allow-scripts" className="builder-canvas-frame"
        style={{ width, height, transform: `scale(${scale})` }} onLoad={event => {
          const doc = event.currentTarget.contentDocument;
          if (!doc) return;
          for (const source of document.querySelectorAll('link[rel="stylesheet"], style')) {
            const clone = source.cloneNode(true) as HTMLElement;
            if (source instanceof HTMLLinkElement) (clone as HTMLLinkElement).href = source.href;
            doc.head.appendChild(clone);
          }
          setMount(doc.getElementById("canvas-root"));
        }} />
      {mount && createPortal(children, mount)}
    </div>
  </div>;
}

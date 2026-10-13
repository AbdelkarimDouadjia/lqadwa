"use client";
import { version } from "@/package.json";
import { Mail,AtSign as Instagram,MessageCircle as Facebook,ShieldCheck,ArrowUp,MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { designText } from "@/lib/design-copy";
import { ex } from "@/lib/experience-copy";
import { siteInformation } from "@/lib/site-information";
import type { AppData } from "@/lib/domain";
import type { Language } from "@/lib/i18n";
export function SiteFooter({language,signedOut,role}:{language:Language;signedOut:boolean;role:AppData["role"]}){
 const t=(key:Parameters<typeof designText>[1])=>designText(language,key);
 const social=[{name:"Instagram",url:siteInformation.instagram,Icon:Instagram},{name:"Facebook",url:siteInformation.facebook,Icon:Facebook}].filter(s=>s.url);
 return <footer className="product-footer"><div className="footer-top"><div className="footer-brand"><span className="brand-tile"><img src="/brand/luqya.png" width="44" height="44" alt=""/></span><div><strong>LQADWA<span>.</span></strong><p>{t("tagline")}</p></div></div><Button variant="outline" onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset.lessMotion==="true"?"auto":"smooth"})}><ArrowUp/>{t("home")}</Button></div><div className="footer-columns"><section><h2>{t("product")}</h2><a href={signedOut?"#how-it-works":role==="admin"?"/operations":role==="pharmacist"?"/?space=pharmacy#pharmacy":"/?space=search#search"}>{signedOut?ex(language,"how"):t("home")}</a>{(signedOut||role==="client")&&<a href="/login?mode=register&return_to=%2F%3Fspace%3Dpharmacy">{t("join")}</a>}<a href={`/downloads/lqadwa-release.apk?v=${version}`}>{t("download")}</a><span><MapPin/>{t("region")}</span></section><section><h2>{t("help")}</h2><a href={`mailto:${siteInformation.supportEmail}`}><Mail/>{t("email")}</a><a className="footer-email" dir="ltr" href={`mailto:${siteInformation.supportEmail}`}>{siteInformation.supportEmail}</a><a href="/privacy">{t("privacy")}</a>{!signedOut&&<a href="/account-data">{t("data")}</a>}</section><section><h2>{t("connect")}</h2>{social.length?social.map(({name,url,Icon})=><a href={url} target="_blank" rel="noopener noreferrer" key={name}><Icon/>{name}</a>):<><div className="social-coming"><Instagram/><Facebook/></div><p>{t("socials")}</p></>}<span className="footer-pickup"><ShieldCheck/>{ex(language,"clientFree")}</span></section></div><div className="footer-bottom"><small>© {new Date().getFullYear()} LQADWA · {t("rights")}</small><p>{t("note")}</p></div></footer>;
}

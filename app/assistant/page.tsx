import type { Metadata } from "next";
import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { publicLanguage } from "@/lib/public-page";
import { assistantPolicy } from "@/lib/assistant-contract";
import { AssistantChat } from "@/components/assistant-chat";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"LQADWA · Assistant",robots:{index:false,follow:false}};
export default async function AssistantPage({searchParams}:{searchParams:Promise<{lang?:string}>}) {
  const query=await searchParams, store=await cookies();
  const language=publicLanguage(query.lang,publicLanguage(store.get("lqadwa-language")?.value));
  return <AssistantChat key={language} language={language} initialDark={store.get("lqadwa-theme")?.value==="dark"} enabled={assistantPolicy(env).enabled}/>;
}

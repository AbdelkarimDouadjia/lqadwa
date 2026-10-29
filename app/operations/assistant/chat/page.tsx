import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {env} from "cloudflare:workers";
import {getAppUser} from "@/lib/auth";
import {identity,isRootAdmin} from "@/lib/access";
import {recentPrivilegedSession} from "@/lib/privileged-access";
import {publicLanguage} from "@/lib/public-page";
import {AssistantChat} from "@/components/assistant-chat";
export const dynamic="force-dynamic";
export const metadata={title:"LQADWA · Owner assistant",robots:{index:false,follow:false}};
export default async function OwnerChat({searchParams}:{searchParams:Promise<{lang?:string}>}){
  if(!await getAppUser())redirect("/operations/login");
  let owner="";try{const user=await identity();if(!isRootAdmin(user.userId))notFound();owner=user.userId;}catch{notFound();}
  if(!await recentPrivilegedSession(owner))redirect("/operations/security");
  const query=await searchParams,store=await cookies(),language=publicLanguage(query.lang,publicLanguage(store.get("lqadwa-language")?.value));
  return <AssistantChat key={language} language={language} initialDark={store.get("lqadwa-theme")?.value==="dark"} enabled={env.ASSISTANT_NVIDIA_EVALUATION_ENABLED==="true"} chatEnabled evaluation/>;
}

import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {getAppUser} from "@/lib/auth";
import {identity,isRootAdmin} from "@/lib/access";
import {recentPrivilegedSession} from "@/lib/privileged-access";
import {publicLanguage} from "@/lib/public-page";
import {AdminAssistantSettings} from "@/components/admin-assistant-settings";
export const dynamic="force-dynamic";
export const metadata={title:"LQADWA · Assistant settings",robots:{index:false,follow:false}};
export default async function AssistantSettingsPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
 if(!await getAppUser())redirect("/operations/login");
 let owner="";try{const user=await identity();if(!isRootAdmin(user.userId))notFound();owner=user.userId;}catch{notFound();}
 if(!await recentPrivilegedSession(owner))redirect("/operations/security");
 const query=await searchParams,store=await cookies(),language=publicLanguage(query.lang,publicLanguage(store.get("lqadwa-language")?.value));
 return <AdminAssistantSettings language={language}/>;
}

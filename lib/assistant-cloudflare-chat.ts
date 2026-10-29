import {z} from "zod";
export const cloudflareChatModel="@cf/qwen/qwen3-30b-a3b-fp8";
export function cloudflareChatAuthorized(evaluation:boolean,config:{ASSISTANT_CLOUDFLARE_CHAT_ENABLED?:string;ASSISTANT_CLOUDFLARE_FREE_CONFIRMED?:string;ASSISTANT_CLOUDFLARE_CHAT_ACCEPTANCE_REFERENCE?:string}){return config.ASSISTANT_CLOUDFLARE_CHAT_ENABLED==="true"&&config.ASSISTANT_CLOUDFLARE_FREE_CONFIRMED==="true"&&(evaluation||(config.ASSISTANT_CLOUDFLARE_CHAT_ACCEPTANCE_REFERENCE?.trim().length||0)>=8);}
type Messages={role:"system"|"user";content:string}[];
type ChatBinding={run:(model:typeof cloudflareChatModel,input:{messages:Messages;max_tokens:number;temperature:number;stream:false;response_format:{type:"json_object"}},options:{signal:AbortSignal})=>Promise<unknown>};
export function cloudflareChatRunner(binding:ChatBinding){
  return async(messages:Messages,signal:AbortSignal)=>{
    const result=await binding.run(cloudflareChatModel,{messages:messages.map(message=>message.role==="system"?{...message,content:message.content+" /no_think"}:message),max_tokens:768,temperature:0.2,stream:false,response_format:{type:"json_object"}},{signal});
    // The binding has returned both completion-shaped and legacy response-shaped outputs across runtime versions.
    const output=z.union([z.object({response:z.string().max(5000)}),z.object({choices:z.array(z.object({message:z.object({content:z.string().max(5000)}),finish_reason:z.string().optional()})).min(1).max(1)})]).parse(result);
    if("response"in output)return output.response;
    if(output.choices[0].finish_reason==="length")throw Error("Chat output was truncated");
    return output.choices[0].message.content;
  };
}

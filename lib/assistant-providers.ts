import {z} from "zod";
export const providerId=z.enum(["openrouter","openai","anthropic","gemini","groq","mistral","deepseek"]);
export type AssistantProvider=z.infer<typeof providerId>;
export const providers = {
  openrouter:{name:"OpenRouter",url:"https://openrouter.ai/api/v1/key",keyUrl:"https://openrouter.ai/settings/keys"},
  openai:{name:"OpenAI",url:"https://api.openai.com/v1/models",keyUrl:"https://platform.openai.com/api-keys"},
  anthropic:{name:"Anthropic",url:"https://api.anthropic.com/v1/models",keyUrl:"https://console.anthropic.com/settings/keys"},
  gemini:{name:"Google Gemini",url:"https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",keyUrl:"https://aistudio.google.com/apikey"},
  groq:{name:"Groq",url:"https://api.groq.com/openai/v1/models",keyUrl:"https://console.groq.com/keys"},
  mistral:{name:"Mistral",url:"https://api.mistral.ai/v1/models",keyUrl:"https://console.mistral.ai/api-keys"},
  deepseek:{name:"DeepSeek",url:"https://api.deepseek.com/models",keyUrl:"https://platform.deepseek.com/api_keys"},
} as const;
export const providerCommand=z.discriminatedUnion("action",[
  z.object({action:z.literal("save"),provider:providerId,revision:z.number().int().min(0),apiKey:z.string().trim().min(16).max(512).regex(/^[A-Za-z0-9_.-]+$/)}).strict(),
  z.object({action:z.literal("test"),provider:providerId,revision:z.number().int().min(1),publicEvidenceConsent:z.literal(true)}).strict(),
  z.object({action:z.literal("enable"),provider:z.literal("openrouter"),revision:z.number().int().min(1),publicEvidenceConsent:z.literal(true)}).strict(),
  z.object({action:z.enum(["disable","remove"]),provider:providerId,revision:z.number().int().min(1)}).strict(),
]);
export type ProviderStatus={provider:AssistantProvider;configured:boolean;revision:number;enabled:boolean;testedAt:number;updatedAt:number;tested:boolean};
export type ProviderSettings={encryptionReady:boolean;storageReady:boolean;externalEnabled:boolean;items:ProviderStatus[];nvidiaEvaluation?:{configured:boolean;enabled:boolean};chatFallbackAuthorized?:boolean;cloudflareChat?:{bound:boolean;enabled:boolean;freeConfirmed:boolean;publicAuthorized:boolean}};

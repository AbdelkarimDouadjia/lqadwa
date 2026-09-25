import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { DeviceConnect } from "@/components/device-connect";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
async function Connected({ id }: { id: string }) { await requireChatGPTUser(`/connect?id=${encodeURIComponent(id)}`); return <DeviceConnect id={id} />; }
export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) { const { id = "" } = await searchParams; return <Connected id={id} />; }

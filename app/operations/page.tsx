import { notFound, redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth";
import { isAdmin, identity } from "@/lib/access";
import HomePage from "@/components/lqadwa-app";
import { recentPrivilegedSession } from "@/lib/privileged-access";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function OperationsPage() {
  if (!await getAppUser()) redirect("/operations/login");
  try { const user = await identity(); if (!await isAdmin(user.userId)) notFound(); } catch { notFound(); }
  if (!await recentPrivilegedSession((await identity()).userId)) redirect("/operations/security");
  return <HomePage initialView="admin" />;
}

import { notFound, redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth";
import { isAdmin, identity } from "@/lib/access";
import HomePage from "@/app/page";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function OperationsPage() {
  if (!await getAppUser()) redirect("/operations/login");
  try { const user = await identity(); if (!await isAdmin(user.userId)) notFound(); } catch { notFound(); }
  return <HomePage initialView="admin" />;
}

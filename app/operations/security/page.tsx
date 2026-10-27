import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth";
import { AdminSecurity } from "@/components/admin-security";
export const dynamic = "force-dynamic";
export const metadata = { title: "LQADWA · Account security", robots: { index: false, follow: false } };
export default async function SecurityPage() {
  if (!await getAppUser()) redirect("/operations/login");
  return <AdminSecurity/>;
}

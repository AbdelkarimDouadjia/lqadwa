import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "LQADWA", robots: { index: false, follow: false } };
export default function LogoutPage() { return <AuthForm initialMode="logout" />; }

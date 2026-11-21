import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => pageHead("Sign in", "Sign in to your private MediVault medical record."),
  component: () => <AuthPage mode="login" />,
});
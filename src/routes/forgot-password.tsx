import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => pageHead("Reset your password", "Request a secure password reset for your MediVault account."),
  component: () => <AuthPage mode="forgot" />,
});
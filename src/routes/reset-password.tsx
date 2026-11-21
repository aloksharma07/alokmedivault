import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => pageHead("Choose a new password", "Set a new password for your MediVault account."),
  component: () => <AuthPage mode="reset" />,
});
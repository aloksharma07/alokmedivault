import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/register")({
  head: () => pageHead("Create an account", "Create a patient or clinician account for MediVault."),
  component: () => <AuthPage mode="register" />,
});
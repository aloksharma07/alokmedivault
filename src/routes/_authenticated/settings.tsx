import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => pageHead("Account settings", "Change your MediVault sign-in password."),
  component: () => <WorkspacePage section="settings" />,
});
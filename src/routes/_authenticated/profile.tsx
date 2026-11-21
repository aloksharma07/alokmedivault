import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => pageHead("My profile", "Manage your MediVault contact details and health profile."),
  component: () => <WorkspacePage section="profile" />,
});
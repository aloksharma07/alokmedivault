import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => pageHead("System activity logs", "Search account and report activity across MediVault."),
  component: () => <WorkspacePage section="admin-activity" />,
});
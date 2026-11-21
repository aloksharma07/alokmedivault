import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => pageHead("Administration overview", "Review MediVault account, report, and category statistics."),
  component: () => <WorkspacePage section="admin-dashboard" />,
});
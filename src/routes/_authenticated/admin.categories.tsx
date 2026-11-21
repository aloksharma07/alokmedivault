import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => pageHead("Report categories", "Add, rename, and maintain medical report categories."),
  component: () => <WorkspacePage section="admin-categories" />,
});
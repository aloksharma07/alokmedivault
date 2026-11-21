import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/users/")({
  head: () => pageHead("Manage users", "Search user accounts and manage active access."),
  component: () => <WorkspacePage section="admin-users" />,
});
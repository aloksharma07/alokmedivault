import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => pageHead("Health overview", "Review your report library, recent activity, and health timeline."),
  component: () => <WorkspacePage section="dashboard" />,
});
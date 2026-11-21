import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => pageHead("Activity history", "Review recent actions on your MediVault account and reports."),
  component: () => <WorkspacePage section="activities" />,
});
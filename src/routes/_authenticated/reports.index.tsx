import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => pageHead("My reports", "Search, filter, and organize your private medical reports."),
  component: () => <WorkspacePage section="reports" />,
});
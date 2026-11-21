import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/compare")({
  head: () => pageHead("Compare reports", "Compare two different reports from the same category."),
  component: () => <WorkspacePage section="compare" />,
});
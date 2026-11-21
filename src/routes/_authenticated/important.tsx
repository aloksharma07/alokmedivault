import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/important")({
  head: () => pageHead("Important reports", "Keep starred reports close for quick access."),
  component: () => <WorkspacePage section="important" />,
});
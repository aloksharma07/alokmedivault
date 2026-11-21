import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => pageHead("Medical timeline", "Browse your medical reports in date order."),
  component: () => <WorkspacePage section="timeline" />,
});
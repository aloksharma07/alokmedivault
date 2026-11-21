import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/shared-reports")({
  head: () => pageHead("Shared access", "Review or revoke access to reports you have shared with clinicians."),
  component: () => <WorkspacePage section="shares" />,
});
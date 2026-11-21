import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/doctor/reports/")({
  head: () => pageHead("Shared reports for clinicians", "Open reports that patients have shared with your account."),
  component: () => <WorkspacePage section="doctor-reports" />,
});
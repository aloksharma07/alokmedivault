import { createFileRoute } from "@tanstack/react-router";
import { ReportDetailsPage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/reports/$reportId/")({
  head: () => pageHead("Report details", "Review the details and access settings for a medical report."),
  component: ReportRoute,
});

function ReportRoute() {
  const { reportId } = Route.useParams();
  return <ReportDetailsPage reportId={reportId} />;
}
import { createFileRoute } from "@tanstack/react-router";
import { ReportEditPage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/reports/$reportId/edit")({
  head: () => pageHead("Edit report details", "Update the information saved with a medical report."),
  component: EditReportRoute,
});

function EditReportRoute() {
  const { reportId } = Route.useParams();
  return <ReportEditPage reportId={reportId} />;
}
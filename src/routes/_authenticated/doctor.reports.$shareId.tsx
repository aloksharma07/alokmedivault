import { createFileRoute } from "@tanstack/react-router";
import { DoctorShareDetailsPage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/doctor/reports/$shareId")({
  head: () => pageHead("Shared report details", "Review a report shared with your clinician account."),
  component: DoctorShareRoute,
});

function DoctorShareRoute() {
  const { shareId } = Route.useParams();
  return <DoctorShareDetailsPage shareId={shareId} />;
}
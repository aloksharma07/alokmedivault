import { createFileRoute } from "@tanstack/react-router";
import { QrPatientPortal } from "@/components/medivault-pages";
import { qrPatientQueryOptions } from "@/lib/medivault";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/doctor/qr-access/$qrToken")({
  head: () => pageHead("Patient QR report portal", "Open medical reports shared through a patient's current QR access code."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(qrPatientQueryOptions(params.qrToken)),
  component: QrPatientRoute,
});

function QrPatientRoute() {
  const { qrToken } = Route.useParams();
  return <QrPatientPortal qrToken={qrToken} />;
}
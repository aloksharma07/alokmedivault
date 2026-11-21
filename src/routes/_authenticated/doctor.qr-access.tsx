import { createFileRoute } from "@tanstack/react-router";
import { QrAccessStart } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/doctor/qr-access")({
  head: () => pageHead("Patient QR access", "Open a patient record using their current MediVault QR access code."),
  component: QrAccessStart,
});
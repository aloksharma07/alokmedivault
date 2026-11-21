import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/doctor/dashboard")({
  head: () => pageHead("Clinician overview", "Review active, expired, and revoked patient report shares."),
  component: () => <WorkspacePage section="doctor-dashboard" />,
});
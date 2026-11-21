import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => pageHead("MediVault medical records", "Keep medical reports organized, searchable, and private. Share individual reports with clinicians for a limited time."),
  component: LandingPage,
});

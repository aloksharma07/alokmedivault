import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/reports/new")({
  head: () => pageHead("Upload a report", "Add a medical report to your private MediVault library."),
  component: () => <WorkspacePage section="upload" />,
});
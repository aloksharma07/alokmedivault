import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, Download, FileHeart, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadPublicReportShare } from "@/lib/public-report-share.functions";
import { formatDate, formatDateTime } from "@/lib/medivault";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Shared medical report | MediVault" },
      { name: "description", content: "View a single medical report shared through an expiring MediVault link." },
      { property: "og:title", content: "Shared medical report | MediVault" },
      { property: "og:description", content: "View a single medical report shared through an expiring MediVault link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ params }) => {
    try {
      return await loadPublicReportShare({ data: { token: params.token } });
    } catch {
      return null;
    }
  },
  component: PublicReportPage,
});

function PublicReportPage() {
  const report = Route.useLoaderData();
  if (!report) {
    return <main className="public-share-shell public-share-unavailable">
      <Link to="/" className="public-share-brand">MediVault</Link>
      <span className="eyebrow">LINK UNAVAILABLE</span>
      <h1>This report link is unavailable</h1>
      <p>It may have expired or been revoked by the person who shared it.</p>
      <Button asChild variant="outline"><Link to="/">Return to MediVault</Link></Button>
    </main>;
  }

  return <main className="public-share-shell">
    <header className="public-share-header">
      <Link to="/" className="public-share-brand">MediVault</Link>
      <span className="public-share-label"><LockKeyhole size={15} /> SECURE REPORT LINK</span>
    </header>
    <section className="public-report-heading">
      <div>
        <span className="eyebrow">SHARED MEDICAL REPORT</span>
        <h1>{report.title}</h1>
        <p><FileHeart size={15} /> {report.category} <span>·</span> {formatDate(report.reportDate)} <span>·</span> {report.fileName}</p>
      </div>
      <span className="public-share-expiry"><Clock3 size={15} /> Expires {formatDateTime(report.expiresAt)}</span>
    </section>
    <section className="public-report-viewer" aria-label="Medical report preview">
      <div className="public-report-toolbar">
        <strong>{report.fileName}</strong>
        <Button asChild variant="outline" size="sm"><a href={report.signedUrl} target="_blank" rel="noreferrer" referrerPolicy="no-referrer"><Download size={15} /> Open file</a></Button>
      </div>
      {report.fileType === "pdf"
        ? <iframe title={report.title} src={report.signedUrl} className="public-report-frame" referrerPolicy="no-referrer" />
        : <img src={report.signedUrl} alt={report.title} className="public-report-image" referrerPolicy="no-referrer" />}
    </section>
    <p className="public-share-note"><LockKeyhole size={15} /> This link provides access to this report only. It expires {formatDateTime(report.expiresAt)}.</p>
  </main>;
}
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown,
  Clock3, Copy, Download, Eye, FileHeart, FilePlus2, FileSearch2, HeartPulse, Hospital,
  Image, LockKeyhole, MoreHorizontal, Pencil, QrCode, Search, Share2, ShieldCheck, Sparkles,
  Star, Stethoscope, Trash2, Upload, Users, X, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { explainReportText } from "@/lib/report-ai.functions";
import { limitReportAiText, REPORT_AI_MAX_QUESTION_CHARS } from "@/lib/report-ai.shared";
import {
  canCompareReports, formatDate, formatDateTime, formatSize, getShareStatus, initials,
  qrPatientQueryOptions, REPORT_MAX_BYTES, validateReportFile, validateShareExpiry,
  workspaceQueryOptions, type Activity as ActivityRow, type AdminUser, type Category,
  type DoctorDirectoryEntry, type DoctorShare, type PatientShare, type PublicShare, type Report,
  type UserRole, type WorkspaceData,
} from "@/lib/medivault";

type Section = "dashboard" | "reports" | "important" | "upload" | "timeline" | "compare" | "shares" | "activities" | "profile" | "settings" | "doctor-dashboard" | "doctor-reports" | "admin-dashboard" | "admin-users" | "admin-categories" | "admin-activity";

function useWorkspace() {
  return useSuspenseQuery(workspaceQueryOptions()).data;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

function Metric({ label, value, icon: Icon, tone = "green" }: { label: string; value: number | string; icon: typeof FileHeart; tone?: string }) {
  return <div className="metric-tile"><span className={`metric-icon tone-${tone}`}><Icon size={19} /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-mark"><FileSearch2 size={22} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function StatusPill({ status }: { status: string }) {
  const label = status === "active" ? "Active" : status === "expired" ? "Expired" : "Revoked";
  return <span className={`status-pill status-${status}`}>{label}</span>;
}

function categoryIcon(icon: string) {
  if (icon === "droplet") return <Activity size={17} />;
  if (icon === "image") return <Image size={17} />;
  if (icon === "pill") return <Activity size={17} />;
  if (icon === "clipboard") return <FileHeart size={17} />;
  return <FileHeart size={17} />;
}

function ReportRow({ report, category, showStar = true, onStar, onPreview }: { report: Report; category?: Category | undefined; showStar?: boolean; onStar?: () => void; onPreview?: () => void }) {
  return <div className="report-row">
    <span className="report-category-icon">{categoryIcon(category?.icon ?? "file")}</span>
    <Link to="/reports/$reportId" params={{ reportId: report.id }} className="report-row-main">
      <strong>{report.title}</strong><span>{category?.name ?? "Report"} · {report.hospital_name || report.laboratory_name || "Clinic not specified"}</span>
    </Link>
    <span className="report-row-date">{formatDate(report.report_date)}</span>
    {onPreview && <Button variant="ghost" size="icon" title="Preview report" aria-label={`Preview ${report.title}`} onClick={onPreview}><Eye size={16} /></Button>}
    {showStar && <Button variant="ghost" size="icon" className={report.is_important ? "star-button is-starred" : "star-button"} aria-label={report.is_important ? "Remove from important reports" : "Mark as important"} onClick={onStar}><Star size={17} fill={report.is_important ? "currentColor" : "none"} /></Button>}
  </div>;
}

function roleCanSee(data: WorkspaceData, roles: UserRole[]) {
  return roles.includes(data.role);
}

function NoAccess() {
  return <div className="page-section"><EmptyState title="This area is not available for your account" detail="Your account does not have permission to open this page." action={<Button asChild><Link to="/dashboard">Return to overview</Link></Button>} /></div>;
}

export function WorkspacePage({ section }: { section: Section }) {
  const data = useWorkspace();
  if (["dashboard", "reports", "important", "upload", "timeline", "compare", "shares", "activities", "profile", "settings"].includes(section)) {
    if (!roleCanSee(data, ["patient"])) return <NoAccess />;
  }
  if (section.startsWith("doctor") && !roleCanSee(data, ["doctor"])) return <NoAccess />;
  if (section.startsWith("admin") && !roleCanSee(data, ["admin"])) return <NoAccess />;

  switch (section) {
    case "dashboard": return <PatientDashboard />;
    case "reports": return <ReportsPage />;
    case "important": return <ImportantPage />;
    case "upload": return <ReportForm />;
    case "timeline": return <TimelinePage />;
    case "compare": return <ComparePage />;
    case "shares": return <PatientSharesPage />;
    case "activities": return <ActivityPage />;
    case "profile": return <ProfilePage />;
    case "settings": return <SettingsPage />;
    case "doctor-dashboard": return <DoctorDashboard />;
    case "doctor-reports": return <DoctorReportsPage />;
    case "admin-dashboard": return <AdminDashboard />;
    case "admin-users": return <AdminUsersPage />;
    case "admin-categories": return <CategoryAdminPage />;
    case "admin-activity": return <AdminActivityPage />;
  }
}

export function ReportDetailsPage({ reportId }: { reportId: string }) {
  const data = useWorkspace();
  if (data.role !== "patient") return <NoAccess />;
  const report = data.reports.find((item) => item.id === reportId);
  if (!report) return <div className="page-section"><EmptyState title="Report not found" detail="This report may have been removed or you may not have access to it." action={<Button asChild variant="outline"><Link to="/reports">Back to reports</Link></Button>} /></div>;
  return <ReportDetails report={report} />;
}

export function ReportEditPage({ reportId }: { reportId: string }) {
  const data = useWorkspace();
  if (data.role !== "patient") return <NoAccess />;
  const report = data.reports.find((item) => item.id === reportId);
  if (!report) return <div className="page-section"><EmptyState title="Report not found" detail="This report may have been removed or you may not have access to it." action={<Button asChild variant="outline"><Link to="/reports">Back to reports</Link></Button>} /></div>;
  return <ReportForm report={report} />;
}

export function DoctorShareDetailsPage({ shareId }: { shareId: string }) {
  const data = useWorkspace();
  if (data.role !== "doctor") return <NoAccess />;
  const share = data.shares.find((item) => "share_id" in item && item.share_id === shareId) as DoctorShare | undefined;
  if (!share) return <div className="page-section"><EmptyState title="Shared report not found" detail="This report may have been removed or it was not shared with your account." action={<Button asChild variant="outline"><Link to="/doctor/reports">Back to shared reports</Link></Button>} /></div>;
  return <DoctorShareDetails share={share} />;
}

export function QrAccessStart() {
  const [token, setToken] = useState("");
  const navigate = useNavigate();
  const data = useWorkspace();
  if (data.role !== "doctor") return <NoAccess />;
  return <div className="page-section narrow-page"><SectionHeading eyebrow="Patient access" title="Open a patient QR link" description="Scan a patient’s MediVault code, or enter the access code from their link." />
    <form className="surface form-stack" onSubmit={(event) => { event.preventDefault(); if (token.trim()) void navigate({ to: "/doctor/qr-access/$qrToken", params: { qrToken: token.trim() } }); }}>
      <div className="form-field"><Label htmlFor="qr-token">Patient access code</Label><Input id="qr-token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste the code from the patient link" required /></div>
      <Button type="submit"><QrCode size={17} /> Open patient records</Button>
    </form>
    <p className="quiet-note"><ShieldCheck size={16} /> Access remains available until the patient regenerates their code.</p>
  </div>;
}

export function QrPatientPortal({ qrToken }: { qrToken: string }) {
  const workspace = useWorkspace();
  const { data } = useSuspenseQuery(qrPatientQueryOptions(qrToken));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [preview, setPreview] = useState<{ url: string; type: string; title: string } | null>(null);
  if (workspace.role !== "doctor") return <NoAccess />;
  const rows = data.reports.filter((report) => {
    const categoryName = data.categories.find((item) => item.id === report.category_id)?.name ?? "";
    const matchQuery = `${report.title} ${report.hospital_name} ${report.laboratory_name} ${report.doctor_name}`.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (!category || report.category_id === category);
  });

  async function openFile(report: Report, download = false) {
    const { data: signed, error } = await supabase.storage.from("medical-reports").createSignedUrl(report.storage_path, 300, { download });
    if (error) { toast.error("This report file is not available."); return; }
    if (download) window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    else setPreview({ url: signed.signedUrl, type: report.file_type, title: report.title });
  }

  return <div className="page-section">
    <div className="patient-access-banner"><div className="access-person"><span className="avatar avatar-large">{initials(data.patient.name)}</span><div><span className="eyebrow">CURRENT QR ACCESS</span><h2>{data.patient.name}</h2><p>{data.patient.patient_code} <span className="dot-separator">·</span> Verified patient link</p></div></div><span className="access-state"><ShieldCheck size={16} /> Access granted</span></div>
    <div className="patient-facts"><div><span>AGE & GENDER</span><strong>{data.patient.age ?? "—"}{data.patient.age !== null ? " yrs" : ""} · {data.patient.gender || "—"}</strong></div><div><span>PHONE</span><strong>{data.patient.phone || "—"}</strong></div><div><span>EMERGENCY CONTACT</span><strong>{data.patient.emergency_contact || "—"}</strong></div><div className="patient-fact-wide"><span>MEDICAL INFORMATION</span><p>{data.patient.medical_info || "No critical information noted."}</p></div></div>
    <SectionHeading eyebrow="Patient records" title={`${rows.length} report${rows.length === 1 ? "" : "s"}`} description="Access is available until the patient replaces this QR code." />
    <div className="filter-toolbar"><div className="search-control"><Search size={17} /><Input aria-label="Search patient reports" placeholder="Search reports" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="field-control" aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
    <div className="surface list-surface">{rows.length ? rows.map((report) => {
      const cat = data.categories.find((item) => item.id === report.category_id);
      return <div className="report-row" key={report.id}><span className="report-category-icon">{categoryIcon(cat?.icon ?? "file")}</span><div className="report-row-main"><strong>{report.title}</strong><span>{cat?.name ?? "Report"} · {report.hospital_name || report.laboratory_name || "Clinic not specified"}</span></div><span className="report-row-date">{formatDate(report.report_date)}</span><Button variant="outline" size="sm" onClick={() => void openFile(report)}><Eye size={15} /> Preview</Button><Button variant="ghost" size="icon" title="Download report" aria-label={`Download ${report.title}`} onClick={() => void openFile(report, true)}><Download size={16} /></Button></div>;
    }) : <EmptyState title="No reports found" detail="No reports match this search." />}</div>
    {preview && <PreviewDialog preview={preview} onClose={() => setPreview(null)} />}
  </div>;
}

function PatientDashboard() {
  const data = useWorkspace();
  const patient = data.patient;
  const reports = data.reports;
  const important = reports.filter((item) => item.is_important);
  const activeShares = data.shares.filter((share) => "effective_status" in share && getShareStatus(share, Date.now()) === "active");
  const hospitals = new Set(reports.flatMap((report) => [report.hospital_name, report.laboratory_name]).filter(Boolean)).size;
  const doctorCount = new Set(reports.map((report) => report.doctor_name).filter(Boolean)).size;
  const monthCounts = new Map<string, number>();
  for (const report of reports) {
    const month = report.report_date.slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }
  const chartRows = [...monthCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const maxMonthCount = Math.max(1, ...chartRows.map(([, count]) => count));
  const categoryCounts = data.categories.map((category) => ({ category, count: reports.filter((report) => report.category_id === category.id).length })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((item) => item.count));

  return <div className="page-section">
    <div className="welcome-strip"><div><span className="eyebrow">YOUR HEALTH RECORD</span><h2>Good to see you, {data.profile.name.split(/\s+/)[0]}.</h2><p>Your reports are organized and ready when you need them.</p></div><Button asChild><Link to="/reports/new"><FilePlus2 size={17} /> Add a report</Link></Button></div>
    <div className="metric-grid"><Metric label="Total reports" value={reports.length} icon={FileHeart} /><Metric label="Important" value={important.length} icon={Star} tone="coral" /><Metric label="Hospitals & labs" value={hospitals} icon={Hospital} tone="blue" /><Metric label="Clinicians noted" value={doctorCount} icon={Stethoscope} tone="gold" /></div>
    <div className="dashboard-grid">
      <section className="surface dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR HISTORY</span><h3>Reports over time</h3></div><Link to="/timeline" className="text-link">Open timeline <ArrowRight size={14} /></Link></div>
        {chartRows.length ? <div className="month-chart" aria-label="Reports per month">{chartRows.map(([month, count]) => <div className="month-bar" key={month}><strong>{count}</strong><span className="bar-rail"><i style={{ height: `${Math.max(8, count / maxMonthCount * 100)}%` }} /></span><small>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${month}-15T12:00:00`))}</small></div>)}</div> : <EmptyState title="Your timeline starts here" detail="Add a report and it will appear in your health history." action={<Button size="sm" asChild><Link to="/reports/new">Add a report</Link></Button>} />}
      </section>
      <section className="surface dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">BY CATEGORY</span><h3>Report library</h3></div><span className="count-chip">{reports.length} total</span></div>
        {categoryCounts.length ? <div className="category-chart">{categoryCounts.map(({ category, count }) => <div className="category-bar-row" key={category.id}><span>{category.name}</span><div className="category-bar-track"><i style={{ width: `${count / maxCategoryCount * 100}%` }} /></div><strong>{count}</strong></div>)}</div> : <EmptyState title="No categories yet" detail="Uploaded reports will be grouped here." />}
      </section>
    </div>
    <div className="dashboard-grid dashboard-grid-bottom">
      <section className="surface dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">LATEST</span><h3>Recent reports</h3></div><Link to="/reports" className="text-link">View all <ArrowRight size={14} /></Link></div>{reports.slice(0, 5).map((report) => <ReportRow key={report.id} report={report} category={data.categories.find((item) => item.id === report.category_id)} />)}{!reports.length && <EmptyState title="No reports yet" detail="Upload your first medical report to begin." action={<Button size="sm" asChild><Link to="/reports/new">Upload report</Link></Button>} />}</section>
      <div className="dashboard-side-stack"><section className="surface dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">QUICK ACCESS</span><h3>Important reports</h3></div><Link to="/important" className="text-link">View all <ArrowRight size={14} /></Link></div>{important.slice(0, 3).map((report) => <ReportRow key={report.id} report={report} category={data.categories.find((item) => item.id === report.category_id)} />)}{!important.length && <p className="quiet-note">Star any report to keep it close.</p>}</section>
        <section className="share-summary"><span className="share-summary-icon"><ShieldCheck size={19} /></span><div><strong>{activeShares.length} active share{activeShares.length === 1 ? "" : "s"}</strong><small>Only the reports you choose are shared.</small></div><Button variant="ghost" size="icon" asChild aria-label="View shared access"><Link to="/shared-reports"><ArrowRight size={17} /></Link></Button></section></div>
    </div>
    {patient && <p className="health-disclaimer"><LockKeyhole size={14} /> MediVault keeps records organized; it does not provide medical advice or diagnosis.</p>}
  </div>;
}

function ReportsPage({ onlyImportant = false }: { onlyImportant?: boolean }) {
  const data = useWorkspace();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [hospital, setHospital] = useState("");
  const [doctor, setDoctor] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState("newest");
  const [preview, setPreview] = useState<{ url: string; type: string; title: string } | null>(null);
  const reports = data.reports.filter((report) => {
    if (onlyImportant && !report.is_important) return false;
    const searchIn = `${report.title} ${report.hospital_name} ${report.laboratory_name} ${report.doctor_name}`.toLowerCase();
    return searchIn.includes(query.toLowerCase()) && (!category || report.category_id === category)
      && (!hospital || report.hospital_name === hospital || report.laboratory_name === hospital)
      && (!doctor || report.doctor_name === doctor) && (!fromDate || report.report_date >= fromDate) && (!toDate || report.report_date <= toDate);
  }).sort((a, b) => sort === "oldest" ? a.report_date.localeCompare(b.report_date) : sort === "uploaded" ? b.uploaded_at.localeCompare(a.uploaded_at) : b.report_date.localeCompare(a.report_date));
  const hospitals = [...new Set(data.reports.flatMap((item) => [item.hospital_name, item.laboratory_name]).filter(Boolean))].sort();
  const doctors = [...new Set(data.reports.map((item) => item.doctor_name).filter(Boolean))].sort();

  async function toggleImportant(report: Report) {
    const { error } = await supabase.from("reports").update({ is_important: !report.is_important }).eq("id", report.id);
    if (error) toast.error(error.message);
    else {
      await supabase.rpc("log_activity", { _action: "Report edited", _details: `${report.is_important ? "Removed from" : "Marked as"} important: ${report.title}`, _report_id: report.id });
      await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
    }
  }

  async function previewReport(report: Report) {
    const { data: signed, error } = await supabase.storage.from("medical-reports").createSignedUrl(report.storage_path, 300);
    if (error) { toast.error(error.message || "The report file could not be opened."); return; }
    setPreview({ url: signed.signedUrl, type: report.file_type, title: report.title });
  }

  return <div className="page-section"><SectionHeading eyebrow={onlyImportant ? "PINNED FOR QUICK ACCESS" : "YOUR LIBRARY"} title={onlyImportant ? "Important reports" : "My reports"} description={onlyImportant ? "Reports you have marked for quick access." : `${data.reports.length} report${data.reports.length === 1 ? "" : "s"} in your private library.`} action={<Button asChild><Link to="/reports/new"><FilePlus2 size={17} /> Add report</Link></Button>} />
    <div className="filter-toolbar"><div className="search-control"><Search size={17} /><Input aria-label="Search reports" placeholder="Search title, hospital, or doctor" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="field-control" aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="field-control" aria-label="Hospital or laboratory" value={hospital} onChange={(event) => setHospital(event.target.value)}><option value="">All locations</option>{hospitals.map((item) => <option key={item} value={item}>{item}</option>)}</select><select className="field-control" aria-label="Doctor" value={doctor} onChange={(event) => setDoctor(event.target.value)}><option value="">All doctors</option>{doctors.map((item) => <option key={item} value={item}>{item}</option>)}</select><select className="field-control" aria-label="Sort reports" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="uploaded">Recently added</option></select></div>
    <div className="filter-toolbar date-filter"><label className="date-field"><span>From</span><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="date-field"><span>To</span><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><span className="result-count">{reports.length} result{reports.length === 1 ? "" : "s"}</span></div>
    <div className="surface list-surface">{reports.length ? reports.map((report) => <ReportRow key={report.id} report={report} category={data.categories.find((item) => item.id === report.category_id)} onStar={() => void toggleImportant(report)} onPreview={() => void previewReport(report)} />) : <EmptyState title={onlyImportant ? "Nothing marked important" : "No reports match"} detail={onlyImportant ? "Tap the star on any report to keep it here." : "Try changing your search or add your first report."} action={!onlyImportant && <Button asChild><Link to="/reports/new">Upload a report</Link></Button>} />}</div>
    {preview && <PreviewDialog preview={preview} onClose={() => setPreview(null)} />}
  </div>;
}

function ImportantPage() {
  return <ReportsPage onlyImportant />;
}

function ReportForm({ report: editingReport }: { report?: Report }) {
  const data = useWorkspace();
  const patient = data.patient;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [duplicate, setDuplicate] = useState<Report | null>(null);
  const [title, setTitle] = useState(editingReport?.title ?? "");
  const [categoryId, setCategoryId] = useState(editingReport?.category_id ?? "");
  const [hospital, setHospital] = useState(editingReport?.hospital_name ?? "");
  const [laboratory, setLaboratory] = useState(editingReport?.laboratory_name ?? "");
  const [doctor, setDoctor] = useState(editingReport?.doctor_name ?? "");
  const [department, setDepartment] = useState(editingReport?.department ?? "");
  const [reportDate, setReportDate] = useState(editingReport?.report_date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(editingReport?.notes ?? "");
  const [important, setImportant] = useState(editingReport?.is_important ?? false);

  async function validatePickedFile(nextFile: File | null) {
    setFile(nextFile);
    setDuplicate(null);
    setAllowDuplicate(false);
    if (!nextFile) { setFileError(""); return; }
    const header = new Uint8Array(await nextFile.slice(0, 8).arrayBuffer());
    setFileError(validateReportFile({ name: nextFile.name, type: nextFile.type, size: nextFile.size, header }) ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient) return;
    if (!title.trim()) { toast.error("Report title is required."); return; }
    if (!categoryId) { toast.error("Choose a report category."); return; }
    if (!reportDate || reportDate > new Date().toISOString().slice(0, 10)) { toast.error("Report date cannot be in the future."); return; }
    if (!editingReport && !file) { toast.error("Choose a report file to upload."); return; }
    if (fileError) { toast.error(fileError); return; }
    setBusy(true);
    try {
      if (editingReport) {
        const { error } = await supabase.from("reports").update({ title: title.trim(), category_id: categoryId, hospital_name: hospital.trim(), laboratory_name: laboratory.trim(), doctor_name: doctor.trim(), department: department.trim(), report_date: reportDate, notes: notes.trim(), is_important: important }).eq("id", editingReport.id);
        if (error) throw error;
        await supabase.rpc("log_activity", { _action: "Report edited", _details: `Edited ${title.trim()}`, _report_id: editingReport.id });
        await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
        toast.success("Report details updated.");
        await navigate({ to: "/reports/$reportId", params: { reportId: editingReport.id } });
        return;
      }
      if (!file) return;
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const prior = data.reports.find((report) => report.file_hash === hash);
      if (prior && !allowDuplicate) { setDuplicate(prior); setBusy(false); return; }
      const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
      const storagePath = `${patient.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("medical-reports").upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: inserted, error: insertError } = await supabase.from("reports").insert({
        patient_id: patient.id, category_id: categoryId, title: title.trim(), hospital_name: hospital.trim(), laboratory_name: laboratory.trim(),
        doctor_name: doctor.trim(), department: department.trim(), report_date: reportDate, notes: notes.trim(), is_important: important,
        file_name: file.name, storage_path: storagePath, file_type: extension, file_size: file.size, file_hash: hash,
      }).select("id").single();
      if (insertError) {
        await supabase.storage.from("medical-reports").remove([storagePath]);
        throw insertError;
      }
      await supabase.rpc("log_activity", { _action: "Report uploaded", _details: `Uploaded ${title.trim()}`, _report_id: inserted.id });
      await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
      toast.success("Report uploaded.");
      await navigate({ to: "/reports/$reportId", params: { reportId: inserted.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this report.");
    } finally {
      setBusy(false);
    }
  }

  if (!patient && data.role === "patient") return <EmptyState title="Patient profile unavailable" detail="Your account profile is still being prepared." />;
  return <div className="page-section narrow-page"><SectionHeading eyebrow={editingReport ? "REPORT DETAILS" : "ADD TO YOUR RECORD"} title={editingReport ? "Edit report details" : "Upload a report"} description={editingReport ? "Update the information saved with this report." : "Add a PDF or image report and keep the original file private."} />
    <form className="surface form-stack" onSubmit={(event) => void handleSubmit(event)}>
      {!editingReport && <div className="form-field"><Label htmlFor="report-file">Report file <span className="required-mark">*</span></Label><label className={`file-drop ${file ? "has-file" : ""}`} htmlFor="report-file"><Upload size={21} /><strong>{file ? file.name : "Choose or drop a report file"}</strong><small>PDF, JPG, JPEG, or PNG · up to 10 MB</small><Input id="report-file" className="visually-hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => void validatePickedFile(event.target.files?.[0] ?? null)} /></label>{file && <span className="field-hint">{formatSize(file.size)}</span>}{fileError && <span className="field-error">{fileError}</span>}{duplicate && <div className="duplicate-warning"><strong>Possible duplicate</strong><span>This file matches “{duplicate.title}” from {formatDate(duplicate.report_date)}.</span><Button type="button" variant="outline" size="sm" onClick={() => { setAllowDuplicate(true); setDuplicate(null); }}>Upload another copy</Button><Button type="button" variant="ghost" size="sm" onClick={() => void navigate({ to: "/reports/$reportId", params: { reportId: duplicate.id } })}>View existing</Button></div>}</div>}
      <div className="form-grid"><div className="form-field span-two"><Label htmlFor="report-title">Report title <span className="required-mark">*</span></Label><Input id="report-title" maxLength={150} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Complete blood count" /></div>
        <div className="form-field"><Label htmlFor="report-category">Category <span className="required-mark">*</span></Label><select className="field-control" id="report-category" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Choose a category</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="form-field"><Label htmlFor="report-date">Report date <span className="required-mark">*</span></Label><Input id="report-date" type="date" max={new Date().toISOString().slice(0, 10)} required value={reportDate} onChange={(event) => setReportDate(event.target.value)} /></div>
        <div className="form-field"><Label htmlFor="hospital-name">Hospital</Label><Input id="hospital-name" maxLength={120} value={hospital} onChange={(event) => setHospital(event.target.value)} /></div>
        <div className="form-field"><Label htmlFor="lab-name">Laboratory</Label><Input id="lab-name" maxLength={120} value={laboratory} onChange={(event) => setLaboratory(event.target.value)} /></div>
        <div className="form-field"><Label htmlFor="doctor-name">Doctor</Label><Input id="doctor-name" maxLength={120} value={doctor} onChange={(event) => setDoctor(event.target.value)} /></div>
        <div className="form-field"><Label htmlFor="department">Department</Label><Input id="department" maxLength={120} value={department} onChange={(event) => setDepartment(event.target.value)} /></div>
        <div className="form-field span-two"><Label htmlFor="report-notes">Notes</Label><Textarea id="report-notes" maxLength={2000} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional details to help you remember this report" /></div>
      </div>
      <label className="check-row"><input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} /><span><Star size={16} /> Keep this report in Important</span></label>
      <div className="form-actions"><Button type="submit" disabled={busy || !!fileError}>{busy ? "Saving…" : editingReport ? "Save changes" : "Upload report"}</Button>{editingReport ? <Button type="button" variant="outline" asChild><Link to="/reports/$reportId" params={{ reportId: editingReport.id }}>Cancel</Link></Button> : <Button type="button" variant="outline" asChild><Link to="/reports">Cancel</Link></Button>}</div>
    </form>
  </div>;
}

async function extractReportPdfText(report: Report) {
  if (report.file_type !== "pdf") throw new Error("Report explanations are available for PDF files only.");
  const { data: signed, error } = await supabase.storage.from("medical-reports").createSignedUrl(report.storage_path, 300);
  if (error || !signed) throw new Error("This report PDF could not be opened.");
  const response = await fetch(signed.signedUrl);
  if (!response.ok) throw new Error("This report PDF could not be downloaded for reading.");

  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
  const document = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 5); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      if (pages.join(" ").length >= REPORT_AI_MAX_QUESTION_CHARS * 14) break;
    }
    const text = limitReportAiText(pages.join(" "));
    if (!text) throw new Error("No selectable text was found. Scanned PDFs and image reports are not supported yet.");
    return text;
  } finally {
    await document.destroy();
  }
}

function ReportAiPanel({ report, previousReports }: { report: Report; previousReports: Report[] }) {
  const askGroq = useServerFn(explainReportText);
  const [previousId, setPreviousId] = useState(previousReports[0]?.id ?? "");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const previousReport = previousReports.find((item) => item.id === previousId);

  async function submitQuestion() {
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const reportText = await extractReportPdfText(report);
      const previousReportText = previousReport ? await extractReportPdfText(previousReport) : null;
      const result = await askGroq({ data: {
        reportId: report.id,
        reportText,
        question: question.trim(),
        previousReportId: previousReport?.id ?? null,
        previousReportText,
      } });
      setAnswer(result.answer);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not explain this report.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="surface detail-panel report-ai-panel">
    <div className="report-ai-heading"><div><span className="eyebrow">GROQ REPORT EXPLANATION</span><h3>Ask about this report</h3><p>Brief, non-diagnostic explanations and a comparison with an earlier report.</p></div><Sparkles size={20} /></div>
    {previousReports.length > 0 && <div className="form-field"><Label htmlFor="report-ai-previous">Compare with earlier report</Label><select id="report-ai-previous" className="field-control" value={previousId} onChange={(event) => setPreviousId(event.target.value)} disabled={busy}><option value="">No comparison</option>{previousReports.map((item) => <option key={item.id} value={item.id}>{item.title} · {formatDate(item.report_date)}</option>)}</select></div>}
    <div className="form-field"><Label htmlFor="report-ai-question">Your question</Label><Textarea id="report-ai-question" maxLength={REPORT_AI_MAX_QUESTION_CHARS} rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about a result or leave blank for a short summary" disabled={busy} /></div>
    <div className="privacy-callout"><LockKeyhole size={16} /> The selected PDF text and optional earlier PDF text are sent to Groq; they may contain personal details. The answer is not a diagnosis, and scanned PDFs are not readable here.</div>
    <div className="form-actions"><Button type="button" disabled={busy || report.file_type !== "pdf"} onClick={() => void submitQuestion()}><Sparkles size={16} />{busy ? "Reading report…" : question.trim() ? "Ask about report" : previousReport ? "Compare reports" : "Summarize report"}</Button></div>
    {error && <p className="report-ai-error" role="alert">{error}</p>}
    {answer && <div className="report-ai-answer" aria-live="polite"><strong>Report explanation</strong><p>{answer}</p></div>}
  </section>;
}

function ReportDetails({ report }: { report: Report }) {
  const data = useWorkspace();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{ url: string; type: string; title: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [publicShareOpen, setPublicShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const category = data.categories.find((item) => item.id === report.category_id);
  const previousReports = data.reports
    .filter((item) => item.id !== report.id && item.category_id === report.category_id && item.report_date < report.report_date && item.file_type === "pdf")
    .sort((a, b) => b.report_date.localeCompare(a.report_date));

  async function openFile(download = false) {
    const { data: signed, error } = await supabase.storage.from("medical-reports").createSignedUrl(report.storage_path, 300, { download });
    if (error) { toast.error("The report file could not be opened."); return; }
    if (download) window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    else setPreview({ url: signed.signedUrl, type: report.file_type, title: report.title });
    await supabase.rpc("log_activity", { _action: download ? "Report downloaded" : "Report viewed", _details: `${download ? "Downloaded" : "Viewed"} ${report.title}`, _report_id: report.id });
  }

  async function toggleStar() {
    const { error } = await supabase.from("reports").update({ is_important: !report.is_important }).eq("id", report.id);
    if (error) toast.error(error.message);
    else { await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] }); toast.success(report.is_important ? "Removed from important reports." : "Marked as important."); }
  }

  async function removeReport() {
    const { error: fileError } = await supabase.storage.from("medical-reports").remove([report.storage_path]);
    if (fileError) { toast.error(fileError.message); return; }
    const { error } = await supabase.from("reports").delete().eq("id", report.id);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_activity", { _action: "Report deleted", _details: `Deleted ${report.title}` });
    await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
    toast.success("Report deleted.");
    setDeleteOpen(false);
    window.location.assign("/reports");
  }

  return <div className="page-section narrow-page"><Link to="/reports" className="back-link"><ArrowLeft size={16} /> Back to reports</Link>
    <div className="detail-header"><div className="detail-title-line"><span className="report-category-icon large">{categoryIcon(category?.icon ?? "file")}</span><div><span className="eyebrow">{category?.name ?? "MEDICAL REPORT"}</span><h2>{report.title}</h2><p>{formatDate(report.report_date)} <span className="dot-separator">·</span> Added {formatDate(report.uploaded_at)}</p></div></div><div className="detail-actions"><Button variant={report.is_important ? "secondary" : "outline"} size="icon" title="Toggle important" aria-label="Toggle important" onClick={() => void toggleStar()}><Star size={17} fill={report.is_important ? "currentColor" : "none"} /></Button><Button variant="outline" size="icon" title="Edit details" aria-label="Edit details" asChild><Link to="/reports/$reportId/edit" params={{ reportId: report.id }}><Pencil size={16} /></Link></Button><Button variant="outline" size="icon" title="Delete report" aria-label="Delete report" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /></Button></div></div>
    <div className="detail-grid"><section className="surface detail-panel"><span className="eyebrow">REPORT INFORMATION</span><dl className="detail-list"><div><dt>Hospital</dt><dd>{report.hospital_name || "—"}</dd></div><div><dt>Laboratory</dt><dd>{report.laboratory_name || "—"}</dd></div><div><dt>Doctor</dt><dd>{report.doctor_name || "—"}</dd></div><div><dt>Department</dt><dd>{report.department || "—"}</dd></div><div><dt>File</dt><dd>{report.file_name} <span className="muted-inline">· {formatSize(report.file_size)}</span></dd></div><div className="full"><dt>Notes</dt><dd className="pre-line">{report.notes || "No notes added."}</dd></div></dl></section>
      <section className="surface file-panel"><span className="file-panel-icon">{report.file_type === "pdf" ? <FileHeart size={25} /> : <Image size={25} />}</span><span className="eyebrow">PRIVATE FILE</span><h3>{report.file_name}</h3><p>{report.file_type.toUpperCase()} · {formatSize(report.file_size)}</p><Button className="full-button" onClick={() => void openFile()}><Eye size={16} /> Preview file</Button><Button className="full-button" variant="outline" onClick={() => void openFile(true)}><ArrowDownToLine size={16} /> Download</Button><Button className="full-button" variant="secondary" onClick={() => setShareOpen(true)}><Share2 size={16} /> Share with a doctor</Button><Button className="full-button" variant="outline" onClick={() => setPublicShareOpen(true)}><Link2 size={16} /> Create public link</Button></section></div>
    <ReportAiPanel report={report} previousReports={previousReports} />
    <section className="surface detail-panel share-history"><div className="panel-heading"><div><span className="eyebrow">ACCESS HISTORY</span><h3>Report shares</h3></div><Button size="sm" variant="outline" onClick={() => setShareOpen(true)}><Share2 size={15} /> Share report</Button></div>{data.shares.filter((share) => "report_id" in share && share.report_id === report.id).length ? data.shares.filter((share) => "report_id" in share && share.report_id === report.id).map((share) => <ShareRow key={share.share_id} share={share as PatientShare} />) : <p className="quiet-note">This report has not been shared.</p>}</section>
    {shareOpen && <ShareDialog report={report} onClose={() => setShareOpen(false)} />}
    {publicShareOpen && <PublicShareDialog report={report} onClose={() => setPublicShareOpen(false)} />}
    {preview && <PreviewDialog preview={preview} onClose={() => setPreview(null)} />}
    {deleteOpen && <ConfirmDialog title="Delete this report?" detail="The report and its saved file will be permanently removed." onCancel={() => setDeleteOpen(false)} onConfirm={() => void removeReport()} />}
  </div>;
}

function PublicShareDialog({ report, onClose }: { report: Report; onClose: () => void }) {
  const data = useWorkspace();
  const queryClient = useQueryClient();
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PublicShare | null>(null);
  const shares = data.publicShares.filter((share) => share.report_id === report.id).sort((a, b) => b.created_at.localeCompare(a.created_at));

  async function createLink() {
    setBusy(true);
    try {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 60_000).toISOString();
      const { data: shareId, error } = await supabase.rpc("create_report_public_share", {
        _report_id: report.id,
        _token_hash: tokenHash,
        _expires_at: expiresAt,
      });
      if (error) throw error;
      if (!shareId) throw new Error("Could not create this report link.");
      setLink({ id: shareId, url: `${window.location.origin}/share/${token}` });
      setCopied(false);
      await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
      toast.success("Share link created. It expires in 7 days.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create this report link.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success("Link copied.");
    } catch {
      toast.error("Copy was blocked. Select the link and copy it.");
    }
  }

  async function revokeShare(share: PublicShare) {
    const { error } = await supabase.rpc("revoke_report_public_share", { _share_id: share.id });
    if (error) toast.error(error.message);
    else {
      if (link?.id === share.id) setLink(null);
      await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
      toast.success("Public link revoked.");
    }
    setRevokeTarget(null);
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog-panel public-share-dialog" role="dialog" aria-modal="true" aria-labelledby="public-share-title">
      <div className="dialog-heading"><div><span className="eyebrow">ONE REPORT · 7 DAYS</span><h3 id="public-share-title">Create a link for “{report.title}”</h3></div><Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}><X size={18} /></Button></div>
      <p className="public-share-description">Anyone with the link can view this report. It will not reveal any other report in your library, and you can revoke access at any time.</p>
      {link && <div className="public-share-link"><Input aria-label="Public report link" readOnly value={link.url} /><Button variant="outline" onClick={() => void copyLink()}><Copy size={16} />{copied ? "Copied" : "Copy link"}</Button><span className="field-hint">Copy it now; for privacy, the link cannot be shown again after this dialog closes.</span></div>}
      <div className="public-share-actions"><Button onClick={() => void createLink()} disabled={busy}><Link2 size={16} />{busy ? "Creating…" : "Create new link"}</Button></div>
      <div className="public-share-history"><h4>Existing links</h4>{shares.length ? shares.map((share) => {
        const status = getShareStatus({ status: share.revoked_at ? "revoked" : "active", expires_at: share.expires_at });
        return <div className="public-share-row" key={share.id}><div><StatusPill status={status} /><small>{status === "active" ? "Expires" : "Ended"} {formatDateTime(share.expires_at)}</small></div>{status === "active" && <Button variant="outline" size="sm" onClick={() => setRevokeTarget(share)}>Revoke</Button>}</div>;
      }) : <p className="quiet-note">No public links have been created for this report.</p>}</div>
      {revokeTarget && <ConfirmDialog title="Revoke this public link?" detail="Anyone using this link will immediately lose access to this report." onCancel={() => setRevokeTarget(null)} onConfirm={() => void revokeShare(revokeTarget)} />}
    </section>
  </div>;
}

function ShareDialog({ report, onClose }: { report: Report; onClose: () => void }) {
  const data = useWorkspace();
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState(() => {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expiryError = validateShareExpiry(expiresAt);
    if (expiryError) { toast.error(expiryError); return; }
    if (!doctorId) { toast.error("Choose a doctor."); return; }
    const existing = data.shares.find((share) => "report_id" in share && share.report_id === report.id && "doctor_user_id" in share && share.doctor_user_id === data.availableDoctors.find((item) => item.id === doctorId)?.id && getShareStatus(share, Date.now()) === "active");
    if (existing) { toast.error("This report is already actively shared with that doctor. Revoke the existing share first."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("create_report_share", { _report_id: report.id, _doctor_id: doctorId, _message: message.trim(), _expires_at: new Date(expiresAt).toISOString() });
    if (error) toast.error(error.message);
    else {
      await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
      toast.success("Report shared. Access ends automatically at the chosen time.");
      onClose();
    }
    setBusy(false);
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title"><div className="dialog-heading"><div><span className="eyebrow">TIME-LIMITED ACCESS</span><h3 id="share-dialog-title">Share “{report.title}”</h3></div><Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}><X size={18} /></Button></div><form className="form-stack" onSubmit={(event) => void submit(event)}>
    {data.availableDoctors.length ? <div className="form-field"><Label htmlFor="share-doctor">Clinician</Label><select id="share-doctor" className="field-control" required value={doctorId} onChange={(event) => setDoctorId(event.target.value)}><option value="">Choose a doctor</option>{data.availableDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.specialization ? ` — ${doctor.specialization}` : ""}</option>)}</select></div> : <EmptyState title="No active doctors yet" detail="A doctor must create an active MediVault account before you can share a report." />}
    <div className="form-field"><Label htmlFor="share-message">Message (optional)</Label><Textarea id="share-message" maxLength={500} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a short note for the doctor" /></div>
    <div className="form-field"><Label htmlFor="share-expiry">Access expires</Label><Input id="share-expiry" type="datetime-local" required value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /><span className="field-hint">Choose a future time within one year.</span></div>
    <div className="privacy-callout"><ShieldCheck size={17} /><span>Only this report is shared. You can revoke access at any time.</span></div>
    <div className="form-actions"><Button type="submit" disabled={busy || !data.availableDoctors.length}><Share2 size={16} />{busy ? "Sharing…" : "Share report"}</Button><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></div>
  </form></section></div>;
}

function ShareRow({ share }: { share: PatientShare }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const status = getShareStatus(share, Date.now());
  async function revoke() {
    const { error } = await supabase.rpc("revoke_report_share", { _share_id: share.share_id });
    if (error) toast.error(error.message);
    else { await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] }); toast.success("Access revoked. The doctor can no longer open this report."); }
    setConfirm(false);
  }
  return <div className="share-row"><span className="share-row-icon"><Stethoscope size={17} /></span><div className="share-row-main"><strong>{share.doctor_name}</strong><span>{share.doctor_specialization || "Clinician"} · {share.message || "No message"}</span></div><div className="share-row-state"><StatusPill status={status} /><small>Until {formatDateTime(share.expires_at)}</small></div>{status === "active" && <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>Revoke</Button>}{confirm && <ConfirmDialog title="Revoke doctor access?" detail="The doctor will no longer be able to open this report." onCancel={() => setConfirm(false)} onConfirm={() => void revoke()} />}</div>;
}

function PatientSharesPage() {
  const data = useWorkspace();
  const shares = data.shares.filter((item): item is PatientShare => "doctor_name" in item);
  const [filter, setFilter] = useState("all");
  const filtered = shares.filter((share) => filter === "all" || getShareStatus(share, Date.now()) === filter);
  return <div className="page-section"><SectionHeading eyebrow="REPORT ACCESS" title="Shared access" description="Each share gives one clinician access to one report. Expired and revoked shares remain in your history." />
    <div className="segmented-tabs" role="group" aria-label="Filter access"><Button type="button" variant="ghost" size="sm" className={filter === "all" ? "segment-tab is-selected" : "segment-tab"} onClick={() => setFilter("all")}>All <span>{shares.length}</span></Button>{["active", "expired", "revoked"].map((status) => <Button type="button" variant="ghost" size="sm" key={status} className={filter === status ? "segment-tab is-selected" : "segment-tab"} onClick={() => setFilter(status)}>{status[0]?.toUpperCase()}{status.slice(1)} <span>{shares.filter((share) => getShareStatus(share, Date.now()) === status).length}</span></Button>)}</div>
    <div className="surface share-list">{filtered.length ? filtered.map((share) => <div key={share.share_id} className="share-card"><div className="share-card-top"><span className="share-row-icon"><Stethoscope size={17} /></span><div className="share-row-main"><strong>{share.doctor_name}</strong><span>{share.doctor_specialization || "Clinician"}</span></div><StatusPill status={getShareStatus(share, Date.now())} /></div><Link to="/reports/$reportId" params={{ reportId: share.report_id }} className="shared-report-title"><FileHeart size={16} />{share.title} <span>{share.category_name} · {formatDate(share.report_date)}</span></Link><div className="share-meta"><span><Clock3 size={14} /> {getShareStatus(share, Date.now()) === "active" ? "Ends" : "Ended"} {formatDateTime(share.expires_at)}</span>{share.message && <span>{share.message}</span>}</div><ShareRow share={share} /></div>) : <EmptyState title="No shares in this view" detail="Shares you create will appear here." />}</div>
  </div>;
}

function TimelinePage() {
  const data = useWorkspace();
  const years = useMemo(() => {
    const grouped = new Map<string, Map<string, Report[]>>();
    for (const report of data.reports) {
      const year = report.report_date.slice(0, 4);
      const month = report.report_date.slice(5, 7);
      if (!grouped.has(year)) grouped.set(year, new Map());
      const yearGroup = grouped.get(year);
      if (!yearGroup) continue;
      if (!yearGroup.has(month)) yearGroup.set(month, []);
      yearGroup.get(month)?.push(report);
    }
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => ({ year, months: [...months.entries()].sort(([a], [b]) => b.localeCompare(a)) }));
  }, [data.reports]);
  return <div className="page-section"><SectionHeading eyebrow="YOUR HEALTH HISTORY" title="Medical timeline" description="Reports grouped by the date they were recorded." action={<Button asChild variant="outline"><Link to="/reports/new"><FilePlus2 size={16} /> Add report</Link></Button>} />
    {years.length ? <div className="timeline">{years.map(({ year, months }) => <section className="timeline-year" key={year}><h3>{year}</h3><div className="timeline-months">{months.map(([month, reports]) => <div className="timeline-month" key={month}><div className="timeline-marker" /><div className="timeline-month-head"><strong>{new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(`${year}-${month}-15T12:00:00`))}</strong><span>{reports.length} report{reports.length === 1 ? "" : "s"}</span></div><div className="timeline-items">{reports.map((report) => <ReportRow key={report.id} report={report} category={data.categories.find((item) => item.id === report.category_id)} />)}</div></div>)}</div></section>)}</div> : <div className="surface"><EmptyState title="Your timeline is empty" detail="Your reports will appear here in date order." action={<Button asChild><Link to="/reports/new">Upload a report</Link></Button>} /></div>}
  </div>;
}

function ComparePage() {
  const data = useWorkspace();
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const first = data.reports.find((item) => item.id === firstId);
  const second = data.reports.find((item) => item.id === secondId);
  const comparisonAllowed = first && second ? canCompareReports(first, second) : false;
  const availableSecond = data.reports.filter((item) => !first || item.category_id === first.category_id);
  const fields = [
    { label: "Report date", value: (report: Report) => formatDate(report.report_date) },
    { label: "Hospital", value: (report: Report) => report.hospital_name || "—" },
    { label: "Laboratory", value: (report: Report) => report.laboratory_name || "—" },
    { label: "Doctor", value: (report: Report) => report.doctor_name || "—" },
    { label: "Department", value: (report: Report) => report.department || "—" },
    { label: "Notes", value: (report: Report) => report.notes || "—" },
  ];
  return <div className="page-section"><SectionHeading eyebrow="SIDE-BY-SIDE VIEW" title="Compare reports" description="Choose two different reports from the same category." />
    <div className="compare-selectors surface"><div className="form-field"><Label htmlFor="compare-first">First report</Label><select className="field-control" id="compare-first" value={firstId} onChange={(event) => { setFirstId(event.target.value); setSecondId(""); }}><option value="">Choose a report</option>{data.reports.map((report) => <option key={report.id} value={report.id}>{report.title} · {formatDate(report.report_date)}</option>)}</select></div><div className="compare-divider"><span>VS</span></div><div className="form-field"><Label htmlFor="compare-second">Second report</Label><select className="field-control" id="compare-second" disabled={!first} value={secondId} onChange={(event) => setSecondId(event.target.value)}><option value="">Choose a report</option>{availableSecond.map((report) => <option key={report.id} value={report.id} disabled={report.id === first?.id}>{report.title} · {formatDate(report.report_date)}</option>)}</select></div></div>
    {first && second && comparisonAllowed && <div className="compare-grid"><ReportCompareCard report={first} fields={fields} category={data.categories.find((item) => item.id === first.category_id)} /><ReportCompareCard report={second} fields={fields} category={data.categories.find((item) => item.id === second.category_id)} /></div>}
    {first && second && !comparisonAllowed && <div className="notice-message">Choose two different reports from the same category.</div>}
    {!data.reports.length && <div className="surface"><EmptyState title="No reports to compare" detail="Add a report first. You can compare reports that share a category." action={<Button asChild><Link to="/reports/new">Add a report</Link></Button>} /></div>}
  </div>;
}

function ReportCompareCard({ report, fields, category }: { report: Report; fields: Array<{ label: string; value: (report: Report) => string }>; category?: Category | undefined }) {
  return <section className="surface compare-card"><div className="compare-card-title"><span className="report-category-icon">{categoryIcon(category?.icon ?? "file")}</span><div><span className="eyebrow">{category?.name ?? "REPORT"}</span><h3>{report.title}</h3></div></div><dl className="detail-list">{fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd className="pre-line">{field.value(report)}</dd></div>)}</dl><Button variant="outline" size="sm" asChild><Link to="/reports/$reportId" params={{ reportId: report.id }}>Open report <ArrowRight size={14} /></Link></Button></section>;
}

function ActivityPage() {
  const data = useWorkspace();
  return <div className="page-section"><SectionHeading eyebrow="YOUR ACCOUNT" title="Activity history" description="Recent actions on your account and your medical records." />
    <div className="surface activity-surface">{data.activities.length ? data.activities.map((activity) => <ActivityItem key={activity.id} activity={activity} />) : <EmptyState title="No activity yet" detail="Report and account actions will appear here." />}</div>
  </div>;
}

function ActivityItem({ activity }: { activity: ActivityRow }) {
  return <div className="activity-row"><span className="activity-mark"><Activity size={16} /></span><div className="activity-text"><strong>{activity.action}</strong><span>{activity.details || activity.action}</span></div><time>{formatDateTime(activity.created_at)}</time></div>;
}

function ProfilePage() {
  const data = useWorkspace();
  const queryClient = useQueryClient();
  const patient = data.patient;
  const doctor = data.doctor;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data.profile.name);
  const [phone, setPhone] = useState(data.profile.phone);
  const [age, setAge] = useState(patient?.age?.toString() ?? "");
  const [gender, setGender] = useState(patient?.gender ?? "");
  const [address, setAddress] = useState(patient?.address ?? "");
  const [emergencyContact, setEmergencyContact] = useState(patient?.emergency_contact ?? "");
  const [medicalInfo, setMedicalInfo] = useState(patient?.medical_info ?? "");
  const [specialization, setSpecialization] = useState(doctor?.specialization ?? "");
  const [hospital, setHospital] = useState(doctor?.hospital ?? "");
  const [qrImage, setQrImage] = useState("");
  const qrLink = patient ? `${typeof window === "undefined" ? "" : window.location.origin}/doctor/qr-access/${patient.qr_token}` : "";

  useEffect(() => {
    let current = true;
    if (patient && qrLink) {
      void import("qrcode").then(({ default: qrCode }) => qrCode.toDataURL(qrLink, { width: 240, margin: 1, errorCorrectionLevel: "M" })).then((value) => { if (current) setQrImage(value); }).catch(() => { if (current) toast.error("Could not create the QR code."); });
    }
    return () => { current = false; };
  }, [patient, qrLink]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) { toast.error("Enter your full name."); return; }
    if (patient && age.trim() && (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 130)) { toast.error("Age must be between 0 and 130."); return; }
    const { error: profileError } = await supabase.from("profiles").update({ name: name.trim(), phone: phone.trim() }).eq("user_id", data.user.id);
    if (profileError) { toast.error(profileError.message); return; }
    if (patient) {
      const { error } = await supabase.from("patients").update({ age: age.trim() ? Number(age) : null, gender, address: address.trim(), emergency_contact: emergencyContact.trim(), medical_info: medicalInfo.trim() }).eq("id", patient.id);
      if (error) { toast.error(error.message); return; }
    }
    if (doctor) {
      const { error } = await supabase.from("doctors").update({ specialization: specialization.trim(), hospital: hospital.trim() }).eq("id", doctor.id);
      if (error) { toast.error(error.message); return; }
    }
    await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] });
    toast.success("Profile saved.");
    setEditing(false);
  }

  async function resetQr() {
    if (!window.confirm("Regenerating your QR code will turn off access through the current code. Continue?")) return;
    const { error } = await supabase.rpc("reset_patient_qr");
    if (error) toast.error(error.message);
    else { await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] }); toast.success("A new QR access code is ready."); }
  }

  return <div className="page-section"><SectionHeading eyebrow="ACCOUNT" title="My profile" description="Keep your contact and health details current." />
    <div className="profile-layout"><section className="surface profile-summary"><span className="avatar avatar-large">{initials(data.profile.name)}</span><h3>{data.profile.name}</h3><span className="role-chip">{data.role}</span><p>{data.profile.email}</p>{patient && <div className="patient-code"><small>PATIENT ID</small><strong>{patient.patient_code}</strong></div>}</section>
      <section className="surface profile-details"><div className="panel-heading"><div><span className="eyebrow">PERSONAL INFORMATION</span><h3>{editing ? "Edit profile" : "Profile details"}</h3></div>{!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil size={15} /> Edit profile</Button>}</div>
        {editing ? <form className="form-stack" onSubmit={(event) => void saveProfile(event)}><div className="form-grid"><div className="form-field"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" required value={name} onChange={(event) => setName(event.target.value)} /></div><div className="form-field"><Label htmlFor="profile-phone">Phone</Label><Input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} /></div><div className="form-field"><Label>Email address</Label><Input value={data.profile.email} disabled /></div>
          {patient && <><div className="form-field"><Label htmlFor="profile-age">Age</Label><Input id="profile-age" type="number" min="0" max="130" value={age} onChange={(event) => setAge(event.target.value)} /></div><div className="form-field"><Label htmlFor="profile-gender">Gender</Label><select id="profile-gender" className="field-control" value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div><div className="form-field span-two"><Label htmlFor="profile-address">Address</Label><Textarea id="profile-address" rows={2} value={address} onChange={(event) => setAddress(event.target.value)} /></div><div className="form-field span-two"><Label htmlFor="emergency-contact">Emergency contact</Label><Input id="emergency-contact" value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} /></div><div className="form-field span-two"><Label htmlFor="medical-info">Basic medical information</Label><Textarea id="medical-info" rows={3} value={medicalInfo} onChange={(event) => setMedicalInfo(event.target.value)} placeholder="Blood group, allergies, long-term conditions…" /></div></>}
          {doctor && <><div className="form-field"><Label htmlFor="profile-specialty">Specialization</Label><Input id="profile-specialty" value={specialization} onChange={(event) => setSpecialization(event.target.value)} /></div><div className="form-field"><Label htmlFor="profile-hospital">Hospital or clinic</Label><Input id="profile-hospital" value={hospital} onChange={(event) => setHospital(event.target.value)} /></div></>}
        </div><div className="form-actions"><Button type="submit">Save changes</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div></form> : <dl className="detail-list"><div><dt>Full name</dt><dd>{data.profile.name}</dd></div><div><dt>Phone</dt><dd>{data.profile.phone || "—"}</dd></div><div><dt>Email</dt><dd>{data.profile.email}</dd></div>{patient && <><div><dt>Age</dt><dd>{patient.age ?? "—"}</dd></div><div><dt>Gender</dt><dd>{patient.gender || "—"}</dd></div><div><dt>Address</dt><dd>{patient.address || "—"}</dd></div><div><dt>Emergency contact</dt><dd>{patient.emergency_contact || "—"}</dd></div><div className="full"><dt>Basic medical information</dt><dd className="pre-line">{patient.medical_info || "—"}</dd></div></>}{doctor && <><div><dt>Specialization</dt><dd>{doctor.specialization || "—"}</dd></div><div><dt>Hospital or clinic</dt><dd>{doctor.hospital || "—"}</dd></div></>}<div><dt>Member since</dt><dd>{formatDate(data.profile.created_at)}</dd></div></dl>}
      </section>
      {patient && <section className="surface qr-profile"><div><span className="eyebrow">DIGITAL HEALTH PASS</span><h3>Your patient QR code</h3><p>Show this code to a clinician with a MediVault account. Access continues until you regenerate the code.</p><div className="qr-actions"><Button variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText(qrLink).then(() => toast.success("Access link copied."))}><Share2 size={15} /> Copy access link</Button>{qrImage && <a className="button-link button-outline-sm" href={qrImage} download={`MediVault-${patient.patient_code}.png`}><Download size={15} /> Download QR</a>}<Button variant="outline" size="sm" onClick={() => void resetQr()}><QrCode size={15} /> Regenerate code</Button></div></div>{qrImage ? <img className="qr-image" src={qrImage} alt="Patient QR access code" /> : <div className="qr-placeholder"><QrCode size={30} /></div>}</section>}
    </div>
  </div>;
}

function SettingsPage() {
  const data = useWorkspace();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) { toast.error("Use at least 8 characters with a letter and a number."); return; }
    if (newPassword !== confirmPassword) { toast.error("The new passwords do not match."); return; }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.profile.email, password: currentPassword });
    if (signInError) { toast.error("Your current password is incorrect."); setBusy(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { await supabase.rpc("log_activity", { _action: "Password changed", _details: "Password updated" }); toast.success("Password changed."); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    setBusy(false);
  }
  return <div className="page-section narrow-page"><SectionHeading eyebrow="ACCOUNT SECURITY" title="Settings" description="Change the password used to sign in." /><form className="surface form-stack" onSubmit={(event) => void changePassword(event)}><div className="form-field"><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div className="form-field"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><span className="field-hint">At least 8 characters, including a letter and a number.</span></div><div className="form-field"><Label htmlFor="confirm-new-password">Confirm new password</Label><Input id="confirm-new-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><Button type="submit" disabled={busy}>{busy ? "Updating…" : "Change password"}</Button></form></div>;
}

function DoctorDashboard() {
  const data = useWorkspace();
  const shares = data.shares.filter((item): item is DoctorShare => "effective_status" in item && "patient_name" in item);
  const active = shares.filter((share) => getShareStatus(share, Date.now()) === "active");
  const expired = shares.filter((share) => getShareStatus(share, Date.now()) === "expired");
  const revoked = shares.filter((share) => getShareStatus(share, Date.now()) === "revoked");
  return <div className="page-section"><div className="welcome-strip doctor-welcome"><div><span className="eyebrow">CLINICIAN WORKSPACE</span><h2>Welcome, {data.profile.name.split(/\s+/)[0]}.</h2><p>Only reports shared with you or opened through a patient’s current QR code appear here.</p></div><Button variant="outline" asChild><Link to="/doctor/qr-access"><QrCode size={17} /> Open patient QR</Link></Button></div>
    <div className="metric-grid"><Metric label="All shares" value={shares.length} icon={FileHeart} /><Metric label="Active" value={active.length} icon={ShieldCheck} tone="green" /><Metric label="Expired" value={expired.length} icon={Clock3} tone="gold" /><Metric label="Revoked" value={revoked.length} icon={X} tone="coral" /></div>
    <section className="surface dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACCESS</span><h3>Shared reports</h3></div><Button variant="outline" size="sm" asChild><Link to="/doctor/reports">View all <ArrowRight size={15} /></Link></Button></div>{shares.slice(0, 6).map((share) => <DoctorShareRow key={share.share_id} share={share} />)}{!shares.length && <EmptyState title="No shared reports yet" detail="When a patient shares a report with you, it will appear here." />}</section>
  </div>;
}

function DoctorShareRow({ share }: { share: DoctorShare }) {
  const status = getShareStatus(share, Date.now());
  return <div className="doctor-share-row"><span className="share-row-icon"><FileHeart size={17} /></span><div className="share-row-main"><strong>{share.title}</strong><span>{share.patient_name} · {share.category_name} · {formatDate(share.report_date)}</span></div><div className="share-row-state"><StatusPill status={status} /><small>{status === "active" ? "Ends" : "Ended"} {formatDateTime(share.expires_at)}</small></div>{status === "active" && <Button variant="outline" size="sm" asChild><Link to="/doctor/reports/$shareId" params={{ shareId: share.share_id }}>Open <ArrowRight size={14} /></Link></Button>}</div>;
}

function DoctorReportsPage() {
  const data = useWorkspace();
  const shares = data.shares.filter((item): item is DoctorShare => "effective_status" in item && "patient_name" in item);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const rows = shares.filter((share) => (status === "all" || getShareStatus(share, Date.now()) === status) && `${share.title} ${share.patient_name} ${share.category_name}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-section"><SectionHeading eyebrow="PATIENT-SHARED RECORDS" title="Shared reports" description="Expired and revoked entries remain visible in your history; only active access can be opened." />
    <div className="filter-toolbar"><div className="search-control"><Search size={17} /><Input aria-label="Search shared reports" placeholder="Search title, patient, or category" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select className="field-control" aria-label="Share status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All access</option><option value="active">Active</option><option value="expired">Expired</option><option value="revoked">Revoked</option></select></div>
    <div className="surface list-surface">{rows.length ? rows.map((share) => <DoctorShareRow key={share.share_id} share={share} />) : <EmptyState title="No reports in this view" detail="Reports shared with you will appear here." />}</div>
  </div>;
}

function DoctorShareDetails({ share }: { share: DoctorShare }) {
  const [preview, setPreview] = useState<{ url: string; type: string; title: string } | null>(null);
  const status = getShareStatus(share, Date.now());
  async function openFile(download = false) {
    if (status !== "active" || !share.storage_path) { toast.error("This report is no longer available."); return; }
    const { data, error } = await supabase.storage.from("medical-reports").createSignedUrl(share.storage_path, 300, { download });
    if (error) { toast.error(error.message || "This report is no longer available."); return; }
    if (download) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    else setPreview({ url: data.signedUrl, type: share.file_type, title: share.title });
    if (download) await supabase.rpc("log_activity", { _action: "Report downloaded", _details: `Downloaded ${share.title}`, _report_id: share.report_id });
  }
  return <div className="page-section narrow-page"><Link to="/doctor/reports" className="back-link"><ArrowLeft size={16} /> Back to shared reports</Link><div className="detail-header"><div className="detail-title-line"><span className="report-category-icon large"><FileHeart size={20} /></span><div><span className="eyebrow">{share.category_name}</span><h2>{share.title}</h2><p>{share.patient_name} <span className="dot-separator">·</span> {share.patient_code}</p></div></div><StatusPill status={status} /></div>
    <div className="surface detail-panel"><div className="panel-heading"><div><span className="eyebrow">SHARED REPORT</span><h3>Access details</h3></div><ShieldCheck size={19} /></div><dl className="detail-list"><div><dt>Report date</dt><dd>{formatDate(share.report_date)}</dd></div><div><dt>Hospital</dt><dd>{share.hospital_name || share.laboratory_name || "—"}</dd></div><div><dt>Doctor listed</dt><dd>{share.report_doctor || "—"}</dd></div><div><dt>Access expires</dt><dd>{formatDateTime(share.expires_at)}</dd></div><div className="full"><dt>Patient message</dt><dd>{share.message || "No message provided."}</dd></div>{status === "active" && <div className="full"><dt>Report notes</dt><dd className="pre-line">{share.notes || "No notes provided."}</dd></div>}</dl>{status === "active" && <div className="form-actions"><Button onClick={() => void openFile()}><Eye size={16} /> Preview report</Button><Button variant="outline" onClick={() => void openFile(true)}><Download size={16} /> Download</Button></div>}</div>
    {status !== "active" && <div className="privacy-callout"><LockKeyhole size={17} /> This share is no longer active, so the report file cannot be opened.</div>}
    {preview && <PreviewDialog preview={preview} onClose={() => setPreview(null)} />}
  </div>;
}

function AdminDashboard() {
  const data = useWorkspace();
  const patients = data.users.filter((user) => user.role === "patient").length;
  const doctors = data.users.filter((user) => user.role === "doctor").length;
  const counts = data.categories.map((category) => ({ category, count: data.reports.filter((report) => report.category_id === category.id).length })).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...counts.map((item) => item.count));
  const sharesMade = data.activities.filter((item) => item.action === "Report shared").length;
  return <div className="page-section"><div className="welcome-strip admin-welcome"><div><span className="eyebrow">SYSTEM OVERVIEW</span><h2>Workspace administration</h2><p>Account access, report categories, and recent system activity.</p></div><Button variant="outline" asChild><Link to="/admin/users"><Users size={17} /> Manage users</Link></Button></div>
    <div className="metric-grid"><Metric label="Total users" value={data.users.length} icon={Users} /><Metric label="Patients" value={patients} icon={HeartPulse} tone="green" /><Metric label="Doctors" value={doctors} icon={Stethoscope} tone="blue" /><Metric label="Reports / shares" value={`${data.reports.length} / ${sharesMade}`} icon={FileHeart} tone="gold" /></div>
    <div className="dashboard-grid"><section className="surface dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">REPORT LIBRARY</span><h3>Category usage</h3></div><Button size="sm" variant="outline" asChild><Link to="/admin/categories">Manage categories</Link></Button></div>{counts.map(({ category, count }) => <div className="category-bar-row" key={category.id}><span>{category.name}</span><div className="category-bar-track"><i style={{ width: `${count / maxCount * 100}%` }} /></div><strong>{count}</strong></div>)}</section>
      <section className="surface dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT EVENTS</span><h3>Activity log</h3></div><Button size="sm" variant="outline" asChild><Link to="/admin/activity">Full log</Link></Button></div>{data.activities.slice(0, 7).map((activity) => <ActivityItem key={activity.id} activity={activity} />)}{!data.activities.length && <EmptyState title="No activity recorded" detail="System events will appear here." />}</section></div>
  </div>;
}

function AdminUsersPage() {
  const data = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const rows = data.users.filter((user) => `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(search.toLowerCase()) && (roleFilter === "all" || user.role === roleFilter) && (statusFilter === "all" || (statusFilter === "active") === user.is_active));
  async function toggleActive(user: AdminUser) {
    const { error } = await supabase.rpc("admin_set_user_active", { _user_id: user.user_id, _active: !user.is_active });
    if (error) toast.error(error.message);
    else { await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] }); toast.success(user.is_active ? "Account deactivated." : "Account activated."); }
  }
  return <div className="page-section"><SectionHeading eyebrow="ACCESS CONTROL" title="Users" description={`${data.users.length} accounts in MediVault.`} />
    <div className="filter-toolbar"><div className="search-control"><Search size={17} /><Input aria-label="Search users" placeholder="Search name, email, or phone" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select className="field-control" aria-label="Filter by role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All roles</option><option value="patient">Patients</option><option value="doctor">Doctors</option><option value="admin">Admins</option></select><select className="field-control" aria-label="Filter by account status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    <div className="surface table-surface"><div className="table-scroll"><table className="data-table"><thead><tr><th>Account</th><th>Role</th><th>Joined</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{rows.map((user) => <tr key={user.user_id}><td><Link to="/admin/users/$userId" params={{ userId: user.user_id }} className="user-table-cell"><span className="avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></Link></td><td><span className="role-chip">{user.role}</span></td><td>{formatDate(user.created_at)}</td><td><span className={`account-state ${user.is_active ? "is-active" : "is-inactive"}`}>{user.is_active ? "Active" : "Inactive"}</span></td><td className="table-action"><Button variant="outline" size="sm" disabled={user.user_id === data.user.id} onClick={() => void toggleActive(user)}>{user.is_active ? "Deactivate" : "Activate"}</Button></td></tr>)}</tbody></table></div>{!rows.length && <EmptyState title="No matching users" detail="Try changing your search or filters." />}</div>
  </div>;
}

function AdminUserDetails({ userId }: { userId: string }) {
  const data = useWorkspace();
  const user = data.users.find((item) => item.user_id === userId);
  if (!user) return <div className="page-section"><EmptyState title="User not found" detail="This account is unavailable." action={<Button asChild variant="outline"><Link to="/admin/users">Back to users</Link></Button>} /></div>;
  const relatedLogs = data.activities.filter((item) => item.user_id === user.user_id || item.target_user_id === user.user_id);
  return <div className="page-section"><Link to="/admin/users" className="back-link"><ArrowLeft size={16} /> Back to users</Link><div className="detail-header"><div className="detail-title-line"><span className="avatar avatar-large">{initials(user.name)}</span><div><span className="eyebrow">{user.role.toUpperCase()} ACCOUNT</span><h2>{user.name}</h2><p>{user.email}</p></div></div><span className={`account-state ${user.is_active ? "is-active" : "is-inactive"}`}>{user.is_active ? "Active" : "Inactive"}</span></div><div className="surface detail-panel"><dl className="detail-list"><div><dt>Phone</dt><dd>{user.phone || "—"}</dd></div><div><dt>Member since</dt><dd>{formatDate(user.created_at)}</dd></div><div><dt>Account status</dt><dd>{user.is_active ? "Active" : "Inactive"}</dd></div><div><dt>Recent activity</dt><dd>{relatedLogs.length} entries</dd></div></dl></div><section className="surface activity-surface"><div className="panel-heading"><div><span className="eyebrow">ACCOUNT HISTORY</span><h3>Recent activity</h3></div></div>{relatedLogs.slice(0, 20).map((activity) => <ActivityItem key={activity.id} activity={activity} />)}</section></div>;
}

function CategoryAdminPage() {
  const data = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 40) { toast.error("Category names must be 1–40 characters."); return; }
    if (data.categories.some((category) => category.name.toLowerCase() === cleanName.toLowerCase())) { toast.error("That category already exists."); return; }
    setBusy(true);
    const { error } = await supabase.from("report_categories").insert({ name: cleanName, icon: "file" });
    if (error) toast.error(error.message);
    else { await supabase.rpc("admin_log_category", { _action: "Category added", _details: `Added category ${cleanName}` }); await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] }); toast.success("Category added."); setName(""); }
    setBusy(false);
  }
  async function saveRename(category: Category) {
    const cleanName = editName.trim();
    if (!cleanName || cleanName.length > 40 || data.categories.some((item) => item.id !== category.id && item.name.toLowerCase() === cleanName.toLowerCase())) { toast.error("Enter a unique category name (up to 40 characters)."); return; }
    const { error } = await supabase.from("report_categories").update({ name: cleanName }).eq("id", category.id);
    if (error) toast.error(error.message);
    else { await supabase.rpc("admin_log_category", { _action: "Category renamed", _details: `Renamed category to ${cleanName}` }); await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] }); toast.success("Category renamed."); setEditingId(""); }
  }
  async function deleteCategory(category: Category) {
    if (category.name === "Other") { toast.error("The Other category cannot be deleted."); return; }
    if (data.reports.some((report) => report.category_id === category.id)) { toast.error("This category is used by reports and cannot be deleted."); return; }
    if (!window.confirm(`Delete “${category.name}”?`)) return;
    const { error } = await supabase.from("report_categories").delete().eq("id", category.id);
    if (error) toast.error(error.message);
    else { await supabase.rpc("admin_log_category", { _action: "Category deleted", _details: `Deleted category ${category.name}` }); await queryClient.invalidateQueries({ queryKey: ["medivault", "workspace"] }); toast.success("Category deleted."); }
  }
  return <div className="page-section"><SectionHeading eyebrow="REPORT ORGANIZATION" title="Categories" description="Manage the categories patients use to organize their reports." />
    <form className="surface category-create" onSubmit={(event) => void addCategory(event)}><div><span className="eyebrow">NEW CATEGORY</span><h3>Add a category</h3></div><Input aria-label="New category name" maxLength={40} placeholder="Category name" value={name} onChange={(event) => setName(event.target.value)} required /><Button type="submit" disabled={busy}>Add category</Button></form>
    <div className="surface category-list">{data.categories.map((category) => {
      const used = data.reports.filter((report) => report.category_id === category.id).length;
      return <div className="category-admin-row" key={category.id}><span className="report-category-icon">{categoryIcon(category.icon)}</span>{editingId === category.id ? <Input aria-label={`Rename ${category.name}`} autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} /> : <strong>{category.name}</strong>}<span className="category-usage">{used} report{used === 1 ? "" : "s"}</span>{editingId === category.id ? <><Button size="sm" onClick={() => void saveRename(category)}>Save</Button><Button variant="ghost" size="sm" onClick={() => setEditingId("")}>Cancel</Button></> : <><Button variant="ghost" size="icon" aria-label={`Rename ${category.name}`} onClick={() => { setEditingId(category.id); setEditName(category.name); }}><Pencil size={16} /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${category.name}`} disabled={category.name === "Other" || used > 0} onClick={() => void deleteCategory(category)}><Trash2 size={16} /></Button></>}</div>;
    })}</div>
  </div>;
}

function AdminActivityPage() {
  const data = useWorkspace();
  const [search, setSearch] = useState("");
  const filtered = data.activities.filter((item) => `${item.action} ${item.details}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-section"><SectionHeading eyebrow="AUDIT TRAIL" title="Activity logs" description="Recent activity across accounts and report access." /><div className="filter-toolbar"><div className="search-control"><Search size={17} /><Input aria-label="Search activity" placeholder="Search action or details" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="result-count">{filtered.length} entries</span></div><div className="surface activity-surface">{filtered.length ? filtered.map((activity) => <ActivityItem key={activity.id} activity={activity} />) : <EmptyState title="No activity found" detail="Try another search." />}</div></div>;
}

export function AdminUserDetailsPage({ userId }: { userId: string }) {
  const data = useWorkspace();
  if (data.role !== "admin") return <NoAccess />;
  return <AdminUserDetails userId={userId} />;
}

function PreviewDialog({ preview, onClose }: { preview: { url: string; type: string; title: string }; onClose: () => void }) {
  return <div className="dialog-backdrop preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="preview-dialog" role="dialog" aria-modal="true" aria-label={`Preview ${preview.title}`}><div className="preview-toolbar"><strong>{preview.title}</strong><div><a className="icon-action" href={preview.url} download aria-label="Download file"><Download size={17} /></a><Button variant="ghost" size="icon" aria-label="Close preview" onClick={onClose}><X size={18} /></Button></div></div>{preview.type === "pdf" ? <iframe title={preview.title} src={preview.url} className="preview-frame" /> : <img src={preview.url} alt={preview.title} className="preview-image" />}</section></div>;
}

function ConfirmDialog({ title, detail, onCancel, onConfirm }: { title: string; detail: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><section className="dialog-panel confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><span className="confirm-mark"><ShieldCheck size={22} /></span><h3 id="confirm-title">{title}</h3><p>{detail}</p><div className="form-actions"><Button variant="destructive" onClick={onConfirm}>Confirm</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div></section></div>;
}
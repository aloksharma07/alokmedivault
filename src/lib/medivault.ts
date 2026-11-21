import { queryOptions } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Enums"]["app_role"];
export type Profile = Tables<"profiles">;
export type Patient = Tables<"patients">;
export type Doctor = Tables<"doctors">;
export type Report = Tables<"reports">;
export type Category = Tables<"report_categories">;
export type Activity = Tables<"activity_logs">;
export type DoctorShare = Database["public"]["Functions"]["doctor_share_list"]["Returns"][number];
export type PatientShare = Database["public"]["Functions"]["patient_share_list"]["Returns"][number];
export type DoctorDirectoryEntry = Database["public"]["Functions"]["list_active_doctors"]["Returns"][number];
export type AdminUser = Profile & { role: UserRole };

export type WorkspaceData = {
  user: User;
  profile: Profile;
  role: UserRole;
  patient: Patient | null;
  doctor: Doctor | null;
  reports: Report[];
  categories: Category[];
  availableDoctors: DoctorDirectoryEntry[];
  shares: Array<DoctorShare | PatientShare>;
  activities: Activity[];
  users: AdminUser[];
};

export type QrPatient = Database["public"]["Functions"]["redeem_patient_qr"]["Returns"][number];

export const REPORT_MAX_BYTES = 10 * 1024 * 1024;
export const REPORT_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export type FileCheck = {
  name: string;
  type: string;
  size: number;
  header: Uint8Array;
};

export function validateReportFile(file: FileCheck): string | null {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  const expectedMime = REPORT_MIME_TYPES[extension];
  if (!expectedMime || expectedMime !== file.type.toLowerCase()) {
    return "Choose a PDF, JPG, JPEG, or PNG file whose content matches its file type.";
  }
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > REPORT_MAX_BYTES) return "The file must be 10 MB or smaller.";

  const startsWith = (signature: number[]) => signature.every((byte, index) => file.header[index] === byte);
  const validSignature = extension === "pdf"
    ? startsWith([0x25, 0x50, 0x44, 0x46])
    : extension === "png"
      ? startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      : startsWith([0xff, 0xd8, 0xff]);
  return validSignature ? null : "The selected file does not look like a valid report image or PDF.";
}

export function getShareStatus(share: { status: string; expires_at: string }, now = Date.now()) {
  if (share.status === "revoked") return "revoked" as const;
  return new Date(share.expires_at).getTime() <= now ? "expired" as const : "active" as const;
}

export function validateShareExpiry(value: string, now = Date.now()): string | null {
  const expiresAt = new Date(value).getTime();
  if (!Number.isFinite(expiresAt)) return "Choose a valid expiry date and time.";
  if (expiresAt <= now) return "Expiry must be in the future.";
  if (expiresAt > now + 365 * 24 * 60 * 60 * 1000) return "Expiry cannot be more than 1 year from now.";
  return null;
}

export function canCompareReports(a: Pick<Report, "id" | "category_id">, b: Pick<Report, "id" | "category_id">) {
  return a.id !== b.id && a.category_id === b.category_id;
}

async function loadWorkspace(): Promise<WorkspaceData> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Please sign in to continue.");
  const user = authData.user;

  const [profileResult, roleResult, categoryResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("report_categories").select("*").order("name"),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (roleResult.error) throw roleResult.error;
  if (categoryResult.error) throw categoryResult.error;
  if (!profileResult.data || !roleResult.data) throw new Error("Your account profile is not ready yet.");
  if (!profileResult.data.is_active) throw new Error("This account is inactive. Contact the administrator.");

  const base = {
    user,
    profile: profileResult.data,
    role: roleResult.data.role,
    patient: null,
    doctor: null,
    reports: [] as Report[],
    categories: categoryResult.data,
    availableDoctors: [] as DoctorDirectoryEntry[],
    shares: [] as Array<DoctorShare | PatientShare>,
    activities: [] as Activity[],
    users: [] as AdminUser[],
  };

  if (base.role === "patient") {
    const patientResult = await supabase.from("patients").select("*").eq("user_id", user.id).maybeSingle();
    if (patientResult.error) throw patientResult.error;
    if (!patientResult.data) throw new Error("Your patient profile is not ready yet.");
    const [reportsResult, sharesResult, activitiesResult, doctorsResult] = await Promise.all([
      supabase.from("reports").select("*").eq("patient_id", patientResult.data.id).order("report_date", { ascending: false }),
      supabase.rpc("patient_share_list"),
      supabase.from("activity_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
      supabase.rpc("list_active_doctors"),
    ]);
    if (reportsResult.error) throw reportsResult.error;
    if (sharesResult.error) throw sharesResult.error;
    if (activitiesResult.error) throw activitiesResult.error;
    if (doctorsResult.error) throw doctorsResult.error;
    return { ...base, patient: patientResult.data, reports: reportsResult.data, shares: sharesResult.data, activities: activitiesResult.data, availableDoctors: doctorsResult.data };
  }

  if (base.role === "doctor") {
    const doctorResult = await supabase.from("doctors").select("*").eq("user_id", user.id).maybeSingle();
    if (doctorResult.error) throw doctorResult.error;
    if (!doctorResult.data) throw new Error("Your clinician profile is not ready yet.");
    const [sharesResult, activitiesResult] = await Promise.all([
      supabase.rpc("doctor_share_list"),
      supabase.from("activity_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    ]);
    if (sharesResult.error) throw sharesResult.error;
    if (activitiesResult.error) throw activitiesResult.error;
    return { ...base, doctor: doctorResult.data, shares: sharesResult.data, activities: activitiesResult.data };
  }

  const [profilesResult, rolesResult, reportsResult, activitiesResult] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("reports").select("id, category_id, title, report_date, is_important, patient_id"),
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (reportsResult.error) throw reportsResult.error;
  if (activitiesResult.error) throw activitiesResult.error;
  const roleByUser = new Map(rolesResult.data.map((row) => [row.user_id, row.role]));
  const users = profilesResult.data.map((profile) => ({
    ...profile,
    role: roleByUser.get(profile.user_id) ?? "patient" as UserRole,
  }));
  return { ...base, reports: reportsResult.data as Report[], activities: activitiesResult.data, users };
}

export const workspaceQueryOptions = () => queryOptions({
  queryKey: ["medivault", "workspace"],
  queryFn: loadWorkspace,
  staleTime: 20_000,
});

export const qrPatientQueryOptions = (token: string) => queryOptions({
  queryKey: ["medivault", "qr-patient", token],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("redeem_patient_qr", { _qr_token: token });
    if (error) throw error;
    const patient = data[0];
    if (!patient) throw new Error("This QR access link is invalid or has been regenerated.");
    const [reportsResult, categoriesResult] = await Promise.all([
      supabase.from("reports").select("*").eq("patient_id", patient.patient_id).order("report_date", { ascending: false }),
      supabase.from("report_categories").select("*").order("name"),
    ]);
    if (reportsResult.error) throw reportsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    return { patient, reports: reportsResult.data, categories: categoriesResult.data };
  },
});

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "MV";
}
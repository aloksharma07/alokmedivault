import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canCompareReports, getShareStatus, REPORT_MAX_BYTES, validateReportFile, validateShareExpiry } from "@/lib/medivault";
import { limitReportAiText, REPORT_AI_MAX_ANSWER_CHARS, REPORT_AI_MAX_COMPARISON_REPORTS, REPORT_AI_MAX_MESSAGES, REPORT_AI_MAX_OUTPUT_TOKENS, REPORT_AI_MAX_QUESTION_CHARS, REPORT_AI_MAX_TEXT_CHARS } from "@/lib/report-ai.shared";

describe("MediVault report rules", () => {
  it("accepts a valid report at the 10 MB limit and rejects one byte over", () => {
    const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(validateReportFile({ name: "report.pdf", type: "application/pdf", size: REPORT_MAX_BYTES, header })).toBeNull();
    expect(validateReportFile({ name: "report.pdf", type: "application/pdf", size: REPORT_MAX_BYTES + 1, header })).toBe("The file must be 10 MB or smaller.");
  });

  it("rejects file content that does not match its extension and MIME type", () => {
    expect(validateReportFile({
      name: "report.pdf",
      type: "image/png",
      size: 10,
      header: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    })).toContain("matches its file type");
  });

  it("treats revoked shares as revoked and shares at their expiry time as expired", () => {
    const now = Date.parse("2026-11-21T16:48:00.000Z");
    expect(getShareStatus({ status: "active", expires_at: "2026-11-21T16:48:00.000Z" }, now)).toBe("expired");
    expect(getShareStatus({ status: "revoked", expires_at: "2026-11-22T16:48:00.000Z" }, now)).toBe("revoked");
    expect(getShareStatus({ status: "active", expires_at: "2026-11-22T16:48:00.000Z" }, now)).toBe("active");
  });

  it("allows a future share expiry through one year and rejects longer access", () => {
    const now = Date.parse("2026-11-21T16:48:00.000Z");
    expect(validateShareExpiry("2027-11-21T16:48:00.000Z", now)).toBeNull();
    expect(validateShareExpiry("2027-11-21T16:48:00.001Z", now)).toBe("Expiry cannot be more than 1 year from now.");
  });

  it("compares only two different reports from the same category", () => {
    expect(canCompareReports({ id: "a", category_id: "blood" }, { id: "b", category_id: "blood" })).toBe(true);
    expect(canCompareReports({ id: "a", category_id: "blood" }, { id: "b", category_id: "scan" })).toBe(false);
    expect(canCompareReports({ id: "a", category_id: "blood" }, { id: "a", category_id: "blood" })).toBe(false);
  });

  it("keeps report AI context and answers small to limit token use", () => {
    expect(REPORT_AI_MAX_TEXT_CHARS).toBe(3200);
    expect(REPORT_AI_MAX_QUESTION_CHARS).toBe(240);
    expect(REPORT_AI_MAX_ANSWER_CHARS).toBe(12000);
    expect(REPORT_AI_MAX_MESSAGES).toBe(6);
    expect(REPORT_AI_MAX_COMPARISON_REPORTS).toBe(5);
    expect(REPORT_AI_MAX_OUTPUT_TOKENS).toBe(1024);
    expect(limitReportAiText("a".repeat(3201))).toHaveLength(3200);
  });

  it("keeps patient-owned reports readable while preserving clinician and admin gates", () => {
    const migration = readFileSync(resolve(process.cwd(), "drizzle/migrations/0003_allow_owner_report_returning.sql"), "utf8");
    expect(migration).toMatch(/ALTER POLICY "Allowed users can view reports" ON public\.reports USING \(patient_id = public\.current_patient_id\(\) OR public\.doctor_can_view_report\(id\) OR public\.has_active_role\(auth\.uid\(\), 'admin'\)\);/);
  });

  it("allows patients to clean up incomplete files without widening clinician access", () => {
    const migration = readFileSync(resolve(process.cwd(), "drizzle/migrations/0004_allow_owner_cleanup_of_incomplete_uploads.sql"), "utf8");
    expect(migration).toMatch(/storage\.foldername\(name\)\)\[1\] = public\.current_patient_id\(\)::text OR public\.can_access_report_file\(name\)/);
  });

  it("allows clinicians to read only reports covered by their active share or current QR access", () => {
    const migration = readFileSync(resolve(process.cwd(), "drizzle/migrations/0005_fix_doctor_report_file_access.sql"), "utf8");
    expect(migration).toContain("d.user_id = auth.uid()");
    expect(migration).toContain("public.has_active_role(auth.uid(), 'doctor'::public.app_role)");
    expect(migration).toContain("s.status = 'active'");
    expect(migration).toContain("s.expires_at > now()");
    expect(migration).toContain("g.qr_token = p.qr_token");
    expect(migration).not.toContain("'admin'");
  });
});
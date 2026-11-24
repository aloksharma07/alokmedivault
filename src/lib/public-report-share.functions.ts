import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const tokenInput = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) });

export const loadPublicReportShare = createServerFn({ method: "POST" })
  .validator((input: unknown) => tokenInput.parse(input))
  .handler(async ({ data }) => {
    const tokenDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.token));
    const tokenHash = Array.from(new Uint8Array(tokenDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data: shares, error: shareError } = await supabasePublic.rpc("resolve_report_public_share", { _token_hash: tokenHash });
    const share = shares?.[0];
    if (shareError || !share) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signedFile, error: fileError } = await supabaseAdmin.storage
      .from("medical-reports")
      .createSignedUrl(share.storage_path, 300);
    if (fileError || !signedFile) return null;

    return {
      title: share.report_title,
      category: share.category_name,
      reportDate: share.report_date,
      fileName: share.file_name,
      fileType: share.file_type,
      expiresAt: share.expires_at,
      signedUrl: signedFile.signedUrl,
    };
  });
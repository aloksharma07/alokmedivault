CREATE TABLE public.report_public_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.report_public_shares TO authenticated;
GRANT ALL ON public.report_public_shares TO service_role;
ALTER TABLE public.report_public_shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_report_public_shares_patient ON public.report_public_shares(patient_id, created_at DESC);
CREATE INDEX idx_report_public_shares_report ON public.report_public_shares(report_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_report_public_share(_report_id uuid, _token_hash text, _expires_at timestamp with time zone)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _patient_id uuid := public.current_patient_id();
  _share_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _patient_id IS NULL THEN
    RAISE EXCEPTION 'Only patients can create report links.';
  END IF;
  IF _token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid share token.';
  END IF;
  IF _expires_at <= now() OR _expires_at > now() + interval '7 days' THEN
    RAISE EXCEPTION 'Report links can be active for up to 7 days.';
  END IF;

  INSERT INTO public.report_public_shares (report_id, patient_id, token_hash, expires_at)
  SELECT r.id, r.patient_id, _token_hash, _expires_at
  FROM public.reports r
  WHERE r.id = _report_id AND r.patient_id = _patient_id
  RETURNING id INTO _share_id;

  IF _share_id IS NULL THEN
    RAISE EXCEPTION 'Report not found or not owned by this patient.';
  END IF;
  RETURN _share_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_report_public_share(_share_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.report_public_shares
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE id = _share_id AND patient_id = public.current_patient_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share link not found.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_report_public_share(_token_hash text)
RETURNS TABLE (
  report_title text,
  category_name text,
  report_date date,
  file_name text,
  file_type text,
  storage_path text,
  expires_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT r.title, c.name, r.report_date, r.file_name, r.file_type, r.storage_path, s.expires_at
  FROM public.report_public_shares s
  JOIN public.reports r ON r.id = s.report_id AND r.patient_id = s.patient_id
  JOIN public.report_categories c ON c.id = r.category_id
  JOIN public.patients p ON p.id = s.patient_id
  WHERE _token_hash ~ '^[0-9a-f]{64}$'
    AND s.token_hash = _token_hash
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
    AND public.is_active_user(p.user_id)
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.create_report_public_share(uuid, text, timestamp with time zone) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_report_public_share(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_report_public_share(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_report_public_share(uuid, text, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_report_public_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_report_public_share(text) TO anon, authenticated;

CREATE POLICY "Patients can view own public report shares"
  ON public.report_public_shares
  FOR SELECT TO authenticated
  USING (patient_id = public.current_patient_id());
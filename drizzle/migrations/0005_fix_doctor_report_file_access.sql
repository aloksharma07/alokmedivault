CREATE OR REPLACE FUNCTION public.can_access_report_file(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.storage_path = _path
      AND (
        r.patient_id = public.current_patient_id()
        OR EXISTS (
          SELECT 1
          FROM public.report_shares s
          JOIN public.doctors d ON d.id = s.doctor_id
          WHERE s.report_id = r.id
            AND d.user_id = auth.uid()
            AND public.has_active_role(auth.uid(), 'doctor'::public.app_role)
            AND s.status = 'active'
            AND s.expires_at > now()
        )
        OR EXISTS (
          SELECT 1
          FROM public.qr_access_grants g
          JOIN public.doctors d ON d.id = g.doctor_id
          JOIN public.patients p ON p.id = g.patient_id
          WHERE g.patient_id = r.patient_id
            AND d.user_id = auth.uid()
            AND public.has_active_role(auth.uid(), 'doctor'::public.app_role)
            AND g.qr_token = p.qr_token
        )
      )
  )
$function$;
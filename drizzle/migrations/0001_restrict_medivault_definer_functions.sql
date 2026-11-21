CREATE OR REPLACE FUNCTION public.log_activity(_action text, _details text DEFAULT '', _report_id uuid DEFAULT NULL, _target_user_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _action NOT IN ('Login', 'Logout', 'Report uploaded', 'Report viewed', 'Report edited', 'Report deleted', 'Report downloaded', 'Reports compared', 'Password changed', 'QR Code regenerated', 'Report shared', 'Share revoked', 'QR Code scanned', 'User deactivated', 'User activated', 'Category added', 'Category renamed', 'Category deleted') THEN RAISE EXCEPTION 'Unsupported activity'; END IF;
  IF _target_user_id IS NOT NULL AND NOT public.has_active_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _report_id IS NOT NULL AND NOT public.can_access_report(_report_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.activity_logs (user_id, target_user_id, action, details, report_id)
  VALUES (auth.uid(), _target_user_id, _action, left(COALESCE(_details, ''), 500), _report_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_log_category(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_report(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_report_file(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_report_share(uuid, uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_doctor_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_patient_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.doctor_can_view_report(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.doctor_share_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_active_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_active_doctors() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_activity(text, text, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.patient_share_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_patient_qr(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_patient_qr() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_report_share(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_patient_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_doctor_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_report_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_category_delete() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_log_category(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_report_file(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_report_share(uuid, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_doctor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctor_can_view_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctor_share_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_active_doctors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.patient_share_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_patient_qr(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_patient_qr() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_report_share(uuid) TO authenticated;
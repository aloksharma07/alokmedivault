CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'admin');
CREATE SEQUENCE public.patient_code_seq START 1;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (name, phone) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  patient_code text NOT NULL UNIQUE DEFAULT ('PAT-' || lpad(nextval('public.patient_code_seq')::text, 4, '0')),
  qr_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  age integer CHECK (age IS NULL OR age BETWEEN 0 AND 130),
  gender text NOT NULL DEFAULT '' CHECK (gender IN ('', 'Male', 'Female', 'Other')),
  address text NOT NULL DEFAULT '',
  emergency_contact text NOT NULL DEFAULT '',
  medical_info text NOT NULL DEFAULT '',
  legacy_patient_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  specialization text NOT NULL DEFAULT '',
  hospital text NOT NULL DEFAULT '',
  legacy_doctor_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.report_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(trim(name)) BETWEEN 1 AND 40),
  icon text NOT NULL DEFAULT 'file',
  legacy_category_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_categories TO authenticated;
GRANT ALL ON public.report_categories TO service_role;
ALTER TABLE public.report_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.report_categories(id),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 150),
  hospital_name text NOT NULL DEFAULT '',
  laboratory_name text NOT NULL DEFAULT '',
  doctor_name text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  report_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  is_important boolean NOT NULL DEFAULT false,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'jpeg', 'png')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  file_hash text NOT NULL,
  legacy_report_id text UNIQUE,
  legacy_stored_name text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, file_hash)
);
CREATE INDEX idx_reports_patient ON public.reports(patient_id);
CREATE INDEX idx_reports_hash ON public.reports(patient_id, file_hash);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  revoked_at timestamptz,
  legacy_share_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shares_doctor ON public.report_shares(doctor_id);
CREATE INDEX idx_shares_report ON public.report_shares(report_id);
GRANT SELECT ON public.report_shares TO authenticated;
GRANT ALL ON public.report_shares TO service_role;
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.qr_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  qr_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id, qr_token)
);
CREATE INDEX idx_qr_grants_doctor ON public.qr_access_grants(doctor_id, patient_id);
GRANT SELECT ON public.qr_access_grants TO authenticated;
GRANT ALL ON public.qr_access_grants TO service_role;
ALTER TABLE public.qr_access_grants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  action text NOT NULL,
  details text NOT NULL DEFAULT '',
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  legacy_activity_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_user ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_target ON public.activity_logs(target_user_id, created_at DESC);
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_active)
$$;
CREATE OR REPLACE FUNCTION public.has_active_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user(_user_id) AND public.has_role(_user_id, _role)
$$;
CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.patients p WHERE p.user_id = auth.uid() AND public.has_active_role(auth.uid(), 'patient')
$$;
CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id FROM public.doctors d WHERE d.user_id = auth.uid() AND public.has_active_role(auth.uid(), 'doctor')
$$;
CREATE OR REPLACE FUNCTION public.doctor_can_view_report(_report_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.report_shares s
    WHERE s.report_id = _report_id AND s.doctor_id = public.current_doctor_id()
      AND s.status = 'active' AND s.expires_at > now()
  ) OR EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.qr_access_grants g ON g.patient_id = r.patient_id
    JOIN public.patients p ON p.id = g.patient_id
    WHERE r.id = _report_id AND g.doctor_id = public.current_doctor_id() AND g.qr_token = p.qr_token
  )
$$;
CREATE OR REPLACE FUNCTION public.can_access_report(_report_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.reports r WHERE r.id = _report_id AND r.patient_id = public.current_patient_id())
    OR public.doctor_can_view_report(_report_id)
    OR public.has_active_role(auth.uid(), 'admin')
$$;
CREATE OR REPLACE FUNCTION public.can_access_report_file(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.storage_path = _path
      AND (r.patient_id = public.current_patient_id() OR public.doctor_can_view_report(r.id))
  )
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER patients_touch BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER doctors_touch BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.report_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER shares_touch BEFORE UPDATE ON public.report_shares FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_active_role(auth.uid(), 'admin') THEN
    NEW.email = OLD.email;
    NEW.is_active = OLD.is_active;
  END IF;
  NEW.user_id = OLD.user_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE OR REPLACE FUNCTION public.protect_patient_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.user_id = OLD.user_id; NEW.id = OLD.id; NEW.patient_code = OLD.patient_code; NEW.qr_token = OLD.qr_token; RETURN NEW; END;
$$;
CREATE OR REPLACE FUNCTION public.protect_doctor_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.user_id = OLD.user_id; NEW.id = OLD.id; RETURN NEW; END;
$$;
CREATE TRIGGER patients_protect BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.protect_patient_identity();
CREATE TRIGGER doctors_protect BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.protect_doctor_identity();

CREATE OR REPLACE FUNCTION public.validate_report_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.report_date > current_date THEN RAISE EXCEPTION 'Report date cannot be in the future.'; END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.patient_id = OLD.patient_id; NEW.file_name = OLD.file_name; NEW.storage_path = OLD.storage_path;
    NEW.file_type = OLD.file_type; NEW.file_size = OLD.file_size; NEW.file_hash = OLD.file_hash; NEW.uploaded_at = OLD.uploaded_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reports_validate BEFORE INSERT OR UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.validate_report_write();

CREATE OR REPLACE FUNCTION public.protect_category_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.name = 'Other' THEN RAISE EXCEPTION 'The Other category cannot be deleted.'; END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE category_id = OLD.id) THEN RAISE EXCEPTION 'This category is used by reports.'; END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER categories_protect_delete BEFORE DELETE ON public.report_categories FOR EACH ROW EXECUTE FUNCTION public.protect_category_delete();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested_role text := COALESCE(NEW.raw_user_meta_data ->> 'role', 'patient');
  chosen_role public.app_role := CASE WHEN requested_role = 'doctor' THEN 'doctor'::public.app_role ELSE 'patient'::public.app_role END;
BEGIN
  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (NEW.id, left(COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''), NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'MediVault user'), 120), lower(COALESCE(NEW.email, '')), left(COALESCE(NEW.raw_user_meta_data ->> 'phone', ''), 30));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);
  IF chosen_role = 'doctor' THEN
    INSERT INTO public.doctors (user_id, specialization) VALUES (NEW.id, left(COALESCE(NEW.raw_user_meta_data ->> 'specialization', ''), 100));
  ELSE
    INSERT INTO public.patients (user_id) VALUES (NEW.id);
  END IF;
  INSERT INTO public.activity_logs (user_id, action, details) VALUES (NEW.id, 'Registered', 'New ' || chosen_role::text || ' account created');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_active_role(auth.uid(), 'admin'));
CREATE POLICY "Active users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() AND is_active) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_active_role(auth.uid(), 'admin'));

CREATE POLICY "Patients can view own patient profile" ON public.patients FOR SELECT TO authenticated USING (id = public.current_patient_id());
CREATE POLICY "Patients can update own patient profile" ON public.patients FOR UPDATE TO authenticated USING (id = public.current_patient_id()) WITH CHECK (id = public.current_patient_id());
CREATE POLICY "Admins can view patient profiles" ON public.patients FOR SELECT TO authenticated USING (public.has_active_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors can view own doctor profile" ON public.doctors FOR SELECT TO authenticated USING (id = public.current_doctor_id());
CREATE POLICY "Doctors can update own doctor profile" ON public.doctors FOR UPDATE TO authenticated USING (id = public.current_doctor_id()) WITH CHECK (id = public.current_doctor_id());
CREATE POLICY "Admins can view doctor profiles" ON public.doctors FOR SELECT TO authenticated USING (public.has_active_role(auth.uid(), 'admin'));
CREATE POLICY "Patients can view active doctors" ON public.doctors FOR SELECT TO authenticated USING (public.has_active_role(auth.uid(), 'patient') AND public.is_active_user(user_id));

CREATE POLICY "Signed-in users can view categories" ON public.report_categories FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Admins can add categories" ON public.report_categories FOR INSERT TO authenticated WITH CHECK (public.has_active_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can edit categories" ON public.report_categories FOR UPDATE TO authenticated USING (public.has_active_role(auth.uid(), 'admin')) WITH CHECK (public.has_active_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.report_categories FOR DELETE TO authenticated USING (public.has_active_role(auth.uid(), 'admin'));

CREATE POLICY "Allowed users can view reports" ON public.reports FOR SELECT TO authenticated USING (public.can_access_report(id));
CREATE POLICY "Patients can add own reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (patient_id = public.current_patient_id());
CREATE POLICY "Patients can edit own reports" ON public.reports FOR UPDATE TO authenticated USING (patient_id = public.current_patient_id()) WITH CHECK (patient_id = public.current_patient_id());
CREATE POLICY "Patients can delete own reports" ON public.reports FOR DELETE TO authenticated USING (patient_id = public.current_patient_id());

CREATE POLICY "Patients can view own shares" ON public.report_shares FOR SELECT TO authenticated USING (patient_id = public.current_patient_id());
CREATE POLICY "Doctors can view their shares" ON public.report_shares FOR SELECT TO authenticated USING (doctor_id = public.current_doctor_id());
CREATE POLICY "Admins can view shares" ON public.report_shares FOR SELECT TO authenticated USING (public.has_active_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors can view own QR access" ON public.qr_access_grants FOR SELECT TO authenticated USING (doctor_id = public.current_doctor_id());
CREATE POLICY "Users can view related activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()) AND (user_id = auth.uid() OR target_user_id = auth.uid()));
CREATE POLICY "Admins can view activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_active_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_activity(_action text, _details text DEFAULT '', _report_id uuid DEFAULT NULL, _target_user_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _action NOT IN ('Login', 'Logout', 'Report uploaded', 'Report viewed', 'Report edited', 'Report deleted', 'Report downloaded', 'Reports compared', 'Password changed', 'QR Code regenerated', 'Report shared', 'Share revoked', 'QR Code scanned', 'User deactivated', 'User activated', 'Category added', 'Category renamed', 'Category deleted') THEN RAISE EXCEPTION 'Unsupported activity'; END IF;
  IF _report_id IS NOT NULL AND NOT public.can_access_report(_report_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.activity_logs (user_id, target_user_id, action, details, report_id) VALUES (auth.uid(), _target_user_id, _action, left(COALESCE(_details, ''), 500), _report_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_active_doctors()
RETURNS TABLE (id uuid, name text, specialization text, hospital text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, p.name, d.specialization, d.hospital FROM public.doctors d JOIN public.profiles p ON p.user_id = d.user_id
  WHERE p.is_active AND public.current_patient_id() IS NOT NULL ORDER BY p.name
$$;

CREATE OR REPLACE FUNCTION public.create_report_share(_report_id uuid, _doctor_id uuid, _message text, _expires_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := public.current_patient_id(); rtitle text; doctor_user uuid; doctor_name text; new_id uuid;
BEGIN
  IF pid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT title INTO rtitle FROM public.reports WHERE id = _report_id AND patient_id = pid;
  IF rtitle IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  SELECT d.user_id, p.name INTO doctor_user, doctor_name FROM public.doctors d JOIN public.profiles p ON p.user_id = d.user_id WHERE d.id = _doctor_id AND p.is_active;
  IF doctor_user IS NULL THEN RAISE EXCEPTION 'Please select a doctor.'; END IF;
  IF _expires_at <= now() THEN RAISE EXCEPTION 'Expiry must be a future date and time.'; END IF;
  IF _expires_at > now() + interval '365 days' THEN RAISE EXCEPTION 'Expiry cannot be more than 1 year from now.'; END IF;
  IF EXISTS (SELECT 1 FROM public.report_shares WHERE report_id = _report_id AND doctor_id = _doctor_id AND status = 'active' AND expires_at > now()) THEN RAISE EXCEPTION 'This report is already actively shared with that doctor. Revoke it first to change the expiry.'; END IF;
  INSERT INTO public.report_shares (report_id, patient_id, doctor_id, message, expires_at) VALUES (_report_id, pid, _doctor_id, left(COALESCE(_message, ''), 500), _expires_at) RETURNING id INTO new_id;
  INSERT INTO public.activity_logs (user_id, target_user_id, action, details, report_id) VALUES (auth.uid(), doctor_user, 'Report shared', 'Shared ' || rtitle || ' with ' || doctor_name, _report_id);
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_report_share(_share_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE share_row public.report_shares%ROWTYPE; rtitle text; doctor_user uuid;
BEGIN
  SELECT * INTO share_row FROM public.report_shares WHERE id = _share_id AND patient_id = public.current_patient_id();
  IF share_row.id IS NULL THEN RAISE EXCEPTION 'Share not found'; END IF;
  IF share_row.status <> 'active' OR share_row.expires_at <= now() THEN RAISE EXCEPTION 'This share is no longer active.'; END IF;
  UPDATE public.report_shares SET status = 'revoked', revoked_at = now() WHERE id = _share_id;
  SELECT title INTO rtitle FROM public.reports WHERE id = share_row.report_id;
  SELECT user_id INTO doctor_user FROM public.doctors WHERE id = share_row.doctor_id;
  INSERT INTO public.activity_logs (user_id, target_user_id, action, details, report_id) VALUES (auth.uid(), doctor_user, 'Share revoked', 'Revoked access to ' || COALESCE(rtitle, 'a report'), share_row.report_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_patient_qr()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := public.current_patient_id(); token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  IF pid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.patients SET qr_token = token WHERE id = pid;
  INSERT INTO public.activity_logs (user_id, action, details) VALUES (auth.uid(), 'QR Code regenerated', 'Regenerated patient access QR code');
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_patient_qr(_qr_token text)
RETURNS TABLE (patient_id uuid, patient_user_id uuid, name text, patient_code text, phone text, age integer, gender text, emergency_contact text, medical_info text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE did uuid := public.current_doctor_id(); pat public.patients%ROWTYPE; doctor_name text;
BEGIN
  IF did IS NULL THEN RAISE EXCEPTION 'Please sign in as an active doctor.'; END IF;
  SELECT * INTO pat FROM public.patients WHERE qr_token = _qr_token;
  IF pat.id IS NULL THEN RAISE EXCEPTION 'Invalid or regenerated QR code.'; END IF;
  INSERT INTO public.qr_access_grants (patient_id, doctor_id, qr_token) VALUES (pat.id, did, _qr_token) ON CONFLICT (patient_id, doctor_id, qr_token) DO NOTHING;
  SELECT p.name INTO doctor_name FROM public.profiles p WHERE p.user_id = auth.uid();
  INSERT INTO public.activity_logs (user_id, target_user_id, action, details) VALUES (auth.uid(), pat.user_id, 'QR Code scanned', COALESCE(doctor_name, 'A doctor') || ' accessed patient reports by QR code');
  RETURN QUERY SELECT pat.id, pat.user_id, pr.name, pat.patient_code, pr.phone, pat.age, pat.gender, pat.emergency_contact, pat.medical_info FROM public.profiles pr WHERE pr.user_id = pat.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.doctor_share_list()
RETURNS TABLE (share_id uuid, report_id uuid, patient_user_id uuid, patient_name text, patient_code text, title text, category_name text, report_date date, hospital_name text, laboratory_name text, report_doctor text, notes text, file_type text, file_size integer, file_name text, storage_path text, message text, expires_at timestamptz, status text, effective_status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, r.id, pa.user_id, pr.name, pa.patient_code, r.title, c.name, r.report_date, r.hospital_name, r.laboratory_name, r.doctor_name,
    CASE WHEN s.status = 'active' AND s.expires_at > now() THEN r.notes ELSE '' END,
    r.file_type, r.file_size, r.file_name, CASE WHEN s.status = 'active' AND s.expires_at > now() THEN r.storage_path ELSE '' END,
    s.message, s.expires_at, s.status, CASE WHEN s.status = 'revoked' THEN 'revoked' WHEN s.expires_at <= now() THEN 'expired' ELSE 'active' END, s.created_at
  FROM public.report_shares s JOIN public.reports r ON r.id = s.report_id JOIN public.report_categories c ON c.id = r.category_id
  JOIN public.patients pa ON pa.id = s.patient_id JOIN public.profiles pr ON pr.user_id = pa.user_id
  WHERE s.doctor_id = public.current_doctor_id() ORDER BY s.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.patient_share_list()
RETURNS TABLE (share_id uuid, report_id uuid, doctor_user_id uuid, doctor_name text, doctor_specialization text, title text, category_name text, report_date date, message text, expires_at timestamptz, status text, effective_status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, r.id, d.user_id, pr.name, d.specialization, r.title, c.name, r.report_date, s.message, s.expires_at, s.status,
    CASE WHEN s.status = 'revoked' THEN 'revoked' WHEN s.expires_at <= now() THEN 'expired' ELSE 'active' END, s.created_at
  FROM public.report_shares s JOIN public.reports r ON r.id = s.report_id JOIN public.report_categories c ON c.id = r.category_id
  JOIN public.doctors d ON d.id = s.doctor_id JOIN public.profiles pr ON pr.user_id = d.user_id
  WHERE s.patient_id = public.current_patient_id() ORDER BY s.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_active(_user_id uuid, _active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_name text;
BEGIN
  IF NOT public.has_active_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot deactivate your own account.'; END IF;
  UPDATE public.profiles SET is_active = _active WHERE user_id = _user_id RETURNING name INTO target_name;
  IF target_name IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  INSERT INTO public.activity_logs (user_id, target_user_id, action, details) VALUES (auth.uid(), _user_id, CASE WHEN _active THEN 'User activated' ELSE 'User deactivated' END, target_name || CASE WHEN _active THEN ' was activated' ELSE ' was deactivated' END);
END;
$$;
CREATE OR REPLACE FUNCTION public.admin_log_category(_action text, _details text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_active_role(auth.uid(), 'admin') OR _action NOT IN ('Category added', 'Category renamed', 'Category deleted') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  INSERT INTO public.activity_logs (user_id, action, details) VALUES (auth.uid(), _action, left(_details, 300));
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_patient_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_doctor_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_report_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_category_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_doctor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctor_can_view_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_report_file(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_active_doctors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_report_share(uuid, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_report_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_patient_qr() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_patient_qr(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctor_share_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.patient_share_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_category(text, text) TO authenticated;

CREATE POLICY "Patients upload own report files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-reports' AND (storage.foldername(name))[1] = public.current_patient_id()::text);
CREATE POLICY "Allowed users read report files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-reports' AND public.can_access_report_file(name));
CREATE POLICY "Patients delete own report files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medical-reports' AND (storage.foldername(name))[1] = public.current_patient_id()::text);
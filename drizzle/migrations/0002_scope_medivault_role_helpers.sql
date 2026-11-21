CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_is_admin boolean;
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.user_id = r.user_id
      WHERE r.user_id = auth.uid() AND r.role = 'admin' AND p.is_active
    ) INTO caller_is_admin;
    IF NOT caller_is_admin THEN RETURN false; END IF;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_is_admin boolean;
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.user_id = r.user_id
      WHERE r.user_id = auth.uid() AND r.role = 'admin' AND p.is_active
    ) INTO caller_is_admin;
    IF NOT caller_is_admin THEN RETURN false; END IF;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_active);
END;
$$;

DROP POLICY IF EXISTS "Patients can view active doctors" ON public.doctors;
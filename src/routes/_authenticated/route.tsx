import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { workspaceQueryOptions } from "@/lib/medivault";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw redirect({ to: "/login" });
    const [{ data: profile }, { data: role }] = await Promise.all([
      supabase.from("profiles").select("is_active").eq("user_id", authData.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", authData.user.id).maybeSingle(),
    ]);
    if (!profile?.is_active) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }
    if (!role) throw redirect({ to: "/login" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(workspaceQueryOptions()),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <AppShell><Outlet /></AppShell>;
}
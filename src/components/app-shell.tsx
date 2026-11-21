import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity, ArrowUpRight, ChartNoAxesCombined, ChevronRight, ClipboardList, FileHeart,
  FilePlus2, HeartPulse, LayoutDashboard, LogOut, Menu, QrCode, Settings2, ShieldCheck,
  Star, UserRound, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials, workspaceQueryOptions } from "@/lib/medivault";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery } from "@tanstack/react-query";

const navigation = {
  patient: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/reports", label: "My reports", icon: FileHeart },
    { to: "/reports/new", label: "Add a report", icon: FilePlus2 },
    { to: "/important", label: "Important", icon: Star },
    { to: "/timeline", label: "Health timeline", icon: ChartNoAxesCombined },
    { to: "/compare", label: "Compare reports", icon: ClipboardList },
    { to: "/shared-reports", label: "Shared access", icon: ShieldCheck },
    { to: "/activities", label: "Activity", icon: Activity },
  ],
  doctor: [
    { to: "/doctor/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/doctor/reports", label: "Shared reports", icon: FileHeart },
    { to: "/doctor/qr-access", label: "Patient QR access", icon: QrCode },
    { to: "/activities", label: "Activity", icon: Activity },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/categories", label: "Categories", icon: ClipboardList },
    { to: "/admin/activity", label: "Activity logs", icon: Activity },
  ],
} as const;

const pageNames: Record<string, string> = {
  "/dashboard": "Overview", "/reports": "My reports", "/reports/new": "Add a report",
  "/important": "Important reports", "/timeline": "Health timeline", "/compare": "Compare reports",
  "/shared-reports": "Shared access", "/activities": "Activity", "/profile": "My profile",
  "/settings": "Settings", "/doctor/dashboard": "Overview", "/doctor/reports": "Shared reports",
  "/doctor/qr-access": "Patient QR access", "/admin/dashboard": "Overview", "/admin/users": "Users",
  "/admin/categories": "Categories", "/admin/activity": "Activity logs",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useSuspenseQuery(workspaceQueryOptions());
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const items = navigation[data.role];
  const currentTitle = pageNames[location.pathname] ?? "MediVault";

  async function signOut() {
    await supabase.rpc("log_activity", { _action: "Logout", _details: "Logged out" });
    await supabase.auth.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div className="app-shell">
      {mobileOpen && <Button variant="ghost" className="mobile-shade" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <Link to="/" className="brand-lockup" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark"><HeartPulse size={20} strokeWidth={2.2} /></span>
          <span><strong>MediVault</strong><small>Personal health records</small></span>
        </Link>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`side-link ${location.pathname === to ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{location.pathname === to && <ChevronRight className="nav-current" size={15} />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/profile" className={`side-link ${location.pathname === "/profile" ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
            <UserRound size={18} strokeWidth={1.8} /><span>My profile</span>
          </Link>
          <Link to="/settings" className={`side-link ${location.pathname === "/settings" ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
            <Settings2 size={18} strokeWidth={1.8} /><span>Settings</span>
          </Link>
          <div className="sidebar-user">
            <span className="avatar">{initials(data.profile.name)}</span>
            <span className="user-lines"><strong>{data.profile.name}</strong><small>{data.role}</small></span>
            <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={() => void signOut()}>
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <Button className="mobile-menu-button" variant="ghost" size="icon" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </Button>
          <div className="topbar-heading"><span>MEDIVAULT / {data.role.toUpperCase()}</span><h1>{currentTitle}</h1></div>
          <Link to="/profile" className="topbar-account">
            <span className="avatar avatar-small">{initials(data.profile.name)}</span>
            <span>{data.profile.name}</span><ArrowUpRight size={15} />
          </Link>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
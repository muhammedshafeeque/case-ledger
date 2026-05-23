import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LocaleToggle } from "./LocaleToggle";
import {
  Shield,
  LayoutDashboard,
  FolderOpen,
  Bell,
  Users,
  BarChart2,
  Bot,
  LogOut,
  Search,
  CheckSquare,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/",          icon: LayoutDashboard, key: "nav.dashboard", end: true },
  { to: "/cases",     icon: FolderOpen, key: "nav.cases" },
  { to: "/tasks",     icon: CheckSquare, key: "nav.tasks" },
  { to: "/alerts",    icon: Bell,       key: "nav.alerts" },
  { to: "/search",    icon: Search,     key: "nav.search" },
  { to: "/entities",  icon: Users,      key: "nav.entities" },
  { to: "/analytics", icon: BarChart2,  key: "nav.analytics" },
  { to: "/ai",        icon: Bot,        key: "nav.ai" },
  { to: "/settings",  icon: Settings,   key: "nav.settings" },
] satisfies Array<{ to: string; icon: typeof LayoutDashboard; key: string; end?: boolean }>;

export function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("accessToken");
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <Shield size={16} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-text">{t("app.title")}</div>
            <div className="sidebar-logo-sub">Investigation Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_ITEMS.map(({ to, icon: Icon, key, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={15} />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <LocaleToggle />
          <button className="secondary" onClick={logout} style={{ width: "100%", justifyContent: "center" }}>
            <LogOut size={13} />
            {t("common.logout")}
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

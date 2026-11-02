import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { BrandMark } from "../components/layout/BrandMark";
import { enabledAdminNav } from "./adminNav";
import "./admin.css";

export function AdminShell() {
  const { me } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const nav = enabledAdminNav();

  return (
    <div className={`admin-shell${navOpen ? " is-nav-open" : ""}`}>
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <button
            type="button"
            className="btn btn-secondary admin-mobile-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="admin-sidebar"
            onClick={() => setNavOpen((v) => !v)}
          >
            תפריט
          </button>
          <BrandMark compact />
          <strong>מרכז ניהול</strong>
        </div>
        <div className="admin-topbar-meta">
          <span>{me?.nickname ?? "מנהל/ת"}</span>
          <Link className="btn btn-secondary" to="/">
            חזרה לאתר
          </Link>
        </div>
      </header>

      <button
        type="button"
        className="admin-nav-backdrop"
        aria-label="סגירת תפריט ניהול"
        onClick={() => setNavOpen(false)}
      />

      <div className="admin-body">
        <nav id="admin-sidebar" className="admin-sidebar" aria-label="ניווט ניהול">
          {nav.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}
            >
              <span>{item.label}</span>
              {item.id === "reports" && badge > 0 && (
                <span className="admin-nav-badge" aria-label={`${badge} דיווחים פתוחים`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <main className="admin-main">
          <Outlet context={{ setOpenReportsBadge: setBadge } satisfies AdminOutletContext} />
        </main>
      </div>
    </div>
  );
}

export interface AdminOutletContext {
  setOpenReportsBadge: (n: number) => void;
}

export function AdminPageFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <header className="admin-page-head">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

export function AdminPerson({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl: string | null;
}) {
  return (
    <span className="admin-person">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" width={36} height={36} />
      ) : (
        <span className="admin-avatar-fallback" aria-hidden="true">
          {nickname.slice(0, 1)}
        </span>
      )}
      <strong>{nickname}</strong>
    </span>
  );
}

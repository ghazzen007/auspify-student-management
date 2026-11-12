import { Link, NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Link to="/" className="logo">
            <svg className="logo-mark" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="currentColor" />
              <path d="M32 14 52 24 32 34 12 24Z" fill="#fff" />
              <path d="M20 29v10c0 4 6 7 12 7s12-3 12-7V29l-12 6Z" fill="#d99a3d" />
            </svg>
            <span>Campus Registry</span>
          </Link>
          <nav aria-label="Main">
            <NavLink to="/" end className="topnav-link">
              Students
            </NavLink>
            <NavLink to="/students/new" className="topnav-link">
              Add student
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className="wrap page">
        <Outlet />
      </main>
      <footer className="wrap footer">Campus Registry, a student management system built with React, Express and MongoDB.</footer>
    </>
  );
}

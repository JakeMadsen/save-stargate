import { LogIn, LogOut, Shield, Sparkles } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AuthProvider, isStaff, useAuth } from "./AuthContext.js";

const Shell = () => {
  const { user, logout } = useAuth();
  const nav = [
    ["Updates", "/updates"],
    ["Petitions", "/petitions"],
    ["Contacts", "/contacts"],
    ["Community", "/community"],
    ["Resources", "/resources"]
  ];

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Save The Gate home">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>Save The Gate</span>
        </Link>
        <nav className="main-nav">
          {nav.map(([label, href]) => (
            <NavLink key={href} to={href}>
              {label}
            </NavLink>
          ))}
          {isStaff(user?.role) && (
            <NavLink to="/admin">
              <Shield size={16} /> Admin
            </NavLink>
          )}
        </nav>
        <div className="session-actions">
          {user ? (
            <button className="icon-button" type="button" onClick={logout} title="Log out">
              <LogOut size={18} />
            </button>
          ) : (
            <Link className="icon-button" to="/login" title="Log in">
              <LogIn size={18} />
            </Link>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>Fan-run site. No official affiliation.</span>
        <Link to="/login">Staff login</Link>
      </footer>
    </>
  );
};

export const App = () => (
  <AuthProvider>
    <Shell />
  </AuthProvider>
);

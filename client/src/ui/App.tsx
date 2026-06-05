import { LogIn, LogOut, Moon, Shield, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AuthProvider, isStaff, useAuth } from "./AuthContext.js";

type Theme = "light" | "dark";
const themeKey = "save-the-gate-theme";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(themeKey);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
};

const Shell = () => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const nav = [
    ["Updates", "/updates"],
    ["Petitions", "/petitions"],
    ["Contacts", "/contacts"],
    ["Community", "/community"],
    ["Resources", "/resources"],
    ["Write Us", "/write-us"]
  ];
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeKey, theme);
  }, [theme]);

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
          <button
            className="icon-button"
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            title={isDark ? "Use light mode" : "Use dark mode"}
            aria-label={isDark ? "Use light mode" : "Use dark mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
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
        <div className="footer-links">
          <Link to="/signup">Sign up</Link>
          <Link to="/write-us">Write us</Link>
          <Link to="/login">Staff login</Link>
        </div>
      </footer>
    </>
  );
};

export const App = () => (
  <AuthProvider>
    <Shell />
  </AuthProvider>
);

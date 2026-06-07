import { LogIn, LogOut, Moon, Shield, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../api.js";
import { AuthProvider, isStaff, useAuth } from "./AuthContext.js";

type Theme = "light" | "dark";
type ShellSettings = {
  navBrand: string;
  footerNote: string;
};
const themeKey = "save-the-gate-theme";
const defaultShellSettings: ShellSettings = {
  navBrand: "Save The Gate",
  footerNote: "Fan-run site. No official affiliation."
};

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(themeKey);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
};

const Shell = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [settings, setSettings] = useState<ShellSettings>(defaultShellSettings);
  const nav = [
    ["Take Action", "/contacts"],
    ["Fan Voices", "/fan-messages"],
    ["Updates", "/updates"],
    ["Community", "/community"],
    ["Resources", "/resources"],
    ["Write Us", "/write-us"]
  ];
  const isDark = theme === "dark";

  useEffect(() => {
    api<{ settings: ShellSettings }>("/api/public/settings")
      .then((data) => setSettings({ ...defaultShellSettings, ...data.settings }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeKey, theme);
  }, [theme]);

  useEffect(() => {
    fetch("/api/public/traffic", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: `${location.pathname}${location.search}` })
    }).catch(() => {});
  }, [location.pathname, location.search]);

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Save The Gate home">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>{settings.navBrand}</span>
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
        <span>{settings.footerNote}</span>
        <div className="footer-links">
          <Link to="/signup">Sign up</Link>
          <Link to="/fan-messages">Fan voices</Link>
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

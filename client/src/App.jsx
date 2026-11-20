import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { api } from "./api.js";
import * as P from "./pages.jsx";

const Ctx = createContext();
export const useApp = () => useContext(Ctx);

const LINKS = {
  guest: [
    ["/", "Home"],
    ["/departments", "Departments"],
    ["/login", "Sign in"],
    ["/register", "Register"],
  ],
  patient: [
    ["/dashboard", "Dashboard"],
    ["/departments", "Book"],
    ["/queue", "Queue"],
    ["/history", "History"],
  ],
  staff: [["/staff", "Queue"]],
  admin: [
    ["/staff", "Queue"],
    ["/admin", "Admin"],
  ],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const toast = useCallback((text, error) => {
    setMsg({ text, error });
    setTimeout(() => setMsg(null), 3500);
  }, []);
  useEffect(() => {
    (localStorage.getItem("cl_token")
      ? api("/me")
          .then(setUser)
          .catch(() => localStorage.removeItem("cl_token"))
      : Promise.resolve()
    ).finally(() => setReady(true));
  }, []);
  const signIn = ({ token, user }) => {
    localStorage.setItem("cl_token", token);
    setUser(user);
  };
  const signOut = () => {
    localStorage.removeItem("cl_token");
    setUser(null);
    toast("You have signed out.");
    nav("/");
  };
  const links = LINKS[user?.role || "guest"];
  if (!ready)
    return (
      <div className="p-6">
        <div className="sk h-12 w-1/2" />
      </div>
    );
  return (
    <Ctx.Provider value={{ user, signIn, toast }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <nav
          aria-label="Main"
          className="flex w-full max-w-3xl items-center justify-between gap-2 rounded-2xl border border-[#313131] bg-[#181818]/70 p-2 backdrop-blur-md"
        >
          <Link to="/" className="title-3 rounded-lg px-3 py-2">
            CareLoop
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {links.map(([to, l]) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) => "nl" + (isActive ? " active" : "")}
              >
                {l}
              </NavLink>
            ))}
            {user && (
              <button className="nl" onClick={signOut}>
                Sign out
              </button>
            )}
          </div>
          <button
            className="t rounded-lg p-3 hover:bg-[#272727] md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span
              className={
                "t mb-1 block h-0.5 w-5 bg-white " +
                (open ? "translate-y-1 rotate-45" : "")
              }
            />
            <span
              className={
                "t block h-0.5 w-5 bg-white " +
                (open ? "-translate-y-1 -rotate-45" : "")
              }
            />
          </button>
        </nav>
      </header>
      {open && (
        <div className="fixed inset-0 z-30 flex flex-col gap-2 bg-black/95 p-6 pt-24 backdrop-blur-xl">
          {links.map(([to, l], i) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={() => setOpen(false)}
              className="nl heading-6 block"
              style={{
                animation: `rise .5s cubic-bezier(.22,1,.36,1) ${Math.min(i * 60, 400)}ms both`,
              }}
            >
              {l}
            </NavLink>
          ))}
          {user && (
            <button
              className="nl heading-6 text-left"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
            >
              Sign out
            </button>
          )}
        </div>
      )}
      <style>
        {
          "@keyframes rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}"
        }
      </style>
      <main id="main" className="min-h-screen px-4 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
          <Routes>
            <Route path="/" element={<P.Landing />} />
            <Route path="/register" element={<P.Auth mode="register" />} />
            <Route path="/login" element={<P.Auth mode="login" />} />
            <Route path="/departments" element={<P.Departments />} />
            <Route path="/departments/:id" element={<P.Doctors />} />
            <Route
              path="/book/:doctorId"
              element={
                <Guard roles={["patient"]}>
                  <P.Book />
                </Guard>
              }
            />
            <Route
              path="/ticket/:id"
              element={
                <Guard roles={["patient"]}>
                  <P.Ticket />
                </Guard>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Guard roles={["patient"]}>
                  <P.History dashboard />
                </Guard>
              }
            />
            <Route
              path="/history"
              element={
                <Guard roles={["patient"]}>
                  <P.History />
                </Guard>
              }
            />
            <Route
              path="/queue"
              element={
                <Guard roles={["patient"]}>
                  <P.Queue />
                </Guard>
              }
            />
            <Route
              path="/staff"
              element={
                <Guard roles={["staff", "admin"]}>
                  <P.Staff />
                </Guard>
              }
            />
            <Route
              path="/admin"
              element={
                <Guard roles={["admin"]}>
                  <P.Admin />
                </Guard>
              }
            />
            <Route path="*" element={<P.NotFound />} />
          </Routes>
        </div>
      </main>
      <footer className="border-t border-[#313131] px-4 py-8">
        <div className="caption-2 mut mx-auto flex max-w-5xl justify-between">
          <span>CareLoop</span>
          <span>Privacy policy and terms: {"{{to be supplied}}"}</span>
        </div>
      </footer>
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4"
      >
        {msg && (
          <div
            className={
              "card body-5 py-3 " +
              (msg.error ? "text-red-400" : "text-emerald-400")
            }
          >
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
function Guard({ roles, children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

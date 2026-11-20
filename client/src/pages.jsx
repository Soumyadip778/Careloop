import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "./api.js";
import { useApp } from "./App.jsx";

const LABEL = {
  booked: "Booked",
  checkedin: "Checked in",
  serving: "Now serving",
  completed: "Completed",
  cancelled: "Cancelled",
};
const COLOR = {
  serving: "text-emerald-400",
  checkedin: "text-amber-300",
  cancelled: "text-red-400",
};
const Badge = ({ s }) => (
  <span className={"badge " + (COLOR[s] || "")}>{LABEL[s]}</span>
);
const Head = ({ t, s }) => (
  <div className="mb-8">
    <h1 className="heading-4 mb-2">{t}</h1>
    {s && <p className="body-3 mut max-w-[680px]">{s}</p>}
  </div>
);
const Skeleton = () => (
  <div className="grid gap-4" aria-busy="true">
    <div className="sk h-12 w-2/3" />
    <div className="grid gap-4 md:grid-cols-3">
      <div className="sk h-40" />
      <div className="sk h-40" />
      <div className="sk h-40" />
    </div>
  </div>
);
const Empty = ({ t, m, to, cta }) => (
  <div className="card py-12 text-center">
    <h2 className="heading-6 mb-2">{t}</h2>
    <p className="body-3 mut mx-auto mb-6 max-w-sm">{m}</p>
    {to && (
      <Link to={to} className="btn btn-p">
        {cta}
      </Link>
    )}
  </div>
);

// Loads data, shows a skeleton while pending and an inline error if the request fails.
function useLoad(path, deps = []) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    set((s) => ({ ...s, loading: true }));
    api(path)
      .then((data) => set({ data, error: null, loading: false }))
      .catch((e) => set({ data: null, error: e.message, loading: false }));
  }, [path]);
  useEffect(load, [load, ...deps]);
  return { ...state, reload: load };
}
const Gate = ({ q, children }) =>
  q.loading ? (
    <Skeleton />
  ) : q.error ? (
    <Empty t="Could not load this page" m={q.error} />
  ) : (
    children(q.data)
  );

const TicketCard = ({ a }) => (
  <div className="card w-full max-w-md">
    <div className="mb-6 flex items-start justify-between">
      <span className="caption-1 mut">CareLoop digital ticket</span>
      <Badge s={a.status} />
    </div>
    <p className="mb-6 font-mono text-5xl font-medium md:text-6xl">
      {a.ticket}
    </p>
    <dl className="body-6 grid grid-cols-2 gap-4">
      <div>
        <dt className="mut">Doctor</dt>
        <dd className="body-5">{a.doctor.name}</dd>
      </div>
      <div>
        <dt className="mut">Department</dt>
        <dd className="body-5">{a.doctor.department.name}</dd>
      </div>
      <div>
        <dt className="mut">Date</dt>
        <dd className="body-5">{a.date}</dd>
      </div>
      <div>
        <dt className="mut">Time</dt>
        <dd className="body-5">{a.time}</dd>
      </div>
    </dl>
  </div>
);

export function Landing() {
  const { user } = useApp();
  const to = user ? "/departments" : "/register";
  const tag = useRef();
  useEffect(() => {
    const words = tag.current.querySelectorAll(".wd");
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -40% 0px" },
    );
    words.forEach((w) => io.observe(w));
    return () => io.disconnect();
  }, []);
  return (
    <>
      <section className="py-12 md:py-20">
        <h1 className="heading-1 hg mb-6 max-w-[680px]">
          Book your hospital visit
          <br />
          and skip the physical queue
        </h1>
        <p className="body-3 mut mb-8 max-w-[680px]">
          Pick a department and doctor, choose a slot and get a digital ticket.
          Follow your place in line from home and arrive when your turn is
          close.
        </p>
        <Link to={to} className="btn btn-p">
          Book an appointment
        </Link>
        <p className="caption-2 mut mt-4">
          Your ticket number is issued the moment you confirm.
        </p>
      </section>
      <section className="grid gap-4 py-16 md:grid-cols-3">
        {[
          [
            "Choose your own doctor",
            "Browse departments and see who is available.",
          ],
          [
            "A ticket on your phone",
            "Every confirmed visit gets a number and a status.",
          ],
          [
            "A live place in line",
            "See your position and wait estimate without asking the desk.",
          ],
        ].map(([t, m]) => (
          <div key={t} className="card">
            <h2 className="title-2 mb-2">{t}</h2>
            <p className="body-6 mut">{m}</p>
          </div>
        ))}
      </section>
      <section className="py-24 md:py-32">
        <p
          ref={tag}
          className="heading-3 max-w-[680px]"
          aria-label="Wait at home. Walk in when your turn is near."
        >
          {["Wait at home.", "Walk in when your turn is near."].map((l) => (
            <span key={l} className="block" aria-hidden="true">
              {l.split(" ").map((w, i) => (
                <span key={i}>
                  <span className="wd">{w}</span>{" "}
                </span>
              ))}
            </span>
          ))}
        </p>
      </section>
    </>
  );
}

export function Auth({ mode }) {
  const { signIn, toast } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [e, setE] = useState({});
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";
  const check = () => {
    const x = {};
    if (reg && f.name.trim().length < 2) x.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email))
      x.email = "Enter a valid email address, like name@example.com.";
    if (reg && !/^\d{10}$/.test(f.phone))
      x.phone = "Enter a 10 digit mobile number.";
    if (reg ? f.password.length < 8 : !f.password)
      x.password = reg
        ? "Password needs at least 8 characters."
        : "Enter your password.";
    return x;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    const x = check();
    setE(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      const r = await api("/auth/" + mode, { method: "POST", body: f });
      signIn(r);
      toast("Welcome, " + r.user.name.split(" ")[0] + ".");
      nav(
        r.user.role === "patient"
          ? "/dashboard"
          : r.user.role === "staff"
            ? "/staff"
            : "/admin",
      );
    } catch (er) {
      setE({ form: er.message });
    } finally {
      setBusy(false);
    }
  };
  const F = ({ k, l, type = "text" }) => (
    <div className="mb-4">
      <label className="lbl" htmlFor={k}>
        {l}
      </label>
      <input
        id={k}
        type={type}
        className="inp"
        value={f[k]}
        onChange={(ev) => setF({ ...f, [k]: ev.target.value })}
        aria-describedby={k + "e"}
      />
      <p id={k + "e"} role="alert" className="err">
        {e[k]}
      </p>
    </div>
  );
  return (
    <div className="mx-auto max-w-md">
      <Head t={reg ? "Create your account" : "Sign in"} />
      <form className="card" noValidate onSubmit={submit}>
        {reg && F({ k: "name", l: "Full name" })}
        {F({ k: "email", l: "Email", type: "email" })}
        {reg && F({ k: "phone", l: "Mobile number", type: "tel" })}
        {F({ k: "password", l: "Password", type: "password" })}
        {e.form && (
          <p role="alert" className="err mb-4">
            {e.form}
          </p>
        )}
        <button className="btn btn-p w-full" disabled={busy}>
          {busy ? "Please wait…" : reg ? "Create account" : "Sign in"}
        </button>
        <p className="body-6 mut mt-4">
          {reg ? "Already registered? " : "New here? "}
          <Link className="underline" to={reg ? "/login" : "/register"}>
            {reg ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </div>
  );
}

export function Departments() {
  const q = useLoad("/departments");
  return (
    <>
      <Head t="Departments" s="Select the department you need to visit." />
      <Gate q={q}>
        {(d) =>
          d.length ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {d.map((x) => (
                <Link
                  key={x._id}
                  to={"/departments/" + x._id}
                  className="card t block hover:bg-[#1F1F1F]"
                >
                  <h2 className="title-2 mb-2">{x.name}</h2>
                  <p className="body-6 mut">{x.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              t="No departments yet"
              m="An admin needs to add departments first."
            />
          )
        }
      </Gate>
    </>
  );
}

export function Doctors() {
  const { id } = useParams();
  const { user } = useApp();
  const q = useLoad("/doctors?department=" + id);
  return (
    <>
      <Link to="/departments" className="btn btn-s btn-sm mb-6 w-fit">
        Back
      </Link>
      <Head t="Choose a doctor" />
      <Gate q={q}>
        {(d) =>
          d.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {d.map((x) => (
                <div key={x._id} className="card">
                  <div className="mb-2 flex justify-between">
                    <h2 className="title-2">{x.name}</h2>
                    <span
                      className={
                        "badge " +
                        (x.available ? "text-emerald-400" : "text-red-400")
                      }
                    >
                      {x.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <p className="body-6 mut mb-4">{x.qualification}</p>
                  {x.available && (
                    <Link
                      className="btn btn-p btn-sm"
                      to={user ? "/book/" + x._id : "/login"}
                    >
                      {user ? "Choose a slot" : "Sign in to book"}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              t="No doctors listed"
              m="This department has no doctors yet."
            />
          )
        }
      </Gate>
    </>
  );
}

const days = () =>
  [0, 1, 2].map((i) => {
    const d = new Date(Date.now() + i * 864e5);
    return {
      v: d.toISOString().slice(0, 10),
      l: i ? d.toDateString().slice(0, 10) : "Today",
    };
  });
export function Book() {
  const { doctorId } = useParams();
  const { toast } = useApp();
  const nav = useNavigate();
  const D = days();
  const [date, setDate] = useState(D[0].v);
  const [time, setTime] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = useLoad(`/doctors/${doctorId}/slots?date=${date}`, [date]);
  const confirm = async () => {
    setBusy(true);
    try {
      const a = await api("/appointments", {
        method: "POST",
        body: { doctor: doctorId, date, time },
      });
      toast("Appointment confirmed. Ticket " + a.ticket + ".");
      nav("/ticket/" + a._id, { state: a });
    } catch (e) {
      toast(e.message, true);
      setTime(null);
      q.reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Head t="Pick a date and time" />
      <div className="card mb-4">
        <h2 className="title-3 mb-3">Date</h2>
        <div className="mb-6 flex flex-wrap gap-2">
          {D.map((d) => (
            <button
              key={d.v}
              aria-pressed={d.v === date}
              className={"btn btn-sm " + (d.v === date ? "btn-p" : "btn-s")}
              onClick={() => {
                setDate(d.v);
                setTime(null);
              }}
            >
              {d.l}
            </button>
          ))}
        </div>
        <h2 className="title-3 mb-3">Time</h2>
        <Gate q={q}>
          {(s) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {s.times.map((t) => (
                <button
                  key={t}
                  disabled={s.taken.includes(t)}
                  aria-pressed={t === time}
                  className={"btn btn-sm " + (t === time ? "btn-p" : "btn-s")}
                  onClick={() => setTime(t)}
                >
                  {t}
                  {s.taken.includes(t) ? " (taken)" : ""}
                </button>
              ))}
            </div>
          )}
        </Gate>
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <p className="body-5">
          {time ? `${date} at ${time}` : "Select a time to continue."}
        </p>
        <button
          className="btn btn-p"
          disabled={!time || busy}
          onClick={confirm}
        >
          {busy ? "Confirming…" : "Confirm appointment"}
        </button>
      </div>
    </>
  );
}

export function Ticket() {
  const { id } = useParams();
  const q = useLoad("/appointments/mine");
  return (
    <Gate q={q}>
      {(list) => {
        const a = list.find((x) => x._id === id);
        return a ? (
          <>
            <Head
              t="Appointment confirmed"
              s="Show this ticket at the department desk."
            />
            <div className="flex flex-wrap items-start gap-6">
              <TicketCard a={a} />
              <div className="card max-w-xs">
                <p className="body-6 mut mb-4">
                  Arrive 15 minutes early and check in at the desk.
                </p>
                <Link className="btn btn-p btn-sm" to="/queue">
                  Track queue
                </Link>
              </div>
            </div>
          </>
        ) : (
          <Empty
            t="Ticket not found"
            m="It may belong to another account."
            to="/dashboard"
            cta="Go to dashboard"
          />
        );
      }}
    </Gate>
  );
}

function Row({ a, onCancel }) {
  const [sure, setSure] = useState(false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-[#313131] py-3 first:border-0">
      <div>
        <p className="title-3">{a.doctor.name}</p>
        <p className="caption-2 mut">
          {a.date}, {a.time} · ticket {a.ticket}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge s={a.status} />
        {["booked", "checkedin", "serving"].includes(a.status) && (
          <Link className="btn btn-s btn-sm" to={"/ticket/" + a._id}>
            View ticket
          </Link>
        )}
        {a.status === "booked" &&
          (sure ? (
            <>
              <button
                className="btn btn-d btn-sm"
                onClick={() => onCancel(a._id)}
              >
                Confirm cancel
              </button>
              <button
                className="btn btn-s btn-sm"
                onClick={() => setSure(false)}
              >
                Keep it
              </button>
            </>
          ) : (
            <button className="btn btn-d btn-sm" onClick={() => setSure(true)}>
              Cancel
            </button>
          ))}
      </div>
    </li>
  );
}

export function History({ dashboard }) {
  const { toast } = useApp();
  const q = useLoad("/appointments/mine");
  const cancel = async (id) => {
    try {
      await api(`/appointments/${id}/cancel`, { method: "PATCH" });
      toast("Appointment cancelled.");
      q.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  return (
    <>
      <Head t={dashboard ? "Your dashboard" : "Appointment history"} />
      <Gate q={q}>
        {(l) => {
          const live = l.filter((x) =>
            ["booked", "checkedin", "serving"].includes(x.status),
          );
          const past = l.filter((x) => !live.includes(x));
          if (!l.length)
            return (
              <Empty
                t="No appointments yet"
                m="Your booked, completed and cancelled visits show up here."
                to="/departments"
                cta="Book now"
              />
            );
          return (
            <>
              {dashboard && (
                <div className="card mb-4">
                  <h2 className="title-2 mb-2">Active ticket</h2>
                  {live[0] ? (
                    <>
                      <p className="mb-2 font-mono text-4xl font-medium">
                        {live[0].ticket}
                      </p>
                      <Link className="btn btn-p btn-sm" to="/queue">
                        Track queue
                      </Link>
                    </>
                  ) : (
                    <p className="body-6 mut">No active ticket.</p>
                  )}
                </div>
              )}
              <div className="card mb-4">
                <h2 className="title-2 mb-2">Upcoming</h2>
                {live.length ? (
                  <ul>
                    {live.map((a) => (
                      <Row key={a._id} a={a} onCancel={cancel} />
                    ))}
                  </ul>
                ) : (
                  <p className="body-6 mut">Nothing upcoming.</p>
                )}
              </div>
              <div className="card">
                <h2 className="title-2 mb-2">Past</h2>
                {past.length ? (
                  <ul>
                    {(dashboard ? past.slice(0, 3) : past).map((a) => (
                      <Row key={a._id} a={a} onCancel={cancel} />
                    ))}
                  </ul>
                ) : (
                  <p className="body-6 mut">No past visits.</p>
                )}
                {dashboard && past.length > 3 && (
                  <Link to="/history" className="body-6 mt-4 block underline">
                    See all
                  </Link>
                )}
              </div>
            </>
          );
        }}
      </Gate>
    </>
  );
}

export function Queue() {
  const q = useLoad("/queue/mine");
  useEffect(() => {
    const t = setInterval(q.reload, 15000);
    return () => clearInterval(t);
  }, [q.reload]);
  return (
    <>
      <Head
        t="Live queue"
        s="Refreshes every 15 seconds. The wait is an estimate."
      />
      <Gate q={q}>
        {(d) =>
          !d ? (
            <Empty
              t="No active ticket"
              m="You have nothing in the queue right now."
              to="/departments"
              cta="Book now"
            />
          ) : d.opensOn ? (
            <Empty
              t={"Queue opens on " + d.opensOn}
              m="Come back on the day of your appointment."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Now serving", d.serving || "None"],
                ["Your position", d.position],
                ["Estimated wait", d.waitMinutes + " min"],
              ].map(([l, v]) => (
                <div key={l} className="card">
                  <p className="caption-1 mut">{l}</p>
                  <p className="font-mono text-4xl font-medium">{v}</p>
                </div>
              ))}
            </div>
          )
        }
      </Gate>
    </>
  );
}

export function Staff() {
  const { toast } = useApp();
  const q = useLoad("/staff/queue");
  const act = async (fn) => {
    try {
      await fn();
      q.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const set = (id, status, m) =>
    act(async () => {
      await api("/staff/appointments/" + id, {
        method: "PATCH",
        body: { status },
      });
      toast(m);
    });
  const [ask, setAsk] = useState(null);
  return (
    <>
      <Head t="Queue management" s="Today's appointments and patient flow." />
      <Gate q={q}>
        {(l) => (
          <>
            <div className="card">
              <div className="mb-4 flex flex-wrap justify-between gap-2">
                <h2 className="title-2">
                  Now serving:{" "}
                  <span className="font-mono">
                    {l.find((x) => x.status === "serving")?.ticket || "None"}
                  </span>
                </h2>
                <button
                  className="btn btn-p btn-sm"
                  onClick={() =>
                    act(async () => {
                      const a = await api("/staff/call-next", {
                        method: "POST",
                      });
                      toast("Now serving " + a.ticket + ".");
                    })
                  }
                >
                  Call next
                </button>
              </div>
              {l.length ? (
                <ul>
                  {l.map((a) => (
                    <li
                      key={a._id}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-[#313131] py-3 first:border-0"
                    >
                      <div>
                        <p className="title-3">
                          <span className="font-mono">{a.ticket}</span>{" "}
                          {a.patient?.name}
                        </p>
                        <p className="caption-2 mut">
                          {a.doctor.name}, {a.time}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge s={a.status} />
                        {a.status === "booked" && (
                          <button
                            className="btn btn-s btn-sm"
                            onClick={() =>
                              set(
                                a._id,
                                "checkedin",
                                a.patient?.name + " checked in.",
                              )
                            }
                          >
                            Check in
                          </button>
                        )}
                        {a.status === "serving" && (
                          <button
                            className="btn btn-p btn-sm"
                            onClick={() =>
                              set(
                                a._id,
                                "completed",
                                "Ticket " + a.ticket + " completed.",
                              )
                            }
                          >
                            Complete
                          </button>
                        )}
                        {["booked", "checkedin", "serving"].includes(
                          a.status,
                        ) &&
                          (ask === a._id ? (
                            <>
                              <button
                                className="btn btn-d btn-sm"
                                onClick={() => {
                                  setAsk(null);
                                  set(
                                    a._id,
                                    "cancelled",
                                    "Ticket " + a.ticket + " cancelled.",
                                  );
                                }}
                              >
                                Confirm cancel
                              </button>
                              <button
                                className="btn btn-s btn-sm"
                                onClick={() => setAsk(null)}
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-d btn-sm"
                              onClick={() => setAsk(a._id)}
                            >
                              Cancel
                            </button>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="body-6 mut">No appointments today.</p>
              )}
            </div>
          </>
        )}
      </Gate>
    </>
  );
}

export function Admin() {
  const { toast } = useApp();
  const st = useLoad("/admin/stats");
  const dep = useLoad("/departments");
  const doc = useLoad("/doctors");
  const [dn, setDn] = useState("");
  const [dd, setDd] = useState("");
  const [name, setName] = useState("");
  const run = async (fn, m) => {
    try {
      await fn();
      toast(m);
      st.reload();
      dep.reload();
      doc.reload();
    } catch (e) {
      toast(e.message, true);
    }
  };
  return (
    <>
      <Head t="Admin dashboard" />
      <Gate q={st}>
        {(s) => (
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Total", s.total],
              ["Booked", s.byStatus.booked || 0],
              ["Completed", s.byStatus.completed || 0],
              ["Cancelled", s.byStatus.cancelled || 0],
            ].map(([l, v]) => (
              <div key={l} className="card">
                <p className="caption-1 mut">{l}</p>
                <p className="font-mono text-4xl font-medium">{v}</p>
              </div>
            ))}
          </div>
        )}
      </Gate>
      <section className="card mb-4">
        <h2 className="title-2 mb-4">Departments</h2>
        <Gate q={dep}>
          {(d) => (
            <ul className="mb-4">
              {d.map((x) => (
                <li
                  key={x._id}
                  className="body-6 border-t border-[#313131] py-2 first:border-0"
                >
                  {x.name}
                </li>
              ))}
            </ul>
          )}
        </Gate>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api("/admin/departments", {
                method: "POST",
                body: { name: dn },
              });
              setDn("");
            }, "Department added.");
          }}
        >
          <input
            className="inp"
            aria-label="Department name"
            placeholder="Department name"
            value={dn}
            onChange={(e) => setDn(e.target.value)}
          />
          <button className="btn btn-p">Add</button>
        </form>
      </section>
      <section className="card">
        <h2 className="title-2 mb-4">Doctors and availability</h2>
        <Gate q={doc}>
          {(d) => (
            <ul className="mb-4">
              {d.map((x) => (
                <li
                  key={x._id}
                  className="flex items-center justify-between gap-2 border-t border-[#313131] py-2 first:border-0"
                >
                  <span className="body-6">
                    {x.name} · {x.department?.name}
                  </span>
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() =>
                      run(
                        () =>
                          api("/admin/doctors/" + x._id, {
                            method: "PATCH",
                            body: { available: !x.available },
                          }),
                        x.name +
                          (x.available
                            ? " is now unavailable."
                            : " is now available."),
                      )
                    }
                  >
                    {x.available ? "Mark unavailable" : "Mark available"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Gate>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api("/admin/doctors", {
                method: "POST",
                body: { name, department: dd },
              });
              setName("");
            }, "Doctor added.");
          }}
        >
          <input
            className="inp flex-1"
            aria-label="Doctor name"
            placeholder="Doctor name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="inp w-auto"
            aria-label="Department"
            value={dd}
            onChange={(e) => setDd(e.target.value)}
          >
            <option value="">Department</option>
            {dep.data?.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>
          <button className="btn btn-p">Add</button>
        </form>
      </section>
    </>
  );
}

export const NotFound = () => (
  <div className="py-24 text-center">
    <p className="mut mb-4 font-mono">404</p>
    <h1 className="heading-3 mb-4">This page is not on the map</h1>
    <p className="body-3 mut mb-8">The link may be old or mistyped.</p>
    <Link to="/" className="btn btn-p">
      Back to home
    </Link>
  </div>
);

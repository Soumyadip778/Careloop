const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export async function api(path, { method = "GET", body } = {}) {
  const t = localStorage.getItem("cl_token");
  const r = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: "Bearer " + t } : {}),
    },
    body: body && JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      d.message || "Request failed. Check your connection and try again.",
    );
  return d;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const ADMIN_TOKEN_KEY = "mdg_admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function authHeaders() {
  const t = getAdminToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * Chamadas à API administrativa (usuários, clientes). Envia JWT e redireciona em 401.
 * @param {string} path - ex.: "/users" ou "/clients" (prefixo /api já está em VITE_API_URL)
 */
export async function adminFetch(path, options = {}) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const headers = {
    ...authHeaders(),
    ...options.headers,
  };
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${base}${p}`, { ...options, headers });

  if (response.status === 401) {
    clearAdminToken();
    const target = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?redirect=${encodeURIComponent(target)}`);
  }

  return response;
}

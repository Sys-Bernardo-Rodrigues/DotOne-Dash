/**
 * Leitura do JWT (apenas payload) para decisões de rota no cliente.
 * A autorização real é sempre validada no servidor.
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function canAccessFullAdmPanel(payload) {
  if (!payload) return false;
  const role = payload.role;
  if (role === "super_admin" || role === "admin") return true;
  return payload.perfil === "Administrador";
}

/** Qualquer `/:slug` do dashboard — alinhado ao servidor (`temAcessoWorkspaceClienteCompleto`). */
export function temAcessoWorkspaceClienteCompleto(payload) {
  if (!payload) return false;
  const role = payload.role;
  if (role === "super_admin" || role === "admin") return true;
  const p = payload.perfil;
  return p === "Administrador" || p === "Gestor";
}

export function canAccessClientSlug(payload, slug) {
  const s = String(slug || "").trim();
  if (!s || !payload) return false;
  if (temAcessoWorkspaceClienteCompleto(payload)) return true;
  const list = Array.isArray(payload.clienteSlugs) ? payload.clienteSlugs : [];
  return list.includes(s);
}

export function isMultiClientNonAdmin(payload) {
  if (!payload || canAccessFullAdmPanel(payload)) return false;
  return (payload.clienteSlugs || []).length > 1;
}

/** Destino imediato após login com JWT válido. */
export function postLoginDestination(payload) {
  if (!payload) return "/login";
  if (canAccessFullAdmPanel(payload)) return "/adm/home";
  const slugs = payload.clienteSlugs || [];
  if (slugs.length >= 2) return "/adm/home";
  if (slugs.length === 1) return `/${slugs[0]}`;
  return "/login";
}

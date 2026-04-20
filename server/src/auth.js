import jwt from "jsonwebtoken";
import { perfilPode } from "./accessProfiles.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-only-ALTERE-JWT_SECRET-em-producao";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@mydotgrowth.local")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "admin123");

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] CRÍTICO: defina JWT_SECRET no ambiente de produção antes de expor a API."
  );
}

if (!process.env.JWT_SECRET) {
  console.warn(
    "[auth] JWT_SECRET não definido — usando chave de desenvolvimento (não use em produção)."
  );
}

export function createAdminToken() {
  return jwt.sign(
    {
      role: "super_admin",
      sub: "sistema",
      access: "full",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function validateAdminCredentials(email, password) {
  const e = String(email ?? "")
    .trim()
    .toLowerCase();
  const p = String(password ?? "");
  return e === ADMIN_EMAIL && p === ADMIN_PASSWORD;
}

export function isPainelElevado(role) {
  return role === "super_admin" || role === "admin";
}

/** Conta sistema ou utilizador Mongo com perfil Administrador — gestão completa do /adm. */
export function temAcessoPainelAdministracaoCompleta(decoded) {
  if (!decoded) return false;
  if (isPainelElevado(decoded.role)) return true;
  return decoded.perfil === "Administrador";
}

export function createUserToken({ sub, perfil, nome, email, clienteSlugs }) {
  return jwt.sign(
    {
      role: "user",
      sub,
      perfil,
      nome: nome || "",
      email: email || "",
      clienteSlugs: Array.isArray(clienteSlugs) ? clienteSlugs : [],
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Workspace `/:slug` (dashboard do cliente): conta sistema, Administrador e Gestor
 * acedem a qualquer slug; restantes só aos slugs em `clienteSlugs`.
 */
export function temAcessoWorkspaceClienteCompleto(auth) {
  if (!auth) return false;
  if (isPainelElevado(auth.role)) return true;
  const p = auth.perfil;
  return p === "Administrador" || p === "Gestor";
}

export function podeAcessarSlugCliente(auth, slug) {
  const s = String(slug || "").trim();
  if (!s || !auth) return false;
  if (temAcessoWorkspaceClienteCompleto(auth)) return true;
  const list = Array.isArray(auth.clienteSlugs) ? auth.clienteSlugs : [];
  return list.includes(s);
}

export function requireAdmAdministrador(req, res, next) {
  if (temAcessoPainelAdministracaoCompleta(req.auth)) return next();
  return res.status(403).json({
    message: "Apenas administradores podem executar esta ação.",
  });
}

export function requireClientSlugAccess(req, res, next) {
  const slug = String(req.params.slug || "").trim();
  if (!podeAcessarSlugCliente(req.auth, slug)) {
    return res.status(403).json({ message: "Sem permissão para aceder a este cliente." });
  }
  next();
}

/** Valida JWT do painel e anexa `req.auth` / `req.admin` (legado). */
export function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Autenticação necessária." });
  }
  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Autenticação necessária." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isPainelElevado(decoded.role) && !decoded.perfil) {
      return res.status(403).json({ message: "Token sem perfil válido." });
    }
    req.auth = decoded;
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Sessão inválida ou expirada." });
  }
}

/**
 * Depois de `authAdmin`. Conta sistema (`super_admin` / `admin`) ignora a matriz;
 * tokens futuros com `perfil` são avaliados em `accessProfiles`.
 */
export function requirePermission(action) {
  return (req, res, next) => {
    const r = req.auth?.role;
    if (isPainelElevado(r)) return next();
    const perfil = req.auth?.perfil;
    if (perfil && perfilPode(perfil, action)) return next();
    return res.status(403).json({ message: "Permissão insuficiente para esta ação." });
  };
}

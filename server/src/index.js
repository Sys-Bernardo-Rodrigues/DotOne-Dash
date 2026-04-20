import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { buildChartPayload } from "../../src/utils/chartData.js";
import {
  authAdmin,
  createAdminToken,
  createUserToken,
  requireAdmAdministrador,
  requireClientSlugAccess,
  temAcessoPainelAdministracaoCompleta,
  validateAdminCredentials,
} from "./auth.js";
import { assertPerfilValido } from "./accessProfiles.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:admin123@localhost:27017/mydotgrowth?authSource=admin";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const userSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    perfil: {
      type: String,
      enum: ["Administrador", "Gestor", "Operador", "Visualizador"],
      default: "Operador",
    },
    status: { type: String, enum: ["Ativo", "Inativo"], default: "Ativo" },
    cliente: { type: String, default: "" },
    clienteSlugs: [{ type: String, trim: true }],
    passwordHash: { type: String, default: "" },
  },
  { timestamps: true }
);

const clientSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, sparse: true, unique: true },
    segmento: { type: String, required: true, trim: true },
    responsavel: { type: String, default: "", trim: true },
    status: { type: String, enum: ["Ativo", "Inativo"], default: "Ativo" },
    dashboard: {
      planoAcaoItems: { type: Array, default: [] },
      missao: { type: String, default: "" },
      visao: { type: String, default: "" },
      valores: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Client = mongoose.model("Client", clientSchema);

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cliente";
}

async function ensureUniqueSlug(base) {
  let slug = base;
  let n = 1;
  while (await Client.findOne({ slug })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resolve slugs a partir do texto "Cliente A" ou "A, B" ou do array gravado no utilizador. */
async function resolveClienteSlugsFromClienteField(clienteStr) {
  const raw = String(clienteStr || "").trim();
  if (!raw) return [];
  const parts = raw.split(/[,;|]/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const name of parts) {
    const escaped = escapeRegex(name);
    let c = await Client.findOne({ nome: new RegExp(`^${escaped}$`, "i") }).lean();
    if (!c) {
      const s = slugify(name);
      c = await Client.findOne({ slug: s }).lean();
    }
    if (c?.slug) out.push(String(c.slug));
  }
  return [...new Set(out)];
}

async function resolveClienteSlugsForUser(user) {
  if (Array.isArray(user.clienteSlugs) && user.clienteSlugs.length > 0) {
    return [...new Set(user.clienteSlugs.map((s) => String(s).trim()).filter(Boolean))];
  }
  return resolveClienteSlugsFromClienteField(user.cliente);
}

/** Utilizador ativo com ligação explícita ao cliente (slugs ou texto `cliente` legado). */
function usuarioVinculadoAoCliente(user, clienteSlug, clienteNome) {
  const slug = String(clienteSlug || "").trim();
  const slugs = Array.isArray(user.clienteSlugs) ? user.clienteSlugs : [];
  if (slug && slugs.includes(slug)) return true;
  const nome = String(clienteNome || "").trim();
  if (!nome) return false;
  const texto = String(user.cliente || "").trim();
  if (!texto) return false;
  const nl = nome.toLowerCase();
  if (texto.toLowerCase() === nl) return true;
  const parts = texto.split(/[,;|]/).map((p) => p.trim()).filter(Boolean);
  return parts.some((p) => p.toLowerCase() === nl);
}

/** Normaliza lista de slugs do body e valida existência em Client. */
async function normalizarEValidarClienteSlugs(slugsInput, clienteTextoFallback) {
  const arr = Array.isArray(slugsInput) ? slugsInput : [];
  let slugs = [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];
  const texto = String(clienteTextoFallback || "").trim();
  if (slugs.length === 0 && texto) {
    slugs = await resolveClienteSlugsFromClienteField(texto);
  }
  for (const slug of slugs) {
    const exists = await Client.findOne({ slug }).lean();
    if (!exists) {
      return { error: `Cliente não encontrado (slug): ${slug}` };
    }
  }
  let clienteLegivel = texto;
  if (!clienteLegivel && slugs.length > 0) {
    const docs = await Client.find({ slug: { $in: slugs } })
      .select("nome slug")
      .lean();
    const nomePorSlug = Object.fromEntries(docs.map((d) => [d.slug, d.nome]));
    clienteLegivel = slugs.map((s) => nomePorSlug[s] || s).join(", ");
  }
  return { clienteSlugs: slugs, cliente: clienteLegivel || "" };
}

async function findClientLeanBySlug(paramSlug) {
  const wanted = String(paramSlug || "").trim();
  if (!wanted) return null;

  let client = await Client.findOne({ slug: wanted }).lean();
  if (!client) {
    const legacy = await Client.find({
      $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
    }).lean();
    const match = legacy.find((c) => slugify(c.nome) === wanted);
    if (match) {
      const newSlug = await ensureUniqueSlug(slugify(match.nome));
      await Client.updateOne({ _id: match._id }, { $set: { slug: newSlug } });
      client = await Client.findById(match._id).lean();
    }
  }
  return client;
}

function nextPlanoAcaoItemId(items) {
  const nums = (items || []).map((i) => {
    const m = String(i?.id || "").match(/^(?:PA|AE)-(\d+)$/i);
    return m ? Number(m[1], 10) : 0;
  });
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `PA-${String(n).padStart(3, "0")}`;
}

app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const now = new Date();
  res.json({
    ok: true,
    year: now.getFullYear(),
    serverTime: now.toISOString(),
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const e = String(email ?? "")
    .trim()
    .toLowerCase();
  const p = String(password ?? "");
  if (!e || !p) {
    return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
  }

  if (validateAdminCredentials(e, p)) {
    const token = createAdminToken();
    return res.json({
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      admin: { email: e, tipo: "sistema" },
    });
  }

  const user = await User.findOne({ email: e }).lean();
  if (!user || user.status !== "Ativo") {
    return res.status(401).json({ message: "E-mail ou senha incorretos." });
  }
  if (!user.passwordHash) {
    return res.status(401).json({
      message:
        "Conta sem senha definida. Um administrador deve definir a senha ao criar ou atualizar o utilizador.",
    });
  }
  const senhaOk = await bcrypt.compare(p, user.passwordHash);
  if (!senhaOk) {
    return res.status(401).json({ message: "E-mail ou senha incorretos." });
  }

  const clienteSlugs = await resolveClienteSlugsForUser(user);
  const isAdmMongo = user.perfil === "Administrador";
  if (clienteSlugs.length === 0 && !isAdmMongo) {
    return res.status(403).json({
      message: "Este utilizador não tem cliente associado. Contacte um administrador.",
    });
  }

  const token = createUserToken({
    sub: String(user._id),
    perfil: user.perfil,
    nome: user.nome,
    email: user.email,
    clienteSlugs,
  });

  res.json({
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    admin: {
      email: user.email,
      tipo: "utilizador",
      perfil: user.perfil,
      clienteSlugs,
    },
  });
});

app.get("/api/auth/me", authAdmin, (req, res) => {
  const d = req.auth;
  res.json({
    ok: true,
    admin: {
      sub: d.sub,
      role: d.role,
      perfil: d.perfil ?? null,
      nome: d.nome ?? null,
      email: d.email ?? null,
      clienteSlugs: d.clienteSlugs ?? [],
    },
    painelAdministracaoCompleto: temAcessoPainelAdministracaoCompleta(d),
  });
});

app.get("/api/me/accessible-clients", authAdmin, async (req, res) => {
  const d = req.auth;
  if (temAcessoPainelAdministracaoCompleta(d)) {
    return res.json({ clients: [] });
  }
  const slugs = Array.isArray(d.clienteSlugs) ? d.clienteSlugs : [];
  const items = await Client.find({ slug: { $in: slugs } })
    .select("nome slug segmento responsavel status")
    .sort({ nome: 1 })
    .lean();
  res.json({
    clients: items.map((c) => ({
      nome: c.nome,
      slug: c.slug,
      segmento: c.segmento,
      responsavel: c.responsavel,
      status: c.status,
    })),
  });
});

app.get(
  "/api/users",
  authAdmin,
  requireAdmAdministrador,
  async (_req, res) => {
  const items = await User.find().sort({ createdAt: 1 }).lean();
  res.json(
    items.map((item, index) => ({
      id: `USR-${String(index + 1).padStart(3, "0")}`,
      _id: item._id,
      nome: item.nome,
      email: item.email,
      perfil: item.perfil,
      status: item.status,
      cliente: item.cliente,
      clienteSlugs: Array.isArray(item.clienteSlugs) ? item.clienteSlugs : [],
      temSenha: Boolean(item.passwordHash),
    }))
  );
  }
);

app.post(
  "/api/users",
  authAdmin,
  requireAdmAdministrador,
  async (req, res) => {
  const { nome, email, perfil, status, cliente, clienteSlugs: clienteSlugsBody, senha } =
    req.body || {};
  if (!nome?.trim() || !email?.trim()) {
    return res.status(400).json({ message: "Nome e e-mail são obrigatórios." });
  }
  if (!senha || String(senha).length < 6) {
    return res.status(400).json({ message: "Senha obrigatória com pelo menos 6 caracteres." });
  }

  const perfilNorm = String(perfil ?? "Operador").trim() || "Operador";
  if (!assertPerfilValido(perfilNorm)) {
    return res.status(400).json({ message: "Perfil inválido." });
  }

  const norm = await normalizarEValidarClienteSlugs(clienteSlugsBody, cliente);
  if (norm.error) {
    return res.status(400).json({ message: norm.error });
  }
  if (perfilNorm !== "Administrador" && norm.clienteSlugs.length === 0) {
    return res.status(400).json({
      message: "Selecione pelo menos um cliente ou utilize o perfil Administrador.",
    });
  }

  const passwordHash = await bcrypt.hash(String(senha), 10);

  let created;
  try {
    created = await User.create({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil: perfilNorm,
      status,
      cliente: norm.cliente,
      clienteSlugs: norm.clienteSlugs,
      passwordHash,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Este e-mail já está registado." });
    }
    throw err;
  }
  const safe = created.toObject();
  delete safe.passwordHash;
  return res.status(201).json(safe);
  }
);

app.delete(
  "/api/users/:id",
  authAdmin,
  requireAdmAdministrador,
  async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).send();
  }
);

app.get(
  "/api/clients",
  authAdmin,
  requireAdmAdministrador,
  async (_req, res) => {
  const items = await Client.find().sort({ createdAt: 1 }).lean();
  res.json(
    items.map((item, index) => ({
      id: `CLI-${String(index + 1).padStart(3, "0")}`,
      _id: item._id,
      nome: item.nome,
      slug: item.slug || null,
      segmento: item.segmento,
      responsavel: item.responsavel,
      status: item.status,
      dashboard: item.dashboard,
    }))
  );
  }
);

app.post(
  "/api/clients",
  authAdmin,
  requireAdmAdministrador,
  async (req, res) => {
  const { nome, segmento, responsavel, status } = req.body || {};
  if (!nome?.trim() || !segmento?.trim()) {
    return res
      .status(400)
      .json({ message: "Nome e segmento do cliente são obrigatórios." });
  }

  const base = slugify(nome);
  const slug = await ensureUniqueSlug(base);
  const created = await Client.create({
    nome: nome.trim(),
    slug,
    segmento: segmento.trim(),
    responsavel: responsavel?.trim() || "",
    status,
  });
  return res.status(201).json(created);
  }
);

app.delete(
  "/api/clients/:id",
  authAdmin,
  requireAdmAdministrador,
  async (req, res) => {
  await Client.findByIdAndDelete(req.params.id);
  res.status(204).send();
  }
);

app.get("/api/clients/:id/dashboard", async (req, res) => {
  const client = await Client.findById(req.params.id).lean();
  if (!client) return res.status(404).json({ message: "Cliente não encontrado." });
  res.json({
    planoAcaoItems: client.dashboard?.planoAcaoItems || [],
  });
});

app.get(
  "/api/clients/slug/:slug/dashboard",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
  const wanted = String(req.params.slug || "").trim();
  if (!wanted) return res.status(400).json({ message: "Slug inválido." });

  const client = await findClientLeanBySlug(wanted);
  if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

  const planoRaw = client.dashboard?.planoAcaoItems || [];
  res.json({
    nome: client.nome,
    slug: client.slug,
    planoAcaoItems: planoRaw,
    missao: client.dashboard?.missao || "",
    visao: client.dashboard?.visao || "",
    valores: client.dashboard?.valores || "",
    charts: buildChartPayload(planoRaw),
  });
  }
);

app.get(
  "/api/clients/slug/:slug/assignable-users",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    if (!wanted) return res.status(400).json({ message: "Slug inválido." });

    const client = await findClientLeanBySlug(wanted);
    if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

    const clientSlug = String(client.slug || wanted).trim();
    const clientNome = String(client.nome || "").trim();

    const users = await User.find({ status: "Ativo" })
      .select("nome email perfil cliente clienteSlugs")
      .sort({ nome: 1 })
      .lean();

    const vinculados = users.filter((u) =>
      usuarioVinculadoAoCliente(u, clientSlug, clientNome)
    );

    res.json({
      users: vinculados.map((u) => ({
        id: String(u._id),
        nome: u.nome,
        email: u.email,
        perfil: u.perfil,
      })),
    });
  }
);

app.get(
  "/api/clients/slug/:slug/charts",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
  const wanted = String(req.params.slug || "").trim();
  if (!wanted) return res.status(400).json({ message: "Slug inválido." });

  const client = await findClientLeanBySlug(wanted);
  if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

  const planoRaw = client.dashboard?.planoAcaoItems || [];
  const charts = buildChartPayload(planoRaw);

  res.json({
    ok: true,
    slug: client.slug,
    nome: client.nome,
    generatedAt: new Date().toISOString(),
    ...charts,
  });
  }
);

app.patch(
  "/api/clients/slug/:slug/config",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
  const wanted = String(req.params.slug || "").trim();
  if (!wanted) return res.status(400).json({ message: "Slug inválido." });

  const lean = await findClientLeanBySlug(wanted);
  if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

  const doc = await Client.findById(lean._id);
  if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

  const body = req.body || {};
  doc.dashboard = doc.dashboard || {};

  if (body.missao !== undefined) {
    doc.dashboard.missao = String(body.missao ?? "").trim();
  }
  if (body.visao !== undefined) {
    doc.dashboard.visao = String(body.visao ?? "").trim();
  }
  if (body.valores !== undefined) {
    doc.dashboard.valores = String(body.valores ?? "").trim();
  }

  await doc.save();

  res.json({
    missao: doc.dashboard.missao || "",
    visao: doc.dashboard.visao || "",
    valores: doc.dashboard.valores || "",
  });
  }
);

app.post(
  "/api/clients/slug/:slug/plano-acao-items",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
  const wanted = String(req.params.slug || "").trim();
  if (!wanted) return res.status(400).json({ message: "Slug inválido." });

  const lean = await findClientLeanBySlug(wanted);
  if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

  const doc = await Client.findById(lean._id);
  if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

  const body = req.body || {};
  const items = doc.dashboard?.planoAcaoItems || [];
  const allowedStatus = ["Não Iniciado", "Em Andamento", "Atrasado", "Concluído"];
  const status = allowedStatus.includes(body.status) ? body.status : "Não Iniciado";

  const acao = String(body.acao || "").trim();
  if (!acao) {
    return res.status(400).json({ message: "O quê (ação) é obrigatório." });
  }

  const newItem = {
    id: nextPlanoAcaoItemId(items),
    acao,
    porQue: String(body.porQue || "").trim(),
    fase: String(body.fase || "").trim() || "Sem fase",
    responsavel: String(body.responsavel || "").trim(),
    prazo: String(body.prazo || "").trim(),
    area: String(body.area || "").trim(),
    como: String(body.como || "").trim(),
    quanto: String(body.quanto || "").trim(),
    status,
    progresso: String(body.progresso || "0%").trim(),
  };

  doc.dashboard = doc.dashboard || {};
  doc.dashboard.planoAcaoItems = [...items, newItem];
  await doc.save();

  res.status(201).json({ planoAcaoItems: doc.dashboard.planoAcaoItems });
  }
);

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar API:", error);
  process.exit(1);
});

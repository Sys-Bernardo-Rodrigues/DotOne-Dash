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
      investimentos: { type: Array, default: [] },
      campanhasMarketing: { type: Array, default: [] },
      kpisMarketing: { type: Array, default: [] },
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

function nextInvestimentoId(items) {
  const nums = (items || []).map((i) => {
    const m = String(i?.id || "").match(/^INV-(\d+)$/i);
    return m ? Number(m[1], 10) : 0;
  });
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `INV-${String(n).padStart(3, "0")}`;
}

function nextCampanhaId(items) {
  const nums = (items || []).map((i) => {
    const m = String(i?.id || "").match(/^CMK-(\d+)$/i);
    return m ? Number(m[1], 10) : 0;
  });
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `CMK-${String(n).padStart(3, "0")}`;
}

function nextKpiId(items) {
  const nums = (items || []).map((i) => {
    const m = String(i?.id || "").match(/^KPI-(\d+)$/i);
    return m ? Number(m[1], 10) : 0;
  });
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `KPI-${String(n).padStart(3, "0")}`;
}

function parseProgress(value) {
  const n = Number(String(value ?? "0").replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function formatProgress(value) {
  return `${parseProgress(value)}%`;
}

function parsePrazoBR(prazo) {
  const txt = String(prazo ?? "").trim();
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeStatus({ progresso, prazo }) {
  const p = parseProgress(progresso);
  if (p >= 100) return "Concluído";
  const prazoDate = parsePrazoBR(prazo);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const atrasado = prazoDate ? prazoDate < hoje : false;
  if (p <= 0) return atrasado ? "Atrasado" : "Não Iniciado";
  return atrasado ? "Atrasado" : "Em Andamento";
}

function buildPlanoItemFromBody(body, base = {}) {
  const prazo = String(body.prazo || base.prazo || "").trim();
  const progresso = formatProgress(body.progresso ?? base.progresso ?? "0%");
  return {
    ...base,
    acao: String(body.acao ?? base.acao ?? "").trim(),
    porQue: String(body.porQue ?? base.porQue ?? "").trim(),
    fase: String(body.fase ?? base.fase ?? "").trim() || "Sem fase",
    responsavel: String(body.responsavel ?? base.responsavel ?? "").trim(),
    prazo,
    area: String(body.area ?? base.area ?? "").trim(),
    como: String(body.como ?? base.como ?? "").trim(),
    quanto: String(body.quanto ?? base.quanto ?? "").trim(),
    progresso,
    status: computeStatus({ progresso, prazo }),
  };
}

function parseMoney(value) {
  const n = Number(String(value ?? "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Number(n.toFixed(2)));
}

function normalizeInvestimento(body, base = {}) {
  const nome = String(body.nome ?? base.nome ?? "").trim();
  const canal = String(body.canal ?? base.canal ?? "").trim();
  const valor = parseMoney(body.valor ?? base.valor ?? 0);
  const data = String(body.data ?? base.data ?? "").trim();
  const repete = Boolean(body.repete ?? base.repete ?? false);
  const frequenciaRaw = String(body.frequencia ?? base.frequencia ?? "").trim().toLowerCase();
  const frequencia = frequenciaRaw === "semanal" ? "semanal" : "mensal";
  const dataInicio = String(body.dataInicio ?? base.dataInicio ?? "").trim();
  const dataFim = String(body.dataFim ?? base.dataFim ?? "").trim();

  return {
    ...base,
    nome,
    canal,
    valor,
    data,
    repete,
    frequencia: repete ? frequencia : "",
    dataInicio: repete ? dataInicio : "",
    dataFim: repete ? dataFim : "",
  };
}

function computeRoiPercent(investimentoTrafego, faturamento) {
  const inv = parseMoney(investimentoTrafego);
  const fat = parseMoney(faturamento);
  if (inv <= 0) return 0;
  return Number((((fat - inv) / inv) * 100).toFixed(2));
}

function normalizeCampanhaMarketing(body, base = {}) {
  const nome = String(body.nome ?? base.nome ?? "").trim();
  const investimentoTrafego = parseMoney(
    body.investimentoTrafego ?? base.investimentoTrafego ?? 0
  );
  const faturamento = parseMoney(body.faturamento ?? base.faturamento ?? 0);
  const data = String(body.data ?? base.data ?? "").trim();
  const roi = computeRoiPercent(investimentoTrafego, faturamento);

  return {
    ...base,
    nome,
    investimentoTrafego,
    faturamento,
    roi,
    data,
  };
}

function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function safeDiv(num, den) {
  const d = Number(den) || 0;
  if (d <= 0) return 0;
  return Number(num || 0) / d;
}

function normalizeKpiMarketing(body, base = {}) {
  const competencia = String(body.competencia ?? base.competencia ?? "").trim();
  const canal = String(body.canal ?? base.canal ?? "").trim();
  const investimento = parseMoney(body.investimento ?? base.investimento ?? 0);
  const leads = Math.max(0, Math.round(Number(body.leads ?? base.leads ?? 0) || 0));
  const oportunidades = Math.max(
    0,
    Math.round(Number(body.oportunidades ?? base.oportunidades ?? 0) || 0)
  );
  const vendasNumero = Math.max(
    0,
    Math.round(Number(body.vendasNumero ?? base.vendasNumero ?? 0) || 0)
  );
  const faturamentoAquisicao = parseMoney(
    body.faturamentoAquisicao ?? base.faturamentoAquisicao ?? 0
  );
  const margemContribuicao = round2(
    Number(body.margemContribuicao ?? base.margemContribuicao ?? 30) || 0
  );

  const cpl = round2(safeDiv(investimento, leads));
  const cpo = round2(safeDiv(investimento, oportunidades));
  const conversaoFunil = round2(safeDiv(oportunidades * 100, leads));
  const cpv = round2(safeDiv(investimento, vendasNumero));
  const ticketMedio = round2(safeDiv(faturamentoAquisicao, vendasNumero));
  const txConvOportunidades = round2(safeDiv(oportunidades * 100, leads));
  const txConvVendas = round2(safeDiv(vendasNumero * 100, oportunidades));
  const roiDireto = round2(
    safeDiv(faturamentoAquisicao * (margemContribuicao / 100), investimento)
  );

  return {
    ...base,
    competencia,
    canal,
    investimento,
    leads,
    oportunidades,
    vendasNumero,
    faturamentoAquisicao,
    margemContribuicao,
    cpl,
    cpo,
    conversaoFunil,
    cpv,
    ticketMedio,
    txConvOportunidades,
    txConvVendas,
    roiDireto,
  };
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
    investimentos: client.dashboard?.investimentos || [],
    campanhasMarketing: client.dashboard?.campanhasMarketing || [],
    kpisMarketing: client.dashboard?.kpisMarketing || [],
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
    investimentos: client.dashboard?.investimentos || [],
    campanhasMarketing: client.dashboard?.campanhasMarketing || [],
    kpisMarketing: client.dashboard?.kpisMarketing || [],
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
  const acao = String(body.acao || "").trim();
  if (!acao) {
    return res.status(400).json({ message: "O quê (ação) é obrigatório." });
  }

  const newItem = buildPlanoItemFromBody(body, {
    id: nextPlanoAcaoItemId(items),
  });

  doc.dashboard = doc.dashboard || {};
  doc.dashboard.planoAcaoItems = [...items, newItem];
  await doc.save();

  res.status(201).json({ planoAcaoItems: doc.dashboard.planoAcaoItems });
  }
);

app.patch(
  "/api/clients/slug/:slug/plano-acao-items/:itemId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const itemId = String(req.params.itemId || "").trim();
    if (!wanted || !itemId) return res.status(400).json({ message: "Parâmetros inválidos." });

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const body = req.body || {};
    const items = doc.dashboard?.planoAcaoItems || [];
    const idx = items.findIndex((i) => String(i?.id || "").trim() === itemId);
    if (idx < 0) return res.status(404).json({ message: "Ação não encontrada." });

    const merged = buildPlanoItemFromBody(body, items[idx]);
    if (!merged.acao) {
      return res.status(400).json({ message: "O quê (ação) é obrigatório." });
    }

    const nextItems = [...items];
    nextItems[idx] = merged;
    doc.dashboard = doc.dashboard || {};
    doc.dashboard.planoAcaoItems = nextItems;
    await doc.save();

    res.json({ planoAcaoItems: doc.dashboard.planoAcaoItems });
  }
);

app.delete(
  "/api/clients/slug/:slug/plano-acao-items/:itemId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const itemId = String(req.params.itemId || "").trim();
    if (!wanted || !itemId) return res.status(400).json({ message: "Parâmetros inválidos." });

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.planoAcaoItems || [];
    const nextItems = items.filter((i) => String(i?.id || "").trim() !== itemId);
    if (nextItems.length === items.length) {
      return res.status(404).json({ message: "Ação não encontrada." });
    }

    doc.dashboard = doc.dashboard || {};
    doc.dashboard.planoAcaoItems = nextItems;
    await doc.save();

    res.json({ planoAcaoItems: doc.dashboard.planoAcaoItems });
  }
);

app.post(
  "/api/clients/slug/:slug/investimentos",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    if (!wanted) return res.status(400).json({ message: "Slug inválido." });

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.investimentos || [];
    const item = normalizeInvestimento(req.body || {}, { id: nextInvestimentoId(items) });
    if (!item.nome) return res.status(400).json({ message: "Nome do investimento é obrigatório." });
    if (!item.data) return res.status(400).json({ message: "Data é obrigatória." });
    if (item.repete && (!item.dataInicio || !item.dataFim)) {
      return res.status(400).json({ message: "Data de início e fim são obrigatórias para repetição." });
    }

    doc.dashboard = doc.dashboard || {};
    doc.dashboard.investimentos = [...items, item];
    await doc.save();
    res.status(201).json({ investimentos: doc.dashboard.investimentos });
  }
);

app.patch(
  "/api/clients/slug/:slug/investimentos/:investimentoId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const investimentoId = String(req.params.investimentoId || "").trim();
    if (!wanted || !investimentoId) {
      return res.status(400).json({ message: "Parâmetros inválidos." });
    }

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.investimentos || [];
    const idx = items.findIndex((i) => String(i?.id || "").trim() === investimentoId);
    if (idx < 0) return res.status(404).json({ message: "Investimento não encontrado." });

    const item = normalizeInvestimento(req.body || {}, items[idx]);
    if (!item.nome) return res.status(400).json({ message: "Nome do investimento é obrigatório." });
    if (!item.data) return res.status(400).json({ message: "Data é obrigatória." });
    if (item.repete && (!item.dataInicio || !item.dataFim)) {
      return res.status(400).json({ message: "Data de início e fim são obrigatórias para repetição." });
    }

    const nextItems = [...items];
    nextItems[idx] = item;
    doc.dashboard = doc.dashboard || {};
    doc.dashboard.investimentos = nextItems;
    await doc.save();
    res.json({ investimentos: doc.dashboard.investimentos });
  }
);

app.delete(
  "/api/clients/slug/:slug/investimentos/:investimentoId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const investimentoId = String(req.params.investimentoId || "").trim();
    if (!wanted || !investimentoId) {
      return res.status(400).json({ message: "Parâmetros inválidos." });
    }

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.investimentos || [];
    const nextItems = items.filter((i) => String(i?.id || "").trim() !== investimentoId);
    if (nextItems.length === items.length) {
      return res.status(404).json({ message: "Investimento não encontrado." });
    }

    doc.dashboard = doc.dashboard || {};
    doc.dashboard.investimentos = nextItems;
    await doc.save();
    res.json({ investimentos: doc.dashboard.investimentos });
  }
);

app.post(
  "/api/clients/slug/:slug/campanhas-marketing",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    if (!wanted) return res.status(400).json({ message: "Slug inválido." });

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.campanhasMarketing || [];
    const item = normalizeCampanhaMarketing(req.body || {}, { id: nextCampanhaId(items) });
    if (!item.nome) return res.status(400).json({ message: "Nome da campanha é obrigatório." });

    doc.dashboard = doc.dashboard || {};
    doc.dashboard.campanhasMarketing = [...items, item];
    await doc.save();
    res.status(201).json({ campanhasMarketing: doc.dashboard.campanhasMarketing });
  }
);

app.patch(
  "/api/clients/slug/:slug/campanhas-marketing/:campanhaId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const campanhaId = String(req.params.campanhaId || "").trim();
    if (!wanted || !campanhaId) {
      return res.status(400).json({ message: "Parâmetros inválidos." });
    }

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.campanhasMarketing || [];
    const idx = items.findIndex((i) => String(i?.id || "").trim() === campanhaId);
    if (idx < 0) return res.status(404).json({ message: "Campanha não encontrada." });

    const item = normalizeCampanhaMarketing(req.body || {}, items[idx]);
    if (!item.nome) return res.status(400).json({ message: "Nome da campanha é obrigatório." });

    const nextItems = [...items];
    nextItems[idx] = item;
    doc.dashboard = doc.dashboard || {};
    doc.dashboard.campanhasMarketing = nextItems;
    await doc.save();
    res.json({ campanhasMarketing: doc.dashboard.campanhasMarketing });
  }
);

app.delete(
  "/api/clients/slug/:slug/campanhas-marketing/:campanhaId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const campanhaId = String(req.params.campanhaId || "").trim();
    if (!wanted || !campanhaId) {
      return res.status(400).json({ message: "Parâmetros inválidos." });
    }

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.campanhasMarketing || [];
    const nextItems = items.filter((i) => String(i?.id || "").trim() !== campanhaId);
    if (nextItems.length === items.length) {
      return res.status(404).json({ message: "Campanha não encontrada." });
    }

    doc.dashboard = doc.dashboard || {};
    doc.dashboard.campanhasMarketing = nextItems;
    await doc.save();
    res.json({ campanhasMarketing: doc.dashboard.campanhasMarketing });
  }
);

app.post(
  "/api/clients/slug/:slug/kpis-marketing",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    if (!wanted) return res.status(400).json({ message: "Slug inválido." });

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });
    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.kpisMarketing || [];
    const item = normalizeKpiMarketing(req.body || {}, { id: nextKpiId(items) });
    if (!item.competencia) return res.status(400).json({ message: "Competência é obrigatória." });

    doc.dashboard = doc.dashboard || {};
    doc.dashboard.kpisMarketing = [...items, item];
    await doc.save();
    res.status(201).json({ kpisMarketing: doc.dashboard.kpisMarketing });
  }
);

app.patch(
  "/api/clients/slug/:slug/kpis-marketing/:kpiId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const kpiId = String(req.params.kpiId || "").trim();
    if (!wanted || !kpiId) return res.status(400).json({ message: "Parâmetros inválidos." });

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });
    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.kpisMarketing || [];
    const idx = items.findIndex((i) => String(i?.id || "").trim() === kpiId);
    if (idx < 0) return res.status(404).json({ message: "KPI não encontrado." });

    const item = normalizeKpiMarketing(req.body || {}, items[idx]);
    if (!item.competencia) return res.status(400).json({ message: "Competência é obrigatória." });

    const nextItems = [...items];
    nextItems[idx] = item;
    doc.dashboard = doc.dashboard || {};
    doc.dashboard.kpisMarketing = nextItems;
    await doc.save();
    res.json({ kpisMarketing: doc.dashboard.kpisMarketing });
  }
);

app.delete(
  "/api/clients/slug/:slug/kpis-marketing/:kpiId",
  authAdmin,
  requireClientSlugAccess,
  async (req, res) => {
    const wanted = String(req.params.slug || "").trim();
    const kpiId = String(req.params.kpiId || "").trim();
    if (!wanted || !kpiId) return res.status(400).json({ message: "Parâmetros inválidos." });

    const lean = await findClientLeanBySlug(wanted);
    if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });
    const doc = await Client.findById(lean._id);
    if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

    const items = doc.dashboard?.kpisMarketing || [];
    const nextItems = items.filter((i) => String(i?.id || "").trim() !== kpiId);
    if (nextItems.length === items.length) return res.status(404).json({ message: "KPI não encontrado." });

    doc.dashboard = doc.dashboard || {};
    doc.dashboard.kpisMarketing = nextItems;
    await doc.save();
    res.json({ kpisMarketing: doc.dashboard.kpisMarketing });
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

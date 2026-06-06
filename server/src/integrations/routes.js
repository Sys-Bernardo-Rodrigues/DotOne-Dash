import jwt from "jsonwebtoken";
import { encryptSecret, decryptSecret } from "../integrationCrypto.js";
import {
  authAdmin,
  isPainelElevado,
  requireClientSlugAccess,
} from "../auth.js";
import {
  buildMetaAuthUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchAdAccounts,
  isMetaConfigured,
} from "./metaAds.js";
import {
  applyGoogleTokenPatch,
  buildGoogleAuthUrl,
  ensureGoogleAccessToken,
  exchangeCodeForTokens,
  fetchCustomerDisplayName,
  isGoogleConfigured,
  listAccessibleCustomers,
  storeGoogleTokens,
} from "./googleAds.js";
import { applyMetaSync, applyGoogleSync, applyMetaPixelSync } from "./syncService.js";
import { buildIntegrationAlerts } from "./alerts.js";
import { currentCompetencia } from "./monthBounds.js";
import {
  getNotificationsCapabilities,
  notifySyncFailure,
  sanitizeNotificationSettings,
  sendTestNotification,
  resetMailTransporter,
} from "./notifications.js";
import { buildMarketingPerformance } from "./marketingPerformance.js";
import {
  sanitizePlatformSettingsForApi,
  updatePlatformSettings,
} from "../platformSettings.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-only-ALTERE-JWT_SECRET-em-producao";

function frontendOrigin() {
  return String(process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")[0]
    .trim();
}

function podeGerirIntegracoes(auth) {
  if (!auth) return false;
  if (isPainelElevado(auth.role)) return true;
  const perfil = auth.perfil;
  return perfil === "Administrador" || perfil === "Gestor" || perfil === "Operador";
}

function podeConfigurarPlataforma(auth) {
  if (!auth) return false;
  if (isPainelElevado(auth.role)) return true;
  return auth.perfil === "Administrador";
}

function requirePlatformConfigManage(req, res, next) {
  if (!podeConfigurarPlataforma(req.auth)) {
    return res.status(403).json({
      message: "Sem permissão para configurar credenciais da plataforma.",
    });
  }
  return next();
}

function requireIntegrationsManage(req, res, next) {
  if (!podeGerirIntegracoes(req.auth)) {
    return res.status(403).json({ message: "Sem permissão para gerir integrações." });
  }
  return next();
}

export function sanitizeIntegrations(integrations) {
  const meta = integrations?.meta || {};
  const google = integrations?.google || {};
  return {
    meta: {
      status: meta.status || "disconnected",
      adAccountId: meta.adAccountId || "",
      adAccountName: meta.adAccountName || "",
      pixelId: meta.pixelId || "",
      lastSyncAt: meta.lastSyncAt || null,
      pixelLastSyncAt: meta.pixelLastSyncAt || null,
      tokenExpiresAt: meta.tokenExpiresAt || null,
      lastError: meta.lastError || "",
      autoSync: meta.autoSync !== false,
      connected: Boolean(meta.accessTokenEnc),
      readyToSync: Boolean(meta.accessTokenEnc && meta.adAccountId),
      readyToSyncPixel: Boolean(meta.accessTokenEnc && meta.pixelId),
    },
    google: {
      status: google.status || "disconnected",
      customerId: google.customerId || "",
      customerName: google.customerName || "",
      lastSyncAt: google.lastSyncAt || null,
      lastError: google.lastError || "",
      autoSync: google.autoSync !== false,
      connected: Boolean(google.refreshTokenEnc),
      readyToSync: Boolean(google.refreshTokenEnc && google.customerId),
      available: isGoogleConfigured(),
    },
  };
}

function getMetaAccessToken(integrations) {
  const enc = integrations?.meta?.accessTokenEnc;
  if (!enc) return "";
  return decryptSecret(enc);
}

function formatGoogleCustomerId(id) {
  const digits = String(id || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function findPixelSnapshot(client, period) {
  const snaps = Array.isArray(client.marketingSnapshots) ? client.marketingSnapshots : [];
  const exact = snaps.find((s) => s.platform === "meta_pixel" && s.period === period);
  if (exact) return exact;
  return [...snaps]
    .filter((s) => s.platform === "meta_pixel")
    .sort((a, b) => String(b.period || "").localeCompare(String(a.period || "")))[0] || null;
}

async function persistSyncErrorNotify(doc, platform, err) {
  try {
    await notifySyncFailure(doc, platform, err?.message || String(err));
    await doc.save();
  } catch (notifyErr) {
    console.warn("[notifications] Falha ao notificar erro de sync:", notifyErr.message || notifyErr);
  }
}

export function registerIntegrationRoutes(app, deps) {
  const { Client, findClientLeanBySlug, nextKpiId, normalizeKpiMarketing } = deps;

  app.get(
    "/api/clients/slug/:slug/integrations",
    authAdmin,
    requireClientSlugAccess,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      if (!wanted) return res.status(400).json({ message: "Slug inválido." });

      const client = await findClientLeanBySlug(wanted);
      if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

      const dismissals = client.integrations?.alertDismissals || {};
      const alerts = buildIntegrationAlerts(client.integrations, { dismissals });
      const pixelSnapshot = findPixelSnapshot(client, currentCompetencia());

      res.json({
        configured: {
          meta: isMetaConfigured(),
          google: isGoogleConfigured(),
        },
        canManage: podeGerirIntegracoes(req.auth),
        canConfigurePlatform: podeConfigurarPlataforma(req.auth),
        platform: podeConfigurarPlataforma(req.auth)
          ? sanitizePlatformSettingsForApi()
          : undefined,
        integrations: sanitizeIntegrations(client.integrations),
        notifications: sanitizeNotificationSettings(client.integrations),
        notificationCapabilities: getNotificationsCapabilities(),
        alerts,
        pixelSnapshot,
      });
    }
  );

  app.get(
    "/api/clients/slug/:slug/marketing/performance",
    authAdmin,
    requireClientSlugAccess,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      if (!wanted) return res.status(400).json({ message: "Slug inválido." });

      const client = await findClientLeanBySlug(wanted);
      if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

      const competencia = String(req.query.competencia || "").trim();
      const performance = buildMarketingPerformance(client, competencia);
      res.json(performance);
    }
  );

  app.patch(
    "/api/clients/slug/:slug/integrations/platform-config",
    authAdmin,
    requireClientSlugAccess,
    requirePlatformConfigManage,
    async (req, res) => {
      try {
        await updatePlatformSettings(req.body || {});
        resetMailTransporter();
        res.json({
          ok: true,
          platform: sanitizePlatformSettingsForApi(),
          configured: {
            meta: isMetaConfigured(),
            google: isGoogleConfigured(),
          },
          notificationCapabilities: getNotificationsCapabilities(),
        });
      } catch (err) {
        return res.status(400).json({
          message: err.message || "Não foi possível salvar configuração da plataforma.",
        });
      }
    }
  );

  app.patch(
    "/api/clients/slug/:slug/integrations/notifications",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

      const body = req.body || {};
      doc.integrations = doc.integrations || {};

      if (body.notificationEmails !== undefined) {
        const arr = Array.isArray(body.notificationEmails) ? body.notificationEmails : [];
        doc.integrations.notificationEmails = [
          ...new Set(arr.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)),
        ];
      }
      if (body.notifyOnAlerts !== undefined) {
        doc.integrations.notifyOnAlerts = Boolean(body.notifyOnAlerts);
      }
      if (body.notifyEmail !== undefined) {
        doc.integrations.notifyEmail = Boolean(body.notifyEmail);
      }
      if (body.notifySlack !== undefined) {
        doc.integrations.notifySlack = Boolean(body.notifySlack);
      }
      if (body.notifyWeeklyReport !== undefined) {
        doc.integrations.notifyWeeklyReport = Boolean(body.notifyWeeklyReport);
      }

      await doc.save();
      res.json({
        notifications: sanitizeNotificationSettings(doc.integrations),
        notificationCapabilities: getNotificationsCapabilities(),
      });
    }
  );

  app.post(
    "/api/clients/slug/:slug/integrations/notifications/test",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const caps = getNotificationsCapabilities();
      if (!caps.enabled) {
        return res.status(503).json({
          message: "Notificações desativadas. Ative em Configurações → Integrações → Automação.",
        });
      }

      const doc = await Client.findById(lean._id);
      try {
        const result = await sendTestNotification(doc);
        await doc.save();
        if (!result.sent?.length) {
          return res.status(502).json({
            message:
              "Nenhum canal enviou a notificação. Verifique SMTP/Slack e e-mails configurados.",
            result,
          });
        }
        res.json({
          ok: true,
          message: "Notificação de teste enviada.",
          sent: result.sent,
          notifications: sanitizeNotificationSettings(doc.integrations),
        });
      } catch (err) {
        return res.status(502).json({
          message: err.message || "Falha ao enviar notificação de teste.",
        });
      }
    }
  );

  app.post(
    "/api/clients/slug/:slug/integrations/alerts/dismiss",
    authAdmin,
    requireClientSlugAccess,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const alertId = String(req.body?.alertId || "").trim();
      if (!wanted || !alertId) {
        return res.status(400).json({ message: "alertId é obrigatório." });
      }

      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      doc.integrations = doc.integrations || {};
      doc.integrations.alertDismissals = doc.integrations.alertDismissals || {};
      doc.integrations.alertDismissals[alertId] = new Date().toISOString();
      await doc.save();

      const alerts = buildIntegrationAlerts(doc.integrations, {
        dismissals: doc.integrations.alertDismissals,
      });

      res.json({ ok: true, alerts });
    }
  );

  app.get(
    "/api/clients/slug/:slug/integrations/meta/connect",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      if (!wanted) return res.status(400).json({ message: "Slug inválido." });

      const client = await findClientLeanBySlug(wanted);
      if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

      if (!isMetaConfigured()) {
        return res.status(503).json({
          message:
            "Meta Ads não configurado. Preencha App ID e App Secret em Configurações → Integrações.",
        });
      }

      const state = jwt.sign({ slug: wanted, purpose: "meta_oauth" }, JWT_SECRET, {
        expiresIn: "15m",
      });

      res.json({ authUrl: buildMetaAuthUrl(state) });
    }
  );

  app.get("/api/integrations/meta/callback", async (req, res) => {
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    const oauthError = String(req.query.error || "").trim();
    const redirectBase = frontendOrigin();

    if (oauthError) {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent(oauthError)}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent("Parâmetros OAuth inválidos.")}`
      );
    }

    let slug = "";
    try {
      const decoded = jwt.verify(state, JWT_SECRET);
      if (decoded?.purpose !== "meta_oauth") throw new Error("State inválido.");
      slug = String(decoded.slug || "").trim();
    } catch {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent("Sessão OAuth expirada.")}`
      );
    }

    const lean = await findClientLeanBySlug(slug);
    if (!lean) {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent("Cliente não encontrado.")}`
      );
    }

    try {
      const short = await exchangeCodeForToken(code);
      const long = await exchangeForLongLivedToken(short.access_token);
      const expiresIn = Number(long.expires_in || short.expires_in || 5184000);
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      const doc = await Client.findById(lean._id);
      doc.integrations = doc.integrations || {};
      doc.integrations.meta = {
        ...(doc.integrations.meta || {}),
        status: "connected",
        accessTokenEnc: encryptSecret(long.access_token || short.access_token),
        tokenExpiresAt,
        lastError: "",
      };
      await doc.save();

      return res.redirect(
        `${redirectBase}/${encodeURIComponent(slug)}/configuracao/integracoes?meta=connected`
      );
    } catch (err) {
      const doc = await Client.findById(lean._id);
      if (doc) {
        doc.integrations = doc.integrations || {};
        doc.integrations.meta = {
          ...(doc.integrations.meta || {}),
          status: "error",
          lastError: String(err.message || "Erro OAuth Meta"),
        };
        await doc.save();
      }
      return res.redirect(
        `${redirectBase}/${encodeURIComponent(slug)}/configuracao/integracoes?meta=error&message=${encodeURIComponent(err.message || "Erro OAuth")}`
      );
    }
  });

  app.get(
    "/api/clients/slug/:slug/integrations/meta/ad-accounts",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const token = getMetaAccessToken(lean.integrations);
      if (!token) {
        return res.status(400).json({ message: "Meta Ads não conectado para este cliente." });
      }

      try {
        const accounts = await fetchAdAccounts(token);
        res.json({
          accounts: accounts.map((a) => ({
            id: a.id,
            accountId: a.account_id,
            name: a.name,
            currency: a.currency,
            status: a.account_status,
          })),
        });
      } catch (err) {
        return res.status(502).json({ message: err.message || "Falha ao listar contas Meta." });
      }
    }
  );

  app.patch(
    "/api/clients/slug/:slug/integrations/meta",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

      const body = req.body || {};
      doc.integrations = doc.integrations || {};
      doc.integrations.meta = doc.integrations.meta || {};

      if (body.adAccountId !== undefined) {
        doc.integrations.meta.adAccountId = String(body.adAccountId || "").trim();
      }
      if (body.adAccountName !== undefined) {
        doc.integrations.meta.adAccountName = String(body.adAccountName || "").trim();
      }
      if (body.pixelId !== undefined) {
        doc.integrations.meta.pixelId = String(body.pixelId || "").trim();
      }
      if (body.autoSync !== undefined) {
        doc.integrations.meta.autoSync = Boolean(body.autoSync);
      }

      if (doc.integrations.meta.accessTokenEnc && doc.integrations.meta.adAccountId) {
        doc.integrations.meta.status = "connected";
      }

      await doc.save();
      res.json({ integrations: sanitizeIntegrations(doc.integrations) });
    }
  );

  app.post(
    "/api/clients/slug/:slug/integrations/meta/disconnect",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      doc.integrations = doc.integrations || {};
      doc.integrations.meta = {
        status: "disconnected",
        accessTokenEnc: "",
        tokenExpiresAt: null,
        adAccountId: "",
        adAccountName: "",
        pixelId: "",
        lastSyncAt: null,
        pixelLastSyncAt: null,
        lastError: "",
        autoSync: true,
      };
      await doc.save();
      res.json({ integrations: sanitizeIntegrations(doc.integrations) });
    }
  );

  app.post(
    "/api/clients/slug/:slug/integrations/meta/sync",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

      const competencia = String(req.body?.competencia || "").trim();

      try {
        const result = await applyMetaSync(doc, {
          competencia,
          nextKpiId,
          normalizeKpiMarketing,
        });
        await doc.save();

        res.json({
          ok: true,
          competencia: result.competencia,
          kpi: result.kpi,
          pixel: result.pixel,
          kpisMarketing: doc.dashboard.kpisMarketing,
          snapshot: result.snapshot,
          pixelSnapshot: result.pixel?.snapshot || null,
          integrations: sanitizeIntegrations(doc.integrations),
          alerts: buildIntegrationAlerts(doc.integrations, {
            dismissals: doc.integrations?.alertDismissals || {},
          }),
        });
      } catch (err) {
        doc.integrations.meta = {
          ...(doc.integrations?.meta || {}),
          status: "error",
          lastError: String(err.message || "Erro ao sincronizar Meta"),
        };
        await doc.save();
        await persistSyncErrorNotify(doc, "meta", err);
        return res.status(502).json({
          message: err.message || "Falha ao sincronizar dados da Meta.",
          integrations: sanitizeIntegrations(doc.integrations),
        });
      }
    }
  );

  app.post(
    "/api/clients/slug/:slug/integrations/meta/pixel/sync",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

      const competencia = String(req.body?.competencia || "").trim();

      try {
        const result = await applyMetaPixelSync(doc, { competencia });
        await doc.save();

        res.json({
          ok: true,
          competencia: result.competencia,
          pixelSnapshot: result.snapshot,
          stats: result.stats,
          integrations: sanitizeIntegrations(doc.integrations),
          alerts: buildIntegrationAlerts(doc.integrations, {
            dismissals: doc.integrations?.alertDismissals || {},
          }),
        });
      } catch (err) {
        doc.integrations.meta = {
          ...(doc.integrations?.meta || {}),
          status: "error",
          lastError: String(err.message || "Erro ao sincronizar Pixel"),
        };
        await doc.save();
        await persistSyncErrorNotify(doc, "meta_pixel", err);
        return res.status(502).json({
          message: err.message || "Falha ao sincronizar eventos do Pixel.",
          integrations: sanitizeIntegrations(doc.integrations),
          alerts: buildIntegrationAlerts(doc.integrations, {
            dismissals: doc.integrations?.alertDismissals || {},
          }),
        });
      }
    }
  );

  app.get(
    "/api/clients/slug/:slug/integrations/google/connect",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      if (!wanted) return res.status(400).json({ message: "Slug inválido." });

      const client = await findClientLeanBySlug(wanted);
      if (!client) return res.status(404).json({ message: "Cliente não encontrado." });

      if (!isGoogleConfigured()) {
        return res.status(503).json({
          message:
            "Google Ads não configurado. Preencha credenciais em Configurações → Integrações.",
        });
      }

      const state = jwt.sign({ slug: wanted, purpose: "google_oauth" }, JWT_SECRET, {
        expiresIn: "15m",
      });

      res.json({ authUrl: buildGoogleAuthUrl(state) });
    }
  );

  app.get("/api/integrations/google/callback", async (req, res) => {
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    const oauthError = String(req.query.error || "").trim();
    const redirectBase = frontendOrigin();

    if (oauthError) {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent(oauthError)}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent("Parâmetros OAuth inválidos.")}`
      );
    }

    let slug = "";
    try {
      const decoded = jwt.verify(state, JWT_SECRET);
      if (decoded?.purpose !== "google_oauth") throw new Error("State inválido.");
      slug = String(decoded.slug || "").trim();
    } catch {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent("Sessão OAuth expirada.")}`
      );
    }

    const lean = await findClientLeanBySlug(slug);
    if (!lean) {
      return res.redirect(
        `${redirectBase}/?integrationError=${encodeURIComponent("Cliente não encontrado.")}`
      );
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      if (!tokens.refresh_token) {
        throw new Error(
          "Google não devolveu refresh token. Revogue o acesso em myaccount.google.com/permissions e tente de novo."
        );
      }

      const doc = await Client.findById(lean._id);
      doc.integrations = doc.integrations || {};
      doc.integrations.google = storeGoogleTokens(doc.integrations.google, tokens);
      await doc.save();

      return res.redirect(
        `${redirectBase}/${encodeURIComponent(slug)}/configuracao/integracoes?google=connected`
      );
    } catch (err) {
      const doc = await Client.findById(lean._id);
      if (doc) {
        doc.integrations = doc.integrations || {};
        doc.integrations.google = {
          ...(doc.integrations.google || {}),
          status: "error",
          lastError: String(err.message || "Erro OAuth Google"),
        };
        await doc.save();
      }
      return res.redirect(
        `${redirectBase}/${encodeURIComponent(slug)}/configuracao/integracoes?google=error&message=${encodeURIComponent(err.message || "Erro OAuth")}`
      );
    }
  });

  app.get(
    "/api/clients/slug/:slug/integrations/google/customers",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const google = lean.integrations?.google || {};
      if (!google.refreshTokenEnc) {
        return res.status(400).json({ message: "Google Ads não conectado para este cliente." });
      }

      try {
        const { accessToken, patch } = await ensureGoogleAccessToken(google);
        const doc = await Client.findById(lean._id);
        if (patch) {
          doc.integrations.google = applyGoogleTokenPatch(doc.integrations.google || google, patch);
          await doc.save();
        }

        const ids = await listAccessibleCustomers(accessToken);
        const customers = await Promise.all(
          ids.map(async (id) => {
            const name = await fetchCustomerDisplayName(accessToken, id);
            return {
              id,
              formattedId: formatGoogleCustomerId(id),
              name: name || formatGoogleCustomerId(id),
            };
          })
        );

        res.json({ customers });
      } catch (err) {
        return res.status(502).json({ message: err.message || "Falha ao listar contas Google." });
      }
    }
  );

  app.patch(
    "/api/clients/slug/:slug/integrations/google",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

      const body = req.body || {};
      doc.integrations = doc.integrations || {};
      doc.integrations.google = doc.integrations.google || {};

      if (body.customerId !== undefined) {
        doc.integrations.google.customerId = String(body.customerId || "")
          .trim()
          .replace(/-/g, "");
      }
      if (body.customerName !== undefined) {
        doc.integrations.google.customerName = String(body.customerName || "").trim();
      }
      if (body.autoSync !== undefined) {
        doc.integrations.google.autoSync = Boolean(body.autoSync);
      }

      if (doc.integrations.google.refreshTokenEnc && doc.integrations.google.customerId) {
        doc.integrations.google.status = "connected";
      }

      await doc.save();
      res.json({ integrations: sanitizeIntegrations(doc.integrations) });
    }
  );

  app.post(
    "/api/clients/slug/:slug/integrations/google/disconnect",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      doc.integrations = doc.integrations || {};
      doc.integrations.google = {
        status: "disconnected",
        refreshTokenEnc: "",
        accessTokenEnc: "",
        tokenExpiresAt: null,
        customerId: "",
        customerName: "",
        lastSyncAt: null,
        lastError: "",
        autoSync: true,
      };
      await doc.save();
      res.json({ integrations: sanitizeIntegrations(doc.integrations) });
    }
  );

  app.post(
    "/api/clients/slug/:slug/integrations/google/sync",
    authAdmin,
    requireClientSlugAccess,
    requireIntegrationsManage,
    async (req, res) => {
      const wanted = String(req.params.slug || "").trim();
      const lean = await findClientLeanBySlug(wanted);
      if (!lean) return res.status(404).json({ message: "Cliente não encontrado." });

      const doc = await Client.findById(lean._id);
      if (!doc) return res.status(404).json({ message: "Cliente não encontrado." });

      const competencia = String(req.body?.competencia || "").trim();

      try {
        const result = await applyGoogleSync(doc, {
          competencia,
          nextKpiId,
          normalizeKpiMarketing,
        });
        await doc.save();

        res.json({
          ok: true,
          competencia: result.competencia,
          kpi: result.kpi,
          kpisMarketing: doc.dashboard.kpisMarketing,
          snapshot: result.snapshot,
          integrations: sanitizeIntegrations(doc.integrations),
        });
      } catch (err) {
        doc.integrations.google = {
          ...(doc.integrations?.google || {}),
          status: "error",
          lastError: String(err.message || "Erro ao sincronizar Google"),
        };
        await doc.save();
        await persistSyncErrorNotify(doc, "google", err);
        return res.status(502).json({
          message: err.message || "Falha ao sincronizar dados do Google Ads.",
          integrations: sanitizeIntegrations(doc.integrations),
        });
      }
    }
  );
}

import mongoose from "mongoose";
import { decryptSecret, encryptSecret } from "./integrationCrypto.js";

const DEFAULT_ID = "default";

let cache = null;

const platformSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: DEFAULT_ID },
    apiPublicUrl: { type: String, default: "" },
    meta: {
      appId: { type: String, default: "" },
      appSecretEnc: { type: String, default: "" },
      redirectUri: { type: String, default: "" },
    },
    google: {
      clientId: { type: String, default: "" },
      clientSecretEnc: { type: String, default: "" },
      developerTokenEnc: { type: String, default: "" },
      loginCustomerId: { type: String, default: "" },
      redirectUri: { type: String, default: "" },
    },
    automation: {
      enableCron: { type: Boolean, default: false },
      cronHour: { type: Number, default: 6 },
      enableNotifications: { type: Boolean, default: false },
      enableWeeklyReport: { type: Boolean, default: false },
      weeklyReportDay: { type: Number, default: 1 },
      weeklyReportHour: { type: Number, default: 8 },
      notifyCooldownMs: { type: Number, default: 86400000 },
    },
    notifications: {
      globalEmails: [{ type: String, trim: true, lowercase: true }],
      slackWebhookUrlEnc: { type: String, default: "" },
      smtpHost: { type: String, default: "" },
      smtpPort: { type: Number, default: 587 },
      smtpSecure: { type: Boolean, default: false },
      smtpUser: { type: String, default: "" },
      smtpPassEnc: { type: String, default: "" },
      smtpFrom: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const PlatformSettings =
  mongoose.models.PlatformSettings ||
  mongoose.model("PlatformSettings", platformSettingsSchema);

function envBool(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function defaultApiPublicUrl() {
  return String(process.env.API_PUBLIC_URL || "http://localhost:4000").replace(/\/$/, "");
}

function defaultMetaRedirect() {
  return (
    String(process.env.META_REDIRECT_URI || "").trim() ||
    `${defaultApiPublicUrl()}/api/integrations/meta/callback`
  );
}

function defaultGoogleRedirect() {
  return (
    String(process.env.GOOGLE_ADS_REDIRECT_URI || "").trim() ||
    `${defaultApiPublicUrl()}/api/integrations/google/callback`
  );
}

function buildDefaultsFromEnv() {
  const metaSecret = String(process.env.META_APP_SECRET || "").trim();
  const googleSecret = String(process.env.GOOGLE_ADS_CLIENT_SECRET || "").trim();
  const devToken = String(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "");
  const slackUrl = String(process.env.SLACK_WEBHOOK_URL || "").trim();

  return {
    _id: DEFAULT_ID,
    apiPublicUrl: defaultApiPublicUrl(),
    meta: {
      appId: String(process.env.META_APP_ID || "").trim(),
      appSecretEnc: metaSecret ? encryptSecret(metaSecret) : "",
      redirectUri: defaultMetaRedirect(),
    },
    google: {
      clientId: String(process.env.GOOGLE_ADS_CLIENT_ID || "").trim(),
      clientSecretEnc: googleSecret ? encryptSecret(googleSecret) : "",
      developerTokenEnc: devToken ? encryptSecret(devToken) : "",
      loginCustomerId: String(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "")
        .trim()
        .replace(/-/g, ""),
      redirectUri: defaultGoogleRedirect(),
    },
    automation: {
      enableCron: envBool("ENABLE_INTEGRATION_CRON"),
      cronHour: Math.min(23, Math.max(0, Number(process.env.INTEGRATION_CRON_HOUR || 6))),
      enableNotifications: envBool("ENABLE_INTEGRATION_NOTIFICATIONS"),
      enableWeeklyReport: envBool("ENABLE_WEEKLY_REPORT"),
      weeklyReportDay: Number(process.env.WEEKLY_REPORT_DAY ?? 1),
      weeklyReportHour: Number(process.env.WEEKLY_REPORT_HOUR ?? 8),
      notifyCooldownMs: Number(process.env.INTEGRATION_NOTIFY_COOLDOWN_MS || 86400000),
    },
    notifications: {
      globalEmails: String(process.env.INTEGRATION_NOTIFY_EMAILS || "")
        .split(/[,;]/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
      slackWebhookUrlEnc: slackUrl ? encryptSecret(slackUrl) : "",
      smtpHost: String(process.env.SMTP_HOST || "").trim(),
      smtpPort: Number(process.env.SMTP_PORT || 587),
      smtpSecure: envBool("SMTP_SECURE"),
      smtpUser: String(process.env.SMTP_USER || "").trim(),
      smtpPassEnc: smtpPass ? encryptSecret(smtpPass) : "",
      smtpFrom: String(process.env.SMTP_FROM || "").trim(),
    },
  };
}

function resolveRedirectUri(custom, fallbackPath) {
  const customUri = String(custom || "").trim();
  if (customUri) return customUri;
  const base = String(getCache()?.apiPublicUrl || defaultApiPublicUrl()).replace(/\/$/, "");
  return `${base}/api/integrations/${fallbackPath}/callback`;
}

function applyCache(doc) {
  const plain = doc?.toObject ? doc.toObject() : doc || buildDefaultsFromEnv();
  const apiPublicUrl = String(plain.apiPublicUrl || defaultApiPublicUrl()).replace(/\/$/, "");

  cache = {
    apiPublicUrl,
    meta: {
      appId: String(plain.meta?.appId || "").trim(),
      appSecret: decryptSecret(plain.meta?.appSecretEnc),
      redirectUri: String(plain.meta?.redirectUri || "").trim() || `${apiPublicUrl}/api/integrations/meta/callback`,
    },
    google: {
      clientId: String(plain.google?.clientId || "").trim(),
      clientSecret: decryptSecret(plain.google?.clientSecretEnc),
      developerToken: decryptSecret(plain.google?.developerTokenEnc),
      loginCustomerId: String(plain.google?.loginCustomerId || "")
        .trim()
        .replace(/-/g, ""),
      redirectUri:
        String(plain.google?.redirectUri || "").trim() ||
        `${apiPublicUrl}/api/integrations/google/callback`,
    },
    automation: {
      enableCron: plain.automation?.enableCron === true,
      cronHour: Math.min(23, Math.max(0, Number(plain.automation?.cronHour ?? 6))),
      enableNotifications: plain.automation?.enableNotifications === true,
      enableWeeklyReport: plain.automation?.enableWeeklyReport === true,
      weeklyReportDay: Number(plain.automation?.weeklyReportDay ?? 1),
      weeklyReportHour: Number(plain.automation?.weeklyReportHour ?? 8),
      notifyCooldownMs: Number(plain.automation?.notifyCooldownMs || 86400000),
    },
    notifications: {
      globalEmails: Array.isArray(plain.notifications?.globalEmails)
        ? plain.notifications.globalEmails
            .map((e) => String(e || "").trim().toLowerCase())
            .filter(Boolean)
        : [],
      slackWebhookUrl: decryptSecret(plain.notifications?.slackWebhookUrlEnc),
      smtp: {
        host: String(plain.notifications?.smtpHost || "").trim(),
        port: Number(plain.notifications?.smtpPort || 587),
        secure: plain.notifications?.smtpSecure === true,
        user: String(plain.notifications?.smtpUser || "").trim(),
        pass: decryptSecret(plain.notifications?.smtpPassEnc),
        from: String(plain.notifications?.smtpFrom || "").trim(),
      },
    },
    raw: plain,
  };

  return cache;
}

export async function initPlatformSettings() {
  let doc = await PlatformSettings.findById(DEFAULT_ID);
  if (!doc) {
    doc = await PlatformSettings.create(buildDefaultsFromEnv());
  }
  applyCache(doc);
  return cache;
}

export function refreshPlatformSettingsCache(doc) {
  return applyCache(doc);
}

function getCache() {
  if (!cache) {
    applyCache(buildDefaultsFromEnv());
  }
  return cache;
}

export function getMetaEnv() {
  const c = getCache();
  return {
    appId: c.meta.appId,
    appSecret: c.meta.appSecret,
    redirectUri: c.meta.redirectUri,
  };
}

export function getGoogleEnv() {
  const c = getCache();
  return {
    clientId: c.google.clientId,
    clientSecret: c.google.clientSecret,
    developerToken: c.google.developerToken,
    loginCustomerId: c.google.loginCustomerId,
    redirectUri: c.google.redirectUri,
  };
}

export function isMetaConfiguredFromPlatform() {
  const { appId, appSecret } = getMetaEnv();
  return Boolean(appId && appSecret);
}

export function isGoogleConfiguredFromPlatform() {
  const { clientId, clientSecret, developerToken } = getGoogleEnv();
  return Boolean(clientId && clientSecret && developerToken);
}

export function getAutomationConfig() {
  return getCache().automation;
}

export function getNotificationPlatformConfig() {
  return getCache().notifications;
}

export function getNotifyCooldownMs() {
  return getAutomationConfig().notifyCooldownMs;
}

function shouldReplaceSecret(value) {
  const txt = String(value ?? "").trim();
  if (!txt) return false;
  if (txt === "••••••••" || txt === "********") return false;
  return true;
}

export function sanitizePlatformSettingsForApi(docOrCache) {
  const c = getCache();
  const plain = docOrCache?.raw ? docOrCache.raw : docOrCache?.toObject?.() || docOrCache || c.raw || {};

  return {
    apiPublicUrl: String(plain.apiPublicUrl || c.apiPublicUrl || defaultApiPublicUrl()).replace(
      /\/$/,
      ""
    ),
    meta: {
      appId: String(plain.meta?.appId || c.meta.appId || "").trim(),
      appSecretSet: Boolean(plain.meta?.appSecretEnc || c.meta.appSecret),
      redirectUri: String(plain.meta?.redirectUri || "").trim(),
    },
    google: {
      clientId: String(plain.google?.clientId || c.google.clientId || "").trim(),
      clientSecretSet: Boolean(plain.google?.clientSecretEnc || c.google.clientSecret),
      developerTokenSet: Boolean(plain.google?.developerTokenEnc || c.google.developerToken),
      loginCustomerId: String(plain.google?.loginCustomerId || c.google.loginCustomerId || "").trim(),
      redirectUri: String(plain.google?.redirectUri || "").trim(),
    },
    automation: { ...c.automation },
    notifications: {
      globalEmails: c.notifications.globalEmails,
      slackWebhookSet: Boolean(c.notifications.slackWebhookUrl),
      smtp: {
        host: c.notifications.smtp.host,
        port: c.notifications.smtp.port,
        secure: c.notifications.smtp.secure,
        user: c.notifications.smtp.user,
        passSet: Boolean(c.notifications.smtp.pass),
        from: c.notifications.smtp.from,
      },
    },
    redirectUris: {
      meta: c.meta.redirectUri,
      google: c.google.redirectUri,
    },
  };
}

export async function updatePlatformSettings(body = {}) {
  let doc = await PlatformSettings.findById(DEFAULT_ID);
  if (!doc) {
    doc = new PlatformSettings(buildDefaultsFromEnv());
  }

  if (body.apiPublicUrl !== undefined) {
    doc.apiPublicUrl = String(body.apiPublicUrl || "").trim().replace(/\/$/, "");
  }

  if (body.meta && typeof body.meta === "object") {
    doc.meta = doc.meta || {};
    if (body.meta.appId !== undefined) doc.meta.appId = String(body.meta.appId || "").trim();
    if (shouldReplaceSecret(body.meta.appSecret)) {
      doc.meta.appSecretEnc = encryptSecret(body.meta.appSecret);
    }
    if (body.meta.redirectUri !== undefined) {
      doc.meta.redirectUri = String(body.meta.redirectUri || "").trim();
    }
  }

  if (body.google && typeof body.google === "object") {
    doc.google = doc.google || {};
    if (body.google.clientId !== undefined) {
      doc.google.clientId = String(body.google.clientId || "").trim();
    }
    if (shouldReplaceSecret(body.google.clientSecret)) {
      doc.google.clientSecretEnc = encryptSecret(body.google.clientSecret);
    }
    if (shouldReplaceSecret(body.google.developerToken)) {
      doc.google.developerTokenEnc = encryptSecret(body.google.developerToken);
    }
    if (body.google.loginCustomerId !== undefined) {
      doc.google.loginCustomerId = String(body.google.loginCustomerId || "")
        .trim()
        .replace(/-/g, "");
    }
    if (body.google.redirectUri !== undefined) {
      doc.google.redirectUri = String(body.google.redirectUri || "").trim();
    }
  }

  if (body.automation && typeof body.automation === "object") {
    doc.automation = doc.automation || {};
    const keys = [
      "enableCron",
      "cronHour",
      "enableNotifications",
      "enableWeeklyReport",
      "weeklyReportDay",
      "weeklyReportHour",
      "notifyCooldownMs",
    ];
    keys.forEach((key) => {
      if (body.automation[key] !== undefined) doc.automation[key] = body.automation[key];
    });
  }

  if (body.notifications && typeof body.notifications === "object") {
    doc.notifications = doc.notifications || {};
    if (body.notifications.globalEmails !== undefined) {
      const arr = Array.isArray(body.notifications.globalEmails)
        ? body.notifications.globalEmails
        : String(body.notifications.globalEmails || "")
            .split(/[,;]/)
            .map((e) => e.trim());
      doc.notifications.globalEmails = [
        ...new Set(arr.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)),
      ];
    }
    if (shouldReplaceSecret(body.notifications.slackWebhookUrl)) {
      doc.notifications.slackWebhookUrlEnc = encryptSecret(body.notifications.slackWebhookUrl);
    }
    if (body.notifications.smtp && typeof body.notifications.smtp === "object") {
      const smtp = body.notifications.smtp;
      if (smtp.host !== undefined) doc.notifications.smtpHost = String(smtp.host || "").trim();
      if (smtp.port !== undefined) doc.notifications.smtpPort = Number(smtp.port || 587);
      if (smtp.secure !== undefined) doc.notifications.smtpSecure = Boolean(smtp.secure);
      if (smtp.user !== undefined) doc.notifications.smtpUser = String(smtp.user || "").trim();
      if (shouldReplaceSecret(smtp.pass)) {
        doc.notifications.smtpPassEnc = encryptSecret(smtp.pass);
      }
      if (smtp.from !== undefined) doc.notifications.smtpFrom = String(smtp.from || "").trim();
    }
  }

  await doc.save();
  return refreshPlatformSettingsCache(doc);
}

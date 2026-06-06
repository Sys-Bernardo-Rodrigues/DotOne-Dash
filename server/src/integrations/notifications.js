import nodemailer from "nodemailer";
import { buildIntegrationAlerts } from "./alerts.js";
import {
  getAutomationConfig,
  getNotificationPlatformConfig,
  getNotifyCooldownMs,
} from "../platformSettings.js";

const LOG_LIMIT = 30;

let mailTransporter = null;

export function resetMailTransporter() {
  mailTransporter = null;
}

export function isNotificationsEnabled() {
  return getAutomationConfig().enableNotifications === true;
}

function getGlobalEmails() {
  return getNotificationPlatformConfig().globalEmails || [];
}

function getSlackWebhookUrl() {
  return String(getNotificationPlatformConfig().slackWebhookUrl || "").trim();
}

function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  const smtp = getNotificationPlatformConfig().smtp || {};
  const host = String(smtp.host || "").trim();
  if (!host) return null;

  mailTransporter = nodemailer.createTransport({
    host,
    port: Number(smtp.port || 587),
    secure: smtp.secure === true,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass || "" } : undefined,
  });
  return mailTransporter;
}

export function getNotificationsCapabilities() {
  return {
    enabled: isNotificationsEnabled(),
    email: Boolean(getMailTransporter()) || getGlobalEmails().length > 0,
    slack: Boolean(getSlackWebhookUrl()),
    smtpConfigured: Boolean(getMailTransporter()),
  };
}

export function sanitizeNotificationSettings(integrations) {
  const emails = Array.isArray(integrations?.notificationEmails)
    ? integrations.notificationEmails.map((e) => String(e || "").trim()).filter(Boolean)
    : [];
  const log = Array.isArray(integrations?.notificationLog)
    ? integrations.notificationLog.slice(-LOG_LIMIT).reverse()
    : [];

  return {
    notificationEmails: emails,
    notifyOnAlerts: integrations?.notifyOnAlerts !== false,
    notifyEmail: integrations?.notifyEmail !== false,
    notifySlack: integrations?.notifySlack !== false,
    notifyWeeklyReport: integrations?.notifyWeeklyReport !== false,
    lastWeeklyReportAt: integrations?.lastWeeklyReportAt || null,
    log,
  };
}

function resolveRecipients(client, integrations) {
  const perClient = Array.isArray(integrations?.notificationEmails)
    ? integrations.notificationEmails
    : [];
  const merged = [...new Set([...perClient, ...getGlobalEmails()].map((e) => e.trim().toLowerCase()))];
  return merged.filter(Boolean);
}

function shouldNotify(integrations, alertId) {
  const map = integrations?.notificationSentAt || {};
  const last = map[alertId];
  if (!last) return true;
  const t = new Date(last).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t >= getNotifyCooldownMs();
}

function appendLog(integrations, entry) {
  const log = Array.isArray(integrations.notificationLog) ? integrations.notificationLog : [];
  integrations.notificationLog = [...log, entry].slice(-LOG_LIMIT);
}

function markSent(integrations, alertId) {
  integrations.notificationSentAt = integrations.notificationSentAt || {};
  integrations.notificationSentAt[alertId] = new Date().toISOString();
}

function buildClientUrl(clientSlug) {
  const origin = String(process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",")[0].trim();
  return `${origin}/${encodeURIComponent(clientSlug)}/configuracao/integracoes`;
}

function formatAlertText(clientName, clientSlug, alerts) {
  const lines = alerts.map(
    (a) => `• [${a.severity === "error" ? "ERRO" : "AVISO"}] ${a.title}: ${a.message}`
  );
  return [
    `My Dot Growth — ${clientName}`,
    "",
    ...lines,
    "",
    `Painel: ${buildClientUrl(clientSlug)}`,
  ].join("\n");
}

export async function sendEmailNotification({ to, subject, text }) {
  const transporter = getMailTransporter();
  if (!transporter || !to.length) {
    return { ok: false, skipped: true, reason: "SMTP não configurado ou sem destinatários." };
  }

  const smtp = getNotificationPlatformConfig().smtp || {};
  const from =
    String(smtp.from || "").trim() ||
    String(smtp.user || "").trim() ||
    "noreply@mydotgrowth.local";

  await transporter.sendMail({
    from,
    to: to.join(", "),
    subject,
    text,
  });
  return { ok: true };
}

async function sendSlackNotification({ text }) {
  const url = getSlackWebhookUrl();
  if (!url) return { ok: false, skipped: true, reason: "SLACK_WEBHOOK_URL não configurado." };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Slack webhook falhou (${response.status}): ${body.slice(0, 200)}`);
  }
  return { ok: true };
}

export async function notifyClientAlerts(doc, alerts, { reason = "alert", force = false } = {}) {
  if (!isNotificationsEnabled()) return { sent: [], skipped: "disabled" };
  if (!doc || !Array.isArray(alerts) || alerts.length === 0) return { sent: [], skipped: "no_alerts" };

  doc.integrations = doc.integrations || {};
  const settings = doc.integrations;

  if (settings.notifyOnAlerts === false) return { sent: [], skipped: "client_disabled" };

  const pending = force
    ? alerts
    : alerts.filter((a) => shouldNotify(settings, a.id));

  if (!pending.length) return { sent: [], skipped: "cooldown" };

  const clientName = String(doc.nome || doc.slug || "Cliente").trim();
  const clientSlug = String(doc.slug || "").trim();
  const subject = `[My Dot Growth] ${pending.length} alerta(s) — ${clientName}`;
  const text = formatAlertText(clientName, clientSlug, pending);
  const sent = [];
  const recipients = resolveRecipients(doc, settings);

  if (settings.notifyEmail !== false && recipients.length) {
    try {
      await sendEmailNotification({ to: recipients, subject, text });
      sent.push({ channel: "email", recipients, alertIds: pending.map((a) => a.id) });
      appendLog(settings, {
        channel: "email",
        reason,
        alertIds: pending.map((a) => a.id),
        recipients,
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      appendLog(settings, {
        channel: "email",
        reason,
        error: String(err.message || err),
        sentAt: new Date().toISOString(),
      });
    }
  }

  if (settings.notifySlack !== false) {
    try {
      await sendSlackNotification({ text });
      sent.push({ channel: "slack", alertIds: pending.map((a) => a.id) });
      appendLog(settings, {
        channel: "slack",
        reason,
        alertIds: pending.map((a) => a.id),
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      appendLog(settings, {
        channel: "slack",
        reason,
        error: String(err.message || err),
        sentAt: new Date().toISOString(),
      });
    }
  }

  for (const alert of pending) {
    markSent(settings, alert.id);
  }

  return { sent, pending: pending.map((a) => a.id) };
}

export async function processClientIntegrationNotifications(doc) {
  const alerts = buildIntegrationAlerts(doc.integrations, {
    dismissals: doc.integrations?.alertDismissals || {},
  });
  return notifyClientAlerts(doc, alerts, { reason: "health_check" });
}

export async function notifySyncFailure(doc, platform, message) {
  const alerts = buildIntegrationAlerts(doc.integrations, {
    dismissals: doc.integrations?.alertDismissals || {},
  });
  const filtered = alerts.filter(
    (a) =>
      a.platform === platform ||
      (platform === "meta_pixel" && a.platform === "meta") ||
      a.id.includes("sync_error") ||
      a.id.includes("token")
  );
  if (filtered.length) {
    return notifyClientAlerts(doc, filtered, { reason: `sync_${platform}` });
  }
  return notifyClientAlerts(
    doc,
    [
      {
        id: `${platform}_sync_error`,
        severity: "error",
        platform,
        title: `Falha na sincronização ${platform}`,
        message: String(message || "Erro desconhecido"),
      },
    ],
    { reason: `sync_${platform}`, force: true }
  );
}

export async function sendTestNotification(doc) {
  const clientName = String(doc.nome || doc.slug || "Cliente").trim();
  const testAlert = [
    {
      id: "test_notification",
      severity: "warning",
      platform: "system",
      title: "Notificação de teste",
      message: "Se você recebeu isto, e-mail/Slack estão configurados corretamente.",
    },
  ];
  return notifyClientAlerts(doc, testAlert, { reason: "test", force: true });
}

export async function processAllClientsNotifications(Client) {
  if (!isNotificationsEnabled()) return { processed: 0, notified: 0 };

  const clients = await Client.find({ status: "Ativo" }).select("_id slug nome integrations");
  let processed = 0;
  let notified = 0;

  for (const lean of clients) {
    const doc = await Client.findById(lean._id);
    if (!doc?.integrations) continue;
    processed += 1;
    const result = await processClientIntegrationNotifications(doc);
    await doc.save();
    if (result.sent?.length) notified += 1;
  }

  return { processed, notified };
}

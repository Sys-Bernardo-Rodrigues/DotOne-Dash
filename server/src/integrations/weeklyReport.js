import { buildMarketingPerformance, buildWeeklyReportText } from "./marketingPerformance.js";
import { currentCompetencia } from "./monthBounds.js";
import {
  notifyClientAlerts,
  sendEmailNotification,
  isNotificationsEnabled,
} from "./notifications.js";
import { buildIntegrationAlerts } from "./alerts.js";
import { getAutomationConfig, getNotificationPlatformConfig } from "../platformSettings.js";

function resolveRecipients(client) {
  const perClient = Array.isArray(client.integrations?.notificationEmails)
    ? client.integrations.notificationEmails
    : [];
  const global = getNotificationPlatformConfig().globalEmails || [];
  return [...new Set([...perClient, ...global].filter(Boolean))];
}

function isWeeklyReportEnabled() {
  return getAutomationConfig().enableWeeklyReport === true;
}

export function getWeeklyReportSchedule() {
  const auto = getAutomationConfig();
  return {
    enabled: auto.enableWeeklyReport === true,
    day: Number(auto.weeklyReportDay ?? 1),
    hour: Number(auto.weeklyReportHour ?? 8),
  };
}

export async function sendWeeklyReportForClient(doc) {
  if (!isWeeklyReportEnabled()) return { skipped: "disabled" };
  if (doc.integrations?.notifyWeeklyReport === false) return { skipped: "client_disabled" };
  if (doc.integrations?.notifyOnAlerts === false) return { skipped: "alerts_disabled" };

  const recipients = resolveRecipients(doc);
  if (!recipients.length) return { skipped: "no_recipients" };

  const performance = buildMarketingPerformance(doc, currentCompetencia());
  const hasData = performance.meta.available || performance.google.available;
  if (!hasData) return { skipped: "no_data" };

  const clientName = String(doc.nome || doc.slug || "Cliente").trim();
  const subject = `[My Dot Growth] Relatório semanal — ${clientName} (${performance.competencia})`;
  const text = buildWeeklyReportText(doc, performance);

  await sendEmailNotification({ to: recipients, subject, text });

  doc.integrations = doc.integrations || {};
  doc.integrations.lastWeeklyReportAt = new Date();
  doc.integrations.notificationLog = Array.isArray(doc.integrations.notificationLog)
    ? doc.integrations.notificationLog
    : [];
  doc.integrations.notificationLog.push({
    channel: "weekly_report",
    competencia: performance.competencia,
    recipients,
    sentAt: new Date().toISOString(),
  });
  if (doc.integrations.notificationLog.length > 30) {
    doc.integrations.notificationLog = doc.integrations.notificationLog.slice(-30);
  }

  return { ok: true, recipients, competencia: performance.competencia };
}

export async function sendWeeklyReportsAllClients(Client) {
  if (!isWeeklyReportEnabled()) return { sent: 0, skipped: 0 };

  const clients = await Client.find({ status: "Ativo" });
  let sent = 0;
  let skipped = 0;

  for (const doc of clients) {
    try {
      const result = await sendWeeklyReportForClient(doc);
      if (result.ok) {
        await doc.save();
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      skipped += 1;
      console.warn(`[weekly-report] ${doc.slug}:`, err.message || err);
    }
  }

  if (isNotificationsEnabled()) {
    for (const doc of clients) {
      const alerts = buildIntegrationAlerts(doc.integrations, {
        dismissals: doc.integrations?.alertDismissals || {},
      });
      if (alerts.length) {
        await notifyClientAlerts(doc, alerts, { reason: "weekly_digest" });
        await doc.save();
      }
    }
  }

  return { sent, skipped };
}

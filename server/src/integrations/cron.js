import { syncAllClientsCurrentMonth } from "./syncService.js";
import { processAllClientsNotifications } from "./notifications.js";
import { sendWeeklyReportsAllClients, getWeeklyReportSchedule } from "./weeklyReport.js";
import { getAutomationConfig } from "../platformSettings.js";

let lastCronDate = "";
let lastWeeklyReportWeek = "";

export function startIntegrationCron(deps) {
  const checkMs = Number(process.env.INTEGRATION_CRON_CHECK_MS || 15 * 60 * 1000);
  const weeklyCheckMs = Number(process.env.WEEKLY_REPORT_CHECK_MS || 60 * 60 * 1000);

  async function tick() {
    const auto = getAutomationConfig();
    if (!auto.enableCron) return;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = Math.min(23, Math.max(0, Number(auto.cronHour ?? 6)));
    if (now.getHours() < hour) return;
    if (lastCronDate === today) return;

    lastCronDate = today;
    console.log(`[integrations] Iniciando sync automático (${today}, hora alvo ${hour}h)…`);

    try {
      const summary = await syncAllClientsCurrentMonth(deps.Client, deps);
      console.log(
        `[integrations] Sync concluído: ${summary.synced.length} ok, ${summary.errors.length} erros.`
      );
      if (summary.errors.length) {
        console.warn("[integrations] Erros:", summary.errors);
      }

      const notifySummary = await processAllClientsNotifications(deps.Client);
      if (notifySummary.notified > 0) {
        console.log(
          `[integrations] Notificações enviadas para ${notifySummary.notified} cliente(s).`
        );
      }
    } catch (err) {
      console.error("[integrations] Falha no cron:", err.message || err);
      lastCronDate = "";
    }
  }

  setInterval(tick, checkMs);
  tick();

  setInterval(async () => {
    const weekly = getWeeklyReportSchedule();
    if (!weekly.enabled) return;

    const now = new Date();
    const weekKey = `${now.getFullYear()}-${now.getMonth()}-${Math.floor(now.getDate() / 7)}`;
    if (now.getDay() !== weekly.day) return;
    if (now.getHours() < weekly.hour) return;
    if (lastWeeklyReportWeek === weekKey) return;

    lastWeeklyReportWeek = weekKey;
    console.log("[weekly-report] Enviando relatórios semanais…");
    try {
      const summary = await sendWeeklyReportsAllClients(deps.Client);
      console.log(
        `[weekly-report] Concluído: ${summary.sent} enviados, ${summary.skipped} ignorados.`
      );
    } catch (err) {
      console.error("[weekly-report] Falha:", err.message || err);
      lastWeeklyReportWeek = "";
    }
  }, weeklyCheckMs);

  console.log(
    `[integrations] Cron listener ativo — verificação a cada ${Math.round(checkMs / 60000)} min (ligado/desligado via painel).`
  );
}

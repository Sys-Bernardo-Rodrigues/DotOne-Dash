import { useEffect, useState } from "react";
import { Cloud, Save, Server, Shield } from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

const SECRET_PLACEHOLDER = "••••••••";

function buildFormFromPlatform(platform) {
  const p = platform || {};
  return {
    apiPublicUrl: p.apiPublicUrl || "",
    metaAppId: p.meta?.appId || "",
    metaAppSecret: p.meta?.appSecretSet ? SECRET_PLACEHOLDER : "",
    metaRedirectUri: p.meta?.redirectUri || "",
    googleClientId: p.google?.clientId || "",
    googleClientSecret: p.google?.clientSecretSet ? SECRET_PLACEHOLDER : "",
    googleDeveloperToken: p.google?.developerTokenSet ? SECRET_PLACEHOLDER : "",
    googleLoginCustomerId: p.google?.loginCustomerId || "",
    googleRedirectUri: p.google?.redirectUri || "",
    enableCron: Boolean(p.automation?.enableCron),
    cronHour: String(p.automation?.cronHour ?? 6),
    enableNotifications: Boolean(p.automation?.enableNotifications),
    enableWeeklyReport: Boolean(p.automation?.enableWeeklyReport),
    weeklyReportDay: String(p.automation?.weeklyReportDay ?? 1),
    weeklyReportHour: String(p.automation?.weeklyReportHour ?? 8),
    globalEmails: Array.isArray(p.notifications?.globalEmails)
      ? p.notifications.globalEmails.join(", ")
      : "",
    slackWebhookUrl: p.notifications?.slackWebhookSet ? SECRET_PLACEHOLDER : "",
    smtpHost: p.notifications?.smtp?.host || "",
    smtpPort: String(p.notifications?.smtp?.port ?? 587),
    smtpSecure: Boolean(p.notifications?.smtp?.secure),
    smtpUser: p.notifications?.smtp?.user || "",
    smtpPass: p.notifications?.smtp?.passSet ? SECRET_PLACEHOLDER : "",
    smtpFrom: p.notifications?.smtp?.from || "",
  };
}

function secretPayload(value) {
  const txt = String(value || "").trim();
  if (!txt || txt === SECRET_PLACEHOLDER) return undefined;
  return txt;
}

export default function PlatformIntegrationConfig() {
  const { integrationsState, savePlatformIntegrationConfig } = useClientData();
  const platform = integrationsState?.platform;
  const redirectUris = platform?.redirectUris || {};

  const [form, setForm] = useState(() => buildFormFromPlatform(platform));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    setForm(buildFormFromPlatform(platform));
  }, [platform]);

  if (!integrationsState?.canConfigurePlatform) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback({ tipo: "", texto: "" });

    const metaSecret = secretPayload(form.metaAppSecret);
    const googleSecret = secretPayload(form.googleClientSecret);
    const devToken = secretPayload(form.googleDeveloperToken);
    const slackUrl = secretPayload(form.slackWebhookUrl);
    const smtpPass = secretPayload(form.smtpPass);

    const payload = {
      apiPublicUrl: form.apiPublicUrl.trim(),
      meta: {
        appId: form.metaAppId.trim(),
        redirectUri: form.metaRedirectUri.trim(),
        ...(metaSecret ? { appSecret: metaSecret } : {}),
      },
      google: {
        clientId: form.googleClientId.trim(),
        loginCustomerId: form.googleLoginCustomerId.trim(),
        redirectUri: form.googleRedirectUri.trim(),
        ...(googleSecret ? { clientSecret: googleSecret } : {}),
        ...(devToken ? { developerToken: devToken } : {}),
      },
      automation: {
        enableCron: form.enableCron,
        cronHour: Number(form.cronHour || 6),
        enableNotifications: form.enableNotifications,
        enableWeeklyReport: form.enableWeeklyReport,
        weeklyReportDay: Number(form.weeklyReportDay || 1),
        weeklyReportHour: Number(form.weeklyReportHour || 8),
      },
      notifications: {
        globalEmails: form.globalEmails,
        ...(slackUrl ? { slackWebhookUrl: slackUrl } : {}),
        smtp: {
          host: form.smtpHost.trim(),
          port: Number(form.smtpPort || 587),
          secure: form.smtpSecure,
          user: form.smtpUser.trim(),
          from: form.smtpFrom.trim(),
          ...(smtpPass ? { pass: smtpPass } : {}),
        },
      },
    };

    const result = await savePlatformIntegrationConfig(payload);
    setSaving(false);
    if (!result.ok) {
      setFeedback({ tipo: "erro", texto: result.message || "Não foi possível salvar." });
      return;
    }
    setFeedback({ tipo: "ok", texto: "Configuração da plataforma guardada." });
  }

  return (
    <section className="cfg-integ cfg-platform" aria-labelledby="cfg-platform-title">
      <div className="cfg-integ__head">
        <div className="cfg-integ__brand">
          <span className="cfg-integ__logo cfg-integ__logo--notify" aria-hidden="true">
            <Server size={18} strokeWidth={2} />
          </span>
          <div>
            <h2 id="cfg-platform-title">Credenciais da plataforma</h2>
            <p className="cfg-integ__desc">
              App IDs, tokens OAuth, SMTP e automação — tudo configurável pelo painel.
            </p>
          </div>
        </div>
        <span className="cfg-badge cfg-badge--server-on">
          <Shield size={12} strokeWidth={2} style={{ marginRight: 4, verticalAlign: -2 }} />
          Admin
        </span>
      </div>

      <div className="cfg-platform__uris">
        <p>
          <strong>Redirect Meta:</strong>{" "}
          <code>{redirectUris.meta || "—"}</code>
        </p>
        <p>
          <strong>Redirect Google:</strong>{" "}
          <code>{redirectUris.google || "—"}</code>
        </p>
      </div>

      <form className="cfg-form cfg-platform__form" onSubmit={handleSubmit}>
        <fieldset className="cfg-platform__group">
          <legend>
            <Cloud size={14} strokeWidth={2} aria-hidden="true" /> URL pública da API
          </legend>
          <label className="cfg-field">
            <span className="cfg-field__label">API_PUBLIC_URL</span>
            <span className="cfg-field__hint">Base usada para callbacks OAuth (ex.: https://api.seudominio.com)</span>
            <input
              type="url"
              className="cfg-input"
              placeholder="http://localhost:4000"
              value={form.apiPublicUrl}
              onChange={(e) => setForm((p) => ({ ...p, apiPublicUrl: e.target.value }))}
            />
          </label>
        </fieldset>

        <fieldset className="cfg-platform__group">
          <legend>Meta Ads — app Facebook</legend>
          <div className="cfg-platform__grid">
            <label className="cfg-field">
              <span className="cfg-field__label">App ID</span>
              <input
                type="text"
                className="cfg-input"
                value={form.metaAppId}
                onChange={(e) => setForm((p) => ({ ...p, metaAppId: e.target.value }))}
              />
            </label>
            <label className="cfg-field">
              <span className="cfg-field__label">App Secret</span>
              <input
                type="password"
                className="cfg-input"
                placeholder="Novo secret…"
                value={form.metaAppSecret}
                onChange={(e) => setForm((p) => ({ ...p, metaAppSecret: e.target.value }))}
              />
            </label>
            <label className="cfg-field cfg-field--full">
              <span className="cfg-field__label">Redirect URI (opcional)</span>
              <input
                type="text"
                className="cfg-input"
                placeholder="Deixe vazio para usar o padrão acima"
                value={form.metaRedirectUri}
                onChange={(e) => setForm((p) => ({ ...p, metaRedirectUri: e.target.value }))}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="cfg-platform__group">
          <legend>Google Ads — API</legend>
          <div className="cfg-platform__grid">
            <label className="cfg-field">
              <span className="cfg-field__label">Client ID</span>
              <input
                type="text"
                className="cfg-input"
                value={form.googleClientId}
                onChange={(e) => setForm((p) => ({ ...p, googleClientId: e.target.value }))}
              />
            </label>
            <label className="cfg-field">
              <span className="cfg-field__label">Client Secret</span>
              <input
                type="password"
                className="cfg-input"
                value={form.googleClientSecret}
                onChange={(e) => setForm((p) => ({ ...p, googleClientSecret: e.target.value }))}
              />
            </label>
            <label className="cfg-field">
              <span className="cfg-field__label">Developer Token</span>
              <input
                type="password"
                className="cfg-input"
                value={form.googleDeveloperToken}
                onChange={(e) => setForm((p) => ({ ...p, googleDeveloperToken: e.target.value }))}
              />
            </label>
            <label className="cfg-field">
              <span className="cfg-field__label">Login Customer ID (MCC)</span>
              <input
                type="text"
                className="cfg-input"
                placeholder="Opcional"
                value={form.googleLoginCustomerId}
                onChange={(e) => setForm((p) => ({ ...p, googleLoginCustomerId: e.target.value }))}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="cfg-platform__group">
          <legend>Automação</legend>
          <div className="cfg-platform__checks">
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={form.enableCron}
                onChange={(e) => setForm((p) => ({ ...p, enableCron: e.target.checked }))}
              />
              Sync automático diário (mês corrente)
            </label>
            <label className="cfg-field cfg-field--inline">
              <span className="cfg-field__label">Hora do sync</span>
              <input
                type="number"
                min="0"
                max="23"
                className="cfg-input cfg-input--narrow"
                value={form.cronHour}
                onChange={(e) => setForm((p) => ({ ...p, cronHour: e.target.value }))}
              />
            </label>
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={form.enableNotifications}
                onChange={(e) => setForm((p) => ({ ...p, enableNotifications: e.target.checked }))}
              />
              Alertas por e-mail / Slack
            </label>
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={form.enableWeeklyReport}
                onChange={(e) => setForm((p) => ({ ...p, enableWeeklyReport: e.target.checked }))}
              />
              Relatório semanal por e-mail
            </label>
          </div>
        </fieldset>

        <fieldset className="cfg-platform__group">
          <legend>SMTP, Slack e e-mails globais</legend>
          <label className="cfg-field">
            <span className="cfg-field__label">E-mails globais de alerta</span>
            <input
              type="text"
              className="cfg-input"
              placeholder="admin@empresa.com, ops@empresa.com"
              value={form.globalEmails}
              onChange={(e) => setForm((p) => ({ ...p, globalEmails: e.target.value }))}
            />
          </label>
          <label className="cfg-field">
            <span className="cfg-field__label">Slack Webhook URL</span>
            <input
              type="password"
              className="cfg-input"
              placeholder="https://hooks.slack.com/…"
              value={form.slackWebhookUrl}
              onChange={(e) => setForm((p) => ({ ...p, slackWebhookUrl: e.target.value }))}
            />
          </label>
          <div className="cfg-platform__grid">
            <label className="cfg-field">
              <span className="cfg-field__label">SMTP Host</span>
              <input
                type="text"
                className="cfg-input"
                value={form.smtpHost}
                onChange={(e) => setForm((p) => ({ ...p, smtpHost: e.target.value }))}
              />
            </label>
            <label className="cfg-field">
              <span className="cfg-field__label">Porta</span>
              <input
                type="number"
                className="cfg-input"
                value={form.smtpPort}
                onChange={(e) => setForm((p) => ({ ...p, smtpPort: e.target.value }))}
              />
            </label>
            <label className="cfg-field">
              <span className="cfg-field__label">Utilizador</span>
              <input
                type="text"
                className="cfg-input"
                value={form.smtpUser}
                onChange={(e) => setForm((p) => ({ ...p, smtpUser: e.target.value }))}
              />
            </label>
            <label className="cfg-field">
              <span className="cfg-field__label">Password SMTP</span>
              <input
                type="password"
                className="cfg-input"
                value={form.smtpPass}
                onChange={(e) => setForm((p) => ({ ...p, smtpPass: e.target.value }))}
              />
            </label>
            <label className="cfg-field cfg-field--full">
              <span className="cfg-field__label">Remetente (From)</span>
              <input
                type="email"
                className="cfg-input"
                value={form.smtpFrom}
                onChange={(e) => setForm((p) => ({ ...p, smtpFrom: e.target.value }))}
              />
            </label>
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(e) => setForm((p) => ({ ...p, smtpSecure: e.target.checked }))}
              />
              SMTP seguro (TLS)
            </label>
          </div>
        </fieldset>

        {feedback.texto ? (
          <p className={`cfg-alert cfg-alert--${feedback.tipo === "ok" ? "ok" : "erro"}`} role="status">
            {feedback.texto}
          </p>
        ) : null}

        <div className="cfg-form__actions">
          <button type="submit" className="cfg-btn cfg-btn--primary" disabled={saving}>
            <Save size={16} strokeWidth={2} aria-hidden="true" />
            {saving ? "A guardar…" : "Guardar credenciais da plataforma"}
          </button>
        </div>
      </form>
    </section>
  );
}

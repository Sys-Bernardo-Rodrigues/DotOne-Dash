import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Bell,
  Link2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

function statusLabel(status) {
  if (status === "connected") return "Conectado";
  if (status === "error") return "Erro";
  return "Desconectado";
}

function statusBadgeClass(status) {
  if (status === "connected") return "cfg-badge cfg-badge--connected";
  if (status === "error") return "cfg-badge cfg-badge--error";
  return "cfg-badge cfg-badge--idle";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function currentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function IntegracoesMarketingPage() {
  const { clientSlug } = useParams();
  const {
    isLoading,
    integrationsState,
    loadIntegrations,
    connectMeta,
    disconnectMeta,
    fetchMetaAdAccounts,
    saveMetaSettings,
    syncMeta,
    syncMetaPixel,
    pixelSnapshot,
    connectGoogle,
    disconnectGoogle,
    fetchGoogleCustomers,
    saveGoogleSettings,
    syncGoogle,
    saveNotificationSettings,
    sendTestNotification,
  } = useClientData();

  const [searchParams, setSearchParams] = useSearchParams();
  const [feedback, setFeedback] = useState({ tipo: "", texto: "" });

  const [metaAccounts, setMetaAccounts] = useState([]);
  const [loadingMetaAccounts, setLoadingMetaAccounts] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [syncingPixel, setSyncingPixel] = useState(false);
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [metaCompetencia, setMetaCompetencia] = useState(currentMonth);
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaAccountId, setMetaAccountId] = useState("");
  const [metaAutoSync, setMetaAutoSync] = useState(true);

  const [googleCustomers, setGoogleCustomers] = useState([]);
  const [loadingGoogleCustomers, setLoadingGoogleCustomers] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleCompetencia, setGoogleCompetencia] = useState(currentMonth);
  const [googleCustomerId, setGoogleCustomerId] = useState("");
  const [googleAutoSync, setGoogleAutoSync] = useState(true);

  const meta = integrationsState?.integrations?.meta || {};
  const google = integrationsState?.integrations?.google || {};
  const canManage = integrationsState?.canManage !== false;
  const metaConfigured = integrationsState?.configured?.meta !== false;
  const googleConfigured = integrationsState?.configured?.google !== false;
  const notifications = integrationsState?.notifications || {};
  const notifyCaps = integrationsState?.notificationCapabilities || {};

  const [notifyEmailsText, setNotifyEmailsText] = useState("");
  const [notifyOnAlerts, setNotifyOnAlerts] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  useEffect(() => {
    setNotifyEmailsText((notifications.notificationEmails || []).join(", "));
    setNotifyOnAlerts(notifications.notifyOnAlerts !== false);
    setNotifyEmail(notifications.notifyEmail !== false);
    setNotifySlack(notifications.notifySlack !== false);
    setNotifyWeeklyReport(notifications.notifyWeeklyReport !== false);
  }, [
    notifications.notificationEmails,
    notifications.notifyOnAlerts,
    notifications.notifyEmail,
    notifications.notifySlack,
    notifications.notifyWeeklyReport,
  ]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    setMetaPixelId(meta.pixelId || "");
    setMetaAccountId(meta.adAccountId || "");
    setMetaAutoSync(meta.autoSync !== false);
  }, [meta.pixelId, meta.adAccountId, meta.autoSync]);

  useEffect(() => {
    setGoogleCustomerId(google.customerId || "");
    setGoogleAutoSync(google.autoSync !== false);
  }, [google.customerId, google.autoSync]);

  useEffect(() => {
    const message = searchParams.get("message");
    const metaStatus = searchParams.get("meta");
    const googleStatus = searchParams.get("google");

    if (metaStatus === "connected") {
      setFeedback({ tipo: "ok", texto: "Meta Ads conectado com sucesso." });
      loadIntegrations();
      setSearchParams({}, { replace: true });
    } else if (metaStatus === "error") {
      setFeedback({ tipo: "erro", texto: message || "Não foi possível conectar a Meta." });
      setSearchParams({}, { replace: true });
    } else if (googleStatus === "connected") {
      setFeedback({ tipo: "ok", texto: "Google Ads conectado com sucesso." });
      loadIntegrations();
      setSearchParams({}, { replace: true });
    } else if (googleStatus === "error") {
      setFeedback({ tipo: "erro", texto: message || "Não foi possível conectar o Google." });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadIntegrations]);

  const loadMetaAccounts = useCallback(async () => {
    if (!meta.connected) return;
    setLoadingMetaAccounts(true);
    const result = await fetchMetaAdAccounts();
    setLoadingMetaAccounts(false);
    if (result.ok) setMetaAccounts(result.accounts || []);
    else if (result.message) setFeedback({ tipo: "erro", texto: result.message });
  }, [meta.connected, fetchMetaAdAccounts]);

  const loadGoogleAccounts = useCallback(async () => {
    if (!google.connected) return;
    setLoadingGoogleCustomers(true);
    const result = await fetchGoogleCustomers();
    setLoadingGoogleCustomers(false);
    if (result.ok) setGoogleCustomers(result.customers || []);
    else if (result.message) setFeedback({ tipo: "erro", texto: result.message });
  }, [google.connected, fetchGoogleCustomers]);

  useEffect(() => {
    if (meta.connected) loadMetaAccounts();
  }, [meta.connected, loadMetaAccounts]);

  useEffect(() => {
    if (google.connected) loadGoogleAccounts();
  }, [google.connected, loadGoogleAccounts]);

  const metaAccountOptions = useMemo(() => {
    if (!metaAccounts.length && meta.adAccountId) {
      return [{ id: meta.adAccountId, name: meta.adAccountName || meta.adAccountId }];
    }
    return metaAccounts.map((a) => ({ id: a.id, name: a.name || a.id }));
  }, [metaAccounts, meta.adAccountId, meta.adAccountName]);

  const googleCustomerOptions = useMemo(() => {
    if (!googleCustomers.length && google.customerId) {
      return [
        {
          id: google.customerId,
          name: google.customerName || google.customerId,
        },
      ];
    }
    return googleCustomers.map((c) => ({
      id: c.id,
      name: c.name || c.formattedId || c.id,
    }));
  }, [googleCustomers, google.customerId, google.customerName]);

  async function handleConnectMeta() {
    setConnectingMeta(true);
    setFeedback({ tipo: "", texto: "" });
    const result = await connectMeta();
    setConnectingMeta(false);
    if (!result.ok) {
      setFeedback({ tipo: "erro", texto: result.message || "Falha ao iniciar conexão." });
      return;
    }
    window.location.assign(result.authUrl);
  }

  async function handleConnectGoogle() {
    setConnectingGoogle(true);
    setFeedback({ tipo: "", texto: "" });
    const result = await connectGoogle();
    setConnectingGoogle(false);
    if (!result.ok) {
      setFeedback({ tipo: "erro", texto: result.message || "Falha ao iniciar conexão." });
      return;
    }
    window.location.assign(result.authUrl);
  }

  async function handleSaveMeta(event) {
    event.preventDefault();
    setSavingMeta(true);
    setFeedback({ tipo: "", texto: "" });
    const selected = metaAccountOptions.find((a) => a.id === metaAccountId);
    const result = await saveMetaSettings({
      adAccountId: metaAccountId,
      adAccountName: selected?.name || "",
      pixelId: metaPixelId.trim(),
      autoSync: metaAutoSync,
    });
    setSavingMeta(false);
    setFeedback(
      result.ok
        ? { tipo: "ok", texto: "Configurações Meta salvas." }
        : { tipo: "erro", texto: result.message || "Falha ao salvar." },
    );
  }

  async function handleSaveGoogle(event) {
    event.preventDefault();
    setSavingGoogle(true);
    setFeedback({ tipo: "", texto: "" });
    const selected = googleCustomerOptions.find((c) => c.id === googleCustomerId);
    const result = await saveGoogleSettings({
      customerId: googleCustomerId,
      customerName: selected?.name || "",
      autoSync: googleAutoSync,
    });
    setSavingGoogle(false);
    setFeedback(
      result.ok
        ? { tipo: "ok", texto: "Configurações Google salvas." }
        : { tipo: "erro", texto: result.message || "Falha ao salvar." },
    );
  }

  async function handleSyncMeta() {
    setSyncingMeta(true);
    setFeedback({ tipo: "", texto: "" });
    const result = await syncMeta({ competencia: metaCompetencia });
    setSyncingMeta(false);
    setFeedback(
      result.ok
        ? {
            tipo: "ok",
            texto: `KPI Meta de ${result.competencia || metaCompetencia} sincronizado.`,
          }
        : { tipo: "erro", texto: result.message || "Falha na sincronização Meta." },
    );
  }

  async function handleSyncGoogle() {
    setSyncingGoogle(true);
    setFeedback({ tipo: "", texto: "" });
    const result = await syncGoogle({ competencia: googleCompetencia });
    setSyncingGoogle(false);
    setFeedback(
      result.ok
        ? {
            tipo: "ok",
            texto: `KPI Google de ${result.competencia || googleCompetencia} sincronizado.`,
          }
        : { tipo: "erro", texto: result.message || "Falha na sincronização Google." },
    );
  }

  async function handleSyncPixel() {
    setSyncingPixel(true);
    setFeedback({ tipo: "", texto: "" });
    const result = await syncMetaPixel({ competencia: metaCompetencia });
    setSyncingPixel(false);
    setFeedback(
      result.ok
        ? {
            tipo: "ok",
            texto: `Eventos do Pixel (${result.competencia || metaCompetencia}) sincronizados.`,
          }
        : { tipo: "erro", texto: result.message || "Falha na sincronização do Pixel." },
    );
  }

  const pixelEvents = useMemo(() => {
    const events = pixelSnapshot?.metrics?.events;
    if (!events || typeof events !== "object") return [];
    return Object.entries(events)
      .map(([name, count]) => ({ name, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [pixelSnapshot]);

  async function handleSaveNotifications(event) {
    event.preventDefault();
    setSavingNotifications(true);
    setFeedback({ tipo: "", texto: "" });
    const emails = notifyEmailsText
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    const result = await saveNotificationSettings({
      notificationEmails: emails,
      notifyOnAlerts,
      notifyEmail,
      notifySlack,
      notifyWeeklyReport,
    });
    setSavingNotifications(false);
    setFeedback(
      result.ok
        ? { tipo: "ok", texto: "Preferências de notificação salvas." }
        : { tipo: "erro", texto: result.message || "Falha ao salvar." },
    );
  }

  async function handleTestNotification() {
    setTestingNotification(true);
    setFeedback({ tipo: "", texto: "" });
    const result = await sendTestNotification();
    setTestingNotification(false);
    setFeedback(
      result.ok
        ? { tipo: "ok", texto: result.message || "Notificação de teste enviada." }
        : { tipo: "erro", texto: result.message || "Falha no teste." },
    );
  }

  return (
    <>
      {feedback.texto ? (
        <p className={`cfg-alert cfg-alert--${feedback.tipo === "ok" ? "ok" : "erro"}`} role="status">
          {feedback.texto}
        </p>
      ) : null}

      <section className="cfg-integ">
        <div className="cfg-integ__head">
          <div className="cfg-integ__brand">
            <span className="cfg-integ__logo cfg-integ__logo--meta" aria-hidden="true">
              Meta
            </span>
            <div>
              <h2>Meta Ads (Facebook / Instagram)</h2>
              <p className="cfg-integ__desc">
                Importa investimento, cliques e leads da conta de anúncios.
              </p>
            </div>
          </div>
          <span className={statusBadgeClass(meta.status)}>{statusLabel(meta.status)}</span>
        </div>

        {!metaConfigured ? (
          <p className="cfg-hint cfg-hint--warn">
            Preencha App ID e App Secret em{" "}
            <Link to={`/${clientSlug}/configuracao/credenciais`}>Credenciais</Link>.
          </p>
        ) : null}
        {meta.lastError ? (
          <p className="cfg-hint cfg-hint--erro">Último erro: {meta.lastError}</p>
        ) : null}

        <dl className="cfg-integ__meta">
          <div>
            <dt>Última sincronização</dt>
            <dd>{formatDate(meta.lastSyncAt)}</dd>
          </div>
          <div>
            <dt>Conta</dt>
            <dd>{meta.adAccountName || meta.adAccountId || "—"}</dd>
          </div>
          <div>
            <dt>Pixel ID</dt>
            <dd>{meta.pixelId || "—"}</dd>
          </div>
          <div>
            <dt>Último sync do Pixel</dt>
            <dd>{formatDate(meta.pixelLastSyncAt)}</dd>
          </div>
          <div>
            <dt>Token expira</dt>
            <dd>{formatDate(meta.tokenExpiresAt)}</dd>
          </div>
        </dl>

        {canManage ? (
          <div className="cfg-integ__actions">
            {!meta.connected ? (
              <button
                type="button"
                className="cfg-btn cfg-btn--meta"
                disabled={connectingMeta || isLoading || !metaConfigured}
                onClick={handleConnectMeta}
              >
                <Link2 size={16} strokeWidth={2} aria-hidden="true" />
                {connectingMeta ? "Redirecionando…" : "Conectar Meta Ads"}
              </button>
            ) : (
              <>
                <form className="cfg-form" onSubmit={handleSaveMeta}>
                  <label className="cfg-field">
                    <span className="cfg-field__label">Conta de anúncios</span>
                    <select
                      className="cfg-select"
                      value={metaAccountId}
                      onChange={(e) => setMetaAccountId(e.target.value)}
                      disabled={loadingMetaAccounts || savingMeta}
                    >
                      <option value="">Selecione…</option>
                      {metaAccountOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="cfg-field">
                    <span className="cfg-field__label">Meta Pixel ID (opcional)</span>
                    <input
                      type="text"
                      className="cfg-input"
                      placeholder="Ex.: 123456789012345"
                      value={metaPixelId}
                      onChange={(e) => setMetaPixelId(e.target.value)}
                      disabled={savingMeta}
                    />
                  </label>
                  <label className="cfg-check">
                    <input
                      type="checkbox"
                      checked={metaAutoSync}
                      onChange={(e) => setMetaAutoSync(e.target.checked)}
                      disabled={savingMeta}
                    />
                    Sync automático diário (mês corrente)
                  </label>
                  <div className="cfg-form__actions">
                    <button type="submit" className="cfg-btn cfg-btn--ghost" disabled={savingMeta}>
                      {savingMeta ? "A guardar…" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className="cfg-btn cfg-btn--ghost"
                      disabled={loadingMetaAccounts}
                      onClick={loadMetaAccounts}
                    >
                      <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
                      Atualizar contas
                    </button>
                  </div>
                </form>
                <div className="cfg-sync">
                  <label className="cfg-field cfg-sync__field">
                    <span className="cfg-field__label">Competência</span>
                    <input
                      type="month"
                      className="cfg-input"
                      value={metaCompetencia}
                      onChange={(e) => setMetaCompetencia(e.target.value)}
                      disabled={syncingMeta}
                    />
                  </label>
                  <div className="cfg-sync__actions">
                    <button
                      type="button"
                      className="cfg-btn cfg-btn--meta"
                      disabled={syncingMeta || !meta.readyToSync}
                      onClick={handleSyncMeta}
                    >
                      {syncingMeta ? "A sincronizar…" : "Sincronizar KPIs Meta"}
                    </button>
                    {meta.readyToSyncPixel ? (
                      <button
                        type="button"
                        className="cfg-btn cfg-btn--ghost"
                        disabled={syncingPixel}
                        onClick={handleSyncPixel}
                      >
                        {syncingPixel ? "A sincronizar…" : "Sincronizar eventos Pixel"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="cfg-btn cfg-btn--ghost cfg-btn--danger"
                      disabled={syncingMeta}
                      onClick={async () => {
                        if (!window.confirm("Desconectar Meta Ads?")) return;
                        const r = await disconnectMeta();
                        if (r.ok) {
                          setMetaAccounts([]);
                          setFeedback({ tipo: "ok", texto: "Meta desconectado." });
                        }
                      }}
                    >
                      <Unplug size={14} strokeWidth={2} aria-hidden="true" />
                      Desconectar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="cfg-hint">Acesso somente leitura.</p>
        )}

        {pixelEvents.length ? (
          <div className="cfg-pixel">
            <h3 className="cfg-subtitle">
              Eventos do Pixel
              {pixelSnapshot?.period ? ` (${pixelSnapshot.period})` : ""}
            </h3>
            <div className="cfg-table-wrap">
              <table className="cfg-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pixelEvents.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.count.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pixelSnapshot?.metrics?.leadEvents != null ? (
              <p className="cfg-hint">
                Leads rastreados no pixel:{" "}
                <strong>{Number(pixelSnapshot.metrics.leadEvents).toLocaleString("pt-BR")}</strong>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="cfg-integ">
        <div className="cfg-integ__head">
          <div className="cfg-integ__brand">
            <span className="cfg-integ__logo cfg-integ__logo--google" aria-hidden="true">
              G
            </span>
            <div>
              <h2>Google Ads</h2>
              <p className="cfg-integ__desc">
                Importa investimento, cliques e conversões da conta Google Ads.
              </p>
            </div>
          </div>
          <span className={statusBadgeClass(google.status)}>{statusLabel(google.status)}</span>
        </div>

        {!googleConfigured ? (
          <p className="cfg-hint cfg-hint--warn">
            Preencha credenciais Google em{" "}
            <Link to={`/${clientSlug}/configuracao/credenciais`}>Credenciais</Link>.
          </p>
        ) : null}
        {google.lastError ? (
          <p className="cfg-hint cfg-hint--erro">Último erro: {google.lastError}</p>
        ) : null}

        <dl className="cfg-integ__meta">
          <div>
            <dt>Última sincronização</dt>
            <dd>{formatDate(google.lastSyncAt)}</dd>
          </div>
          <div>
            <dt>Conta (Customer ID)</dt>
            <dd>{google.customerName || google.customerId || "—"}</dd>
          </div>
        </dl>

        {canManage ? (
          <div className="cfg-integ__actions">
            {!google.connected ? (
              <button
                type="button"
                className="cfg-btn cfg-btn--google"
                disabled={connectingGoogle || isLoading || !googleConfigured}
                onClick={handleConnectGoogle}
              >
                <Link2 size={16} strokeWidth={2} aria-hidden="true" />
                {connectingGoogle ? "Redirecionando…" : "Conectar Google Ads"}
              </button>
            ) : (
              <>
                <form className="cfg-form" onSubmit={handleSaveGoogle}>
                  <label className="cfg-field">
                    <span className="cfg-field__label">Conta Google Ads</span>
                    <select
                      className="cfg-select"
                      value={googleCustomerId}
                      onChange={(e) => setGoogleCustomerId(e.target.value)}
                      disabled={loadingGoogleCustomers || savingGoogle}
                    >
                      <option value="">Selecione…</option>
                      {googleCustomerOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="cfg-check">
                    <input
                      type="checkbox"
                      checked={googleAutoSync}
                      onChange={(e) => setGoogleAutoSync(e.target.checked)}
                      disabled={savingGoogle}
                    />
                    Sync automático diário (mês corrente)
                  </label>
                  <div className="cfg-form__actions">
                    <button type="submit" className="cfg-btn cfg-btn--ghost" disabled={savingGoogle}>
                      {savingGoogle ? "A guardar…" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className="cfg-btn cfg-btn--ghost"
                      disabled={loadingGoogleCustomers}
                      onClick={loadGoogleAccounts}
                    >
                      <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
                      Atualizar contas
                    </button>
                  </div>
                </form>
                <div className="cfg-sync">
                  <label className="cfg-field cfg-sync__field">
                    <span className="cfg-field__label">Competência</span>
                    <input
                      type="month"
                      className="cfg-input"
                      value={googleCompetencia}
                      onChange={(e) => setGoogleCompetencia(e.target.value)}
                      disabled={syncingGoogle}
                    />
                  </label>
                  <div className="cfg-sync__actions">
                    <button
                      type="button"
                      className="cfg-btn cfg-btn--google"
                      disabled={syncingGoogle || !google.readyToSync}
                      onClick={handleSyncGoogle}
                    >
                      {syncingGoogle ? "A sincronizar…" : "Sincronizar agora"}
                    </button>
                    <button
                      type="button"
                      className="cfg-btn cfg-btn--ghost cfg-btn--danger"
                      disabled={syncingGoogle}
                      onClick={async () => {
                        if (!window.confirm("Desconectar Google Ads?")) return;
                        const r = await disconnectGoogle();
                        if (r.ok) {
                          setGoogleCustomers([]);
                          setFeedback({ tipo: "ok", texto: "Google desconectado." });
                        }
                      }}
                    >
                      <Unplug size={14} strokeWidth={2} aria-hidden="true" />
                      Desconectar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="cfg-hint">Acesso somente leitura.</p>
        )}
      </section>

      <section className="cfg-integ">
        <div className="cfg-integ__head">
          <div className="cfg-integ__brand">
            <span className="cfg-integ__logo cfg-integ__logo--notify" aria-hidden="true">
              <Bell size={18} strokeWidth={2} />
            </span>
            <div>
              <h2>Notificações de alertas</h2>
              <p className="cfg-integ__desc">
                E-mail e Slack quando integrações falharem ou tokens expirarem.
              </p>
            </div>
          </div>
          <span className={`cfg-badge ${notifyCaps.enabled ? "cfg-badge--server-on" : "cfg-badge--idle"}`}>
            {notifyCaps.enabled ? "Alertas activos" : "Alertas inactivos"}
          </span>
        </div>

        {!notifyCaps.enabled ? (
          <p className="cfg-hint cfg-hint--warn">
            Active alertas em{" "}
            <Link to={`/${clientSlug}/configuracao/credenciais`}>Credenciais</Link> → Automação.
          </p>
        ) : null}

        <dl className="cfg-integ__meta">
          <div>
            <dt>E-mail (SMTP)</dt>
            <dd>{notifyCaps.smtpConfigured ? "Configurado" : "Não configurado"}</dd>
          </div>
          <div>
            <dt>Slack</dt>
            <dd>{notifyCaps.slack ? "Webhook configurado" : "Não configurado"}</dd>
          </div>
        </dl>

        {canManage ? (
          <form className="cfg-form" onSubmit={handleSaveNotifications}>
            <label className="cfg-field">
              <span className="cfg-field__label">E-mails deste cliente</span>
              <span className="cfg-field__hint">
                Separados por vírgula. Somados aos e-mails globais do servidor.
              </span>
              <input
                type="text"
                className="cfg-input"
                placeholder="gestor@empresa.com, diretor@empresa.com"
                value={notifyEmailsText}
                onChange={(e) => setNotifyEmailsText(e.target.value)}
                disabled={savingNotifications}
              />
            </label>
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={notifyOnAlerts}
                onChange={(e) => setNotifyOnAlerts(e.target.checked)}
                disabled={savingNotifications}
              />
              Receber alertas de integração
            </label>
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                disabled={savingNotifications}
              />
              Enviar por e-mail
            </label>
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={notifySlack}
                onChange={(e) => setNotifySlack(e.target.checked)}
                disabled={savingNotifications}
              />
              Enviar para Slack
            </label>
            <label className="cfg-check">
              <input
                type="checkbox"
                checked={notifyWeeklyReport}
                onChange={(e) => setNotifyWeeklyReport(e.target.checked)}
                disabled={savingNotifications}
              />
              Relatório semanal por e-mail
            </label>
            <div className="cfg-form__actions">
              <button type="submit" className="cfg-btn cfg-btn--primary" disabled={savingNotifications}>
                {savingNotifications ? "A guardar…" : "Guardar notificações"}
              </button>
              <button
                type="button"
                className="cfg-btn cfg-btn--ghost"
                disabled={testingNotification || !notifyCaps.enabled}
                onClick={handleTestNotification}
              >
                {testingNotification ? "A enviar…" : "Enviar teste"}
              </button>
            </div>
          </form>
        ) : null}

        {notifications.log?.length ? (
          <div className="cfg-log">
            <h3 className="cfg-subtitle">Histórico recente</h3>
            <ul className="cfg-log__list">
              {notifications.log.slice(0, 8).map((entry, idx) => (
                <li key={`${entry.sentAt}-${idx}`}>
                  <strong>{entry.channel}</strong>
                  {entry.error ? (
                    <span className="cfg-log__err"> — {entry.error}</span>
                  ) : (
                    <span> — {formatDate(entry.sentAt)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}

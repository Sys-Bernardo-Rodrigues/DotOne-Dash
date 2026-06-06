const MS_DAY = 24 * 60 * 60 * 1000;

function isDismissed(dismissals, alertId) {
  const map = dismissals && typeof dismissals === "object" ? dismissals : {};
  return Boolean(map[alertId]);
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const t = new Date(dateValue).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / MS_DAY);
}

export function buildIntegrationAlerts(integrations, { dismissals = {} } = {}) {
  const alerts = [];
  const meta = integrations?.meta || {};
  const google = integrations?.google || {};

  if (meta.accessTokenEnc) {
    const days = daysUntil(meta.tokenExpiresAt);
    if (days !== null && days <= 0) {
      alerts.push({
        id: "meta_token_expired",
        severity: "error",
        platform: "meta",
        title: "Token Meta expirado",
        message: "Reconecte a Meta Ads para continuar sincronizando KPIs.",
      });
    } else if (days !== null && days <= 7) {
      alerts.push({
        id: "meta_token_expiring",
        severity: "warning",
        platform: "meta",
        title: "Token Meta expira em breve",
        message: `O acesso expira em ${days} dia(s). Reconecte para evitar interrupção.`,
      });
    }
  }

  if (meta.status === "error" && meta.lastError) {
    alerts.push({
      id: "meta_sync_error",
      severity: "error",
      platform: "meta",
      title: "Falha na sincronização Meta",
      message: meta.lastError,
    });
  }

  if (meta.autoSync !== false && meta.accessTokenEnc && !meta.adAccountId) {
    alerts.push({
      id: "meta_missing_account",
      severity: "warning",
      platform: "meta",
      title: "Meta conectada sem conta de anúncios",
      message: "Selecione a conta de anúncios em Integrações para o sync automático funcionar.",
    });
  }

  if (google.refreshTokenEnc) {
    const err = String(google.lastError || "").toLowerCase();
    if (
      err.includes("invalid_grant") ||
      err.includes("revoked") ||
      err.includes("expired")
    ) {
      alerts.push({
        id: "google_token_invalid",
        severity: "error",
        platform: "google",
        title: "Acesso Google Ads inválido",
        message: "Reconecte o Google Ads — o refresh token pode ter sido revogado.",
      });
    }
  }

  if (google.status === "error" && google.lastError) {
    alerts.push({
      id: "google_sync_error",
      severity: "error",
      platform: "google",
      title: "Falha na sincronização Google",
      message: google.lastError,
    });
  }

  if (google.autoSync !== false && google.refreshTokenEnc && !google.customerId) {
    alerts.push({
      id: "google_missing_account",
      severity: "warning",
      platform: "google",
      title: "Google conectado sem conta",
      message: "Selecione a conta Google Ads em Integrações para o sync automático funcionar.",
    });
  }

  return alerts.filter((a) => !isDismissed(dismissals, a.id));
}

export function markIntegrationError(integrationState, message) {
  return {
    ...integrationState,
    status: "error",
    lastError: String(message || "Erro de integração"),
  };
}

export function clearIntegrationError(integrationState) {
  return {
    ...integrationState,
    lastError: "",
  };
}

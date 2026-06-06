import { decryptSecret, encryptSecret } from "../integrationCrypto.js";
import { monthBounds } from "./monthBounds.js";
import {
  getGoogleEnv as getGoogleEnvFromPlatform,
  isGoogleConfiguredFromPlatform,
} from "../platformSettings.js";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v18";
const SCOPE = "https://www.googleapis.com/auth/adwords";

export function getGoogleEnv() {
  return getGoogleEnvFromPlatform();
}

export function isGoogleConfigured() {
  return isGoogleConfiguredFromPlatform();
}

export function buildGoogleAuthUrl(state) {
  const { clientId, redirectUri } = getGoogleEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

async function googleTokenRequest(body) {
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Erro OAuth Google");
  }
  return data;
}

export async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv();
  return googleTokenRequest({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
}

export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = getGoogleEnv();
  return googleTokenRequest({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
}

export async function ensureGoogleAccessToken(googleState) {
  const refresh = decryptSecret(googleState?.refreshTokenEnc);
  if (!refresh) throw new Error("Google Ads não conectado para este cliente.");

  const expiresAt = googleState?.tokenExpiresAt
    ? new Date(googleState.tokenExpiresAt).getTime()
    : 0;
  const accessEnc = googleState?.accessTokenEnc;
  if (accessEnc && expiresAt > Date.now() + 120_000) {
    return { accessToken: decryptSecret(accessEnc), patch: null };
  }

  const tokens = await refreshAccessToken(refresh);
  const patch = {
    accessTokenEnc: encryptSecret(tokens.access_token),
    tokenExpiresAt: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000),
  };
  if (tokens.refresh_token) {
    patch.refreshTokenEnc = encryptSecret(tokens.refresh_token);
  }
  return { accessToken: tokens.access_token, patch };
}

function googleAdsHeaders(accessToken, loginCustomerIdOverride) {
  const { developerToken, loginCustomerId } = getGoogleEnv();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  const loginId = String(loginCustomerIdOverride || loginCustomerId || "")
    .trim()
    .replace(/-/g, "");
  if (loginId) headers["login-customer-id"] = loginId;
  return headers;
}

async function googleAdsFetch(path, { accessToken, method = "GET", body, loginCustomerId } = {}) {
  const response = await fetch(`${GOOGLE_ADS_API}${path}`, {
    method,
    headers: googleAdsHeaders(accessToken, loginCustomerId),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      data?.error?.message ||
      data?.[0]?.error?.message ||
      `Google Ads API erro (${response.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function listAccessibleCustomers(accessToken) {
  const data = await googleAdsFetch("/customers:listAccessibleCustomers", { accessToken });
  const names = Array.isArray(data.resourceNames) ? data.resourceNames : [];
  return names
    .map((name) => String(name || "").replace(/^customers\//, ""))
    .filter(Boolean);
}

export async function fetchCustomerDisplayName(accessToken, customerId) {
  const id = String(customerId || "").replace(/-/g, "");
  try {
    const data = await googleAdsFetch(`/customers/${id}/googleAds:search`, {
      accessToken,
      method: "POST",
      body: {
        query: "SELECT customer.descriptive_name FROM customer LIMIT 1",
      },
    });
    const row = Array.isArray(data.results) && data.results.length ? data.results[0] : null;
    return row?.customer?.descriptiveName || row?.customer?.descriptive_name || "";
  } catch {
    return "";
  }
}

export async function fetchCustomerInsights(accessToken, customerId, competencia) {
  const id = String(customerId || "").replace(/-/g, "");
  const { since, until } = monthBounds(competencia);
  const query = `
    SELECT
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM customer
    WHERE segments.date BETWEEN '${since}' AND '${until}'
  `.trim();

  const data = await googleAdsFetch(`/customers/${id}/googleAds:search`, {
    accessToken,
    method: "POST",
    body: { query },
  });

  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;

  for (const row of data.results || []) {
    const metrics = row.metrics || {};
    spend += Number(metrics.costMicros || metrics.cost_micros || 0) / 1_000_000;
    impressions += Math.round(Number(metrics.impressions || 0) || 0);
    clicks += Math.round(Number(metrics.clicks || 0) || 0);
    conversions += Number(metrics.conversions || 0) || 0;
  }

  return {
    since,
    until,
    spend: Number(spend.toFixed(2)),
    impressions,
    clicks,
    conversions: Math.round(conversions),
  };
}

export function buildKpiFromGoogleInsights({
  insights,
  competencia,
  customerId,
  normalizeKpiMarketing,
  existingItem,
}) {
  const externalRef = `${customerId}/${competencia}`;
  const base = existingItem || {};
  return normalizeKpiMarketing(
    {
      competencia,
      canal: "Google Ads",
      investimento: insights.spend,
      leads: insights.conversions,
      oportunidades: base.oportunidades ?? 0,
      vendasNumero: base.vendasNumero ?? 0,
      faturamentoAquisicao: base.faturamentoAquisicao ?? 0,
      margemContribuicao: base.margemContribuicao ?? 30,
      source: "google_ads",
      externalRef,
      syncedAt: new Date().toISOString(),
    },
    base
  );
}

export function applyGoogleTokenPatch(googleState, patch) {
  if (!patch) return googleState;
  return { ...googleState, ...patch };
}

export function storeGoogleTokens(existing, tokens) {
  const expiresIn = Number(tokens.expires_in || 3600);
  return {
    ...(existing || {}),
    status: "connected",
    refreshTokenEnc: encryptSecret(tokens.refresh_token || ""),
    accessTokenEnc: encryptSecret(tokens.access_token || ""),
    tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    lastError: "",
  };
}

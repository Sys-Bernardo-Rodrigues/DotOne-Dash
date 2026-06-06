import { monthBounds } from "./monthBounds.js";
import {
  getMetaEnv as getMetaEnvFromPlatform,
  isMetaConfiguredFromPlatform,
} from "../platformSettings.js";

const META_GRAPH = "https://graph.facebook.com/v21.0";
const META_OAUTH = "https://www.facebook.com/v21.0/dialog/oauth";

export function getMetaEnv() {
  return getMetaEnvFromPlatform();
}

export function isMetaConfigured() {
  return isMetaConfiguredFromPlatform();
}

export function buildMetaAuthUrl(state) {
  const { appId, redirectUri } = getMetaEnv();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: "ads_read,read_insights",
    response_type: "code",
  });
  return `${META_OAUTH}?${params.toString()}`;
}

async function metaFetch(path, params = {}) {
  const url = new URL(`${META_GRAPH}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const msg = data?.error?.message || `Meta API erro (${response.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function exchangeCodeForToken(code) {
  const { appId, appSecret, redirectUri } = getMetaEnv();
  return metaFetch("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
}

export async function exchangeForLongLivedToken(shortToken) {
  const { appId, appSecret } = getMetaEnv();
  return metaFetch("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
}

export async function fetchAdAccounts(accessToken) {
  const data = await metaFetch("/me/adaccounts", {
    access_token: accessToken,
    fields: "id,name,account_id,currency,account_status",
    limit: 100,
  });
  return Array.isArray(data.data) ? data.data : [];
}

export function extractLeadsFromActions(actions) {
  if (!Array.isArray(actions)) return 0;
  return actions.reduce((sum, action) => {
    const type = String(action?.action_type || "").toLowerCase();
    if (!type.includes("lead")) return sum;
    return sum + Math.round(Number(action?.value || 0) || 0);
  }, 0);
}

function parsePixelStatsRows(payload) {
  const events = {};
  const blocks = Array.isArray(payload?.data) ? payload.data : [];

  for (const block of blocks) {
    const rows = Array.isArray(block?.data) ? block.data : [];
    for (const row of rows) {
      const name = String(row?.value || row?.event || "unknown").trim();
      const count = Math.round(Number(row?.count ?? row?.value_count ?? 0) || 0);
      if (!name) continue;
      events[name] = (events[name] || 0) + count;
    }
  }

  if (!Object.keys(events).length && Array.isArray(payload?.data)) {
    for (const row of payload.data) {
      if (row?.value && row?.count !== undefined) {
        const name = String(row.value).trim();
        events[name] = (events[name] || 0) + Math.round(Number(row.count) || 0);
      }
    }
  }

  const totalEvents = Object.values(events).reduce((s, n) => s + n, 0);
  const leadEvents = Object.entries(events).reduce((sum, [name, count]) => {
    if (name.toLowerCase().includes("lead")) return sum + count;
    return sum;
  }, 0);

  return { events, totalEvents, leadEvents };
}

export async function fetchPixelEventStats(accessToken, pixelId, competencia) {
  const id = String(pixelId || "").trim();
  if (!id) throw new Error("Informe o Meta Pixel ID nas configurações.");

  const { since, until, competencia: period } = monthBounds(competencia);
  const startTime = `${since}T00:00:00+0000`;
  const endTime = `${until}T23:59:59+0000`;

  const data = await metaFetch(`/${id}/stats`, {
    access_token: accessToken,
    aggregation: "event",
    start_time: startTime,
    end_time: endTime,
  });

  const parsed = parsePixelStatsRows(data);
  return {
    since,
    until,
    competencia: period,
    pixelId: id,
    ...parsed,
  };
}

export async function fetchAccountInsights(accessToken, adAccountId, competencia) {
  const accountId = String(adAccountId || "").startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;
  const { since, until } = monthBounds(competencia);
  const timeRange = JSON.stringify({ since, until });

  const data = await metaFetch(`/${accountId}/insights`, {
    access_token: accessToken,
    fields: "spend,impressions,clicks,actions,reach",
    time_range: timeRange,
    level: "account",
  });

  const row = Array.isArray(data.data) && data.data.length ? data.data[0] : {};
  const spend = Number(row.spend || 0);
  const impressions = Math.round(Number(row.impressions || 0) || 0);
  const clicks = Math.round(Number(row.clicks || 0) || 0);
  const reach = Math.round(Number(row.reach || 0) || 0);
  const leads = extractLeadsFromActions(row.actions);

  return {
    since,
    until,
    spend,
    impressions,
    clicks,
    reach,
    leads,
  };
}

export function buildKpiFromMetaInsights({
  insights,
  competencia,
  adAccountId,
  normalizeKpiMarketing,
  existingItem,
}) {
  const externalRef = `${adAccountId}/${competencia}`;
  const base = existingItem || {};
  return normalizeKpiMarketing(
    {
      competencia,
      canal: "Meta Ads",
      investimento: insights.spend,
      leads: insights.leads,
      oportunidades: base.oportunidades ?? 0,
      vendasNumero: base.vendasNumero ?? 0,
      faturamentoAquisicao: base.faturamentoAquisicao ?? 0,
      margemContribuicao: base.margemContribuicao ?? 30,
      source: "meta_ads",
      externalRef,
      syncedAt: new Date().toISOString(),
    },
    base
  );
}

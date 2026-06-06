import { decryptSecret } from "../integrationCrypto.js";
import { currentCompetencia } from "./monthBounds.js";
import {
  buildKpiFromMetaInsights,
  fetchAccountInsights,
  fetchPixelEventStats,
} from "./metaAds.js";
import {
  applyGoogleTokenPatch,
  buildKpiFromGoogleInsights,
  ensureGoogleAccessToken,
  fetchCustomerInsights,
} from "./googleAds.js";

function upsertSnapshot(doc, platform, period, metrics) {
  const snapshot = {
    platform,
    period,
    metrics,
    syncedAt: new Date().toISOString(),
  };
  doc.marketingSnapshots = Array.isArray(doc.marketingSnapshots)
    ? doc.marketingSnapshots
    : [];
  const idx = doc.marketingSnapshots.findIndex(
    (s) => s.platform === platform && s.period === period
  );
  if (idx >= 0) doc.marketingSnapshots[idx] = snapshot;
  else doc.marketingSnapshots.push(snapshot);
  return snapshot;
}

function upsertSyncedKpi(doc, { source, externalRef, buildKpi, nextKpiId, normalizeKpiMarketing }) {
  doc.dashboard = doc.dashboard || {};
  const items = doc.dashboard.kpisMarketing || [];
  const idx = items.findIndex(
    (i) => String(i?.source || "") === source && String(i?.externalRef || "") === externalRef
  );
  const kpi = buildKpi(idx >= 0 ? items[idx] : { id: nextKpiId(items) });
  const nextItems = [...items];
  if (idx >= 0) nextItems[idx] = kpi;
  else nextItems.push(kpi);
  doc.dashboard.kpisMarketing = nextItems;
  return kpi;
}

export async function applyMetaSync(doc, { competencia, nextKpiId, normalizeKpiMarketing }) {
  const meta = doc.integrations?.meta || {};
  const token = decryptSecret(meta.accessTokenEnc);
  const adAccountId = String(meta.adAccountId || "").trim();

  if (!token) throw new Error("Conecte a conta Meta antes de sincronizar.");
  if (!adAccountId) throw new Error("Selecione a conta de anúncios Meta.");

  const insights = await fetchAccountInsights(token, adAccountId, competencia);
  const period = competencia || insights.since.slice(0, 7);
  const externalRef = `${adAccountId}/${period}`;

  const kpi = upsertSyncedKpi(doc, {
    source: "meta_ads",
    externalRef,
    nextKpiId,
    normalizeKpiMarketing,
    buildKpi: (existingItem) =>
      buildKpiFromMetaInsights({
        insights,
        competencia: period,
        adAccountId,
        normalizeKpiMarketing,
        existingItem,
      }),
  });

  const snapshot = upsertSnapshot(doc, "meta", period, {
    spend: insights.spend,
    impressions: insights.impressions,
    clicks: insights.clicks,
    reach: insights.reach,
    leads: insights.leads,
  });

  doc.integrations.meta = {
    ...meta,
    status: "connected",
    lastSyncAt: new Date(),
    lastError: "",
  };

  let pixel = null;
  const pixelId = String(meta.pixelId || "").trim();
  if (pixelId) {
    pixel = await applyMetaPixelSync(doc, { competencia: period, token, pixelId });
  }

  return { competencia: period, kpi, snapshot, pixel };
}

export async function applyMetaPixelSync(doc, { competencia, token, pixelId }) {
  const meta = doc.integrations?.meta || {};
  const accessToken = token || decryptSecret(meta.accessTokenEnc);
  const pid = String(pixelId || meta.pixelId || "").trim();
  if (!accessToken) throw new Error("Conecte a Meta antes de sincronizar o pixel.");
  if (!pid) throw new Error("Informe o Meta Pixel ID.");

  const stats = await fetchPixelEventStats(accessToken, pid, competencia);
  const period = stats.competencia;

  const snapshot = upsertSnapshot(doc, "meta_pixel", period, {
    pixelId: stats.pixelId,
    events: stats.events,
    totalEvents: stats.totalEvents,
    leadEvents: stats.leadEvents,
  });

  doc.integrations.meta = {
    ...(doc.integrations?.meta || meta),
    pixelLastSyncAt: new Date(),
  };

  return { competencia: period, snapshot, stats };
}

export async function applyGoogleSync(doc, { competencia, nextKpiId, normalizeKpiMarketing }) {
  const google = doc.integrations?.google || {};
  const customerId = String(google.customerId || "").trim();

  if (!google.refreshTokenEnc) {
    throw new Error("Conecte o Google Ads antes de sincronizar.");
  }
  if (!customerId) {
    throw new Error("Selecione a conta Google Ads.");
  }

  const { accessToken, patch } = await ensureGoogleAccessToken(google);
  if (patch) {
    doc.integrations.google = applyGoogleTokenPatch(google, patch);
  }

  const insights = await fetchCustomerInsights(accessToken, customerId, competencia);
  const period = competencia || insights.since.slice(0, 7);
  const externalRef = `${customerId}/${period}`;

  const kpi = upsertSyncedKpi(doc, {
    source: "google_ads",
    externalRef,
    nextKpiId,
    normalizeKpiMarketing,
    buildKpi: (existingItem) =>
      buildKpiFromGoogleInsights({
        insights,
        competencia: period,
        customerId,
        normalizeKpiMarketing,
        existingItem,
      }),
  });

  const snapshot = upsertSnapshot(doc, "google", period, {
    spend: insights.spend,
    impressions: insights.impressions,
    clicks: insights.clicks,
    conversions: insights.conversions,
  });

  doc.integrations.google = {
    ...(doc.integrations.google || google),
    status: "connected",
    lastSyncAt: new Date(),
    lastError: "",
  };

  return { competencia: period, kpi, snapshot };
}

export async function syncAllClientsCurrentMonth(Client, deps) {
  const { nextKpiId, normalizeKpiMarketing } = deps;
  const competencia = currentCompetencia();
  const clients = await Client.find({ status: "Ativo" }).select("_id slug integrations").lean();
  const summary = { competencia, synced: [], errors: [] };

  for (const lean of clients) {
    const doc = await Client.findById(lean._id);
    if (!doc) continue;

    const meta = doc.integrations?.meta || {};
    const google = doc.integrations?.google || {};

    if (meta.autoSync !== false && meta.accessTokenEnc && meta.adAccountId) {
      try {
        await applyMetaSync(doc, { competencia, nextKpiId, normalizeKpiMarketing });
        await doc.save();
        summary.synced.push({ slug: doc.slug, platform: "meta" });
      } catch (err) {
        doc.integrations.meta = {
          ...meta,
          status: "error",
          lastError: String(err.message || "Erro cron Meta"),
        };
        await doc.save();
        summary.errors.push({ slug: doc.slug, platform: "meta", message: err.message });
      }
    } else if (
      meta.autoSync !== false &&
      meta.accessTokenEnc &&
      meta.pixelId &&
      !meta.adAccountId
    ) {
      try {
        await applyMetaPixelSync(doc, { competencia });
        await doc.save();
        summary.synced.push({ slug: doc.slug, platform: "meta_pixel" });
      } catch (err) {
        doc.integrations.meta = {
          ...meta,
          status: "error",
          lastError: String(err.message || "Erro cron Pixel"),
        };
        await doc.save();
        summary.errors.push({ slug: doc.slug, platform: "meta_pixel", message: err.message });
      }
    }

    if (google.autoSync !== false && google.refreshTokenEnc && google.customerId) {
      try {
        const fresh = await Client.findById(lean._id);
        await applyGoogleSync(fresh, { competencia, nextKpiId, normalizeKpiMarketing });
        await fresh.save();
        summary.synced.push({ slug: fresh.slug, platform: "google" });
      } catch (err) {
        const fresh = await Client.findById(lean._id);
        fresh.integrations.google = {
          ...(fresh.integrations?.google || google),
          status: "error",
          lastError: String(err.message || "Erro cron Google"),
        };
        await fresh.save();
        summary.errors.push({ slug: fresh.slug, platform: "google", message: err.message });
      }
    }
  }

  return summary;
}

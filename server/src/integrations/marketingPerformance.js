import { currentCompetencia } from "./monthBounds.js";

function safeDiv(num, den) {
  const d = Number(den || 0);
  if (d <= 0) return 0;
  return Number(num || 0) / d;
}

function pickKpi(kpis, source, period) {
  return (kpis || []).find(
    (k) => String(k?.source || "") === source && String(k?.competencia || "") === period
  );
}

function pickSnapshot(snapshots, platform, period) {
  return (snapshots || []).find(
    (s) => String(s?.platform || "") === platform && String(s?.period || "") === period
  );
}

function buildPlatformView(snapshot, kpi, { leadsKey = "leads" }) {
  const m = snapshot?.metrics || {};
  const investimento = Number(m.spend ?? kpi?.investimento ?? 0);
  const leads = Number(m[leadsKey] ?? m.leads ?? m.conversions ?? kpi?.leads ?? 0);
  const clicks = Number(m.clicks ?? 0);
  const impressions = Number(m.impressions ?? 0);
  const cpl = Number(kpi?.cpl ?? safeDiv(investimento, leads));

  return {
    investimento,
    leads,
    clicks,
    impressions,
    cpl,
    roiDireto: Number(kpi?.roiDireto ?? 0),
    syncedAt: snapshot?.syncedAt || kpi?.syncedAt || null,
    available: Boolean(snapshot || kpi),
  };
}

export function buildMarketingPerformance(client, competencia) {
  const period = String(competencia || "").trim() || currentCompetencia();
  const snapshots = client?.marketingSnapshots || [];
  const kpis = client?.dashboard?.kpisMarketing || [];

  const metaSnap = pickSnapshot(snapshots, "meta", period);
  const googleSnap = pickSnapshot(snapshots, "google", period);
  const pixelSnap = pickSnapshot(snapshots, "meta_pixel", period);
  const metaKpi = pickKpi(kpis, "meta_ads", period);
  const googleKpi = pickKpi(kpis, "google_ads", period);

  const meta = buildPlatformView(metaSnap, metaKpi, { leadsKey: "leads" });
  const google = buildPlatformView(googleSnap, googleKpi, { leadsKey: "conversions" });

  const pixel = pixelSnap
    ? {
        available: true,
        totalEvents: Number(pixelSnap.metrics?.totalEvents ?? 0),
        leadEvents: Number(pixelSnap.metrics?.leadEvents ?? 0),
        events: pixelSnap.metrics?.events || {},
        syncedAt: pixelSnap.syncedAt || null,
      }
    : { available: false, totalEvents: 0, leadEvents: 0, events: {}, syncedAt: null };

  const totals = {
    investimento: meta.investimento + google.investimento,
    leads: meta.leads + google.leads,
    clicks: meta.clicks + google.clicks,
    impressions: meta.impressions + google.impressions,
    cpl: safeDiv(meta.investimento + google.investimento, meta.leads + google.leads),
  };

  return {
    competencia: period,
    meta,
    google,
    pixel,
    totals,
  };
}

export function buildWeeklyReportText(client, performance) {
  const nome = String(client?.nome || client?.slug || "Cliente").trim();
  const p = performance;
  const lines = [
    `Relatório semanal — ${nome}`,
    `Competência: ${p.competencia}`,
    "",
    "══ Meta Ads ══",
    p.meta.available
      ? `Investimento: R$ ${p.meta.investimento.toFixed(2)} | Leads: ${p.meta.leads} | CPL: R$ ${p.meta.cpl.toFixed(2)} | Cliques: ${p.meta.clicks}`
      : "Sem dados sincronizados.",
    "",
    "══ Google Ads ══",
    p.google.available
      ? `Investimento: R$ ${p.google.investimento.toFixed(2)} | Conversões: ${p.google.leads} | CPL: R$ ${p.google.cpl.toFixed(2)} | Cliques: ${p.google.clicks}`
      : "Sem dados sincronizados.",
    "",
    "══ Totais mídia paga ══",
    `Investimento: R$ ${p.totals.investimento.toFixed(2)} | Leads/conv.: ${p.totals.leads} | CPL médio: R$ ${p.totals.cpl.toFixed(2)}`,
  ];

  if (p.pixel.available) {
    lines.push(
      "",
      "══ Meta Pixel ══",
      `Eventos: ${p.pixel.totalEvents} | Leads (pixel): ${p.pixel.leadEvents}`
    );
  }

  const origin = String(process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",")[0].trim();
  const slug = String(client?.slug || "").trim();
  lines.push("", `Dashboard: ${origin}/${encodeURIComponent(slug)}/dashboard-performance`);

  return lines.join("\n");
}

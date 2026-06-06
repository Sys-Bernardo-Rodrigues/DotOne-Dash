import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function numberFormat(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function competenciaFormat(val) {
  const m = String(val || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return val || "—";
  return `${m[2]}/${m[1]}`;
}

function parseISODate(iso) {
  const txt = String(iso || "").trim();
  if (!txt) return null;
  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseCompetenciaMonth(competencia) {
  const m = String(competencia || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function variationPct(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (p === 0) return c > 0 ? 100 : 0;
  return ((c - p) / p) * 100;
}

function safeDiv(num, den) {
  const d = Number(den || 0);
  if (d <= 0) return 0;
  return Number(num || 0) / d;
}

function inDateRange(date, start, end) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatSync(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function variationTone(value) {
  const n = Number(value || 0);
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "";
}

export default function DashboardPerformancePage() {
  const {
    investimentos,
    campanhasMarketing,
    kpisMarketing,
    lastUpdatedAt,
    refreshClientData,
    marketingPerformance,
    loadMarketingPerformance,
  } = useClientData();

  const investimentosSafe = useMemo(
    () => (Array.isArray(investimentos) ? investimentos.filter(Boolean) : []),
    [investimentos],
  );
  const campanhasSafe = useMemo(
    () => (Array.isArray(campanhasMarketing) ? campanhasMarketing.filter(Boolean) : []),
    [campanhasMarketing],
  );
  const kpisSafe = useMemo(
    () => (Array.isArray(kpisMarketing) ? kpisMarketing.filter(Boolean) : []),
    [kpisMarketing],
  );

  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [competenciaCompare, setCompetenciaCompare] = useState(currentMonth);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMarketingPerformance(competenciaCompare);
  }, [competenciaCompare, loadMarketingPerformance]);

  const perf = marketingPerformance;
  const start = useMemo(() => parseISODate(dataInicial), [dataInicial]);
  const end = useMemo(() => parseISODate(dataFinal), [dataFinal]);

  const previousWindow = useMemo(() => {
    if (!start || !end || end < start) return null;
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setHours(0, 0, 0, 0);
    return { start: prevStart, end: prevEnd };
  }, [start, end]);

  const campanhasFiltradas = useMemo(
    () =>
      campanhasSafe.filter((c) => {
        const d = parseISODate(c.data);
        if (!d) return !start && !end;
        return inDateRange(d, start, end);
      }),
    [campanhasSafe, start, end],
  );

  const investimentosFiltrados = useMemo(
    () =>
      investimentosSafe.filter((i) => {
        const d = parseISODate(i.data);
        if (!d) return !start && !end;
        return inDateRange(d, start, end);
      }),
    [investimentosSafe, start, end],
  );

  const campanhasAnterior = useMemo(
    () =>
      campanhasSafe.filter((c) => {
        const d = parseISODate(c.data);
        if (!d || !previousWindow) return false;
        return inDateRange(d, previousWindow.start, previousWindow.end);
      }),
    [campanhasSafe, previousWindow],
  );

  const investimentosAnterior = useMemo(
    () =>
      investimentosSafe.filter((i) => {
        const d = parseISODate(i.data);
        if (!d || !previousWindow) return false;
        return inDateRange(d, previousWindow.start, previousWindow.end);
      }),
    [investimentosSafe, previousWindow],
  );

  const kpisFiltrados = useMemo(
    () =>
      kpisSafe.filter((k) => {
        if (!start && !end) return true;
        const compDate = parseCompetenciaMonth(k.competencia);
        return inDateRange(compDate, start, end);
      }),
    [kpisSafe, start, end],
  );

  const resumo = useMemo(() => {
    const totalInvestimentos = investimentosFiltrados.reduce(
      (acc, i) => acc + Number(i.valor || 0),
      0,
    );
    const totalTrafego = campanhasFiltradas.reduce(
      (acc, c) => acc + Number(c.investimentoTrafego || 0),
      0,
    );
    const totalFaturamento = campanhasFiltradas.reduce(
      (acc, c) => acc + Number(c.faturamento || 0),
      0,
    );
    const roiCampanhas =
      totalTrafego > 0 ? ((totalFaturamento - totalTrafego) / totalTrafego) * 100 : 0;

    const ultimoKpi = [...kpisFiltrados].sort((a, b) =>
      String(b.competencia || "").localeCompare(String(a.competencia || "")),
    )[0];

    return {
      totalInvestimentos,
      totalTrafego,
      totalFaturamento,
      roiCampanhas,
      ultimoKpi,
    };
  }, [investimentosFiltrados, campanhasFiltradas, kpisFiltrados]);

  const variacoes = useMemo(() => {
    const invAtual = investimentosFiltrados.reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const invAnt = investimentosAnterior.reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const fatAtual = campanhasFiltradas.reduce((acc, c) => acc + Number(c.faturamento || 0), 0);
    const fatAnt = campanhasAnterior.reduce((acc, c) => acc + Number(c.faturamento || 0), 0);
    const trafAtual = campanhasFiltradas.reduce(
      (acc, c) => acc + Number(c.investimentoTrafego || 0),
      0,
    );
    const trafAnt = campanhasAnterior.reduce(
      (acc, c) => acc + Number(c.investimentoTrafego || 0),
      0,
    );
    const roiAtual = trafAtual > 0 ? ((fatAtual - trafAtual) / trafAtual) * 100 : 0;
    const roiAnt = trafAnt > 0 ? ((fatAnt - trafAnt) / trafAnt) * 100 : 0;
    return {
      investimento: variationPct(invAtual, invAnt),
      faturamento: variationPct(fatAtual, fatAnt),
      roi: roiAtual - roiAnt,
    };
  }, [investimentosFiltrados, investimentosAnterior, campanhasFiltradas, campanhasAnterior]);

  const kpiResumo = useMemo(() => {
    const base = kpisFiltrados.reduce(
      (acc, k) => {
        acc.investimento += Number(k.investimento || 0);
        acc.leads += Number(k.leads || 0);
        acc.oportunidades += Number(k.oportunidades || 0);
        acc.vendasNumero += Number(k.vendasNumero || 0);
        acc.faturamentoAquisicao += Number(k.faturamentoAquisicao || 0);
        acc.margemContribuicao += Number(k.margemContribuicao || 0);
        return acc;
      },
      {
        investimento: 0,
        leads: 0,
        oportunidades: 0,
        vendasNumero: 0,
        faturamentoAquisicao: 0,
        margemContribuicao: 0,
      },
    );
    const count = kpisFiltrados.length || 1;
    const cpl = safeDiv(base.investimento, base.leads);
    const cpo = safeDiv(base.investimento, base.oportunidades);
    const txConvOportunidades = safeDiv(base.oportunidades * 100, base.leads);
    const txConvVendas = safeDiv(base.vendasNumero * 100, base.oportunidades);
    const conversaoFunil = txConvOportunidades;
    const cpv = safeDiv(base.investimento, base.vendasNumero);
    const ticketMedio = safeDiv(base.faturamentoAquisicao, base.vendasNumero);
    const margemMedia = base.margemContribuicao / count;
    const roiDireto = safeDiv(base.faturamentoAquisicao * (margemMedia / 100), base.investimento);
    return {
      ...base,
      cpl,
      cpo,
      txConvOportunidades,
      txConvVendas,
      conversaoFunil,
      cpv,
      ticketMedio,
      margemMedia,
      roiDireto,
    };
  }, [kpisFiltrados]);

  const investimentoPorCanal = useMemo(() => {
    const map = new Map();
    investimentosFiltrados.forEach((i) => {
      const canal = String(i.canal || "Sem canal").trim() || "Sem canal";
      map.set(canal, (map.get(canal) || 0) + Number(i.valor || 0));
    });
    const total = [...map.values()].reduce((acc, v) => acc + v, 0);
    return [...map.entries()]
      .map(([canal, valor]) => ({
        canal,
        valor,
        percentual: total > 0 ? Math.round((valor / total) * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [investimentosFiltrados]);

  const campanhasTop = useMemo(
    () =>
      [...campanhasFiltradas]
        .sort((a, b) => Number(b.roi || 0) - Number(a.roi || 0))
        .slice(0, 5),
    [campanhasFiltradas],
  );

  const kpisRecentes = useMemo(
    () =>
      [...kpisFiltrados]
        .sort((a, b) => String(b.competencia || "").localeCompare(String(a.competencia || "")))
        .slice(0, 8),
    [kpisFiltrados],
  );

  const periodoLabel =
    dataInicial || dataFinal
      ? `${dataInicial || "início"} até ${dataFinal || "hoje"}`
      : "Período completo dos lançamentos";

  async function handleRefresh() {
    setRefreshing(true);
    await refreshClientData();
    await loadMarketingPerformance(competenciaCompare);
    setRefreshing(false);
  }

  return (
    <div className="dperf">
      <header className="dperf-hero">
        <div className="dperf-hero__copy">
          <span className="dperf-hero__eyebrow">Marketing · Cockpit</span>
          <h1>Dashboard de Performance</h1>
          <p>Investimentos, campanhas, KPIs e comparativo Meta vs Google</p>
        </div>

        <div className="dperf-hero__side">
          <div className="dperf-hero__stats">
            <div className="dperf-stat dperf-stat--invest">
              <span>Investimentos</span>
              <strong>{money(resumo.totalInvestimentos)}</strong>
            </div>
            <div className="dperf-stat dperf-stat--traffic">
              <span>Tráfego</span>
              <strong>{money(resumo.totalTrafego)}</strong>
            </div>
            <div className="dperf-stat dperf-stat--revenue">
              <span>Faturamento</span>
              <strong>{money(resumo.totalFaturamento)}</strong>
            </div>
            <div
              className={`dperf-stat dperf-stat--roi${resumo.roiCampanhas < 0 ? " dperf-stat--warn" : ""}`}
            >
              <span>ROI campanhas</span>
              <strong>{percent(resumo.roiCampanhas)}</strong>
            </div>
          </div>
          <button
            type="button"
            className="dperf-hero__cta"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
            {refreshing ? "A atualizar…" : "Atualizar dados"}
          </button>
        </div>
      </header>

      <section className="dperf-toolbar" aria-label="Filtro de período">
        <div className="dperf-toolbar__filters">
          <label className="dperf-toolbar__field">
            <span>Data inicial</span>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
            />
          </label>
          <label className="dperf-toolbar__field">
            <span>Data final</span>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="dperf-toolbar__btn"
            onClick={() => {
              setDataInicial("");
              setDataFinal("");
            }}
          >
            <CalendarRange size={14} strokeWidth={2} aria-hidden="true" />
            Limpar período
          </button>
        </div>
        <div className="dperf-toolbar__meta" aria-live="polite">
          <span className="dperf-toolbar__live">
            <span className="dperf-toolbar__dot" aria-hidden="true" />
            Live
          </span>
          <span>
            Atualizado:{" "}
            {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("pt-BR") : "—"}
          </span>
        </div>
      </section>

      <section className="dperf-panel" aria-labelledby="dperf-platform-title">
        <div className="dperf-panel__head">
          <div>
            <h2 id="dperf-platform-title">Meta vs Google</h2>
            <p>Dados sincronizados das integrações (snapshots + KPIs automáticos)</p>
          </div>
          <label className="dperf-month">
            <span>Competência</span>
            <input
              type="month"
              value={competenciaCompare}
              onChange={(e) => setCompetenciaCompare(e.target.value)}
            />
          </label>
        </div>

        <div className="dperf-platform-grid">
          <article
            className={`dperf-platform dperf-platform--meta${
              perf?.meta?.available ? "" : " dperf-platform--empty"
            }`}
          >
            <div className="dperf-platform__brand">
              <span className="dperf-platform__badge">Meta</span>
              <h3>Meta Ads</h3>
            </div>
            {perf?.meta?.available ? (
              <>
                <dl className="dperf-platform__metrics">
                  <div>
                    <dt>Investimento</dt>
                    <dd>{money(perf.meta.investimento)}</dd>
                  </div>
                  <div>
                    <dt>Leads</dt>
                    <dd>{numberFormat(perf.meta.leads)}</dd>
                  </div>
                  <div>
                    <dt>CPL</dt>
                    <dd>{money(perf.meta.cpl)}</dd>
                  </div>
                  <div>
                    <dt>Cliques</dt>
                    <dd>{numberFormat(perf.meta.clicks)}</dd>
                  </div>
                  <div>
                    <dt>Impressões</dt>
                    <dd>{numberFormat(perf.meta.impressions)}</dd>
                  </div>
                </dl>
                <small className="dperf-platform__sync">
                  Sync: {formatSync(perf.meta.syncedAt)}
                </small>
              </>
            ) : (
              <p className="dperf-platform__empty">
                Sem sync Meta para {competenciaFormat(competenciaCompare)}.
              </p>
            )}
          </article>

          <article
            className={`dperf-platform dperf-platform--google${
              perf?.google?.available ? "" : " dperf-platform--empty"
            }`}
          >
            <div className="dperf-platform__brand">
              <span className="dperf-platform__badge">Google</span>
              <h3>Google Ads</h3>
            </div>
            {perf?.google?.available ? (
              <>
                <dl className="dperf-platform__metrics">
                  <div>
                    <dt>Investimento</dt>
                    <dd>{money(perf.google.investimento)}</dd>
                  </div>
                  <div>
                    <dt>Conversões</dt>
                    <dd>{numberFormat(perf.google.leads)}</dd>
                  </div>
                  <div>
                    <dt>CPL</dt>
                    <dd>{money(perf.google.cpl)}</dd>
                  </div>
                  <div>
                    <dt>Cliques</dt>
                    <dd>{numberFormat(perf.google.clicks)}</dd>
                  </div>
                  <div>
                    <dt>Impressões</dt>
                    <dd>{numberFormat(perf.google.impressions)}</dd>
                  </div>
                </dl>
                <small className="dperf-platform__sync">
                  Sync: {formatSync(perf.google.syncedAt)}
                </small>
              </>
            ) : (
              <p className="dperf-platform__empty">
                Sem sync Google para {competenciaFormat(competenciaCompare)}.
              </p>
            )}
          </article>
        </div>

        {perf?.totals && (perf.meta?.available || perf.google?.available) ? (
          <div className="dperf-platform__totals">
            <strong>Total mídia paga</strong>
            <span>
              {money(perf.totals.investimento)} investidos · {numberFormat(perf.totals.leads)}{" "}
              leads/conv. · CPL médio {money(perf.totals.cpl)}
            </span>
          </div>
        ) : null}

        {perf?.pixel?.available ? (
          <p className="dperf-platform__pixel">
            Meta Pixel ({competenciaFormat(competenciaCompare)}):{" "}
            {numberFormat(perf.pixel.totalEvents)} eventos · {numberFormat(perf.pixel.leadEvents)}{" "}
            leads no pixel
          </p>
        ) : null}
      </section>

      <section aria-labelledby="dperf-finance-title">
        <h2 id="dperf-finance-title" className="dperf-section__title">
          Resumo financeiro
        </h2>
        <div className="dperf-metrics dperf-metrics--5">
          <div className="dperf-metric">
            <span>Investimentos (R$)</span>
            <strong>{money(resumo.totalInvestimentos)}</strong>
            <em>Total lançado na tela de investimentos</em>
          </div>
          <div className="dperf-metric">
            <span>Tráfego pago (R$)</span>
            <strong>{money(resumo.totalTrafego)}</strong>
            <em>Soma do investimento de tráfego das campanhas</em>
          </div>
          <div className="dperf-metric">
            <span>Faturamento (R$)</span>
            <strong>{money(resumo.totalFaturamento)}</strong>
            <em>Receita total atribuída às campanhas</em>
          </div>
          <div
            className={`dperf-metric${resumo.roiCampanhas < 0 ? " dperf-metric--warn" : ""}`}
          >
            <span>ROI campanhas</span>
            <strong>{percent(resumo.roiCampanhas)}</strong>
            <em>(Faturamento − Tráfego) / Tráfego</em>
          </div>
          <div className="dperf-metric">
            <span>Competência KPI</span>
            <strong>{competenciaFormat(resumo.ultimoKpi?.competencia) || "—"}</strong>
            <em>Último mês cadastrado em KPIs</em>
          </div>
        </div>
      </section>

      <section aria-labelledby="dperf-var-title">
        <h2 id="dperf-var-title" className="dperf-section__title">
          Variação vs período anterior
        </h2>
        <div className="dperf-metrics dperf-metrics--3">
          {[
            {
              label: "Var. investimento",
              value: percent(variacoes.investimento),
              desc: "Comparado ao intervalo anterior",
              raw: variacoes.investimento,
            },
            {
              label: "Var. faturamento",
              value: percent(variacoes.faturamento),
              desc: "Comparado ao intervalo anterior",
              raw: variacoes.faturamento,
            },
            {
              label: "Variação ROI",
              value: percent(variacoes.roi),
              desc: "Diferença em pontos percentuais",
              raw: variacoes.roi,
            },
          ].map((item) => {
            const tone = variationTone(item.raw);
            const Icon = tone === "down" ? TrendingDown : TrendingUp;
            return (
              <div
                key={item.label}
                className={`dperf-metric${tone ? ` dperf-metric--${tone}` : ""}${item.raw < 0 ? " dperf-metric--warn" : ""}`}
              >
                <span>{item.label}</span>
                <strong>
                  {tone ? (
                    <Icon
                      size={14}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      style={{ verticalAlign: "-2px", marginRight: 4 }}
                    />
                  ) : null}
                  {item.value}
                </strong>
                <em>{item.desc}</em>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dperf-panel" aria-labelledby="dperf-kpi-title">
        <div className="dperf-panel__head">
          <div>
            <h2 id="dperf-kpi-title">Revenue Marketing KPIs</h2>
            <p>{periodoLabel}</p>
          </div>
        </div>
        <div className="dperf-metrics dperf-metrics--5">
          <div className="dperf-metric">
            <span>Investimento (R$)</span>
            <strong>{money(kpiResumo.investimento)}</strong>
            <em>Base dos KPIs no período</em>
          </div>
          <div className="dperf-metric">
            <span>Leads</span>
            <strong>{numberFormat(kpiResumo.leads)}</strong>
            <em>CPL: {money(kpiResumo.cpl)}</em>
          </div>
          <div className="dperf-metric">
            <span>Oportunidades</span>
            <strong>{numberFormat(kpiResumo.oportunidades)}</strong>
            <em>CPO: {money(kpiResumo.cpo)}</em>
          </div>
          <div className="dperf-metric">
            <span>Vendas (nº)</span>
            <strong>{numberFormat(kpiResumo.vendasNumero)}</strong>
            <em>CPV: {money(kpiResumo.cpv)}</em>
          </div>
          <div className="dperf-metric">
            <span>Faturamento aquisição</span>
            <strong>{money(kpiResumo.faturamentoAquisicao)}</strong>
            <em>Ticket: {money(kpiResumo.ticketMedio)}</em>
          </div>
          <div className="dperf-metric">
            <span>Tx conv. oportunidades</span>
            <strong>{percent(kpiResumo.txConvOportunidades)}</strong>
            <em>Leads → Oportunidades</em>
          </div>
          <div className="dperf-metric">
            <span>Tx conv. vendas</span>
            <strong>{percent(kpiResumo.txConvVendas)}</strong>
            <em>Oportunidades → Vendas</em>
          </div>
          <div className="dperf-metric">
            <span>Conversão funil</span>
            <strong>{percent(kpiResumo.conversaoFunil)}</strong>
            <em>Indicador consolidado</em>
          </div>
          <div className="dperf-metric">
            <span>Margem contribuição</span>
            <strong>{percent(kpiResumo.margemMedia)}</strong>
            <em>Média dos lançamentos</em>
          </div>
          <div
            className={`dperf-metric${kpiResumo.roiDireto < 1 ? " dperf-metric--warn" : ""}`}
          >
            <span>ROI direto</span>
            <strong>{Number(kpiResumo.roiDireto || 0).toFixed(2)}x</strong>
            <em>Retorno com margem média</em>
          </div>
        </div>
      </section>

      <div className="dperf-grid-2">
        <article className="dperf-panel">
          <div className="dperf-panel__head">
            <div>
              <h2>Investimento por canal</h2>
              <p>Top canais por participação no investimento</p>
            </div>
          </div>
          {investimentoPorCanal.length ? (
            <div className="dperf-bars">
              {investimentoPorCanal.map((item) => (
                <div className="dperf-bar" key={item.canal}>
                  <div className="dperf-bar__head">
                    <span>{item.canal}</span>
                    <strong>{item.percentual}%</strong>
                  </div>
                  <small>{money(item.valor)}</small>
                  <div className="dperf-bar__track" aria-hidden="true">
                    <div style={{ width: `${item.percentual}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="dperf-empty-inline">Sem dados de canal para exibir.</p>
          )}
        </article>

        <article className="dperf-panel">
          <div className="dperf-panel__head">
            <div>
              <h2>Campanhas com melhor ROI</h2>
              <p>Classificação das campanhas mais eficientes</p>
            </div>
          </div>
          {campanhasTop.length ? (
            <div className="dperf-rank">
              {campanhasTop.map((c) => (
                <div className="dperf-rank__item" key={c.id}>
                  <div className="dperf-rank__top">
                    <span>{c.id}</span>
                    <strong className={Number(c.roi) < 0 ? "dperf-rank__roi--neg" : ""}>
                      {percent(c.roi)}
                    </strong>
                  </div>
                  <p>{c.nome}</p>
                  <small>
                    Tráfego: {money(c.investimentoTrafego)} · Fat.: {money(c.faturamento)}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="dperf-empty-inline">Nenhuma campanha cadastrada.</p>
          )}
        </article>
      </div>

      <section className="dperf-panel" aria-labelledby="dperf-kpi-list-title">
        <div className="dperf-panel__head">
          <div>
            <h2 id="dperf-kpi-list-title">KPIs marketing</h2>
            <p>Últimos lançamentos no período selecionado</p>
          </div>
          <span className="dperf-panel__count">{kpisFiltrados.length} registros</span>
        </div>

        {kpisRecentes.length ? (
          <div className="dperf-kpi-list">
            {kpisRecentes.map((kpi) => (
              <div className="dperf-kpi-row" key={kpi.id}>
                <span className="dperf-kpi-row__comp">
                  {competenciaFormat(kpi.competencia)}
                </span>
                <span className="dperf-kpi-row__canal">{kpi.canal || "—"}</span>
                <span className="dperf-kpi-row__val">{money(kpi.investimento)}</span>
                <span className="dperf-kpi-row__val">{numberFormat(kpi.leads)}</span>
                <span className="dperf-kpi-row__val">{money(kpi.cpl)}</span>
                <span className="dperf-kpi-row__val">{money(kpi.cpo)}</span>
                <span className="dperf-kpi-row__val">{percent(kpi.conversaoFunil)}</span>
                <span className="dperf-kpi-row__val dperf-kpi-row__val--roi">
                  {Number(kpi.roiDireto || 0).toFixed(2)}x
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="dperf-empty-inline">Nenhum KPI no período selecionado.</p>
        )}
      </section>
    </div>
  );
}

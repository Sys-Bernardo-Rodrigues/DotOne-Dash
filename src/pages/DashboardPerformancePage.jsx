import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
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

export default function DashboardPerformancePage() {
  const { investimentos, campanhasMarketing, kpisMarketing, lastUpdatedAt, refreshClientData } =
    useClientData();
  const investimentosSafe = useMemo(
    () => (Array.isArray(investimentos) ? investimentos.filter(Boolean) : []),
    [investimentos]
  );
  const campanhasSafe = useMemo(
    () => (Array.isArray(campanhasMarketing) ? campanhasMarketing.filter(Boolean) : []),
    [campanhasMarketing]
  );
  const kpisSafe = useMemo(
    () => (Array.isArray(kpisMarketing) ? kpisMarketing.filter(Boolean) : []),
    [kpisMarketing]
  );
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
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
    [campanhasSafe, start, end]
  );

  const investimentosFiltrados = useMemo(
    () =>
      investimentosSafe.filter((i) => {
        const d = parseISODate(i.data);
        if (!d) return !start && !end;
        return inDateRange(d, start, end);
      }),
    [investimentosSafe, start, end]
  );

  const campanhasAnterior = useMemo(
    () =>
      campanhasSafe.filter((c) => {
        const d = parseISODate(c.data);
        if (!d || !previousWindow) return false;
        return inDateRange(d, previousWindow.start, previousWindow.end);
      }),
    [campanhasSafe, previousWindow]
  );

  const investimentosAnterior = useMemo(
    () =>
      investimentosSafe.filter((i) => {
        const d = parseISODate(i.data);
        if (!d || !previousWindow) return false;
        return inDateRange(d, previousWindow.start, previousWindow.end);
      }),
    [investimentosSafe, previousWindow]
  );

  const kpisFiltrados = useMemo(
    () =>
      kpisSafe.filter((k) => {
        if (!start && !end) return true;
        const compDate = parseCompetenciaMonth(k.competencia);
        return inDateRange(compDate, start, end);
      }),
    [kpisSafe, start, end]
  );

  const resumo = useMemo(() => {
    const totalInvestimentos = investimentosFiltrados.reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const totalTrafego = campanhasFiltradas.reduce(
      (acc, c) => acc + Number(c.investimentoTrafego || 0),
      0
    );
    const totalFaturamento = campanhasFiltradas.reduce(
      (acc, c) => acc + Number(c.faturamento || 0),
      0
    );
    const roiCampanhas =
      totalTrafego > 0 ? (((totalFaturamento - totalTrafego) / totalTrafego) * 100).toFixed(2) : "0.00";

    const ultimoKpi = [...kpisFiltrados]
      .sort((a, b) => String(b.competencia || "").localeCompare(String(a.competencia || "")))[0];

    return {
      totalInvestimentos,
      totalTrafego,
      totalFaturamento,
      roiCampanhas: Number(roiCampanhas),
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
      0
    );
    const trafAnt = campanhasAnterior.reduce(
      (acc, c) => acc + Number(c.investimentoTrafego || 0),
      0
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
      }
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
    const roiDireto = safeDiv(
      base.faturamentoAquisicao * (margemMedia / 100),
      base.investimento
    );
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
    [campanhasFiltradas]
  );

  return (
    <>
      <PageHeader
        title="Dashboard de Performance"
        subtitle="Visão consolidada de investimentos, campanhas e KPIs de marketing"
        action={
          <div className="header-actions">
            <button type="button" className="btn-secondary" onClick={refreshClientData}>
              Atualizar
            </button>
          </div>
        }
      />

      <section className="card performance-filter-card">
        <div className="table-filters performance-filters-row">
          <input
            type="date"
            className="filter-input"
            value={dataInicial}
            onChange={(e) => setDataInicial(e.target.value)}
            aria-label="Data inicial"
          />
          <input
            type="date"
            className="filter-input"
            value={dataFinal}
            onChange={(e) => setDataFinal(e.target.value)}
            aria-label="Data final"
          />
          <button
            type="button"
            className="btn-secondary performance-filter-clear-btn"
            onClick={() => {
              setDataInicial("");
              setDataFinal("");
            }}
          >
            Limpar período
          </button>
          <div className="table-count performance-updated-at" aria-live="polite">
            Última atualização: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("pt-BR") : "—"}
          </div>
        </div>
      </section>

      <section className="metrics-grid metrics-grid-5">
        <article className="metric-card">
          <h3>Investimentos (R$)</h3>
          <strong>{money(resumo.totalInvestimentos)}</strong>
          <p>Total lançado na tela de investimentos</p>
        </article>
        <article className="metric-card">
          <h3>Tráfego Pago (R$)</h3>
          <strong>{money(resumo.totalTrafego)}</strong>
          <p>Soma do investimento de tráfego das campanhas</p>
        </article>
        <article className="metric-card">
          <h3>Faturamento (R$)</h3>
          <strong>{money(resumo.totalFaturamento)}</strong>
          <p>Receita total atribuída às campanhas</p>
        </article>
        <article className={`metric-card${resumo.roiCampanhas < 0 ? " warning" : ""}`}>
          <h3>ROI Campanhas</h3>
          <strong>{percent(resumo.roiCampanhas)}</strong>
          <p>({"{Faturamento - Tráfego} / Tráfego"})</p>
        </article>
        <article className="metric-card">
          <h3>Competência KPI</h3>
          <strong>{resumo.ultimoKpi?.competencia || "—"}</strong>
          <p>Último mês cadastrado em KPIs</p>
        </article>
      </section>

      <section className="metrics-grid metrics-grid-3">
        <article className={`metric-card${variacoes.investimento < 0 ? " warning" : ""}`}>
          <h3>Var. Investimento</h3>
          <strong>{percent(variacoes.investimento)}</strong>
          <p>vs período anterior</p>
        </article>
        <article className={`metric-card${variacoes.faturamento < 0 ? " warning" : ""}`}>
          <h3>Var. Faturamento</h3>
          <strong>{percent(variacoes.faturamento)}</strong>
          <p>vs período anterior</p>
        </article>
        <article className={`metric-card${variacoes.roi < 0 ? " warning" : ""}`}>
          <h3>Variação ROI</h3>
          <strong>{percent(variacoes.roi)}</strong>
          <p>diferença em pontos percentuais</p>
        </article>
      </section>

      <section className="card mt-12">
        <div className="section-title-row">
          <h2>Revenue Marketing KPIs</h2>
          <span>
            {dataInicial || dataFinal
              ? `Período: ${dataInicial || "início"} até ${dataFinal || "hoje"}`
              : "Período completo"}
          </span>
        </div>
        <section className="metrics-grid metrics-grid-5">
          <article className="metric-card">
            <h3>Investimento (R$)</h3>
            <strong>{money(kpiResumo.investimento)}</strong>
            <p>Base dos KPIs no período</p>
          </article>
          <article className="metric-card">
            <h3>Leads</h3>
            <strong>{numberFormat(kpiResumo.leads)}</strong>
            <p>CPL: {money(kpiResumo.cpl)}</p>
          </article>
          <article className="metric-card">
            <h3>Oportunidades</h3>
            <strong>{numberFormat(kpiResumo.oportunidades)}</strong>
            <p>CPO: {money(kpiResumo.cpo)}</p>
          </article>
          <article className="metric-card">
            <h3>Vendas (nº)</h3>
            <strong>{numberFormat(kpiResumo.vendasNumero)}</strong>
            <p>CPV: {money(kpiResumo.cpv)}</p>
          </article>
          <article className="metric-card">
            <h3>Faturamento Aquisição</h3>
            <strong>{money(kpiResumo.faturamentoAquisicao)}</strong>
            <p>Ticket Médio: {money(kpiResumo.ticketMedio)}</p>
          </article>
          <article className="metric-card">
            <h3>Tx conv. oportunidades</h3>
            <strong>{percent(kpiResumo.txConvOportunidades)}</strong>
            <p>Leads &gt; Oportunidades</p>
          </article>
          <article className="metric-card">
            <h3>Tx conv. vendas</h3>
            <strong>{percent(kpiResumo.txConvVendas)}</strong>
            <p>Oportunidades &gt; Vendas</p>
          </article>
          <article className="metric-card">
            <h3>Conversão Funil</h3>
            <strong>{percent(kpiResumo.conversaoFunil)}</strong>
            <p>Indicador consolidado do funil</p>
          </article>
          <article className="metric-card">
            <h3>Margem Contribuição</h3>
            <strong>{percent(kpiResumo.margemMedia)}</strong>
            <p>Média dos lançamentos de KPI</p>
          </article>
          <article className={`metric-card${kpiResumo.roiDireto < 1 ? " warning" : ""}`}>
            <h3>ROI Direto</h3>
            <strong>{Number(kpiResumo.roiDireto || 0).toFixed(2)}x</strong>
            <p>Retorno considerando margem média</p>
          </article>
        </section>
      </section>

      <section className="charts-grid">
        <article className="card chart-card">
          <h2>Investimento por Canal</h2>
          <p className="chart-card-sub">Top canais por participação no investimento</p>
          <ul className="area-progress-list">
            {investimentoPorCanal.length ? (
              investimentoPorCanal.map((item) => (
                <li key={item.canal}>
                  <div className="area-progress-head">
                    <span>{item.canal}</span>
                    <strong>{item.percentual}%</strong>
                  </div>
                  <small>{money(item.valor)}</small>
                  <div className="bar bar--chart">
                    <div style={{ width: `${item.percentual}%` }} />
                  </div>
                </li>
              ))
            ) : (
              <li>
                <small>Sem dados de canal para exibir.</small>
              </li>
            )}
          </ul>
        </article>

        <article className="card chart-card">
          <h2>Campanhas com Melhor ROI</h2>
          <p className="chart-card-sub">Classificação das campanhas mais eficientes</p>
          <ul className="critical-list">
            {campanhasTop.length ? (
              campanhasTop.map((c) => (
                <li key={c.id}>
                  <div className="critical-topline">
                    <span>{c.id}</span>
                    <b>{percent(c.roi)}</b>
                  </div>
                  <p>{c.nome}</p>
                  <small>
                    Tráfego: {money(c.investimentoTrafego)} • Fat.: {money(c.faturamento)}
                  </small>
                </li>
              ))
            ) : (
              <li>
                <small>Nenhuma campanha cadastrada.</small>
              </li>
            )}
          </ul>
        </article>
      </section>

      <section className="card mt-12">
        <div className="section-title-row">
          <h2>KPIs Marketing (Últimos lançamentos)</h2>
          <span>{kpisFiltrados.length} registros</span>
        </div>
        <div className="table-scroll">
          <table className="timeline-table">
            <thead>
              <tr>
                <th>Competência</th>
                <th>Canal</th>
                <th>Investimento</th>
                <th>Leads</th>
                <th>CPL</th>
                <th>CPO</th>
                <th>Conversão Funil</th>
                <th>ROI Direto</th>
              </tr>
            </thead>
            <tbody>
              {[...kpisFiltrados]
                .sort((a, b) => String(b.competencia || "").localeCompare(String(a.competencia || "")))
                .slice(0, 8)
                .map((kpi) => (
                  <tr key={kpi.id}>
                    <td>{kpi.competencia}</td>
                    <td>{kpi.canal || "—"}</td>
                    <td>{money(kpi.investimento)}</td>
                    <td>{Number(kpi.leads || 0).toLocaleString("pt-BR")}</td>
                    <td>{money(kpi.cpl)}</td>
                    <td>{money(kpi.cpo)}</td>
                    <td>{percent(kpi.conversaoFunil)}</td>
                    <td>{Number(kpi.roiDireto || 0).toFixed(2)}x</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

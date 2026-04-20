import TrendLineChart from "../components/charts/TrendLineChart";
import MetricsGrid from "../components/MetricsGrid";
import PageHeader from "../components/PageHeader";
import { useClientData } from "../context/ClientDataContext";

function textoOuPlaceholder(valor, placeholder) {
  const t = String(valor ?? "").trim();
  return t || placeholder;
}

export default function RelatoriosPage() {
  const {
    relatorioMetricas,
    fases,
    areas,
    activeClient,
    clientConfig,
    trendPorFase,
    swotPlano,
  } = useClientData();
  const nomeCliente = activeClient.nome?.trim() || "Cliente";
  const ph = "Cadastre em Configurações do cliente.";
  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Análises e exportações do plano estratégico"
      />

      <section className="card reports-export-card">
        <div className="section-title-row">
          <h2>Exportar Relatórios</h2>
          <span>Gere relatórios em diferentes formatos para compartilhamento</span>
        </div>
        <div className="exports-grid">
          <article className="export-item"><h3>Resumo Executivo</h3><p>PDF</p></article>
          <article className="export-item"><h3>Plano de Ação Completo</h3><p>Excel</p></article>
          <article className="export-item"><h3>Análise SWOT</h3><p>PDF</p></article>
          <article className="export-item"><h3>Indicadores KPI</h3><p>CSV</p></article>
        </div>
      </section>

      <div className="reports-metrics">
        <MetricsGrid items={relatorioMetricas} />
      </div>

      <section className="charts-grid reports-charts-grid">
        <article className="card chart-card reports-chart chart-card--phases">
          <h2>Progresso por Fase</h2>
          <p>Percentual médio de progresso das ações em cada fase</p>
          <div className="bars bars--pro">
            {(fases.length ? fases : [{ nome: "Sem fases cadastradas", progresso: 0 }]).map((fase) => (
              <div className="bar-row" key={fase.nome}>
                <span>{fase.nome}</span>
                <div className="bar bar--chart">
                  <div style={{ width: `${fase.progresso}%` }} />
                </div>
                <em>{fase.progresso}%</em>
              </div>
            ))}
          </div>
        </article>

        <article className="card chart-card reports-chart chart-card--trend">
          <h2>Análise de Tendência</h2>
          <p>Progresso médio por fase (atual) vs. trajetória de meta linear entre fases</p>
          {trendPorFase.labels.length >= 2 ? (
            <>
              <TrendLineChart
                labels={trendPorFase.labels}
                atual={trendPorFase.atual}
                meta={trendPorFase.meta}
              />
              <div className="line-legend line-legend--pro">
                <span>
                  <i className="dot-line current" /> Atual (média por fase)
                </span>
                <span>
                  <i className="dot-line target" /> Meta (rampa 0–100%)
                </span>
              </div>
            </>
          ) : (
            <p className="chart-empty-hint">
              Cadastre ações com fases distintas para visualizar a linha de tendência.
            </p>
          )}
        </article>

        <article className="card chart-card reports-chart chart-card--areas-report">
          <h2>Distribuição por Área</h2>
          <p>Número de ações e peso relativo por área funcional</p>
          <ul className="area-list area-list--bars">
            {(areas.length
              ? areas
              : [{ nome: "Sem áreas cadastradas", acoes: "0 ações no plano", percentual: 0 }]
            ).map((area) => (
              <li key={area.nome}>
                <div className="area-list-main">
                  <span>{area.nome}</span>
                  <strong>{area.acoes}</strong>
                  <em>{area.percentual}%</em>
                </div>
                <div className="area-list-track">
                  <div style={{ width: `${area.percentual}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card chart-card reports-chart chart-card--swot">
          <h2>Indicadores estilo SWOT</h2>
          <p>Proporções do plano numa escala 0–10 (derivadas dos estados das ações)</p>
          <div className="swot-grid swot-grid--pro">
            <div>
              <h4>Forças</h4>
              <strong>{swotPlano.forcas ?? "—"}</strong>
              <span className="swot-foot">Peso das concluídas</span>
            </div>
            <div>
              <h4>Fraquezas</h4>
              <strong>{swotPlano.fraquezas ?? "—"}</strong>
              <span className="swot-foot">Peso dos atrasos</span>
            </div>
            <div>
              <h4>Oportunidades</h4>
              <strong>{swotPlano.oportunidades ?? "—"}</strong>
              <span className="swot-foot">Peso em andamento</span>
            </div>
            <div>
              <h4>Ameaças</h4>
              <strong>{swotPlano.ameacas ?? "—"}</strong>
              <span className="swot-foot">Peso não iniciadas</span>
            </div>
          </div>
        </article>
      </section>

      <section className="card company-info reports-company-card">
        <h2>Informações do cliente</h2>
        <p>
          Dados exibidos nos relatórios refletem o plano de ação cadastrado para{" "}
          <strong>{nomeCliente}</strong>.
        </p>
        <div className="company-grid">
          <div>
            <h3>Missão</h3>
            <p>{textoOuPlaceholder(clientConfig.missao, ph)}</p>
          </div>
          <div>
            <h3>Visão</h3>
            <p>{textoOuPlaceholder(clientConfig.visao, ph)}</p>
          </div>
          <div>
            <h3>Valores</h3>
            <p>{textoOuPlaceholder(clientConfig.valores, ph)}</p>
          </div>
          <div>
            <h3>Plano de ação</h3>
            <p>
              Métricas, fases e áreas vêm das ações em &quot;Plano de Ação&quot; (5W2H), alinhadas
              ao contexto estratégico acima.
            </p>
          </div>
        </div>
        <div className="differentials">
          <h3>Boas práticas</h3>
          <ul>
            <li>Revise missão, visão e valores quando o posicionamento do cliente mudar</li>
            <li>Completar cadastro 5W2H nas ações para relatórios mais ricos</li>
            <li>Manter prazos em dd/mm/aaaa para o cronograma anual</li>
          </ul>
        </div>
      </section>
    </>
  );
}

import { useState } from "react";
import MetricsGrid from "../components/MetricsGrid";
import PageHeader from "../components/PageHeader";
import {
  acoesCriticas,
  areas,
  fases,
  insights,
  metricasVisaoGeral,
  statusAcoes,
} from "../data/dashboardData";

export default function VisaoGeralPage() {
  const [paginaCritica, setPaginaCritica] = useState(1);
  const itensPorPagina = 3;
  const totalPaginas = Math.ceil(acoesCriticas.length / itensPorPagina);
  const inicio = (paginaCritica - 1) * itensPorPagina;
  const acoesCriticasPaginadas = acoesCriticas.slice(
    inicio,
    inicio + itensPorPagina
  );

  const statusColorClass = {
    Atrasado: "atrasado",
    "Em andamento": "em-andamento",
    "Não iniciado": "nao-iniciado",
    Concluído: "concluido",
  };

  return (
    <>
      <PageHeader
        title="Visão Geral Executivo"
        subtitle="Dashboard de acompanhamento do plano estratégico"
        action={<button className="btn-primary">Exportar PDF</button>}
      />

      <section className="metrics-grid metrics-grid-5">
        {metricasVisaoGeral.map((item) => (
          <article
            key={item.titulo}
            className={`metric-card${item.warning ? " warning" : ""}`}
          >
            <h3>{item.titulo}</h3>
            <strong>{item.valor}</strong>
            {item.desc ? <p>{item.desc}</p> : null}
          </article>
        ))}

        <article className="metric-card progress-inline-card">
          <h3>Progresso Geral</h3>
          <strong>15%</strong>
          <div className="bar">
            <div style={{ width: "15%" }} />
          </div>
        </article>
      </section>

      <section className="charts-grid charts-grid-focus">
        <article className="card chart-card chart-card-wide">
          <h2>Progresso por Fase</h2>
          <div className="bars">
            {fases.map((fase) => (
              <div key={fase.nome} className="bar-row">
                <span>
                  {fase.nome}
                  {fase.atrasadas ? (
                    <small className="phase-delay">{fase.atrasadas} atrasadas</small>
                  ) : null}
                </span>
                <div className="bar">
                  <div style={{ width: `${fase.progresso}%` }} />
                </div>
                <em>{fase.progresso}%</em>
              </div>
            ))}
          </div>
        </article>

        <article className="card chart-card chart-card-side">
          <h2>Insights Automáticos</h2>
          <ul className="insight-list">
            {insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="charts-grid-secondary">
        <div className="left-stack">
          <article className="card chart-card">
            <h2>Ações por Área</h2>
            <ul className="area-progress-list">
              {areas.map((area) => (
                <li key={area.nome}>
                  <div className="area-progress-head">
                    <span>{area.nome}</span>
                    <strong>{area.percentual}%</strong>
                  </div>
                  <small>{area.acoes}</small>
                  <div className="bar">
                    <div style={{ width: `${area.percentual}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="card chart-card">
            <h2>Status das Ações</h2>
            <div className="status-pie-wrap">
              <div className="status-pie" aria-label="Gráfico pizza de status" />
              <ul className="status-legend">
                {statusAcoes.map((status) => (
                  <li key={status.nome}>
                    <span className={`dot ${statusColorClass[status.nome]}`} />
                    <em>{status.nome}</em>
                    <strong>{status.valor}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        <article className="card chart-card chart-card-critical">
          <h2>Ações Críticas</h2>
          <ul className="critical-list">
            {acoesCriticasPaginadas.map((acao) => (
              <li key={acao.codigo}>
                <div className="critical-topline">
                  <span>{acao.codigo}</span>
                  <b>{acao.status}</b>
                </div>
                <p>{acao.descricao}</p>
                <small>{acao.meta}</small>
                <em>{acao.progresso}</em>
              </li>
            ))}
          </ul>
          <div className="critical-pagination">
            <button
              type="button"
              className="pager-btn"
              onClick={() =>
                setPaginaCritica((prev) => Math.max(1, prev - 1))
              }
              disabled={paginaCritica === 1}
            >
              Anterior
            </button>
            <span>
              Página {paginaCritica} de {totalPaginas}
            </span>
            <button
              type="button"
              className="pager-btn"
              onClick={() =>
                setPaginaCritica((prev) => Math.min(totalPaginas, prev + 1))
              }
              disabled={paginaCritica === totalPaginas}
            >
              Próxima
            </button>
          </div>
        </article>
      </section>
    </>
  );
}

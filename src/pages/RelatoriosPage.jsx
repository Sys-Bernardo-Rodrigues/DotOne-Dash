import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Target,
} from "lucide-react";
import TrendLineChart from "../components/charts/TrendLineChart";
import { useClientData } from "../context/ClientDataContext";

const EXPORT_ITEMS = [
  { titulo: "Resumo Executivo", formato: "PDF", icon: FileText },
  { titulo: "Plano de Ação Completo", formato: "Excel", icon: FileSpreadsheet },
  { titulo: "Análise SWOT", formato: "PDF", icon: Target },
  { titulo: "Indicadores KPI", formato: "CSV", icon: BarChart3 },
];

function textoOuPlaceholder(valor, placeholder) {
  const t = String(valor ?? "").trim();
  return t || placeholder;
}

function statTone(titulo, warning) {
  if (warning) return "danger";
  if (titulo.includes("Progresso")) return "active";
  if (titulo.includes("Execução") || titulo.includes("Conclu")) return "done";
  return "";
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

  const fasesList = fases.length
    ? fases
    : [{ nome: "Sem fases cadastradas", progresso: 0, atrasadas: 0 }];

  const areasList = areas.length
    ? areas
    : [{ nome: "Sem áreas cadastradas", acoes: "0 ações no plano", percentual: 0 }];

  return (
    <div className="report">
      <header className="report-hero">
        <div className="report-hero__copy">
          <span className="report-hero__eyebrow">Estratégia · Análise</span>
          <h1>Relatórios</h1>
          <p>Indicadores, tendências e exportações do plano estratégico</p>
        </div>

        <div className="report-hero__stats">
          {relatorioMetricas.map((item) => {
            const tone = statTone(item.titulo, item.warning);
            return (
              <div
                key={item.titulo}
                className={`report-stat${tone ? ` report-stat--${tone}` : ""}`}
              >
                <span>{item.titulo}</span>
                <strong>{item.valor}</strong>
                {item.desc ? <em>{item.desc}</em> : null}
              </div>
            );
          })}
        </div>
      </header>

      <section className="report-exports" aria-label="Exportar relatórios">
        <header className="report-exports__head">
          <h2>Exportar relatórios</h2>
          <p>Formatos disponíveis para compartilhamento com stakeholders</p>
        </header>
        <div className="report-exports__grid">
          {EXPORT_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.titulo} className="report-export">
                <span className="report-export__icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <h3>{item.titulo}</h3>
                <span>{item.formato}</span>
              </article>
            );
          })}
        </div>
      </section>

      <div className="report-grid">
        <article className="report-panel">
          <h2>Progresso por fase</h2>
          <p>Percentual médio de progresso das ações em cada fase</p>
          <div className="report-bars">
            {fasesList.map((fase) => (
              <div className="report-bar" key={fase.nome}>
                <span title={fase.nome}>{fase.nome}</span>
                <div className="report-bar__track" aria-hidden="true">
                  <div style={{ width: `${fase.progresso}%` }} />
                </div>
                <em>{fase.progresso}%</em>
              </div>
            ))}
          </div>
        </article>

        <article className="report-panel">
          <h2>Análise de tendência</h2>
          <p>Progresso médio por fase vs. meta linear entre fases</p>
          {trendPorFase.labels.length >= 2 ? (
            <>
              <TrendLineChart
                labels={trendPorFase.labels}
                atual={trendPorFase.atual}
                meta={trendPorFase.meta}
              />
              <div className="report-legend">
                <span>
                  <i className="report-legend__atual" aria-hidden="true" />
                  Atual (média por fase)
                </span>
                <span>
                  <i className="report-legend__meta" aria-hidden="true" />
                  Meta (rampa 0–100%)
                </span>
              </div>
            </>
          ) : (
            <p className="report-panel__empty">
              Cadastre ações com fases distintas para visualizar a linha de tendência.
            </p>
          )}
        </article>

        <article className="report-panel">
          <h2>Distribuição por área</h2>
          <p>Número de ações e peso relativo por área funcional</p>
          <ul className="report-areas">
            {areasList.map((area) => (
              <li key={area.nome}>
                <div className="report-areas__head">
                  <span>{area.nome}</span>
                  <div>
                    <strong>{area.acoes}</strong>
                    {" · "}
                    <em>{area.percentual}%</em>
                  </div>
                </div>
                <div className="report-areas__track" aria-hidden="true">
                  <div style={{ width: `${area.percentual}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="report-panel">
          <h2>Indicadores SWOT</h2>
          <p>Proporções do plano numa escala 0–10 (derivadas dos estados das ações)</p>
          <div className="report-swot">
            <div className="report-swot__cell report-swot__cell--s">
              <h4>Forças</h4>
              <strong>{swotPlano.forcas ?? "—"}</strong>
              <span>Peso das concluídas</span>
            </div>
            <div className="report-swot__cell report-swot__cell--w">
              <h4>Fraquezas</h4>
              <strong>{swotPlano.fraquezas ?? "—"}</strong>
              <span>Peso dos atrasos</span>
            </div>
            <div className="report-swot__cell report-swot__cell--o">
              <h4>Oportunidades</h4>
              <strong>{swotPlano.oportunidades ?? "—"}</strong>
              <span>Peso em andamento</span>
            </div>
            <div className="report-swot__cell report-swot__cell--t">
              <h4>Ameaças</h4>
              <strong>{swotPlano.ameacas ?? "—"}</strong>
              <span>Peso não iniciadas</span>
            </div>
          </div>
        </article>
      </div>

      <section className="report-about">
        <h2>Informações do cliente</h2>
        <p>
          Dados exibidos nos relatórios refletem o plano de ação cadastrado para{" "}
          <strong>{nomeCliente}</strong>.
        </p>

        <div className="report-about__grid">
          <div className="report-about__block">
            <h3>Missão</h3>
            <p>{textoOuPlaceholder(clientConfig.missao, ph)}</p>
          </div>
          <div className="report-about__block">
            <h3>Visão</h3>
            <p>{textoOuPlaceholder(clientConfig.visao, ph)}</p>
          </div>
          <div className="report-about__block">
            <h3>Valores</h3>
            <p>{textoOuPlaceholder(clientConfig.valores, ph)}</p>
          </div>
          <div className="report-about__block">
            <h3>Plano de ação</h3>
            <p>
              Métricas, fases e áreas vêm das ações em Plano de Ação (5W2H), alinhadas ao
              contexto estratégico acima.
            </p>
          </div>
        </div>

        <div className="report-about__tips">
          <h3>Boas práticas</h3>
          <ul>
            <li>Revise missão, visão e valores quando o posicionamento do cliente mudar</li>
            <li>Complete o cadastro 5W2H nas ações para relatórios mais ricos</li>
            <li>Mantenha prazos em dd/mm/aaaa para o cronograma anual</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

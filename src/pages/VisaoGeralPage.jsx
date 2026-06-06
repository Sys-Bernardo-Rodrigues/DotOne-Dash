import { Link, useParams } from "react-router-dom";
import { useClientData } from "../context/ClientDataContext";

const STATUS_UI = {
  Atrasado: { tone: "danger", label: "Atrasado" },
  ATRASADO: { tone: "danger", label: "Atrasado" },
  "Em andamento": { tone: "active", label: "Em andamento" },
  "EM ANDAMENTO": { tone: "active", label: "Em andamento" },
  "Não iniciado": { tone: "idle", label: "Não iniciado" },
  "NÃO INICIADO": { tone: "idle", label: "Não iniciado" },
  Concluído: { tone: "done", label: "Concluído" },
  CONCLUÍDO: { tone: "done", label: "Concluído" },
};

const DONUT_COLORS = {
  Atrasado: "#ef4444",
  "Em andamento": "#7c3aed",
  "Não iniciado": "#f59e0b",
  Concluído: "#10b981",
};

function ProgressRing({ value, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <svg className="cockpit-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        className="cockpit-ring__track"
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        className="cockpit-ring__fill"
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" className="cockpit-ring__text" dominantBaseline="central" textAnchor="middle">
        {value}%
      </text>
    </svg>
  );
}

function statusTone(status) {
  return STATUS_UI[status]?.tone || "idle";
}

function formatUpdatedAt(iso) {
  if (!iso) return "Sincronizado agora";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "Atualizado recentemente";
  }
}

export default function VisaoGeralPage() {
  const { clientSlug } = useParams();
  const {
    acoesCriticas,
    activeClient,
    areas,
    contadores,
    fases,
    insights,
    lastUpdatedAt,
    progressoGeral,
    statusAcoes,
  } = useClientData();

  const base = `/${clientSlug}`;
  const nomeCliente = activeClient?.nome?.trim() || "Workspace";
  const totalAcoes = contadores?.total ?? 0;
  const atrasadas = contadores?.atrasadas ?? 0;
  const healthScore = totalAcoes
    ? Math.max(0, Math.round(100 - (atrasadas / totalAcoes) * 100))
    : 100;

  const statusTotal = statusAcoes.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
  let donutOffset = 0;
  const donutSegments = statusAcoes
    .filter((s) => Number(s.valor) > 0)
    .map((s) => {
      const pct = statusTotal ? (Number(s.valor) / statusTotal) * 100 : 0;
      const seg = { ...s, pct, offset: donutOffset, color: DONUT_COLORS[s.nome] || "#94a3b8" };
      donutOffset += pct;
      return seg;
    });

  const topAreas = (areas.length ? areas : []).slice(0, 5);
  const fasesList = fases.length
    ? fases
    : [{ nome: "Sem fases cadastradas", progresso: 0, atrasadas: 0 }];

  return (
    <div className="cockpit">
      <section className="cockpit-hero" aria-label="Resumo executivo">
        <div className="cockpit-hero__mesh" aria-hidden="true" />
        <div className="cockpit-hero__main">
          <div className="cockpit-hero__copy">
            <span className="cockpit-hero__live">
              <i aria-hidden="true" /> Live
            </span>
            <h1>{nomeCliente}</h1>
            <p>Painel executivo · estratégia, execução e saúde operacional</p>
            <time className="cockpit-hero__time">{formatUpdatedAt(lastUpdatedAt)}</time>
          </div>

          <div className="cockpit-hero__scores">
            <div className="cockpit-score cockpit-score--progress">
              <ProgressRing value={progressoGeral} size={112} stroke={9} />
              <span>Progresso geral</span>
            </div>
            <div className="cockpit-score cockpit-score--health">
              <strong>{healthScore}</strong>
              <span>Índice de saúde</span>
              <small>{atrasadas} atraso{atrasadas === 1 ? "" : "s"} de {totalAcoes || "—"}</small>
            </div>
          </div>

          <nav className="cockpit-hero__nav" aria-label="Atalhos">
            <Link to={`${base}/plano-de-acao`} className="cockpit-hero__link">
              Plano de ação
            </Link>
            <Link to={`${base}/cronograma`} className="cockpit-hero__link">
              Cronograma
            </Link>
            <Link to={`${base}/dashboard-performance`} className="cockpit-hero__link cockpit-hero__link--accent">
              Performance
            </Link>
          </nav>
        </div>
      </section>

      <section className="cockpit-signals" aria-label="Indicadores rápidos">
        {[
          { label: "Total", value: contadores?.total ?? 0, tone: "violet" },
          { label: "Concluídas", value: contadores?.concluidas ?? 0, tone: "emerald" },
          { label: "Em curso", value: contadores?.andamento ?? 0, tone: "cyan" },
          { label: "Atrasadas", value: contadores?.atrasadas ?? 0, tone: "rose", alert: (contadores?.atrasadas ?? 0) > 0 },
        ].map((item) => (
          <article key={item.label} className={`cockpit-signal cockpit-signal--${item.tone}${item.alert ? " cockpit-signal--alert" : ""}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <div className="cockpit-grid">
        <section className="cockpit-panel cockpit-panel--pipeline" aria-labelledby="cockpit-phases-title">
          <header className="cockpit-panel__head">
            <div>
              <h2 id="cockpit-phases-title">Pipeline por fase</h2>
              <p>Progresso médio e gargalos por etapa do plano</p>
            </div>
            <Link to={`${base}/plano-de-acao`} className="cockpit-panel__action">
              Ver plano →
            </Link>
          </header>
          <ol className="cockpit-pipeline">
            {fasesList.map((fase, i) => (
              <li key={fase.nome} style={{ "--i": i }}>
                <div className="cockpit-pipeline__node">
                  <span className="cockpit-pipeline__step">{String(i + 1).padStart(2, "0")}</span>
                  <div className="cockpit-pipeline__body">
                    <strong>{fase.nome}</strong>
                    <div className="cockpit-pipeline__bar">
                      <div style={{ width: `${fase.progresso}%` }} />
                    </div>
                    <div className="cockpit-pipeline__meta">
                      <em>{fase.progresso}%</em>
                      {fase.atrasadas > 0 ? (
                        <span className="cockpit-pipeline__warn">{fase.atrasadas} atrasada{fase.atrasadas > 1 ? "s" : ""}</span>
                      ) : (
                        <span className="cockpit-pipeline__ok">No prazo</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="cockpit-panel cockpit-panel--status" aria-labelledby="cockpit-status-title">
          <header className="cockpit-panel__head">
            <h2 id="cockpit-status-title">Distribuição</h2>
            <p>Status de todas as ações</p>
          </header>
          <div className="cockpit-donut-wrap">
            <div
              className="cockpit-donut"
              style={{
                background:
                  statusTotal > 0
                    ? `conic-gradient(from -90deg, ${donutSegments
                        .map((s) => `${s.color} ${s.offset}% ${s.offset + s.pct}%`)
                        .join(", ")})`
                    : "conic-gradient(#e2e8f0 0 100%)",
              }}
              role="img"
              aria-label={`${statusTotal} ações por status`}
            >
              <div className="cockpit-donut__hole">
                <strong>{statusTotal}</strong>
                <span>ações</span>
              </div>
            </div>
            <ul className="cockpit-donut-legend">
              {statusAcoes.map((s) => (
                <li key={s.nome}>
                  <i style={{ background: DONUT_COLORS[s.nome] }} />
                  <span>{s.nome}</span>
                  <strong>{s.valor}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="cockpit-panel cockpit-panel--areas" aria-labelledby="cockpit-areas-title">
          <header className="cockpit-panel__head">
            <h2 id="cockpit-areas-title">Por área</h2>
            <p>Concentração de ações</p>
          </header>
          <ul className="cockpit-areas">
            {(topAreas.length
              ? topAreas
              : [{ nome: "Sem áreas", percentual: 0, acoes: "0 ações" }]
            ).map((area) => (
              <li key={area.nome}>
                <div className="cockpit-areas__row">
                  <span>{area.nome}</span>
                  <strong>{area.percentual}%</strong>
                </div>
                <div className="cockpit-areas__track">
                  <div style={{ width: `${area.percentual}%` }} />
                </div>
                <small>{area.acoes}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="cockpit-panel cockpit-panel--insights" aria-labelledby="cockpit-insights-title">
          <header className="cockpit-panel__head">
            <h2 id="cockpit-insights-title">Sinais</h2>
            <p>Leituras automáticas do plano</p>
          </header>
          <ul className="cockpit-insights">
            {insights.map((texto, i) => (
              <li key={texto}>
                <span className="cockpit-insights__n">{i + 1}</span>
                <p>{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="cockpit-panel cockpit-panel--critical" aria-labelledby="cockpit-critical-title">
          <header className="cockpit-panel__head">
            <div>
              <h2 id="cockpit-critical-title">Ações críticas</h2>
              <p>Itens atrasados que exigem atenção imediata</p>
            </div>
            <Link to={`${base}/cronograma`} className="cockpit-panel__action">
              Abrir cronograma →
            </Link>
          </header>

          {acoesCriticas.length === 0 ? (
            <div className="cockpit-empty">
              <strong>Nenhuma ação crítica</strong>
              <p>O plano está sem atrasos registrados neste momento.</p>
            </div>
          ) : (
            <ul className="cockpit-critical">
              {acoesCriticas.map((acao) => (
                <li key={acao.codigo} className={`cockpit-critical__item cockpit-critical__item--${statusTone(acao.status)}`}>
                  <div className="cockpit-critical__code">{acao.codigo}</div>
                  <div className="cockpit-critical__body">
                    <div className="cockpit-critical__top">
                      <strong>{acao.descricao}</strong>
                      <span className={`cockpit-chip cockpit-chip--${statusTone(acao.status)}`}>
                        {STATUS_UI[acao.status]?.label || acao.status}
                      </span>
                    </div>
                    <div className="cockpit-critical__meta">
                      <span>{acao.meta}</span>
                      <em>{acao.progresso} concluído</em>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

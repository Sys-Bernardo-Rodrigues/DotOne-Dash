import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const STATUS_CRONOGRAMA = ["Não Iniciado", "Em Andamento", "Atrasado", "Concluído"];

const STATUS_META = {
  Atrasado: { tone: "danger", label: "Atrasado" },
  "Em Andamento": { tone: "active", label: "Em andamento" },
  Concluído: { tone: "done", label: "Concluído" },
  "Não Iniciado": { tone: "idle", label: "Não iniciado" },
};

const MESES = [
  { key: 1, label: "Jan" },
  { key: 2, label: "Fev" },
  { key: 3, label: "Mar" },
  { key: 4, label: "Abr" },
  { key: 5, label: "Mai" },
  { key: 6, label: "Jun" },
  { key: 7, label: "Jul" },
  { key: 8, label: "Ago" },
  { key: 9, label: "Set" },
  { key: 10, label: "Out" },
  { key: 11, label: "Nov" },
  { key: 12, label: "Dez" },
];

function mesFromPrazo(prazo) {
  if (!prazo || typeof prazo !== "string") return null;
  const parts = prazo.trim().split("/");
  if (parts.length < 2) return null;
  const m = Number(parts[1]);
  return Number.isFinite(m) ? m : null;
}

function anoFromPrazo(prazo) {
  if (!prazo || typeof prazo !== "string") return null;
  const parts = prazo.trim().split("/");
  if (parts.length < 3) return null;
  const y = Number(parts[2]);
  return Number.isFinite(y) ? y : null;
}

function diaMes(prazo) {
  if (!prazo || typeof prazo !== "string") return "--/--";
  const parts = prazo.trim().split("/");
  if (parts.length < 2) return "--/--";
  return `${parts[0]}/${parts[1]}`;
}

function markerTone(status) {
  return STATUS_META[status]?.tone || "idle";
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { tone: "idle", label: status };
  return <span className={`cron-badge cron-badge--${meta.tone}`}>{meta.label}</span>;
}

export default function CronogramaPage() {
  const { planoAcaoItems } = useClientData();
  const anoAjustadoPeloUsuario = useRef(false);
  const [anoSelecionado, setAnoSelecionado] = useState(() => new Date().getFullYear());
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [areaFiltro, setAreaFiltro] = useState("Todas");

  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || anoAjustadoPeloUsuario.current) return;
        if (Number.isFinite(data.year)) {
          setAnoSelecionado(data.year);
        }
      } catch {
        /* mantém o ano do navegador */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function mudarAno(delta) {
    anoAjustadoPeloUsuario.current = true;
    setAnoSelecionado((prev) => prev + delta);
  }

  const statusOptions = [
    "Todos",
    ...new Set([...STATUS_CRONOGRAMA, ...planoAcaoItems.map((item) => item.status)]),
  ];
  const areaOptions = ["Todas", ...new Set(planoAcaoItems.map((item) => item.area).filter(Boolean))];

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return planoAcaoItems.filter((item) => {
      const haystack = [
        item.id,
        item.acao,
        item.responsavel,
        item.area,
        item.fase,
        item.porQue,
        item.como,
        item.quanto,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchBusca = !termo || haystack.includes(termo);
      const matchStatus = statusFiltro === "Todos" || item.status === statusFiltro;
      const matchArea = areaFiltro === "Todas" || item.area === areaFiltro;
      const itemAno = anoFromPrazo(item.prazo);
      const matchAno = itemAno === null || itemAno === anoSelecionado;
      return matchBusca && matchStatus && matchArea && matchAno;
    });
  }, [planoAcaoItems, busca, statusFiltro, areaFiltro, anoSelecionado]);

  const resumo = useMemo(() => {
    const total = itensFiltrados.length;
    const atrasadas = itensFiltrados.filter((i) => i.status === "Atrasado").length;
    const concluidas = itensFiltrados.filter((i) => i.status === "Concluído").length;
    const comPrazo = itensFiltrados.filter((i) => anoFromPrazo(i.prazo) === anoSelecionado).length;
    return { total, atrasadas, concluidas, comPrazo };
  }, [itensFiltrados, anoSelecionado]);

  const anoCurto = String(anoSelecionado).slice(-2);
  const isAnoCorrente = anoSelecionado === anoAtual;

  return (
    <div className="cron">
      <header className="cron-hero">
        <div className="cron-hero__copy">
          <span className="cron-hero__eyebrow">Estratégia · Timeline</span>
          <h1>Cronograma</h1>
          <p>Visualização temporal das ações do plano por mês</p>
          <span className="cron-hero__range">
            jan {anoCurto} – dez {anoCurto}
          </span>
        </div>

        <div className="cron-hero__side">
          <div className="cron-hero__stats">
            <div className="cron-stat">
              <span>No ano</span>
              <strong>{resumo.total}</strong>
            </div>
            <div className="cron-stat">
              <span>Com prazo</span>
              <strong>{resumo.comPrazo}</strong>
            </div>
            <div className="cron-stat cron-stat--danger">
              <span>Atrasadas</span>
              <strong>{resumo.atrasadas}</strong>
            </div>
            <div className="cron-stat cron-stat--done">
              <span>Concluídas</span>
              <strong>{resumo.concluidas}</strong>
            </div>
          </div>

          <div className="cron-year-nav" aria-label="Navegar entre anos">
            <button type="button" onClick={() => mudarAno(-1)} aria-label="Ano anterior">
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <strong>{anoSelecionado}</strong>
            <button type="button" onClick={() => mudarAno(1)} aria-label="Próximo ano">
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <section className="cron-toolbar" aria-label="Filtros">
        <label className="cron-toolbar__search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por ID, ação ou responsável…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "Todos" ? "Todos os status" : status}
            </option>
          ))}
        </select>

        <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)}>
          {areaOptions.map((area) => (
            <option key={area} value={area}>
              {area === "Todas" ? "Todas as áreas" : area}
            </option>
          ))}
        </select>
      </section>

      <section className="cron-board" aria-label={`Cronograma ${anoSelecionado}`}>
        {itensFiltrados.length === 0 ? (
          <div className="cron-board__empty">
            <strong>Sem ações para {anoSelecionado}</strong>
            <p>Ajuste os filtros ou selecione outro ano para ver o cronograma.</p>
          </div>
        ) : (
          <>
            <div className="cron-board__scroll">
              <table className="cron-gantt">
                <thead>
                  <tr>
                    <th scope="col">Ação</th>
                    {MESES.map((mes) => (
                      <th
                        key={mes.key}
                        scope="col"
                        className={
                          isAnoCorrente && mes.key === mesAtual
                            ? "cron-gantt__month--current"
                            : undefined
                        }
                      >
                        {mes.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.map((item) => {
                    const mesAlvo = mesFromPrazo(item.prazo);
                    const semPrazoValido = mesAlvo === null;
                    const tone = markerTone(item.status);

                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="cron-gantt__action-id">{item.id}</span>
                          <p className="cron-gantt__action-title">{item.acao}</p>
                          <div className="cron-gantt__action-meta">
                            <small>{item.responsavel}</small>
                            <StatusBadge status={item.status} />
                          </div>
                        </td>
                        {MESES.map((mes) => {
                          const isCurrentMonth =
                            isAnoCorrente && mes.key === mesAtual;
                          const cellClass = [
                            "cron-gantt__cell",
                            isCurrentMonth ? "cron-gantt__month--current" : "",
                          ]
                            .filter(Boolean)
                            .join(" ");

                          let content = null;
                          if (semPrazoValido && mes.key === 12) {
                            content = (
                              <div className="cron-marker cron-marker--empty">
                                <em>Sem prazo</em>
                              </div>
                            );
                          } else if (mes.key === mesAlvo) {
                            content = (
                              <div className={`cron-marker cron-marker--${tone}`}>
                                <span>{diaMes(item.prazo)}</span>
                                <em>{item.progresso}</em>
                              </div>
                            );
                          }

                          return (
                            <td key={`${item.id}-${mes.key}`} className={cellClass}>
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="cron-legend">
              <span>Legenda:</span>
              <span className="cron-legend__item">
                <i className="cron-legend__dot cron-legend__dot--idle" aria-hidden="true" />
                Não iniciado
              </span>
              <span className="cron-legend__item">
                <i className="cron-legend__dot cron-legend__dot--active" aria-hidden="true" />
                Em andamento
              </span>
              <span className="cron-legend__item">
                <i className="cron-legend__dot cron-legend__dot--done" aria-hidden="true" />
                Concluído
              </span>
              <span className="cron-legend__item">
                <i className="cron-legend__dot cron-legend__dot--danger" aria-hidden="true" />
                Atrasado
              </span>
            </footer>
          </>
        )}
      </section>

      {itensFiltrados.length > 0 ? (
        <p className="cron-foot">
          {itensFiltrados.length} aç{itensFiltrados.length === 1 ? "ão" : "ões"} em {anoSelecionado}
        </p>
      ) : null}
    </div>
  );
}

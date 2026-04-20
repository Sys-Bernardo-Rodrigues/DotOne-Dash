import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useClientData } from "../context/ClientDataContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const STATUS_CRONOGRAMA = ["Não Iniciado", "Em Andamento", "Atrasado", "Concluído"];

const meses = [
  { key: 1, label: "jan" },
  { key: 2, label: "fev" },
  { key: 3, label: "mar" },
  { key: 4, label: "abr" },
  { key: 5, label: "mai" },
  { key: 6, label: "jun" },
  { key: 7, label: "jul" },
  { key: 8, label: "ago" },
  { key: 9, label: "set" },
  { key: 10, label: "out" },
  { key: 11, label: "nov" },
  { key: 12, label: "dez" },
];

function statusClass(status) {
  if (status === "Atrasado") return "gantt-pill atraso";
  if (status === "Em Andamento") return "gantt-pill andamento";
  if (status === "Concluído") return "gantt-pill concluido";
  return "gantt-pill pendente";
}

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

export default function CronogramaPage() {
  const { planoAcaoItems } = useClientData();
  const anoAjustadoPeloUsuario = useRef(false);
  const [anoSelecionado, setAnoSelecionado] = useState(() => new Date().getFullYear());
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [areaFiltro, setAreaFiltro] = useState("Todas");

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
        /* mantém o ano já exibido (relógio do navegador) */
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

  const anoCurto = String(anoSelecionado).slice(-2);

  return (
    <>
      <PageHeader
        title="Cronograma (Timeline/Gantt)"
        subtitle="Visualização temporal das ações estratégicas"
      />

      <section className="card">
        <div className="timeline-range" title="Faixa de meses do ano exibido (padrão = ano do servidor)">
          <span className="timeline-ano-label">Ano {anoSelecionado}</span>
          <span className="timeline-ano-meses">
            jan {anoCurto} – dez {anoCurto}
          </span>
        </div>
        <div className="gantt-title-row">
          <h2 className="gantt-title">Cronograma de Ações Estratégicas</h2>
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => mudarAno(-1)}
              aria-label="Ano anterior"
              title="Ano anterior"
            >
              ←
            </button>
            <button
              className="btn-secondary"
              onClick={() => mudarAno(1)}
              aria-label="Próximo ano"
              title="Próximo ano"
            >
              →
            </button>
          </div>
        </div>

        <div className="table-filters cronograma-filters">
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por ID, ação ou responsável"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={areaFiltro}
            onChange={(e) => setAreaFiltro(e.target.value)}
          >
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        <div className="table-scroll gantt-scroll">
          <table className="timeline-table gantt-table">
            <thead>
              <tr>
                <th>Ação</th>
                {meses.map((mes) => (
                  <th key={mes.key}>{mes.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={13} className="gantt-empty">
                    Sem ações para {anoSelecionado} com os filtros atuais.
                  </td>
                </tr>
              ) : itensFiltrados.map((item) => {
                const mesAlvo = mesFromPrazo(item.prazo);
                const semPrazoValido = mesAlvo === null;
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="gantt-action">
                        <strong>{item.id}</strong>
                        <p>{item.acao}</p>
                        <small>{item.responsavel}</small>
                      </div>
                    </td>
                    {meses.map((mes) => (
                      <td key={`${item.id}-${mes.key}`} className="gantt-month-cell">
                        {semPrazoValido && mes.key === 12 ? (
                          <div className={statusClass(item.status)}>
                            <span>—</span>
                            <em className="gantt-sem-prazo">Sem prazo</em>
                          </div>
                        ) : mes.key === mesAlvo ? (
                          <div className={statusClass(item.status)}>
                            <span>{diaMes(item.prazo)}</span>
                            <em>{item.progresso}</em>
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="gantt-legend">
          <span>Status:</span>
          <em className="legend-pill pendente">não iniciado</em>
          <em className="legend-pill andamento">em andamento</em>
          <em className="legend-pill concluido">concluído</em>
          <em className="legend-pill atraso">atrasado</em>
        </div>
      </section>
    </>
  );
}

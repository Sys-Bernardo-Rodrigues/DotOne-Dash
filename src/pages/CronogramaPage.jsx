import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { planoAcaoItems } from "../data/dashboardData";

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
  return "gantt-pill pendente";
}

function mesFromPrazo(prazo) {
  const parts = prazo.split("/");
  if (parts.length < 2) return null;
  return Number(parts[1]);
}

function anoFromPrazo(prazo) {
  const parts = prazo.split("/");
  if (parts.length < 3) return null;
  return Number(parts[2]);
}

function diaMes(prazo) {
  const parts = prazo.split("/");
  if (!parts.length) return "--/--";
  return `${parts[0]}/${parts[1]}`;
}

export default function CronogramaPage() {
  const [anoSelecionado, setAnoSelecionado] = useState(2025);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [areaFiltro, setAreaFiltro] = useState("Todas");

  const statusOptions = ["Todos", ...new Set(planoAcaoItems.map((item) => item.status))];
  const areaOptions = ["Todas", ...new Set(planoAcaoItems.map((item) => item.area))];

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return planoAcaoItems.filter((item) => {
      const matchBusca =
        !termo ||
        item.id.toLowerCase().includes(termo) ||
        item.acao.toLowerCase().includes(termo) ||
        item.responsavel.toLowerCase().includes(termo);
      const matchStatus = statusFiltro === "Todos" || item.status === statusFiltro;
      const matchArea = areaFiltro === "Todas" || item.area === areaFiltro;
      const matchAno = anoFromPrazo(item.prazo) === anoSelecionado;
      return matchBusca && matchStatus && matchArea && matchAno;
    });
  }, [busca, statusFiltro, areaFiltro, anoSelecionado]);

  const anoCurto = String(anoSelecionado).slice(-2);

  return (
    <>
      <PageHeader
        title="Cronograma (Timeline/Gantt)"
        subtitle="Visualização temporal das ações estratégicas"
        action={<button className="btn-primary">Exportar PDF</button>}
      />

      <section className="card">
        <div className="timeline-range">
          jan {anoCurto} - dez {anoCurto}
        </div>
        <div className="gantt-title-row">
          <h2 className="gantt-title">Cronograma de Ações Estratégicas</h2>
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => setAnoSelecionado((prev) => prev - 1)}
              aria-label="Ano anterior"
              title="Ano anterior"
            >
              ←
            </button>
            <button
              className="btn-secondary"
              onClick={() => setAnoSelecionado((prev) => prev + 1)}
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
                        {mes.key === mesAlvo ? (
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

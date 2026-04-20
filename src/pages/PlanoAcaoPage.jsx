import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { planoAcaoItems } from "../data/dashboardData";

function statusClass(status) {
  if (status === "Atrasado") return "chip atraso";
  if (status === "Em Andamento") return "chip andamento";
  return "chip pendente";
}

export default function PlanoAcaoPage() {
  const [pagina, setPagina] = useState(1);
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
        item.responsavel.toLowerCase().includes(termo) ||
        item.fase.toLowerCase().includes(termo);
      const matchStatus = statusFiltro === "Todos" || item.status === statusFiltro;
      const matchArea = areaFiltro === "Todas" || item.area === areaFiltro;
      return matchBusca && matchStatus && matchArea;
    });
  }, [busca, statusFiltro, areaFiltro]);

  const itensPorPagina = 10;
  const total = itensFiltrados.length;
  const totalPaginas = Math.ceil(total / itensPorPagina);
  const inicio = (pagina - 1) * itensPorPagina;
  const paginaItems = itensFiltrados.slice(inicio, inicio + itensPorPagina);

  useEffect(() => {
    setPagina(1);
  }, [busca, statusFiltro, areaFiltro]);

  return (
    <>
      <PageHeader
        title="Plano de Ação (5W2H)"
        subtitle="Gestão detalhada das ações estratégicas"
        action={
          <div className="header-actions">
            <button className="btn-secondary">Criar Plano de Ação</button>
            <button className="btn-primary">Exportar PDF</button>
          </div>
        }
      />
      <section className="card">
        <div className="table-filters">
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por ID, ação, responsável ou fase"
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

        <div className="table-scroll">
          <table className="timeline-table plano-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ação (What)</th>
                <th>Responsável (Who)</th>
                <th>Prazo (When)</th>
                <th>Área (Where)</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginaItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>
                    <strong>{item.acao}</strong>
                    <div className="table-subline">{item.fase}</div>
                  </td>
                  <td>{item.responsavel}</td>
                  <td>{item.prazo}</td>
                  <td>{item.area}</td>
                  <td>
                    <span className={statusClass(item.status)}>{item.status}</span>
                  </td>
                  <td>{item.progresso}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Editar (em breve)"
                        aria-label="Editar (em breve)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Excluir (em breve)"
                        aria-label="Excluir (em breve)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 7h12v2H6V7zm2 3h8l-.7 10H8.7L8 10zm3-6h2l1 1h4v2H6V5h4l1-1z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="critical-pagination plan-pagination">
          <button
            type="button"
            className="pager-btn"
            onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
            disabled={pagina === 1}
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            className="pager-btn"
            onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
            disabled={pagina === totalPaginas}
          >
            Próxima
          </button>
        </div>

        <div className="table-count">Mostrando {paginaItems.length} de {total} ações</div>
      </section>
    </>
  );
}

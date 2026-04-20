import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useClientData } from "../context/ClientDataContext";
import { authHeaders } from "../lib/adminApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function statusClass(status) {
  if (status === "Atrasado") return "chip atraso";
  if (status === "Em Andamento") return "chip andamento";
  if (status === "Concluído") return "chip ok";
  return "chip pendente";
}

function isoDateToPrazoBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

const STATUS_PADRAO = ["Não Iniciado", "Em Andamento", "Atrasado", "Concluído"];

/** Valor do &lt;select&gt; quando o utilizador escolhe responsável fora da lista. */
const RESPONSAVEL_OUTRO = "__outro__";

function buildInitialForm() {
  return {
    acao: "",
    porQue: "",
    area: "",
    prazoIso: "",
    responsavel: "",
    /** Preenchido só se `responsavel === RESPONSAVEL_OUTRO`. */
    responsavelOutro: "",
    como: "",
    quanto: "",
    fase: "",
    status: "Não Iniciado",
    progresso: "0%",
  };
}

export default function PlanoAcaoPage() {
  const { planoAcaoItems, addPlanoAcaoItem, activeClient } = useClientData();
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [areaFiltro, setAreaFiltro] = useState("Todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(buildInitialForm);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loadingAssignableUsers, setLoadingAssignableUsers] = useState(false);

  const statusOptions = [
    "Todos",
    ...new Set([...STATUS_PADRAO, ...planoAcaoItems.map((item) => item.status)]),
  ];
  const areaOptions = ["Todas", ...new Set(planoAcaoItems.map((item) => item.area).filter(Boolean))];

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return planoAcaoItems.filter((item) => {
      const hay = [
        item.id,
        item.acao,
        item.responsavel,
        item.fase,
        item.area,
        item.porQue,
        item.como,
        item.quanto,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchBusca = !termo || hay.includes(termo);
      const matchStatus = statusFiltro === "Todos" || item.status === statusFiltro;
      const matchArea = areaFiltro === "Todas" || item.area === areaFiltro;
      return matchBusca && matchStatus && matchArea;
    });
  }, [busca, statusFiltro, areaFiltro, planoAcaoItems]);

  const itensPorPagina = 10;
  const total = itensFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const inicio = (pagina - 1) * itensPorPagina;
  const paginaItems = itensFiltrados.slice(inicio, inicio + itensPorPagina);

  useEffect(() => {
    setPagina(1);
  }, [busca, statusFiltro, areaFiltro]);

  useEffect(() => {
    if (!modalAberto || !activeClient.slug?.trim()) {
      setAssignableUsers([]);
      return;
    }
    let cancelled = false;
    setLoadingAssignableUsers(true);
    fetch(
      `${API_BASE_URL}/clients/slug/${encodeURIComponent(activeClient.slug)}/assignable-users`,
      { headers: { ...authHeaders() } }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setAssignableUsers(Array.isArray(d.users) ? d.users : []);
      })
      .catch(() => {
        if (!cancelled) setAssignableUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignableUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalAberto, activeClient.slug]);

  function abrirModal() {
    setForm(buildInitialForm());
    setErroSalvar("");
    setModalAberto(true);
  }

  async function handleSubmitPlano(event) {
    event.preventDefault();
    if (!form.acao.trim()) {
      setErroSalvar("Preencha o campo O quê (ação).");
      return;
    }
    if (!form.responsavel.trim()) {
      setErroSalvar("Selecione quem é o responsável.");
      return;
    }
    const escolheuOutro = form.responsavel === RESPONSAVEL_OUTRO;
    if (escolheuOutro && !form.responsavelOutro.trim()) {
      setErroSalvar('Escreva o nome de quem vai executar a ação (opção «Outro»).');
      return;
    }
    const nomeResponsavel = escolheuOutro
      ? form.responsavelOutro.trim()
      : form.responsavel.trim();
    setSalvando(true);
    setErroSalvar("");
    const prazo = isoDateToPrazoBR(form.prazoIso);
    const result = await addPlanoAcaoItem({
      acao: form.acao.trim(),
      porQue: form.porQue.trim(),
      area: form.area.trim(),
      prazo,
      responsavel: nomeResponsavel,
      como: form.como.trim(),
      quanto: form.quanto.trim(),
      fase: form.fase.trim(),
      status: form.status,
      progresso: form.progresso.trim() || "0%",
    });
    setSalvando(false);
    if (!result.ok) {
      setErroSalvar(result.message || "Erro ao salvar.");
      return;
    }
    setModalAberto(false);
    setForm(buildInitialForm());
  }

  return (
    <>
      <PageHeader
        title="Plano de Ação (5W2H)"
        subtitle="Gestão detalhada das ações estratégicas"
        action={
          <div className="header-actions">
            <button type="button" className="btn-secondary" onClick={abrirModal}>
              Criar Plano de Ação
            </button>
          </div>
        }
      />
      <section className="card">
        <div className="table-filters">
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por ID, ação, 5W2H, responsável ou fase"
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
                    {item.porQue ? (
                      <div className="table-subline plano-table-why">Por quê: {item.porQue}</div>
                    ) : null}
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

        <div className="table-count">
          Mostrando {paginaItems.length} de {total} ações
        </div>
      </section>

      {modalAberto ? (
        <div
          className="adm-modal-backdrop plano-modal-backdrop"
          role="presentation"
          onClick={() => !salvando && setModalAberto(false)}
        >
          <section
            className="plano-acao-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plano-acao-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="plano-modal-header-pro">
              <div className="plano-modal-header-brand" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="plano-modal-header-icon-svg">
                  <path d="M9 11H7a2 2 0 0 0-2 2v7h4v-4h2v4h4v-7a2 2 0 0 0-2-2h-2V9a2 2 0 1 0-4 0v2zm-2 2v5H5v-5a1 1 0 0 1 1-1h1zm8 0a1 1 0 0 1 1 1v5h-2v-5h1zm-5-4a1 1 0 0 1 2 0v2h-2V9z" />
                </svg>
              </div>
              <div className="plano-modal-header-copy">
                <p className="plano-modal-kicker">Framework 5W2H</p>
                <h2 id="plano-acao-modal-title">Nova ação estratégica</h2>
                {activeClient.nome ? (
                  <p className="plano-modal-client-badge">
                    <span className="plano-modal-client-label">Cliente</span>
                    {activeClient.nome}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="plano-modal-close"
                disabled={salvando}
                onClick={() => setModalAberto(false)}
                aria-label="Fechar modal"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            </header>

            <p className="plano-modal-lead-pro">
              Defina a ação de forma completa: contexto, âmbito, responsável e forma de acompanhamento.
            </p>

            <form className="plano-5w2h-form" onSubmit={handleSubmitPlano}>
              <section className="plano-modal-section" aria-labelledby="plano-sec-contexto">
                <h3 id="plano-sec-contexto" className="plano-modal-section-title">
                  Contexto e objetivo
                </h3>
                <div className="plano-modal-section-grid">
                  <label className="plano-field plano-field-span-2">
                    <span className="plano-field-label">
                      O quê <span className="plano-w">(What)</span>{" "}
                      <abbr title="obrigatório">*</abbr>
                    </span>
                    <textarea
                      className="filter-input plano-textarea plano-input-pro"
                      rows={3}
                      required
                      placeholder="O que será feito? Resultado esperado e critério de conclusão."
                      value={form.acao}
                      onChange={(e) => setForm((p) => ({ ...p, acao: e.target.value }))}
                    />
                  </label>

                  <label className="plano-field plano-field-span-2">
                    <span className="plano-field-label">
                      Por quê <span className="plano-w">(Why)</span>
                    </span>
                    <textarea
                      className="filter-input plano-textarea plano-input-pro"
                      rows={2}
                      placeholder="Justificativa de negócio, alinhamento estratégico ou problema a resolver."
                      value={form.porQue}
                      onChange={(e) => setForm((p) => ({ ...p, porQue: e.target.value }))}
                    />
                  </label>
                </div>
              </section>

              <section className="plano-modal-section" aria-labelledby="plano-sec-ambito">
                <h3 id="plano-sec-ambito" className="plano-modal-section-title">
                  Âmbito e prazo
                </h3>
                <div className="plano-modal-section-grid plano-modal-trio">
                  <label className="plano-field">
                    <span className="plano-field-label">
                      Onde <span className="plano-w">(Where)</span>
                    </span>
                    <input
                      className="filter-input plano-input-pro"
                      placeholder="Área, unidade ou canal"
                      value={form.area}
                      onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                    />
                  </label>

                  <label className="plano-field">
                    <span className="plano-field-label">
                      Quando <span className="plano-w">(When)</span>
                    </span>
                    <input
                      type="date"
                      className="filter-input plano-input-pro"
                      value={form.prazoIso}
                      onChange={(e) => setForm((p) => ({ ...p, prazoIso: e.target.value }))}
                    />
                  </label>

                  <label className="plano-field">
                    <span className="plano-field-label">Fase / etapa</span>
                    <input
                      className="filter-input plano-input-pro"
                      placeholder="Ex.: Fase 1 — Fundamentos"
                      value={form.fase}
                      onChange={(e) => setForm((p) => ({ ...p, fase: e.target.value }))}
                    />
                  </label>
                </div>
              </section>

              <section className="plano-modal-section" aria-labelledby="plano-sec-quem">
                <h3 id="plano-sec-quem" className="plano-modal-section-title">
                  Responsabilização
                </h3>
                <div className="plano-field plano-field-span-2">
                  <span className="plano-field-label" id="plano-quem-label">
                    Quem <span className="plano-w">(Who)</span>
                  </span>
                  {loadingAssignableUsers ? (
                    <p className="plano-field-hint">A carregar utilizadores…</p>
                  ) : null}
                  <select
                    className="filter-select plano-input-pro"
                    value={form.responsavel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((p) => ({
                        ...p,
                        responsavel: v,
                        responsavelOutro: v === RESPONSAVEL_OUTRO ? p.responsavelOutro : "",
                      }));
                    }}
                    aria-labelledby="plano-quem-label"
                    aria-describedby="plano-quem-hint"
                  >
                    <option value="">— Selecione o responsável —</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.nome}>
                        {u.nome}
                        {u.email ? ` (${u.email})` : ""}
                        {u.perfil ? ` · ${u.perfil}` : ""}
                      </option>
                    ))}
                    <option value={RESPONSAVEL_OUTRO}>Outro — escrever quem executa</option>
                  </select>
                  {form.responsavel === RESPONSAVEL_OUTRO ? (
                    <div className="plano-quem-outro">
                      <label className="plano-field-label" htmlFor="plano-resp-outro">
                        Nome do responsável
                      </label>
                      <input
                        id="plano-resp-outro"
                        type="text"
                        className="filter-input plano-input-pro"
                        placeholder="Ex.: equipa externa, fornecedor ou pessoa sem conta na plataforma"
                        value={form.responsavelOutro}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, responsavelOutro: e.target.value }))
                        }
                        autoComplete="off"
                      />
                    </div>
                  ) : null}
                  <p id="plano-quem-hint" className="plano-field-hint">
                    {assignableUsers.length === 0 && !loadingAssignableUsers
                      ? "Nenhum utilizador ativo está vinculado a este cliente. Use «Outro» ou associe utilizadores no painel /adm."
                      : "Utilizadores vinculados a este cliente, ou «Outro» para indicar manualmente quem executa."}
                  </p>
                </div>
              </section>

              <section className="plano-modal-section" aria-labelledby="plano-sec-metodo">
                <h3 id="plano-sec-metodo" className="plano-modal-section-title">
                  Método e recursos
                </h3>
                <div className="plano-modal-section-grid">
                  <label className="plano-field plano-field-span-2">
                    <span className="plano-field-label">
                      Como <span className="plano-w">(How)</span>
                    </span>
                    <textarea
                      className="filter-input plano-textarea plano-input-pro"
                      rows={2}
                      placeholder="Método, processo, ferramentas ou passos principais."
                      value={form.como}
                      onChange={(e) => setForm((p) => ({ ...p, como: e.target.value }))}
                    />
                  </label>

                  <label className="plano-field plano-field-span-2">
                    <span className="plano-field-label">
                      Quanto <span className="plano-w">(How much)</span>
                    </span>
                    <input
                      className="filter-input plano-input-pro"
                      placeholder="Custo, esforço, horas ou indicador quantitativo"
                      value={form.quanto}
                      onChange={(e) => setForm((p) => ({ ...p, quanto: e.target.value }))}
                    />
                  </label>
                </div>
              </section>

              <section className="plano-modal-section" aria-labelledby="plano-sec-controlo">
                <h3 id="plano-sec-controlo" className="plano-modal-section-title">
                  Acompanhamento inicial
                </h3>
                <div className="plano-modal-section-grid plano-modal-duo">
                  <label className="plano-field">
                    <span className="plano-field-label">Status inicial</span>
                    <select
                      className="filter-select plano-input-pro"
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      {STATUS_PADRAO.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="plano-field">
                    <span className="plano-field-label">Progresso</span>
                    <input
                      className="filter-input plano-input-pro"
                      placeholder="0%"
                      value={form.progresso}
                      onChange={(e) => setForm((p) => ({ ...p, progresso: e.target.value }))}
                    />
                  </label>
                </div>
              </section>

              {erroSalvar ? (
                <p className="plano-form-error" role="alert">
                  {erroSalvar}
                </p>
              ) : null}

              <div className="plano-modal-actions plano-modal-footer-pro">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={salvando}
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary plano-modal-submit" disabled={salvando}>
                  {salvando ? "A guardar…" : "Guardar ação"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

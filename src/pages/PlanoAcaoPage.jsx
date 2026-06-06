import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardList,
  Gauge,
  MapPin,
  Pencil,
  Plus,
  Route,
  Search,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useClientData } from "../context/ClientDataContext";
import { authHeaders } from "../lib/adminApi";
import {
  computePlanoStatus,
  formatPlanoProgress,
  parsePlanoProgress,
} from "../utils/planoAcaoNormalize";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const STATUS_META = {
  Atrasado: { tone: "danger", label: "Atrasado" },
  "Em Andamento": { tone: "active", label: "Em andamento" },
  Concluído: { tone: "done", label: "Concluído" },
  "Não Iniciado": { tone: "idle", label: "Não iniciado" },
};

const STATUS_PADRAO = ["Não Iniciado", "Em Andamento", "Atrasado", "Concluído"];
const RESPONSAVEL_OUTRO = "__outro__";

const W5H2_LEGEND = [
  { key: "What", label: "O quê" },
  { key: "Why", label: "Por quê" },
  { key: "Where", label: "Onde" },
  { key: "When", label: "Quando" },
  { key: "Who", label: "Quem" },
  { key: "How", label: "Como" },
  { key: "How much", label: "Quanto" },
];

function isoDateToPrazoBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function prazoBRToIsoDate(prazo) {
  const txt = String(prazo || "").trim();
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function buildResponsavelEditState(nomeResponsavel, users) {
  const nome = String(nomeResponsavel || "").trim();
  if (!nome) return { responsavel: "", responsavelOutro: "" };
  const existeNaLista = Array.isArray(users) && users.some((u) => String(u.nome || "").trim() === nome);
  if (existeNaLista) return { responsavel: nome, responsavelOutro: "" };
  return { responsavel: RESPONSAVEL_OUTRO, responsavelOutro: nome };
}

function buildInitialForm() {
  return {
    acao: "",
    porQue: "",
    area: "",
    prazoIso: "",
    responsavel: "",
    responsavelOutro: "",
    como: "",
    quanto: "",
    fase: "",
    status: "Não Iniciado",
    progresso: "0%",
  };
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { tone: "idle", label: status };
  return <span className={`plano-badge plano-badge--${meta.tone}`}>{meta.label}</span>;
}

export default function PlanoAcaoPage() {
  const {
    planoAcaoItems,
    addPlanoAcaoItem,
    updatePlanoAcaoItem,
    deletePlanoAcaoItem,
    activeClient,
  } = useClientData();
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
  const [editingItemId, setEditingItemId] = useState("");

  const statusOptions = [
    "Todos",
    ...new Set([...STATUS_PADRAO, ...planoAcaoItems.map((item) => item.status)]),
  ];
  const areaOptions = ["Todas", ...new Set(planoAcaoItems.map((item) => item.area).filter(Boolean))];

  const resumo = useMemo(() => {
    const total = planoAcaoItems.length;
    const atrasadas = planoAcaoItems.filter((i) => i.status === "Atrasado").length;
    const andamento = planoAcaoItems.filter((i) => i.status === "Em Andamento").length;
    const concluidas = planoAcaoItems.filter((i) => i.status === "Concluído").length;
    const progresso = total
      ? Math.round(
          planoAcaoItems.reduce((acc, item) => acc + parsePlanoProgress(item.progresso), 0) / total,
        )
      : 0;
    return { total, atrasadas, andamento, concluidas, progresso };
  }, [planoAcaoItems]);

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
  const statusPreview = useMemo(
    () =>
      computePlanoStatus({
        progresso: form.progresso,
        prazo: isoDateToPrazoBR(form.prazoIso),
      }),
    [form.progresso, form.prazoIso],
  );

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
      { headers: { ...authHeaders() } },
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

  useEffect(() => {
    if (!modalAberto || !editingItemId || loadingAssignableUsers) return;
    const nomeAtual = String(
      form.responsavel === RESPONSAVEL_OUTRO ? form.responsavelOutro : form.responsavel,
    ).trim();
    if (!nomeAtual) return;
    const next = buildResponsavelEditState(nomeAtual, assignableUsers);
    if (next.responsavel !== form.responsavel || next.responsavelOutro !== form.responsavelOutro) {
      setForm((p) => ({ ...p, ...next }));
    }
  }, [
    modalAberto,
    editingItemId,
    loadingAssignableUsers,
    assignableUsers,
    form.responsavel,
    form.responsavelOutro,
  ]);

  function abrirModal() {
    setEditingItemId("");
    setForm(buildInitialForm());
    setErroSalvar("");
    setModalAberto(true);
  }

  function abrirModalEdicao(item) {
    setEditingItemId(item.id);
    const respState = buildResponsavelEditState(item.responsavel, assignableUsers);
    setForm({
      acao: item.acao || "",
      porQue: item.porQue || "",
      area: item.area || "",
      prazoIso: prazoBRToIsoDate(item.prazo),
      responsavel: respState.responsavel,
      responsavelOutro: respState.responsavelOutro,
      como: item.como || "",
      quanto: item.quanto || "",
      fase: item.fase || "",
      status: item.status || "Não Iniciado",
      progresso: formatPlanoProgress(item.progresso),
    });
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
    const payload = {
      acao: form.acao.trim(),
      porQue: form.porQue.trim(),
      area: form.area.trim(),
      prazo,
      responsavel: nomeResponsavel,
      como: form.como.trim(),
      quanto: form.quanto.trim(),
      fase: form.fase.trim(),
      progresso: form.progresso.trim() || "0%",
    };
    const result = editingItemId
      ? await updatePlanoAcaoItem(editingItemId, payload)
      : await addPlanoAcaoItem(payload);
    setSalvando(false);
    if (!result.ok) {
      setErroSalvar(result.message || "Erro ao salvar.");
      return;
    }
    setModalAberto(false);
    setEditingItemId("");
    setForm(buildInitialForm());
  }

  async function handleDeleteItem(item) {
    if (!item?.id) return;
    const ok = window.confirm(`Excluir a ação ${item.id}? Esta operação não pode ser desfeita.`);
    if (!ok) return;
    const result = await deletePlanoAcaoItem(item.id);
    if (!result.ok) {
      window.alert(result.message || "Não foi possível excluir a ação.");
    }
  }

  return (
    <div className="plano">
      <header className="plano-hero">
        <div className="plano-hero__copy">
          <span className="plano-hero__eyebrow">Estratégia · 5W2H</span>
          <h1>Plano de Ação</h1>
          <p>Gestão detalhada das ações estratégicas do cliente</p>
        </div>

        <div className="plano-hero__side">
          <div className="plano-hero__stats">
            <div className="plano-stat">
              <span>Total</span>
              <strong>{resumo.total}</strong>
            </div>
            <div className="plano-stat plano-stat--danger">
              <span>Atrasadas</span>
              <strong>{resumo.atrasadas}</strong>
            </div>
            <div className="plano-stat plano-stat--active">
              <span>Em curso</span>
              <strong>{resumo.andamento}</strong>
            </div>
            <div className="plano-stat plano-stat--done">
              <span>Concluídas</span>
              <strong>{resumo.concluidas}</strong>
            </div>
            <div className="plano-stat">
              <span>Progresso</span>
              <strong>{resumo.progresso}%</strong>
            </div>
          </div>
          <button type="button" className="plano-hero__cta" onClick={abrirModal}>
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Nova ação
          </button>
        </div>
      </header>

      <section className="plano-toolbar" aria-label="Filtros">
        <label className="plano-toolbar__search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por ID, ação, responsável ou fase…"
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

      {paginaItems.length === 0 ? (
        <div className="plano-empty">
          <strong>Nenhuma ação encontrada</strong>
          <p>
            {planoAcaoItems.length === 0
              ? "Comece criando a primeira ação estratégica do plano."
              : "Ajuste os filtros ou experimente outro termo de busca."}
          </p>
        </div>
      ) : (
        <section className="plano-list" aria-label="Ações do plano">
          {paginaItems.map((item) => {
            const pct = parsePlanoProgress(item.progresso);
            return (
              <article key={item.id} className="plano-card">
                <div className="plano-card__main">
                  <div className="plano-card__top">
                    <span className="plano-card__id">{item.id}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <h2 className="plano-card__title">{item.acao}</h2>
                  {item.fase ? <p className="plano-card__phase">{item.fase}</p> : null}
                  {item.porQue ? (
                    <p className="plano-card__why">
                      <strong>Por quê:</strong> {item.porQue}
                    </p>
                  ) : null}

                  <dl className="plano-card__meta">
                    <div>
                      <dt>Responsável</dt>
                      <dd>{item.responsavel}</dd>
                    </div>
                    <div>
                      <dt>Prazo</dt>
                      <dd>{item.prazo || "—"}</dd>
                    </div>
                    <div>
                      <dt>Área</dt>
                      <dd>{item.area}</dd>
                    </div>
                    <div className="plano-card__progress">
                      <div className="plano-card__progress-head">
                        <span>Progresso</span>
                        <em>{item.progresso}</em>
                      </div>
                      <div className="plano-card__bar" aria-hidden="true">
                        <div style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </dl>
                </div>

                <div className="plano-card__actions">
                  <button
                    type="button"
                    className="plano-card__btn"
                    title="Editar ação"
                    aria-label="Editar ação"
                    onClick={() => abrirModalEdicao(item)}
                  >
                    <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="plano-card__btn plano-card__btn--danger"
                    title="Excluir ação"
                    aria-label="Excluir ação"
                    onClick={() => handleDeleteItem(item)}
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {total > 0 ? (
        <footer className="plano-foot">
          <span>
            Mostrando {paginaItems.length} de {total} aç{total === 1 ? "ão" : "ões"}
            {total !== planoAcaoItems.length ? ` (${planoAcaoItems.length} no total)` : ""}
          </span>
          <div className="plano-pager">
            <button
              type="button"
              onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
              disabled={pagina === 1}
            >
              Anterior
            </button>
            <em>
              {pagina} / {totalPaginas}
            </em>
            <button
              type="button"
              onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
              disabled={pagina === totalPaginas}
            >
              Próxima
            </button>
          </div>
        </footer>
      ) : null}

      {modalAberto
        ? createPortal(
            <div
              className="plano-modal-backdrop"
              role="presentation"
              onClick={() => !salvando && setModalAberto(false)}
            >
          <section
            className="plano-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plano-acao-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="plano-modal__head">
              <div className="plano-modal__head-main">
                <span className="plano-modal__icon" aria-hidden="true">
                  <ClipboardList size={20} strokeWidth={2} />
                </span>
                <div>
                  <span className="plano-modal__eyebrow">Framework 5W2H</span>
                  <h2 id="plano-acao-modal-title">
                    {editingItemId ? "Editar ação" : "Nova ação"}
                  </h2>
                  {activeClient.nome ? (
                    <p className="plano-modal__client">
                      Cliente · <strong>{activeClient.nome}</strong>
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="plano-modal__close"
                disabled={salvando}
                onClick={() => setModalAberto(false)}
                aria-label="Fechar modal"
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </header>

            <div className="plano-modal__legend" aria-label="Campos do 5W2H">
              {W5H2_LEGEND.map((item) => (
                <span key={item.key} className="plano-modal__legend-item">
                  <em>{item.key}</em>
                  {item.label}
                </span>
              ))}
            </div>

            <form className="plano-modal__form" onSubmit={handleSubmitPlano}>
              <div className="plano-modal__scroll">
                <section className="plano-modal__panel" aria-labelledby="plano-sec-contexto">
                  <header className="plano-modal__panel-head">
                    <Target size={16} strokeWidth={2} aria-hidden="true" />
                    <h3 id="plano-sec-contexto">Contexto e objetivo</h3>
                  </header>
                  <div className="plano-modal__grid">
                    <label className="plano-modal__field plano-modal__field--full">
                      <span className="plano-modal__label">
                        O quê <span className="plano-modal__w">What</span>
                        <abbr title="obrigatório">*</abbr>
                      </span>
                      <textarea
                        className="plano-modal__input plano-modal__textarea"
                        rows={3}
                        required
                        placeholder="O que será feito? Resultado esperado e critério de conclusão."
                        value={form.acao}
                        onChange={(e) => setForm((p) => ({ ...p, acao: e.target.value }))}
                      />
                    </label>
                    <label className="plano-modal__field plano-modal__field--full">
                      <span className="plano-modal__label">
                        Por quê <span className="plano-modal__w">Why</span>
                      </span>
                      <textarea
                        className="plano-modal__input plano-modal__textarea"
                        rows={2}
                        placeholder="Justificativa de negócio ou problema a resolver."
                        value={form.porQue}
                        onChange={(e) => setForm((p) => ({ ...p, porQue: e.target.value }))}
                      />
                    </label>
                  </div>
                </section>

                <section className="plano-modal__panel" aria-labelledby="plano-sec-ambito">
                  <header className="plano-modal__panel-head">
                    <MapPin size={16} strokeWidth={2} aria-hidden="true" />
                    <h3 id="plano-sec-ambito">Âmbito e prazo</h3>
                  </header>
                  <div className="plano-modal__grid plano-modal__grid--3">
                    <label className="plano-modal__field">
                      <span className="plano-modal__label">
                        Onde <span className="plano-modal__w">Where</span>
                      </span>
                      <input
                        className="plano-modal__input"
                        placeholder="Área ou unidade"
                        value={form.area}
                        onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                      />
                    </label>
                    <label className="plano-modal__field">
                      <span className="plano-modal__label">
                        Quando <span className="plano-modal__w">When</span>
                      </span>
                      <input
                        type="date"
                        className="plano-modal__input"
                        value={form.prazoIso}
                        onChange={(e) => setForm((p) => ({ ...p, prazoIso: e.target.value }))}
                      />
                    </label>
                    <label className="plano-modal__field">
                      <span className="plano-modal__label">Fase / etapa</span>
                      <input
                        className="plano-modal__input"
                        placeholder="Ex.: Fase 1"
                        value={form.fase}
                        onChange={(e) => setForm((p) => ({ ...p, fase: e.target.value }))}
                      />
                    </label>
                  </div>
                </section>

                <section className="plano-modal__panel" aria-labelledby="plano-sec-quem">
                  <header className="plano-modal__panel-head">
                    <Users size={16} strokeWidth={2} aria-hidden="true" />
                    <h3 id="plano-sec-quem">Responsabilização</h3>
                  </header>
                  <div className="plano-modal__field plano-modal__field--full">
                    <span className="plano-modal__label" id="plano-quem-label">
                      Quem <span className="plano-modal__w">Who</span>
                    </span>
                    {loadingAssignableUsers ? (
                      <p className="plano-modal__hint">A carregar utilizadores…</p>
                    ) : null}
                    <select
                      className="plano-modal__input plano-modal__select"
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
                      <option value="">Selecione o responsável</option>
                      {assignableUsers.map((u) => (
                        <option key={u.id} value={u.nome}>
                          {u.nome}
                          {u.email ? ` (${u.email})` : ""}
                          {u.perfil ? ` · ${u.perfil}` : ""}
                        </option>
                      ))}
                      <option value={RESPONSAVEL_OUTRO}>Outro — escrever manualmente</option>
                    </select>
                    {form.responsavel === RESPONSAVEL_OUTRO ? (
                      <label className="plano-modal__field plano-modal__field--full plano-modal__nested" htmlFor="plano-resp-outro">
                        <span className="plano-modal__label">Nome do responsável</span>
                        <input
                          id="plano-resp-outro"
                          type="text"
                          className="plano-modal__input"
                          placeholder="Equipa externa, fornecedor, etc."
                          value={form.responsavelOutro}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, responsavelOutro: e.target.value }))
                          }
                          autoComplete="off"
                        />
                      </label>
                    ) : null}
                    <p id="plano-quem-hint" className="plano-modal__hint">
                      {assignableUsers.length === 0 && !loadingAssignableUsers
                        ? "Nenhum utilizador vinculado a este cliente. Use «Outro» ou associe utilizadores em /adm."
                        : "Utilizadores do cliente ou opção «Outro» para indicar manualmente."}
                    </p>
                  </div>
                </section>

                <section className="plano-modal__panel" aria-labelledby="plano-sec-metodo">
                  <header className="plano-modal__panel-head">
                    <Route size={16} strokeWidth={2} aria-hidden="true" />
                    <h3 id="plano-sec-metodo">Método e recursos</h3>
                  </header>
                  <div className="plano-modal__grid">
                    <label className="plano-modal__field plano-modal__field--full">
                      <span className="plano-modal__label">
                        Como <span className="plano-modal__w">How</span>
                      </span>
                      <textarea
                        className="plano-modal__input plano-modal__textarea"
                        rows={2}
                        placeholder="Método, processo ou passos principais."
                        value={form.como}
                        onChange={(e) => setForm((p) => ({ ...p, como: e.target.value }))}
                      />
                    </label>
                    <label className="plano-modal__field plano-modal__field--full">
                      <span className="plano-modal__label">
                        Quanto <span className="plano-modal__w">How much</span>
                      </span>
                      <input
                        className="plano-modal__input"
                        placeholder="Custo, esforço ou horas"
                        value={form.quanto}
                        onChange={(e) => setForm((p) => ({ ...p, quanto: e.target.value }))}
                      />
                    </label>
                  </div>
                </section>

                <section className="plano-modal__panel" aria-labelledby="plano-sec-controlo">
                  <header className="plano-modal__panel-head">
                    <Gauge size={16} strokeWidth={2} aria-hidden="true" />
                    <h3 id="plano-sec-controlo">Acompanhamento inicial</h3>
                  </header>
                  <div className="plano-modal__grid plano-modal__grid--2">
                    <label className="plano-modal__field">
                      <span className="plano-modal__label">Status automático</span>
                      <div className="plano-modal__readonly">
                        <StatusBadge status={statusPreview} />
                      </div>
                    </label>
                    <label className="plano-modal__field">
                      <span className="plano-modal__label">Progresso</span>
                      <input
                        className="plano-modal__input"
                        placeholder="0%"
                        value={form.progresso}
                        onChange={(e) => setForm((p) => ({ ...p, progresso: e.target.value }))}
                      />
                    </label>
                  </div>
                </section>

                {erroSalvar ? (
                  <p className="plano-modal__error" role="alert">
                    {erroSalvar}
                  </p>
                ) : null}
              </div>

              <footer className="plano-modal__foot">
                <button
                  type="button"
                  className="plano-modal__btn plano-modal__btn--ghost"
                  disabled={salvando}
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="plano-modal__btn plano-modal__btn--primary"
                  disabled={salvando}
                >
                  {salvando ? "A guardar…" : editingItemId ? "Guardar alterações" : "Guardar ação"}
                </button>
              </footer>
            </form>
          </section>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}

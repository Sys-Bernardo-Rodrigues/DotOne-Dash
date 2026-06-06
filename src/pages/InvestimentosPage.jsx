import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

function moneyFormat(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateFormat(iso) {
  const txt = String(iso || "").trim();
  const m = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return txt || "—";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function buildInitialForm() {
  return {
    nome: "",
    canal: "",
    valor: "",
    data: "",
    repete: false,
    dataInicio: "",
    dataFim: "",
    frequencia: "mensal",
  };
}

export default function InvestimentosPage() {
  const { investimentos, addInvestimento, updateInvestimento, deleteInvestimento } =
    useClientData();
  const [modalAberto, setModalAberto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(buildInitialForm);
  const [busca, setBusca] = useState("");
  const [filtroRepete, setFiltroRepete] = useState("todos");
  const [filtroFreq, setFiltroFreq] = useState("todas");

  const canaisCadastrados = useMemo(
    () =>
      [...new Set(investimentos.map((i) => String(i?.canal || "").trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }),
      ),
    [investimentos],
  );

  const resumo = useMemo(() => {
    const total = investimentos.length;
    const valorTotal = investimentos.reduce((acc, i) => acc + Number(i.valor || 0), 0);
    const recorrentes = investimentos.filter((i) => i.repete).length;
    const canais = new Set(
      investimentos.map((i) => String(i?.canal || "").trim()).filter(Boolean),
    ).size;
    return { total, valorTotal, recorrentes, canais };
  }, [investimentos]);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...investimentos]
      .filter((item) => {
        const nome = String(item?.nome || "").toLowerCase();
        const canal = String(item?.canal || "").toLowerCase();
        const id = String(item?.id || "").toLowerCase();
        const matchBusca = !termo || nome.includes(termo) || canal.includes(termo) || id.includes(termo);
        const matchRepete =
          filtroRepete === "todos" ||
          (filtroRepete === "sim" ? Boolean(item?.repete) : !item?.repete);
        const freq = String(item?.frequencia || "").toLowerCase();
        const matchFreq =
          filtroFreq === "todas" || (Boolean(item?.repete) && freq === filtroFreq);
        return matchBusca && matchRepete && matchFreq;
      })
      .sort((a, b) => String(b?.data || "").localeCompare(String(a?.data || "")));
  }, [investimentos, busca, filtroRepete, filtroFreq]);

  function openCreate() {
    setEditingId("");
    setForm(buildInitialForm());
    setErro("");
    setModalAberto(true);
  }

  function openEdit(item) {
    setEditingId(String(item.id || ""));
    setForm({
      nome: String(item.nome || ""),
      canal: String(item.canal || ""),
      valor: String(item.valor ?? ""),
      data: String(item.data || ""),
      repete: Boolean(item.repete),
      dataInicio: String(item.dataInicio || ""),
      dataFim: String(item.dataFim || ""),
      frequencia: item.frequencia === "semanal" ? "semanal" : "mensal",
    });
    setErro("");
    setModalAberto(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.nome.trim()) {
      setErro("Informe o nome do investimento.");
      return;
    }
    if (!form.data) {
      setErro("Informe a data do investimento.");
      return;
    }
    if (form.repete && (!form.dataInicio || !form.dataFim)) {
      setErro("Informe data início e data fim para investimentos recorrentes.");
      return;
    }

    setSaving(true);
    setErro("");
    const payload = {
      nome: form.nome.trim(),
      canal: form.canal.trim(),
      valor: form.valor,
      data: form.data,
      repete: form.repete,
      dataInicio: form.repete ? form.dataInicio : "",
      dataFim: form.repete ? form.dataFim : "",
      frequencia: form.repete ? form.frequencia : "",
    };

    const result = editingId
      ? await updateInvestimento(editingId, payload)
      : await addInvestimento(payload);

    setSaving(false);
    if (!result.ok) {
      setErro(result.message || "Não foi possível salvar investimento.");
      return;
    }
    setModalAberto(false);
    setEditingId("");
    setForm(buildInitialForm());
  }

  async function handleDelete(item) {
    const id = String(item?.id || "");
    if (!id) return;
    if (!window.confirm(`Excluir investimento ${id}?`)) return;
    const result = await deleteInvestimento(id);
    if (!result.ok) {
      window.alert(result.message || "Não foi possível excluir investimento.");
    }
  }

  return (
    <div className="inv">
      <header className="inv-hero">
        <div className="inv-hero__copy">
          <span className="inv-hero__eyebrow">Marketing · Financeiro</span>
          <h1>Investimentos</h1>
          <p>Registo e controlo de investimentos do cliente</p>
        </div>

        <div className="inv-hero__side">
          <div className="inv-hero__stats">
            <div className="inv-stat">
              <span>Total</span>
              <strong>{resumo.total}</strong>
            </div>
            <div className="inv-stat inv-stat--money">
              <span>Valor</span>
              <strong>{moneyFormat(resumo.valorTotal)}</strong>
            </div>
            <div className="inv-stat inv-stat--active">
              <span>Recorrentes</span>
              <strong>{resumo.recorrentes}</strong>
            </div>
            <div className="inv-stat">
              <span>Canais</span>
              <strong>{resumo.canais}</strong>
            </div>
          </div>
          <button type="button" className="inv-hero__cta" onClick={openCreate}>
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Novo investimento
          </button>
        </div>
      </header>

      <section className="inv-toolbar" aria-label="Filtros">
        <label className="inv-toolbar__search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por ID, nome ou canal…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        <select value={filtroRepete} onChange={(e) => setFiltroRepete(e.target.value)}>
          <option value="todos">Todas recorrências</option>
          <option value="sim">Apenas recorrentes</option>
          <option value="nao">Apenas pontuais</option>
        </select>

        <select value={filtroFreq} onChange={(e) => setFiltroFreq(e.target.value)}>
          <option value="todas">Todas frequências</option>
          <option value="mensal">Mensal</option>
          <option value="semanal">Semanal</option>
        </select>
      </section>

      {itens.length === 0 ? (
        <div className="inv-empty">
          <strong>Nenhum investimento encontrado</strong>
          <p>
            {investimentos.length === 0
              ? "Comece registando o primeiro investimento de marketing."
              : "Ajuste os filtros ou experimente outro termo de busca."}
          </p>
        </div>
      ) : (
        <section className="inv-list" aria-label="Lista de investimentos">
          {itens.map((item) => (
            <article key={item.id} className="inv-card">
              <div className="inv-card__main">
                <div className="inv-card__top">
                  <span className="inv-card__id">{item.id}</span>
                  {item.canal ? (
                    <span className="inv-badge inv-badge--canal">{item.canal}</span>
                  ) : null}
                  <span
                    className={`inv-badge ${item.repete ? "inv-badge--recorrente" : "inv-badge--pontual"}`}
                  >
                    {item.repete ? "Recorrente" : "Pontual"}
                  </span>
                  {item.repete ? (
                    <span className="inv-badge inv-badge--freq">
                      {item.frequencia === "semanal" ? "Semanal" : "Mensal"}
                    </span>
                  ) : null}
                </div>
                <h2 className="inv-card__title">{item.nome}</h2>
                <div className="inv-card__meta">
                  <span>Data · {dateFormat(item.data)}</span>
                  {item.repete ? (
                    <span>
                      Período · {dateFormat(item.dataInicio)} – {dateFormat(item.dataFim)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="inv-card__valor">
                <strong>{moneyFormat(item.valor)}</strong>
                <span>valor</span>
              </div>

              <div className="inv-card__actions">
                <button
                  type="button"
                  className="inv-card__btn"
                  title="Editar investimento"
                  aria-label="Editar investimento"
                  onClick={() => openEdit(item)}
                >
                  <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="inv-card__btn inv-card__btn--danger"
                  title="Excluir investimento"
                  aria-label="Excluir investimento"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {itens.length > 0 ? (
        <p className="inv-foot">
          Mostrando {itens.length} de {investimentos.length} investimento
          {investimentos.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {modalAberto
        ? createPortal(
            <div
              className="plano-modal-backdrop"
              role="presentation"
              onClick={() => !saving && setModalAberto(false)}
            >
              <section
                className="plano-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="investimento-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="plano-modal__head">
                  <div className="plano-modal__head-main">
                    <span className="plano-modal__icon plano-modal__icon--cyan" aria-hidden="true">
                      <Wallet size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <span className="plano-modal__eyebrow">Marketing · Financeiro</span>
                      <h2 id="investimento-modal-title">
                        {editingId ? "Editar investimento" : "Novo investimento"}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="plano-modal__close"
                    disabled={saving}
                    onClick={() => setModalAberto(false)}
                    aria-label="Fechar modal"
                  >
                    <X size={18} strokeWidth={2} aria-hidden="true" />
                  </button>
                </header>

                <form className="plano-modal__form" onSubmit={handleSubmit}>
                  <div className="plano-modal__scroll">
                    <section className="plano-modal__panel" aria-labelledby="investimento-sec-dados">
                      <header className="plano-modal__panel-head plano-modal__panel-head--cyan">
                        <Wallet size={16} strokeWidth={2} aria-hidden="true" />
                        <h3 id="investimento-sec-dados">Dados do investimento</h3>
                      </header>
                      <div className="plano-modal__grid">
                        <label className="plano-modal__field plano-modal__field--full">
                          <span className="plano-modal__label">Nome do investimento</span>
                          <input
                            type="text"
                            className="plano-modal__input"
                            value={form.nome}
                            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                            required
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Canal</span>
                          <input
                            type="text"
                            className="plano-modal__input"
                            list="investimento-canais-sugestoes"
                            placeholder="Google Ads, Meta Ads…"
                            value={form.canal}
                            onChange={(e) => setForm((p) => ({ ...p, canal: e.target.value }))}
                          />
                          {canaisCadastrados.length ? (
                            <datalist id="investimento-canais-sugestoes">
                              {canaisCadastrados.map((canal) => (
                                <option key={canal} value={canal} />
                              ))}
                            </datalist>
                          ) : null}
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Valor (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="plano-modal__input"
                            value={form.valor}
                            onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                            required
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Data</span>
                          <input
                            type="date"
                            className="plano-modal__input"
                            value={form.data}
                            onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                            required
                          />
                        </label>
                      </div>
                    </section>

                    <section className="plano-modal__panel" aria-labelledby="investimento-sec-recorrencia">
                      <header className="plano-modal__panel-head plano-modal__panel-head--cyan">
                        <Repeat size={16} strokeWidth={2} aria-hidden="true" />
                        <h3 id="investimento-sec-recorrencia">Recorrência</h3>
                      </header>
                      <div className="plano-modal__grid plano-modal__grid--2">
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Repete?</span>
                          <select
                            className="plano-modal__input plano-modal__select"
                            value={form.repete ? "sim" : "nao"}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, repete: e.target.value === "sim" }))
                            }
                          >
                            <option value="nao">Não — pontual</option>
                            <option value="sim">Sim — recorrente</option>
                          </select>
                        </label>
                        {form.repete ? (
                          <label className="plano-modal__field">
                            <span className="plano-modal__label">Frequência</span>
                            <select
                              className="plano-modal__input plano-modal__select"
                              value={form.frequencia}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, frequencia: e.target.value }))
                              }
                            >
                              <option value="mensal">Mensal</option>
                              <option value="semanal">Semanal</option>
                            </select>
                          </label>
                        ) : null}
                      </div>

                      {form.repete ? (
                        <div className="inv-modal__recurrence plano-modal__grid plano-modal__grid--2">
                          <label className="plano-modal__field">
                            <span className="plano-modal__label">Data início</span>
                            <input
                              type="date"
                              className="plano-modal__input"
                              value={form.dataInicio}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, dataInicio: e.target.value }))
                              }
                              required
                            />
                          </label>
                          <label className="plano-modal__field">
                            <span className="plano-modal__label">Data fim</span>
                            <input
                              type="date"
                              className="plano-modal__input"
                              value={form.dataFim}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, dataFim: e.target.value }))
                              }
                              required
                            />
                          </label>
                        </div>
                      ) : null}
                    </section>

                    {erro ? (
                      <p className="plano-modal__error" role="alert">
                        {erro}
                      </p>
                    ) : null}
                  </div>

                  <footer className="plano-modal__foot">
                    <button
                      type="button"
                      className="plano-modal__btn plano-modal__btn--ghost"
                      disabled={saving}
                      onClick={() => setModalAberto(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="plano-modal__btn plano-modal__btn--cyan"
                      disabled={saving}
                    >
                      {saving
                        ? "A guardar…"
                        : editingId
                          ? "Guardar alterações"
                          : "Guardar investimento"}
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

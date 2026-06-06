import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Calculator,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

function moneyFormat(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentFormat(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function numberFormat(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function competenciaFormat(val) {
  const m = String(val || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return val || "—";
  return `${m[2]}/${m[1]}`;
}

function buildInitialForm() {
  return {
    competencia: "",
    canal: "",
    investimento: "",
    leads: "",
    oportunidades: "",
    vendasNumero: "",
    faturamentoAquisicao: "",
    margemContribuicao: "30",
  };
}

function kpiSourceLabel(source) {
  if (source === "meta_ads") return "Meta";
  if (source === "google_ads") return "Google";
  return "";
}

function safeDiv(num, den) {
  const d = Number(den || 0);
  if (d <= 0) return 0;
  return Number(num || 0) / d;
}

export default function KpisPage() {
  const { kpisMarketing, addKpiMarketing, updateKpiMarketing, deleteKpiMarketing } =
    useClientData();
  const [modalAberto, setModalAberto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(buildInitialForm);
  const [busca, setBusca] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("todos");

  const canaisCadastrados = useMemo(
    () =>
      [...new Set(kpisMarketing.map((k) => String(k?.canal || "").trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }),
      ),
    [kpisMarketing],
  );

  const resumo = useMemo(() => {
    const total = kpisMarketing.length;
    const investimentoTotal = kpisMarketing.reduce(
      (acc, k) => acc + Number(k.investimento || 0),
      0,
    );
    const leadsTotal = kpisMarketing.reduce((acc, k) => acc + Number(k.leads || 0), 0);
    const contribuicaoTotal = kpisMarketing.reduce((acc, k) => {
      const fat = Number(k.faturamentoAquisicao || 0);
      const margem = Number(k.margemContribuicao || 0);
      return acc + fat * (margem / 100);
    }, 0);
    const roiAgregado = investimentoTotal > 0 ? contribuicaoTotal / investimentoTotal : 0;
    return { total, investimentoTotal, leadsTotal, roiAgregado };
  }, [kpisMarketing]);

  const preview = useMemo(() => {
    const investimento = Number(form.investimento || 0);
    const leads = Number(form.leads || 0);
    const oportunidades = Number(form.oportunidades || 0);
    const vendasNumero = Number(form.vendasNumero || 0);
    const faturamentoAquisicao = Number(form.faturamentoAquisicao || 0);
    const margemContribuicao = Number(form.margemContribuicao || 0);
    const cpl = safeDiv(investimento, leads);
    const cpo = safeDiv(investimento, oportunidades);
    const conversaoFunil = safeDiv(oportunidades * 100, leads);
    const cpv = safeDiv(investimento, vendasNumero);
    const ticketMedio = safeDiv(faturamentoAquisicao, vendasNumero);
    const txConvOportunidades = safeDiv(oportunidades * 100, leads);
    const txConvVendas = safeDiv(vendasNumero * 100, oportunidades);
    const roiDireto = safeDiv(faturamentoAquisicao * (margemContribuicao / 100), investimento);
    return {
      cpl,
      cpo,
      conversaoFunil,
      cpv,
      ticketMedio,
      txConvOportunidades,
      txConvVendas,
      roiDireto,
    };
  }, [form]);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...kpisMarketing]
      .filter((item) => {
        const competencia = String(item?.competencia || "").toLowerCase();
        const canal = String(item?.canal || "").toLowerCase();
        const id = String(item?.id || "").toLowerCase();
        const matchBusca =
          !termo || competencia.includes(termo) || canal.includes(termo) || id.includes(termo);
        const source = String(item?.source || "");
        const matchOrigem =
          filtroOrigem === "todos" ||
          (filtroOrigem === "manual" && !source) ||
          (filtroOrigem === "meta_ads" && source === "meta_ads") ||
          (filtroOrigem === "google_ads" && source === "google_ads");
        return matchBusca && matchOrigem;
      })
      .sort((a, b) => String(b?.competencia || "").localeCompare(String(a?.competencia || "")));
  }, [kpisMarketing, busca, filtroOrigem]);

  function openCreate() {
    setEditingId("");
    setForm(buildInitialForm());
    setErro("");
    setModalAberto(true);
  }

  function openEdit(item) {
    setEditingId(String(item.id || ""));
    setForm({
      competencia: String(item.competencia || ""),
      canal: String(item.canal || ""),
      investimento: String(item.investimento ?? ""),
      leads: String(item.leads ?? ""),
      oportunidades: String(item.oportunidades ?? ""),
      vendasNumero: String(item.vendasNumero ?? ""),
      faturamentoAquisicao: String(item.faturamentoAquisicao ?? ""),
      margemContribuicao: String(item.margemContribuicao ?? "30"),
    });
    setErro("");
    setModalAberto(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.competencia.trim()) {
      setErro("Informe a competência (mês/ano).");
      return;
    }
    if (Number(form.investimento || 0) <= 0) {
      setErro("Informe investimento maior que zero.");
      return;
    }
    setSaving(true);
    setErro("");
    const payload = {
      competencia: form.competencia.trim(),
      canal: form.canal.trim(),
      investimento: form.investimento,
      leads: form.leads,
      oportunidades: form.oportunidades,
      vendasNumero: form.vendasNumero,
      faturamentoAquisicao: form.faturamentoAquisicao,
      margemContribuicao: form.margemContribuicao,
    };
    const result = editingId
      ? await updateKpiMarketing(editingId, payload)
      : await addKpiMarketing(payload);
    setSaving(false);
    if (!result.ok) {
      setErro(result.message || "Não foi possível salvar KPI.");
      return;
    }
    setModalAberto(false);
    setEditingId("");
    setForm(buildInitialForm());
  }

  async function handleDelete(item) {
    const id = String(item?.id || "");
    if (!id) return;
    if (!window.confirm(`Excluir KPI ${id}?`)) return;
    const result = await deleteKpiMarketing(id);
    if (!result.ok) {
      window.alert(result.message || "Não foi possível excluir KPI.");
    }
  }

  return (
    <div className="kpiw">
      <header className="kpiw-hero">
        <div className="kpiw-hero__copy">
          <span className="kpiw-hero__eyebrow">Marketing · Indicadores</span>
          <h1>KPIs de Marketing</h1>
          <p>Base mensal de performance — CPL, CPO, conversões e ROI direto</p>
        </div>

        <div className="kpiw-hero__side">
          <div className="kpiw-hero__stats">
            <div className="kpiw-stat">
              <span>Registos</span>
              <strong>{resumo.total}</strong>
            </div>
            <div className="kpiw-stat kpiw-stat--invest">
              <span>Investimento</span>
              <strong>{moneyFormat(resumo.investimentoTotal)}</strong>
            </div>
            <div className="kpiw-stat kpiw-stat--leads">
              <span>Leads</span>
              <strong>{numberFormat(resumo.leadsTotal)}</strong>
            </div>
            <div className="kpiw-stat kpiw-stat--roi">
              <span>ROI agregado</span>
              <strong>{resumo.roiAgregado.toFixed(2)}x</strong>
            </div>
          </div>
          <button type="button" className="kpiw-hero__cta" onClick={openCreate}>
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Novo KPI
          </button>
        </div>
      </header>

      <section className="kpiw-toolbar" aria-label="Filtros">
        <label className="kpiw-toolbar__search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por ID, competência ou canal…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        <select value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)}>
          <option value="todos">Todas origens</option>
          <option value="manual">Manual</option>
          <option value="meta_ads">Meta Ads</option>
          <option value="google_ads">Google Ads</option>
        </select>
      </section>

      {itens.length === 0 ? (
        <div className="kpiw-empty">
          <strong>Nenhum KPI encontrado</strong>
          <p>
            {kpisMarketing.length === 0
              ? "Cadastre o primeiro lançamento mensal de performance."
              : "Ajuste os filtros ou experimente outro termo de busca."}
          </p>
        </div>
      ) : (
        <section className="kpiw-list" aria-label="Lista de KPIs">
          {itens.map((item) => (
            <article key={item.id} className="kpiw-card">
              <div className="kpiw-card__head">
                <div className="kpiw-card__identity">
                  <div className="kpiw-card__top">
                    <span className="kpiw-card__id">{item.id}</span>
                    {item.canal ? (
                      <span className="kpiw-badge kpiw-badge--canal">{item.canal}</span>
                    ) : null}
                    {item.source ? (
                      <span
                        className="kpiw-badge kpiw-badge--sync"
                        title="Sincronizado automaticamente"
                      >
                        {kpiSourceLabel(item.source) || "Sync"}
                      </span>
                    ) : (
                      <span className="kpiw-badge kpiw-badge--manual">Manual</span>
                    )}
                  </div>
                  <h2 className="kpiw-card__title">
                    Competência · {competenciaFormat(item.competencia)}
                  </h2>
                </div>

                <div className="kpiw-card__actions">
                  <button
                    type="button"
                    className="kpiw-card__btn"
                    title="Editar KPI"
                    aria-label="Editar KPI"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="kpiw-card__btn kpiw-card__btn--danger"
                    title="Excluir KPI"
                    aria-label="Excluir KPI"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="kpiw-card__funnel">
                <div className="kpiw-funnel kpiw-funnel--invest">
                  <span>Investimento</span>
                  <strong>{moneyFormat(item.investimento)}</strong>
                </div>
                <div className="kpiw-funnel kpiw-funnel--leads">
                  <span>Leads</span>
                  <strong>{numberFormat(item.leads)}</strong>
                </div>
                <div className="kpiw-funnel kpiw-funnel--opp">
                  <span>Oportunidades</span>
                  <strong>{numberFormat(item.oportunidades)}</strong>
                </div>
                <div className="kpiw-funnel kpiw-funnel--sales">
                  <span>Vendas</span>
                  <strong>{numberFormat(item.vendasNumero)}</strong>
                </div>
              </div>

              <div className="kpiw-card__kpis">
                <div className="kpiw-kpi">
                  <span>CPL</span>
                  <strong>{moneyFormat(item.cpl)}</strong>
                </div>
                <div className="kpiw-kpi">
                  <span>CPO</span>
                  <strong>{moneyFormat(item.cpo)}</strong>
                </div>
                <div className="kpiw-kpi">
                  <span>Conv. funil</span>
                  <strong>{percentFormat(item.conversaoFunil)}</strong>
                </div>
                <div className="kpiw-kpi">
                  <span>CPV</span>
                  <strong>{moneyFormat(item.cpv)}</strong>
                </div>
                <div className="kpiw-kpi">
                  <span>Ticket médio</span>
                  <strong>{moneyFormat(item.ticketMedio)}</strong>
                </div>
                <div className="kpiw-kpi kpiw-kpi--roi">
                  <span>ROI direto</span>
                  <strong>{Number(item.roiDireto || 0).toFixed(2)}x</strong>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {itens.length > 0 ? (
        <p className="kpiw-foot">
          Mostrando {itens.length} de {kpisMarketing.length} registo
          {kpisMarketing.length === 1 ? "" : "s"}
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
                aria-labelledby="kpi-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="plano-modal__head">
                  <div className="plano-modal__head-main">
                    <span
                      className="plano-modal__icon plano-modal__icon--emerald"
                      aria-hidden="true"
                    >
                      <BarChart3 size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <span className="plano-modal__eyebrow">Marketing · Indicadores</span>
                      <h2 id="kpi-modal-title">{editingId ? "Editar KPI" : "Novo KPI"}</h2>
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
                    <section className="plano-modal__panel" aria-labelledby="kpi-sec-base">
                      <header className="plano-modal__panel-head plano-modal__panel-head--emerald">
                        <Layers size={16} strokeWidth={2} aria-hidden="true" />
                        <h3 id="kpi-sec-base">Base mensal</h3>
                      </header>
                      <div className="plano-modal__grid plano-modal__grid--2">
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Competência (mês/ano)</span>
                          <input
                            type="month"
                            className="plano-modal__input"
                            value={form.competencia}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, competencia: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Canal</span>
                          <input
                            type="text"
                            className="plano-modal__input"
                            list="kpi-canais-sugestoes"
                            placeholder="Ex.: Meta Ads"
                            value={form.canal}
                            onChange={(e) => setForm((p) => ({ ...p, canal: e.target.value }))}
                          />
                          {canaisCadastrados.length ? (
                            <datalist id="kpi-canais-sugestoes">
                              {canaisCadastrados.map((canal) => (
                                <option key={canal} value={canal} />
                              ))}
                            </datalist>
                          ) : null}
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Investimento (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="plano-modal__input"
                            value={form.investimento}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, investimento: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Leads</span>
                          <input
                            type="number"
                            min="0"
                            className="plano-modal__input"
                            value={form.leads}
                            onChange={(e) => setForm((p) => ({ ...p, leads: e.target.value }))}
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Oportunidades</span>
                          <input
                            type="number"
                            min="0"
                            className="plano-modal__input"
                            value={form.oportunidades}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, oportunidades: e.target.value }))
                            }
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Vendas (nº)</span>
                          <input
                            type="number"
                            min="0"
                            className="plano-modal__input"
                            value={form.vendasNumero}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, vendasNumero: e.target.value }))
                            }
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Faturamento de aquisição (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="plano-modal__input"
                            value={form.faturamentoAquisicao}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, faturamentoAquisicao: e.target.value }))
                            }
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Margem de contribuição (%)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="plano-modal__input"
                            value={form.margemContribuicao}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, margemContribuicao: e.target.value }))
                            }
                          />
                        </label>
                      </div>
                    </section>

                    <section className="plano-modal__panel" aria-labelledby="kpi-sec-preview">
                      <header className="plano-modal__panel-head plano-modal__panel-head--emerald">
                        <Calculator size={16} strokeWidth={2} aria-hidden="true" />
                        <h3 id="kpi-sec-preview">Cálculo automático</h3>
                      </header>
                      <div className="kpiw-modal__preview" aria-live="polite">
                        <p className="kpiw-modal__preview-title">Indicadores derivados</p>
                        <div className="kpiw-modal__preview-grid">
                          <div className="kpiw-preview-item">
                            <span>CPL</span>
                            <strong>{moneyFormat(preview.cpl)}</strong>
                          </div>
                          <div className="kpiw-preview-item">
                            <span>CPO</span>
                            <strong>{moneyFormat(preview.cpo)}</strong>
                          </div>
                          <div className="kpiw-preview-item">
                            <span>Conv. funil</span>
                            <strong>{percentFormat(preview.conversaoFunil)}</strong>
                          </div>
                          <div className="kpiw-preview-item">
                            <span>CPV</span>
                            <strong>{moneyFormat(preview.cpv)}</strong>
                          </div>
                          <div className="kpiw-preview-item">
                            <span>Ticket médio</span>
                            <strong>{moneyFormat(preview.ticketMedio)}</strong>
                          </div>
                          <div className="kpiw-preview-item">
                            <span>ROI direto</span>
                            <strong>{preview.roiDireto.toFixed(2)}x</strong>
                          </div>
                        </div>
                      </div>
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
                      className="plano-modal__btn plano-modal__btn--emerald"
                      disabled={saving}
                    >
                      {saving
                        ? "A guardar…"
                        : editingId
                          ? "Guardar alterações"
                          : "Guardar KPI"}
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

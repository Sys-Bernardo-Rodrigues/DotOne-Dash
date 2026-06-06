import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
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

function roiFormat(value) {
  const n = Number(value || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function roiTone(value) {
  const n = Number(value || 0);
  if (n > 0) return "pos";
  if (n < 0) return "neg";
  return "neu";
}

function buildInitialForm() {
  return {
    nome: "",
    investimentoTrafego: "",
    faturamento: "",
    data: "",
  };
}

export default function CampanhasMarketingPage() {
  const {
    campanhasMarketing,
    addCampanhaMarketing,
    updateCampanhaMarketing,
    deleteCampanhaMarketing,
  } = useClientData();

  const [modalAberto, setModalAberto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(buildInitialForm);
  const [busca, setBusca] = useState("");
  const [filtroRoi, setFiltroRoi] = useState("todos");

  const resumo = useMemo(() => {
    const total = campanhasMarketing.length;
    const investimentoTotal = campanhasMarketing.reduce(
      (acc, c) => acc + Number(c.investimentoTrafego || 0),
      0,
    );
    const faturamentoTotal = campanhasMarketing.reduce(
      (acc, c) => acc + Number(c.faturamento || 0),
      0,
    );
    const roiAgregado =
      investimentoTotal > 0
        ? ((faturamentoTotal - investimentoTotal) / investimentoTotal) * 100
        : 0;
    return { total, investimentoTotal, faturamentoTotal, roiAgregado };
  }, [campanhasMarketing]);

  const roiPreview = useMemo(() => {
    const inv = Number(form.investimentoTrafego || 0);
    const fat = Number(form.faturamento || 0);
    if (!Number.isFinite(inv) || inv <= 0 || !Number.isFinite(fat)) return 0;
    return ((fat - inv) / inv) * 100;
  }, [form.investimentoTrafego, form.faturamento]);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...campanhasMarketing]
      .filter((item) => {
        const nome = String(item?.nome || "").toLowerCase();
        const id = String(item?.id || "").toLowerCase();
        const matchBusca = !termo || nome.includes(termo) || id.includes(termo);
        const tone = roiTone(item?.roi);
        const matchRoi =
          filtroRoi === "todos" ||
          (filtroRoi === "positivo" && tone === "pos") ||
          (filtroRoi === "negativo" && tone === "neg") ||
          (filtroRoi === "neutro" && tone === "neu");
        return matchBusca && matchRoi;
      })
      .sort((a, b) => String(b?.data || "").localeCompare(String(a?.data || "")));
  }, [campanhasMarketing, busca, filtroRoi]);

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
      investimentoTrafego: String(item.investimentoTrafego ?? ""),
      faturamento: String(item.faturamento ?? ""),
      data: String(item.data || ""),
    });
    setErro("");
    setModalAberto(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.nome.trim()) {
      setErro("Informe o nome da campanha.");
      return;
    }
    if (Number(form.investimentoTrafego || 0) <= 0) {
      setErro("Informe um investimento de tráfego maior que zero.");
      return;
    }
    setSaving(true);
    setErro("");
    const payload = {
      nome: form.nome.trim(),
      investimentoTrafego: form.investimentoTrafego,
      faturamento: form.faturamento,
      data: form.data,
    };
    const result = editingId
      ? await updateCampanhaMarketing(editingId, payload)
      : await addCampanhaMarketing(payload);
    setSaving(false);
    if (!result.ok) {
      setErro(result.message || "Não foi possível salvar campanha.");
      return;
    }
    setModalAberto(false);
    setEditingId("");
    setForm(buildInitialForm());
  }

  async function handleDelete(item) {
    const id = String(item?.id || "");
    if (!id) return;
    if (!window.confirm(`Excluir campanha ${id}?`)) return;
    const result = await deleteCampanhaMarketing(id);
    if (!result.ok) {
      window.alert(result.message || "Não foi possível excluir campanha.");
    }
  }

  const previewTone = roiTone(roiPreview);

  return (
    <div className="cmp">
      <header className="cmp-hero">
        <div className="cmp-hero__copy">
          <span className="cmp-hero__eyebrow">Marketing · Performance</span>
          <h1>Campanhas de Marketing</h1>
          <p>Investimento em tráfego, faturamento e ROI por campanha</p>
        </div>

        <div className="cmp-hero__side">
          <div className="cmp-hero__stats">
            <div className="cmp-stat">
              <span>Campanhas</span>
              <strong>{resumo.total}</strong>
            </div>
            <div className="cmp-stat cmp-stat--invest">
              <span>Tráfego</span>
              <strong>{moneyFormat(resumo.investimentoTotal)}</strong>
            </div>
            <div className="cmp-stat cmp-stat--revenue">
              <span>Faturamento</span>
              <strong>{moneyFormat(resumo.faturamentoTotal)}</strong>
            </div>
            <div className="cmp-stat cmp-stat--roi">
              <span>ROI agregado</span>
              <strong>{roiFormat(resumo.roiAgregado)}</strong>
            </div>
          </div>
          <button type="button" className="cmp-hero__cta" onClick={openCreate}>
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Nova campanha
          </button>
        </div>
      </header>

      <section className="cmp-toolbar" aria-label="Filtros">
        <label className="cmp-toolbar__search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por ID ou nome da campanha…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        <select value={filtroRoi} onChange={(e) => setFiltroRoi(e.target.value)}>
          <option value="todos">Todos os ROI</option>
          <option value="positivo">ROI positivo</option>
          <option value="negativo">ROI negativo</option>
          <option value="neutro">ROI neutro</option>
        </select>
      </section>

      {itens.length === 0 ? (
        <div className="cmp-empty">
          <strong>Nenhuma campanha encontrada</strong>
          <p>
            {campanhasMarketing.length === 0
              ? "Registe a primeira campanha para acompanhar tráfego e retorno."
              : "Ajuste os filtros ou experimente outro termo de busca."}
          </p>
        </div>
      ) : (
        <section className="cmp-list" aria-label="Lista de campanhas">
          {itens.map((item) => {
            const tone = roiTone(item.roi);
            return (
              <article key={item.id} className="cmp-card">
                <div className="cmp-card__main">
                  <div className="cmp-card__top">
                    <span className="cmp-card__id">{item.id}</span>
                    <span className={`cmp-badge cmp-badge--roi-${tone}`}>
                      ROI {roiFormat(item.roi)}
                    </span>
                  </div>
                  <h2 className="cmp-card__title">{item.nome}</h2>
                  <p className="cmp-card__meta">Data · {dateFormat(item.data)}</p>
                </div>

                <div className="cmp-card__metrics">
                  <div className="cmp-metric cmp-metric--invest">
                    <span>Tráfego</span>
                    <strong>{moneyFormat(item.investimentoTrafego)}</strong>
                  </div>
                  <div className="cmp-metric cmp-metric--revenue">
                    <span>Faturamento</span>
                    <strong>{moneyFormat(item.faturamento)}</strong>
                  </div>
                  <div className={`cmp-metric cmp-metric--roi cmp-metric--roi-${tone}`}>
                    <span>ROI</span>
                    <strong>{roiFormat(item.roi)}</strong>
                  </div>
                </div>

                <div className="cmp-card__actions">
                  <button
                    type="button"
                    className="cmp-card__btn"
                    title="Editar campanha"
                    aria-label="Editar campanha"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="cmp-card__btn cmp-card__btn--danger"
                    title="Excluir campanha"
                    aria-label="Excluir campanha"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {itens.length > 0 ? (
        <p className="cmp-foot">
          Mostrando {itens.length} de {campanhasMarketing.length} campanha
          {campanhasMarketing.length === 1 ? "" : "s"}
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
                aria-labelledby="campanha-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="plano-modal__head">
                  <div className="plano-modal__head-main">
                    <span className="plano-modal__icon" aria-hidden="true">
                      <Megaphone size={20} strokeWidth={2} />
                    </span>
                    <div>
                      <span className="plano-modal__eyebrow">Marketing · Performance</span>
                      <h2 id="campanha-modal-title">
                        {editingId ? "Editar campanha" : "Nova campanha"}
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
                    <section className="plano-modal__panel" aria-labelledby="campanha-sec-dados">
                      <header className="plano-modal__panel-head">
                        <Megaphone size={16} strokeWidth={2} aria-hidden="true" />
                        <h3 id="campanha-sec-dados">Identificação</h3>
                      </header>
                      <div className="plano-modal__grid">
                        <label className="plano-modal__field plano-modal__field--full">
                          <span className="plano-modal__label">Nome da campanha</span>
                          <input
                            type="text"
                            className="plano-modal__input"
                            value={form.nome}
                            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
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
                          />
                        </label>
                      </div>
                    </section>

                    <section className="plano-modal__panel" aria-labelledby="campanha-sec-resultados">
                      <header className="plano-modal__panel-head">
                        <BarChart3 size={16} strokeWidth={2} aria-hidden="true" />
                        <h3 id="campanha-sec-resultados">Resultados financeiros</h3>
                      </header>
                      <div className="plano-modal__grid plano-modal__grid--2">
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Investimento de tráfego (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="plano-modal__input"
                            value={form.investimentoTrafego}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, investimentoTrafego: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label className="plano-modal__field">
                          <span className="plano-modal__label">Faturamento (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="plano-modal__input"
                            value={form.faturamento}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, faturamento: e.target.value }))
                            }
                            required
                          />
                        </label>
                      </div>

                      <div
                        className={`cmp-modal__roi cmp-modal__roi--${previewTone}`}
                        aria-live="polite"
                      >
                        <span>
                          <TrendingUp
                            size={14}
                            strokeWidth={2}
                            aria-hidden="true"
                            style={{ verticalAlign: "-2px", marginRight: 6 }}
                          />
                          ROI calculado automaticamente
                        </span>
                        <strong>{roiFormat(roiPreview)}</strong>
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
                      className="plano-modal__btn plano-modal__btn--primary"
                      disabled={saving}
                    >
                      {saving
                        ? "A guardar…"
                        : editingId
                          ? "Guardar alterações"
                          : "Guardar campanha"}
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

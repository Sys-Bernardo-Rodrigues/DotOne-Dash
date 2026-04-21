import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
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

function safeDiv(num, den) {
  const d = Number(den || 0);
  if (d <= 0) return 0;
  return Number(num || 0) / d;
}

export default function KpisPage() {
  const { kpisMarketing, addKpiMarketing, updateKpiMarketing, deleteKpiMarketing } = useClientData();
  const [modalAberto, setModalAberto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(buildInitialForm);

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
    const roiDireto = safeDiv(
      faturamentoAquisicao * (margemContribuicao / 100),
      investimento
    );
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

  const itens = useMemo(
    () =>
      [...kpisMarketing].sort((a, b) =>
        String(b?.competencia || "").localeCompare(String(a?.competencia || ""))
      ),
    [kpisMarketing]
  );

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
    <>
      <PageHeader
        title="KPIs de Marketing"
        subtitle="Cadastro de indicadores conforme planilha de performance"
        action={
          <div className="header-actions">
            <button type="button" className="btn-secondary" onClick={openCreate}>
              Novo KPI
            </button>
          </div>
        }
      />

      <section className="card">
        <div className="table-scroll">
          <table className="timeline-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Competência</th>
                <th>Canal</th>
                <th>Investimento</th>
                <th>Leads</th>
                <th>Oportunidades</th>
                <th>CPL</th>
                <th>CPO</th>
                <th>Conversão Funil</th>
                <th>CPV</th>
                <th>Ticket Médio</th>
                <th>ROI Direto</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.length ? (
                itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.competencia}</td>
                    <td>{item.canal || "—"}</td>
                    <td>{moneyFormat(item.investimento)}</td>
                    <td>{numberFormat(item.leads)}</td>
                    <td>{numberFormat(item.oportunidades)}</td>
                    <td>{moneyFormat(item.cpl)}</td>
                    <td>{moneyFormat(item.cpo)}</td>
                    <td>{percentFormat(item.conversaoFunil)}</td>
                    <td>{moneyFormat(item.cpv)}</td>
                    <td>{moneyFormat(item.ticketMedio)}</td>
                    <td>{item.roiDireto?.toFixed?.(2) ?? "0.00"}x</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar KPI"
                          aria-label="Editar KPI"
                          onClick={() => openEdit(item)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Excluir KPI"
                          aria-label="Excluir KPI"
                          onClick={() => handleDelete(item)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 7h12v2H6V7zm2 3h8l-.7 10H8.7L8 10zm3-6h2l1 1h4v2H6V5h4l1-1z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13}>Nenhum KPI cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalAberto ? (
        <div
          className="adm-modal-backdrop plano-modal-backdrop"
          role="presentation"
          onClick={() => !saving && setModalAberto(false)}
        >
          <section
            className="plano-acao-modal investimento-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kpi-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="plano-modal-header-pro">
              <div className="plano-modal-header-brand" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="plano-modal-header-icon-svg">
                  <path d="M4 4h16v2H4V4zm0 7h10v2H4v-2zm0 7h7v2H4v-2zm12-8h4v10h-4V10z" />
                </svg>
              </div>
              <div className="plano-modal-header-copy">
                <p className="plano-modal-kicker">Indicadores</p>
                <h2 id="kpi-modal-title">{editingId ? "Editar KPI" : "Novo KPI de marketing"}</h2>
              </div>
              <button
                type="button"
                className="plano-modal-close"
                onClick={() => setModalAberto(false)}
                disabled={saving}
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
              Cadastre a base mensal e o sistema calcula automaticamente CPL, CPO, conversões, CPV, ticket médio e ROI direto.
            </p>

            <form className="plano-5w2h-form" onSubmit={handleSubmit}>
              <section className="plano-modal-section" aria-labelledby="kpi-sec-base">
                <h3 id="kpi-sec-base" className="plano-modal-section-title">
                  Base mensal
                </h3>
                <div className="plano-modal-section-grid plano-modal-duo">
                  <label className="plano-field">
                    <span className="plano-field-label">Competência (mês/ano)</span>
                    <input
                      type="month"
                      className="filter-input plano-input-pro"
                      value={form.competencia}
                      onChange={(e) => setForm((p) => ({ ...p, competencia: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Canal</span>
                    <input
                      type="text"
                      className="filter-input plano-input-pro"
                      placeholder="Ex.: Meta Ads"
                      value={form.canal}
                      onChange={(e) => setForm((p) => ({ ...p, canal: e.target.value }))}
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Investimento (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="filter-input plano-input-pro"
                      value={form.investimento}
                      onChange={(e) => setForm((p) => ({ ...p, investimento: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Leads</span>
                    <input
                      type="number"
                      min="0"
                      className="filter-input plano-input-pro"
                      value={form.leads}
                      onChange={(e) => setForm((p) => ({ ...p, leads: e.target.value }))}
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Oportunidades</span>
                    <input
                      type="number"
                      min="0"
                      className="filter-input plano-input-pro"
                      value={form.oportunidades}
                      onChange={(e) => setForm((p) => ({ ...p, oportunidades: e.target.value }))}
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Vendas (nº)</span>
                    <input
                      type="number"
                      min="0"
                      className="filter-input plano-input-pro"
                      value={form.vendasNumero}
                      onChange={(e) => setForm((p) => ({ ...p, vendasNumero: e.target.value }))}
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Faturamento de Aquisição (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="filter-input plano-input-pro"
                      value={form.faturamentoAquisicao}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, faturamentoAquisicao: e.target.value }))
                      }
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Margem de Contribuição (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="filter-input plano-input-pro"
                      value={form.margemContribuicao}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, margemContribuicao: e.target.value }))
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="plano-modal-section" aria-labelledby="kpi-sec-preview">
                <h3 id="kpi-sec-preview" className="plano-modal-section-title">
                  Cálculo automático
                </h3>
                <div className="plano-modal-section-grid plano-modal-trio">
                  <label className="plano-field">
                    <span className="plano-field-label">CPL</span>
                    <input className="filter-input plano-input-pro" value={moneyFormat(preview.cpl)} readOnly />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">CPO</span>
                    <input className="filter-input plano-input-pro" value={moneyFormat(preview.cpo)} readOnly />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Conversão Funil</span>
                    <input className="filter-input plano-input-pro" value={percentFormat(preview.conversaoFunil)} readOnly />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">CPV</span>
                    <input className="filter-input plano-input-pro" value={moneyFormat(preview.cpv)} readOnly />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Ticket Médio</span>
                    <input className="filter-input plano-input-pro" value={moneyFormat(preview.ticketMedio)} readOnly />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">ROI Direto</span>
                    <input className="filter-input plano-input-pro" value={`${preview.roiDireto.toFixed(2)}x`} readOnly />
                  </label>
                </div>
              </section>

              {erro ? (
                <p className="plano-form-error" role="alert">
                  {erro}
                </p>
              ) : null}

              <div className="plano-modal-actions plano-modal-footer-pro">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalAberto(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary plano-modal-submit" disabled={saving}>
                  {saving ? "A guardar..." : editingId ? "Guardar alterações" : "Guardar KPI"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useClientData } from "../context/ClientDataContext";

function moneyFormat(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function roiFormat(value) {
  const n = Number(value || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function roiClass(value) {
  const n = Number(value || 0);
  if (n > 0) return "chip ok";
  if (n < 0) return "chip atraso";
  return "chip pendente";
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

  const roiPreview = useMemo(() => {
    const inv = Number(form.investimentoTrafego || 0);
    const fat = Number(form.faturamento || 0);
    if (!Number.isFinite(inv) || inv <= 0 || !Number.isFinite(fat)) return 0;
    return ((fat - inv) / inv) * 100;
  }, [form.investimentoTrafego, form.faturamento]);

  const itens = useMemo(
    () =>
      [...campanhasMarketing].sort((a, b) =>
        String(b?.data || "").localeCompare(String(a?.data || ""))
      ),
    [campanhasMarketing]
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

  return (
    <>
      <PageHeader
        title="Campanhas de Marketing"
        subtitle="Acompanhe investimento em tráfego, faturamento e ROI"
        action={
          <div className="header-actions">
            <button type="button" className="btn-secondary" onClick={openCreate}>
              Nova campanha
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
                <th>Campanha</th>
                <th>Investimento de Tráfego</th>
                <th>Faturamento</th>
                <th>ROI</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.length ? (
                itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.nome}</td>
                    <td>{moneyFormat(item.investimentoTrafego)}</td>
                    <td>{moneyFormat(item.faturamento)}</td>
                    <td>
                      <span className={roiClass(item.roi)}>{roiFormat(item.roi)}</span>
                    </td>
                    <td>{item.data || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar campanha"
                          aria-label="Editar campanha"
                          onClick={() => openEdit(item)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Excluir campanha"
                          aria-label="Excluir campanha"
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
                  <td colSpan={7}>Nenhuma campanha cadastrada.</td>
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
            aria-labelledby="campanha-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="plano-modal-header-pro">
              <div className="plano-modal-header-brand" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="plano-modal-header-icon-svg">
                  <path d="M3 19h18v2H3v-2zm2-2V7h3v10H5zm5 0V3h3v14h-3zm5 0v-8h3v8h-3z" />
                </svg>
              </div>
              <div className="plano-modal-header-copy">
                <p className="plano-modal-kicker">Performance</p>
                <h2 id="campanha-modal-title">
                  {editingId ? "Editar campanha" : "Nova campanha de marketing"}
                </h2>
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
              Registre o investimento de tráfego e o faturamento para calcular automaticamente o ROI da campanha.
            </p>

            <form className="plano-5w2h-form" onSubmit={handleSubmit}>
              <section className="plano-modal-section" aria-labelledby="campanha-sec-dados">
                <h3 id="campanha-sec-dados" className="plano-modal-section-title">
                  Dados da campanha
                </h3>
                <div className="plano-modal-section-grid plano-modal-duo">
                  <label className="plano-field plano-field-span-2">
                    <span className="plano-field-label">Campanha</span>
                    <input
                      type="text"
                      className="filter-input plano-input-pro"
                      value={form.nome}
                      onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Investimento do Tráfego</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="filter-input plano-input-pro"
                      value={form.investimentoTrafego}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, investimentoTrafego: e.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Faturamento</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="filter-input plano-input-pro"
                      value={form.faturamento}
                      onChange={(e) => setForm((p) => ({ ...p, faturamento: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Data</span>
                    <input
                      type="date"
                      className="filter-input plano-input-pro"
                      value={form.data}
                      onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">ROI automático</span>
                    <input
                      className="filter-input plano-input-pro"
                      value={roiFormat(roiPreview)}
                      readOnly
                      aria-readonly="true"
                    />
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
                  {saving ? "A guardar..." : editingId ? "Guardar alterações" : "Guardar campanha"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

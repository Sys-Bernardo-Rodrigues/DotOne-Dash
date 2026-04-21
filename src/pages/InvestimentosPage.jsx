import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
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
  const { investimentos, addInvestimento, updateInvestimento, deleteInvestimento } = useClientData();
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
        (a, b) => a.localeCompare(b, "pt", { sensitivity: "base" })
      ),
    [investimentos]
  );

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
    <>
      <PageHeader
        title="Investimentos"
        subtitle="Registo e controlo de investimentos do cliente"
        action={
          <div className="header-actions">
            <button type="button" className="btn-secondary" onClick={openCreate}>
              Novo investimento
            </button>
          </div>
        }
      />

      <section className="card">
        <div className="table-filters">
          <input
            type="text"
            className="filter-input"
            placeholder="Buscar por ID ou nome do investimento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select
            className="filter-select"
            value={filtroRepete}
            onChange={(e) => setFiltroRepete(e.target.value)}
          >
            <option value="todos">Recorrência: Todas</option>
            <option value="sim">Apenas recorrentes</option>
            <option value="nao">Apenas pontuais</option>
          </select>
          <select
            className="filter-select"
            value={filtroFreq}
            onChange={(e) => setFiltroFreq(e.target.value)}
          >
            <option value="todas">Frequência: Todas</option>
            <option value="mensal">Mensal</option>
            <option value="semanal">Semanal</option>
          </select>
        </div>

        <div className="table-scroll">
          <table className="timeline-table investimento-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome do investimento</th>
                <th>Canal</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Repete</th>
                <th>Frequência</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.length ? (
                itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <strong>{item.nome}</strong>
                      <div className="table-subline">Lançamento: {dateFormat(item.data)}</div>
                    </td>
                    <td>{item.canal || "—"}</td>
                    <td>{moneyFormat(item.valor)}</td>
                    <td>{dateFormat(item.data)}</td>
                    <td>
                      <span className={`chip ${item.repete ? "andamento" : "pendente"}`}>
                        {item.repete ? "Recorrente" : "Pontual"}
                      </span>
                    </td>
                    <td>
                      {item.repete ? (
                        <span className={`chip ${item.frequencia === "semanal" ? "ok" : "andamento"}`}>
                          {item.frequencia === "semanal" ? "Semanal" : "Mensal"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{item.repete ? dateFormat(item.dataInicio) : "—"}</td>
                    <td>{item.repete ? dateFormat(item.dataFim) : "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar investimento"
                          aria-label="Editar investimento"
                          onClick={() => openEdit(item)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Excluir investimento"
                          aria-label="Excluir investimento"
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
                  <td colSpan={10}>Nenhum investimento cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-count">Mostrando {itens.length} de {investimentos.length} investimentos</div>
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
            aria-labelledby="investimento-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="plano-modal-header-pro">
              <div className="plano-modal-header-brand" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="plano-modal-header-icon-svg">
                  <path d="M11 2h2v20h-2zM4 13h2v9H4zm14-8h2v17h-2zM7 10h2v12H7zm7 5h2v7h-2z" />
                </svg>
              </div>
              <div className="plano-modal-header-copy">
                <p className="plano-modal-kicker">Financeiro</p>
                <h2 id="investimento-modal-title">
                  {editingId ? "Editar investimento" : "Novo investimento"}
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
              Registre investimentos pontuais ou recorrentes, com calendário e frequência para controlo financeiro.
            </p>

            <form className="plano-5w2h-form" onSubmit={handleSubmit}>
              <section className="plano-modal-section" aria-labelledby="investimento-sec-dados">
                <h3 id="investimento-sec-dados" className="plano-modal-section-title">
                  Dados do investimento
                </h3>
                <div className="plano-modal-section-grid plano-modal-duo">
                  <label className="plano-field plano-field-span-2">
                    <span className="plano-field-label">Nome do investimento</span>
                    <input
                      type="text"
                      className="filter-input plano-input-pro"
                      value={form.nome}
                      onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="plano-field">
                    <span className="plano-field-label">Canal</span>
                    <input
                      type="text"
                      className="filter-input plano-input-pro"
                      list="investimento-canais-sugestoes"
                      placeholder="Ex.: Google Ads, Meta Ads, LinkedIn, Influencer"
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
                  <label className="plano-field">
                    <span className="plano-field-label">Valor</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="filter-input plano-input-pro"
                      value={form.valor}
                      onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
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
                      required
                    />
                  </label>
                </div>
              </section>

              <section className="plano-modal-section" aria-labelledby="investimento-sec-recorrencia">
                <h3 id="investimento-sec-recorrencia" className="plano-modal-section-title">
                  Recorrência
                </h3>
                <div className="plano-modal-section-grid plano-modal-duo">
                  <label className="plano-field">
                    <span className="plano-field-label">Repete?</span>
                    <select
                      className="filter-select plano-input-pro"
                      value={form.repete ? "sim" : "nao"}
                      onChange={(e) => setForm((p) => ({ ...p, repete: e.target.value === "sim" }))}
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>

                  {form.repete ? (
                    <label className="plano-field">
                      <span className="plano-field-label">Frequência</span>
                      <select
                        className="filter-select plano-input-pro"
                        value={form.frequencia}
                        onChange={(e) => setForm((p) => ({ ...p, frequencia: e.target.value }))}
                      >
                        <option value="mensal">Mensal</option>
                        <option value="semanal">Semanal</option>
                      </select>
                    </label>
                  ) : null}
                </div>

                {form.repete ? (
                  <div className="plano-modal-section-grid plano-modal-duo investimento-recorrencia-box">
                    <label className="plano-field">
                      <span className="plano-field-label">Data início</span>
                      <input
                        type="date"
                        className="filter-input plano-input-pro"
                        value={form.dataInicio}
                        onChange={(e) => setForm((p) => ({ ...p, dataInicio: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="plano-field">
                      <span className="plano-field-label">Data fim</span>
                      <input
                        type="date"
                        className="filter-input plano-input-pro"
                        value={form.dataFim}
                        onChange={(e) => setForm((p) => ({ ...p, dataFim: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                ) : null}
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
                  {saving ? "A guardar..." : editingId ? "Guardar alterações" : "Guardar investimento"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useClientData } from "../context/ClientDataContext";

export default function ConfiguracaoClientePage() {
  const { activeClient, clientConfig, updateClientConfig, isLoading } = useClientData();
  const [form, setForm] = useState({
    missao: "",
    visao: "",
    valores: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    setForm({
      missao: clientConfig.missao,
      visao: clientConfig.visao,
      valores: clientConfig.valores,
    });
  }, [clientConfig.missao, clientConfig.visao, clientConfig.valores]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSalvando(true);
    setFeedback({ tipo: "", texto: "" });
    const result = await updateClientConfig({
      missao: form.missao,
      visao: form.visao,
      valores: form.valores,
    });
    setSalvando(false);
    if (result.ok) {
      setFeedback({ tipo: "ok", texto: "Configurações salvas com sucesso." });
    } else {
      setFeedback({ tipo: "erro", texto: result.message || "Não foi possível salvar." });
    }
  }

  const nome = activeClient.nome?.trim() || "Cliente";

  return (
    <>
      <PageHeader
        title="Configurações do cliente"
        subtitle={`Missão, visão e valores exibidos no painel de ${nome}`}
      />

      <section className="card client-config-card">
        <p className="client-config-intro">
          Estes textos aparecem na barra lateral (missão) e nos relatórios. Ajuste conforme o
          posicionamento estratégico do cliente.
        </p>

        <form className="client-config-form" onSubmit={handleSubmit}>
          <label className="client-config-field">
            <span className="client-config-label">Missão</span>
            <span className="client-config-hint">Por que a organização existe e que problema resolve.</span>
            <textarea
              className="filter-input client-config-textarea"
              rows={4}
              placeholder="Ex.: Proporcionar energia limpa e renovável com excelência operacional."
              value={form.missao}
              onChange={(e) => setForm((p) => ({ ...p, missao: e.target.value }))}
              disabled={isLoading}
            />
          </label>

          <label className="client-config-field">
            <span className="client-config-label">Visão</span>
            <span className="client-config-hint">Onde a organização quer chegar no futuro.</span>
            <textarea
              className="filter-input client-config-textarea"
              rows={3}
              placeholder="Ex.: Ser referência regional em soluções sustentáveis até 2030."
              value={form.visao}
              onChange={(e) => setForm((p) => ({ ...p, visao: e.target.value }))}
              disabled={isLoading}
            />
          </label>

          <label className="client-config-field">
            <span className="client-config-label">Valores</span>
            <span className="client-config-hint">Princípios que guiam decisões e comportamento.</span>
            <textarea
              className="filter-input client-config-textarea"
              rows={3}
              placeholder="Ex.: Comprometimento, inovação, transparência e segurança."
              value={form.valores}
              onChange={(e) => setForm((p) => ({ ...p, valores: e.target.value }))}
              disabled={isLoading}
            />
          </label>

          {feedback.texto ? (
            <p className={feedback.tipo === "ok" ? "client-config-msg ok" : "client-config-msg erro"}>
              {feedback.texto}
            </p>
          ) : null}

          <div className="client-config-actions">
            <button type="submit" className="btn-primary" disabled={salvando || isLoading}>
              {salvando ? "Salvando…" : "Salvar configurações"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

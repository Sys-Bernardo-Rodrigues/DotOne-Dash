import { useEffect, useState } from "react";
import { Compass, Gem, Save, Target } from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

const FIELDS = [
  {
    key: "missao",
    label: "Missão",
    hint: "Por que a organização existe e que problema resolve.",
    placeholder: "Ex.: Proporcionar energia limpa e renovável com excelência operacional.",
    rows: 4,
    icon: Target,
    accent: "violet",
  },
  {
    key: "visao",
    label: "Visão",
    hint: "Onde a organização quer chegar no futuro.",
    placeholder: "Ex.: Ser referência regional em soluções sustentáveis até 2030.",
    rows: 3,
    icon: Compass,
    accent: "cyan",
  },
  {
    key: "valores",
    label: "Valores",
    hint: "Princípios que guiam decisões e comportamento.",
    placeholder: "Ex.: Comprometimento, inovação, transparência e segurança.",
    rows: 3,
    icon: Gem,
    accent: "emerald",
  },
];

export default function ConfiguracaoClientePage() {
  const { activeClient, clientConfig, updateClientConfig, isLoading } = useClientData();
  const [form, setForm] = useState({ missao: "", visao: "", valores: "" });
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

  const nomeCliente = activeClient.nome?.trim() || "Cliente";
  const missaoPreview = form.missao?.trim() || "Defina a missão em Configurações → Geral.";
  const inicial = nomeCliente.charAt(0).toUpperCase() || "?";

  return (
    <div className="cfg-geral">
      <div className="cfg-geral__intro">
        <div>
          <h2>Identidade estratégica</h2>
          <p>
            Estes textos alimentam a barra lateral, relatórios e comunicações do workspace de{" "}
            <strong>{nomeCliente}</strong>.
          </p>
        </div>
        <ul className="cfg-geral__tags">
          <li>Sidebar</li>
          <li>Relatórios</li>
          <li>Exportações</li>
        </ul>
      </div>

      <form className="cfg-geral__layout" onSubmit={handleSubmit}>
        <div className="cfg-geral__fields">
          {FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <label
                key={field.key}
                className={`cfg-field-card cfg-field-card--${field.accent}`}
              >
                <div className="cfg-field-card__head">
                  <span className="cfg-field-card__icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <span className="cfg-field-card__label">{field.label}</span>
                    <span className="cfg-field-card__hint">{field.hint}</span>
                  </div>
                </div>
                <textarea
                  className="cfg-field-card__input"
                  rows={field.rows}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                  disabled={isLoading}
                />
              </label>
            );
          })}

          {feedback.texto ? (
            <p
              className={`cfg-alert cfg-alert--${feedback.tipo === "ok" ? "ok" : "erro"}`}
              role="status"
            >
              {feedback.texto}
            </p>
          ) : null}

          <div className="cfg-geral__actions">
            <button type="submit" className="cfg-btn cfg-btn--primary" disabled={salvando || isLoading}>
              <Save size={16} strokeWidth={2} aria-hidden="true" />
              {salvando ? "A guardar…" : "Guardar identidade"}
            </button>
          </div>
        </div>

        <aside className="cfg-preview">
          <div className="cfg-preview__head">
            <h3>Pré-visualização</h3>
            <p>Como aparece na sidebar do painel</p>
          </div>
          <div className="cfg-preview__mock">
            <div className="cfg-preview__nav">
              <span className="cfg-preview__nav-label">Cliente</span>
              <strong>{inicial} · {nomeCliente}</strong>
              <div className="cfg-preview__mission">
                <span>Missão</span>
                <p>{missaoPreview}</p>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

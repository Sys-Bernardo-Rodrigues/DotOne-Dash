import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { setAdminToken } from "../lib/adminApi";
import {
  canAccessClientSlug,
  canAccessFullAdmPanel,
  decodeJwtPayload,
  postLoginDestination,
} from "../lib/session";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const BENEFICIOS = [
  "Dashboards Meta vs Google",
  "KPIs e plano de ação integrados",
  "Cronograma Gantt e alertas",
];

function destinoAposLogin(payload, redirectParam) {
  const padrao = postLoginDestination(payload);
  if (!redirectParam || !redirectParam.startsWith("/") || redirectParam.startsWith("//")) {
    return padrao;
  }
  if (!payload) return padrao;
  if (redirectParam.startsWith("/adm")) {
    if (!canAccessFullAdmPanel(payload)) return padrao;
    return redirectParam;
  }
  const slug = redirectParam.replace(/^\//, "").split("/")[0];
  const reservados = new Set(["login", "explicando", "adm"]);
  if (slug && !reservados.has(slug) && canAccessClientSlug(payload, slug)) return redirectParam;
  return padrao;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro("");
    if (!email.trim() || !password) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setEnviando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErro(data.message || "Não foi possível entrar.");
        return;
      }
      if (!data.token) {
        setErro("Resposta inválida do servidor.");
        return;
      }
      setAdminToken(data.token);
      const payload = decodeJwtPayload(data.token);
      const redirect = searchParams.get("redirect");
      const dest = destinoAposLogin(payload, redirect);
      navigate(dest, { replace: true });
    } catch {
      setErro("Falha de rede. Verifique se a API está no ar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__mesh" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-header__inner">
          <Link to="/" className="landing-brand">
            <img src="/brand-icon-blue.png" alt="" />
            <div>
              <strong>My Dot Growth</strong>
              <span>Growth Command Center</span>
            </div>
          </Link>
          <Link to="/" className="login-page__back" aria-label="Voltar ao início">
            ← Início
          </Link>
        </div>
      </header>

      <main className="login-main">
        <div className="login-layout">
          <aside className="login-aside">
            <span className="landing-hero__badge">
              <span className="landing-hero__pulse" />
              Acesso à plataforma
            </span>
            <h1>
              Entre no seu <em>workspace</em>
            </h1>
            <p>
              Utilize as credenciais da contratação para aceder a KPIs, marketing e gestão de
              projetos num único painel.
            </p>
            <ul className="login-aside__list">
              {BENEFICIOS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>

          <div className="login-card">
            <div className="login-card__head">
              <span className="landing-eyebrow">Login</span>
              <h2>Bem-vindo de volta</h2>
              <p>Introduza o seu e-mail e senha para continuar.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-field">
                <span>E-mail</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@mydotgrowth.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={enviando}
                />
              </label>

              <label className="login-field">
                <span>Senha</span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Senha definida no servidor"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={enviando}
                />
              </label>

              {erro ? <p className="login-form-error" role="alert">{erro}</p> : null}

              <button
                type="submit"
                className="landing-btn landing-btn--primary login-submit"
                disabled={enviando}
              >
                {enviando ? "Entrando…" : "Entrar na plataforma"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

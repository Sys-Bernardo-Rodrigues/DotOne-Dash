import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAdminToken } from "../lib/adminApi";
import {
  canAccessClientSlug,
  canAccessFullAdmPanel,
  decodeJwtPayload,
  postLoginDestination,
} from "../lib/session";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

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
  if (slug && slug !== "login" && canAccessClientSlug(payload, slug)) return redirectParam;
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
    <section className="login-page">
      <div className="login-shell">
        <article className="login-panel login-panel-info">
          <div className="login-panel-inner">
            <div className="login-logo">
              <div className="brand-mark">MD</div>
              <div>
                <strong>My Dot Growth</strong>
                <p>Plataforma de gestão estratégica</p>
              </div>
            </div>

            <h1>Controle total do plano estratégico em um único painel</h1>
            <p>
              Monitore cronograma, metas, responsáveis e decisões críticas com visão
              executiva em tempo real.
            </p>

            <ul className="login-benefits">
              <li>Visão integrada por área e responsável</li>
              <li>Priorização de ações críticas com rapidez</li>
              <li>Acompanhamento de progresso por fase</li>
            </ul>
          </div>
        </article>

        <article className="login-panel login-panel-form">
          <div className="login-panel-inner login-panel-form-inner">
            <div className="login-form-head">
              <span className="login-kicker">Acesso à plataforma</span>
              <h2>Entrar</h2>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@mydotgrowth.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={enviando}
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Senha definida no servidor (.env)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={enviando}
                />
              </div>

              {erro ? <p className="login-form-error">{erro}</p> : null}

              <div className="login-actions-row">
                <label className="login-remember">
                  <input type="checkbox" disabled />
                  <span>Lembrar de mim</span>
                </label>
                <button type="button" className="login-forgot" disabled>
                  Esqueci minha senha
                </button>
              </div>

              <button type="submit" className="btn-primary login-submit" disabled={enviando}>
                {enviando ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <p className="login-disclaimer">
              Conta de sistema (ADMIN_EMAIL / ADMIN_PASSWORD no servidor) ou utilizador
              criado no painel de administração. Utilizadores com perfil Administrador acedem ao
              painel /adm; os restantes entram diretamente no cliente (ou à escolha de cliente, se
              tiverem mais do que um).
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

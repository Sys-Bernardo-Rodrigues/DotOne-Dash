import { useState } from "react";
import { Link } from "react-router-dom";

const STATS = [
  { label: "KPIs rastreados", value: "40+", accent: "violet" },
  { label: "Integrações", value: "Meta · Google", accent: "cyan" },
  { label: "Workspaces", value: "Multi-cliente", accent: "emerald" },
  { label: "Sync automático", value: "Diário", accent: "amber" },
];

const MODULOS = [
  {
    size: "lg",
    accent: "violet",
    icon: "◫",
    titulo: "Projetos & Estratégia",
    descricao:
      "Plano 5W2H, cronograma Gantt, visão por área, responsáveis e relatórios — tudo num fluxo contínuo.",
    tags: ["Plano de ação", "Cronograma", "Relatórios", "Por área"],
  },
  {
    size: "md",
    accent: "cyan",
    icon: "↗",
    titulo: "Marketing & KPIs",
    descricao: "Funil completo, campanhas, investimentos e dashboard Meta vs Google.",
    tags: ["KPIs", "Performance", "Campanhas"],
  },
  {
    size: "md",
    accent: "emerald",
    icon: "◎",
    titulo: "Integrações",
    descricao: "Meta Ads, Google Ads, Pixel, alertas por e-mail/Slack e relatório semanal.",
    tags: ["OAuth", "Sync", "Alertas"],
  },
];

const ETAPAS = [
  {
    titulo: "Contratação",
    descricao: "Escopo, workspaces e perfis de acesso definidos no onboarding comercial.",
  },
  {
    titulo: "Configuração",
    descricao: "Identidade do cliente, integrações de mídia e preferências de notificação.",
  },
  {
    titulo: "Operação",
    descricao: "Equipe monitora KPIs, projetos e campanhas com dashboards em tempo real.",
  },
];

const PERFIS = [
  { nome: "Administrador", nivel: "Nível global", desc: "Painel /adm, todos os clientes e gestão de utilizadores." },
  { nome: "Gestor", nivel: "Workspace", desc: "Acesso completo ao cliente contratado e todas as áreas." },
  { nome: "Operacional", nivel: "Cliente", desc: "Permissões específicas conforme definido na contratação." },
];

const MARQUEE = [
  "KPIs de funil",
  "Meta vs Google",
  "Cronograma Gantt",
  "Plano 5W2H",
  "Alertas de sync",
  "Multi-tenant",
  "Relatórios",
  "Pixel Meta",
];

function HeroDashboard() {
  return (
    <div className="landing-dash" aria-hidden="true">
      <div className="landing-dash__glow landing-dash__glow--1" />
      <div className="landing-dash__glow landing-dash__glow--2" />
      <div className="landing-dash__frame">
        <div className="landing-dash__topbar">
          <span className="landing-dash__live">
            <i /> Live
          </span>
          <span className="landing-dash__crumb">Workspace / Cliente / Performance</span>
        </div>
        <div className="landing-dash__body">
          <aside className="landing-dash__nav">
            <div className="landing-dash__logo" />
            {[72, 58, 64, 52, 48].map((w, i) => (
              <div key={i} className="landing-dash__nav-item" style={{ "--w": `${w}%` }} />
            ))}
          </aside>
          <div className="landing-dash__content">
            <div className="landing-dash__kpis">
              {[
                { v: "R$ 48,2k", l: "Investimento", c: "violet" },
                { v: "1.284", l: "Leads", c: "cyan" },
                { v: "3,8x", l: "ROI", c: "emerald" },
                { v: "67%", l: "Progresso", c: "amber" },
              ].map((k) => (
                <div key={k.l} className={`landing-dash__kpi landing-dash__kpi--${k.c}`}>
                  <span>{k.l}</span>
                  <strong>{k.v}</strong>
                </div>
              ))}
            </div>
            <div className="landing-dash__charts">
              <div className="landing-dash__chart landing-dash__chart--main">
                <svg viewBox="0 0 320 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(139,92,246,0.35)" />
                      <stop offset="100%" stopColor="rgba(139,92,246,0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 L40,65 L80,72 L120,45 L160,52 L200,28 L240,35 L280,18 L320,25 L320,100 L0,100 Z"
                    fill="url(#areaGrad)"
                  />
                  <path
                    d="M0,80 L40,65 L80,72 L120,45 L160,52 L200,28 L240,35 L280,18 L320,25"
                    fill="none"
                    stroke="url(#lineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="landing-dash__chart landing-dash__chart--side">
                <div className="landing-dash__bars">
                  {[65, 42, 88, 54, 72].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="landing-dash__float landing-dash__float--1">
        <span>Meta Ads</span>
        <strong>+24% CPL</strong>
      </div>
      <div className="landing-dash__float landing-dash__float--2">
        <span>Sync OK</span>
        <strong>há 2 min</strong>
      </div>
    </div>
  );
}

export default function ExplicandoSistemaPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="landing">
      <div className="landing__mesh" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-header__inner">
          <Link to="/" className="landing-brand" onClick={closeMenu}>
            <img src="/brand-icon-blue.png" alt="" />
            <div>
              <strong>My Dot Growth</strong>
              <span>Growth Command Center</span>
            </div>
          </Link>
          <nav className="landing-header__nav" aria-label="Seções">
            <a href="#pilares" onClick={closeMenu}>Pilares</a>
            <a href="#jornada" onClick={closeMenu}>Jornada</a>
            <a href="#acesso" onClick={closeMenu}>Acesso</a>
          </nav>
          <button
            type="button"
            className={`landing-menu-btn${menuOpen ? " is-open" : ""}`}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link to="/login" className="landing-header__btn" onClick={closeMenu}>
            Entrar
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
        <nav
          id="landing-mobile-menu"
          className={`landing-mobile-menu${menuOpen ? " is-open" : ""}`}
          aria-label="Navegação mobile"
          aria-hidden={!menuOpen}
        >
          <a href="#pilares" onClick={closeMenu}>Pilares</a>
          <a href="#jornada" onClick={closeMenu}>Jornada</a>
          <a href="#acesso" onClick={closeMenu}>Acesso</a>
          <Link to="/login" className="landing-mobile-menu__cta" onClick={closeMenu}>
            Entrar na plataforma
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <div className="landing-hero__badge">
            <span className="landing-hero__pulse" />
            UP
          </div>
          <h1>
            O centro de comando para{" "}
            <em>KPIs</em>, marketing e projetos
          </h1>
          <p>
            Um workspace por cliente. Dashboards vivos, integrações Meta & Google e gestão
            estratégica — do acordo comercial à operação diária da equipe.
          </p>
          <div className="landing-hero__actions">
            <Link to="/login" className="landing-btn landing-btn--primary">
              Acessar plataforma
            </Link>
            <a href="#pilares" className="landing-btn landing-btn--ghost">
              Explorar recursos
            </a>
          </div>
          <dl className="landing-hero__stats">
            {STATS.map((s) => (
              <div key={s.label} className={`landing-stat landing-stat--${s.accent}`}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroDashboard />
      </section>

      <div className="landing-marquee" aria-hidden="true">
        <div className="landing-marquee__track">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={`${item}-${i}`}>{item}</span>
          ))}
        </div>
      </div>

      <section id="pilares" className="landing-section">
        <div className="landing-section__head">
          <span className="landing-eyebrow">Pilares</span>
          <h2>Tudo o que a contratação desbloqueia</h2>
          <p>Três motores integrados num único painel — sem planilhas soltas.</p>
        </div>
        <div className="landing-bento">
          {MODULOS.map((mod) => (
            <article
              key={mod.titulo}
              className={`landing-bento__card landing-bento__card--${mod.size} landing-bento__card--${mod.accent}`}
            >
              <span className="landing-bento__icon">{mod.icon}</span>
              <h3>{mod.titulo}</h3>
              <p>{mod.descricao}</p>
              <ul>
                {mod.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="jornada" className="landing-section landing-section--dark landing-section--center">
        <div className="landing-section__head landing-section__head--light">
          <span className="landing-eyebrow landing-eyebrow--light">Jornada</span>
          <h2>Do contrato ao primeiro dashboard</h2>
          <p>Onboarding pensado para agências e consultorias entregarem valor rápido.</p>
        </div>
        <ol className="landing-timeline">
          {ETAPAS.map((etapa, i) => (
            <li key={etapa.titulo} className="landing-timeline__step">
              <div className="landing-timeline__marker">
                <span>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="landing-timeline__body">
                <h3>{etapa.titulo}</h3>
                <p>{etapa.descricao}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="acesso" className="landing-section">
        <div className="landing-section__head">
          <span className="landing-eyebrow">Acesso</span>
          <h2>Quem entra e o que vê</h2>
          <p>Credenciais entregues na contratação — login em <code>/login</code>.</p>
        </div>
        <div className="landing-perfis">
          {PERFIS.map((p, i) => (
            <article key={p.nome} className="landing-perfil" style={{ "--i": i }}>
              <span className="landing-perfil__nivel">{p.nivel}</span>
              <h3>{p.nome}</h3>
              <p>{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <div className="landing-final__card">
          <div className="landing-final__glow" aria-hidden="true" />
          <h2>Pronto para operar?</h2>
          <p>
            Utilize o e-mail e a senha da sua contratação. Dúvidas? Fale com o administrador
            do workspace.
          </p>
          <div className="landing-final__actions">
            <Link to="/login" className="landing-btn landing-btn--primary landing-btn--lg">
              Ir para o login
            </Link>
            <Link to="/" className="landing-btn landing-btn--ghost landing-btn--ghost-dark">
              Rever este guia
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© My Dot Growth · Gestão estratégica, marketing e KPIs</p>
      </footer>
    </div>
  );
}

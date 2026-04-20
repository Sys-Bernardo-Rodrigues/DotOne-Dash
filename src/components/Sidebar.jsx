import { Link, NavLink, useParams } from "react-router-dom";
import { menuItems } from "../data/dashboardData";
import { useClientData } from "../context/ClientDataContext";
import { clearAdminToken } from "../lib/adminApi";

const iconBySegment = {
  "": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l9 7h-2v10h-5v-6H10v6H5V10H3l9-7z" />
    </svg>
  ),
  "plano-de-acao": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4v2h8V8H8zm0 4v2h8v-2H8z" />
    </svg>
  ),
  cronograma: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h3V2zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9z" />
    </svg>
  ),
  "por-area": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 13h8v8H3v-8zm10-10h8v8h-8V3zM3 3h8v8H3V3zm10 10h8v8h-8v-8z" />
    </svg>
  ),
  responsaveis: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h10v-3.5C11 14.17 6.33 13 4 13zm12 0c-.29 0-.62.02-.97.05A4.97 4.97 0 0 1 21 16.5V20h3v-3.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  relatorios: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V5a2 2 0 0 1 2-2zm3 4v2h8V7H8zm0 4v2h6v-2H8z" />
    </svg>
  ),
  configuracao: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.14 7.14 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0-.05.94 7.49 7.49 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z" />
    </svg>
  ),
};

function menuHref(clientSlug, segment) {
  if (!clientSlug) return "/";
  if (!segment) return `/${clientSlug}`;
  return `/${clientSlug}/${segment}`;
}

export default function Sidebar() {
  const { clientSlug } = useParams();
  const { activeClient, clientConfig } = useClientData();
  const nomeCliente = activeClient.nome || "Carregando…";
  const textoMissao =
    clientConfig.missao?.trim() ||
    "Defina a missão em Configurações para exibir aqui.";

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">MD</div>
        <div>
          <div className="brand">My Dot Growth</div>
          <div className="brand-subtitle">Painel estratégico</div>
        </div>
      </div>

      <div className="client-badge">
        <h4>Cliente</h4>
        <strong>{nomeCliente}</strong>
      </div>

      <nav className="nav-links">
        {menuItems.map((item) => (
          <NavLink
            key={item.segment || "inicio"}
            to={menuHref(clientSlug, item.segment)}
            end={item.segment === ""}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{iconBySegment[item.segment]}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mission-card">
        <h3>Missão</h3>
        <p>{textoMissao}</p>
      </div>

      <div className="sidebar-exit-wrap">
        <Link to="/login" className="nav-link nav-link-exit" onClick={() => clearAdminToken()}>
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
            </svg>
          </span>
          <span>Sair</span>
        </Link>
      </div>
    </aside>
  );
}

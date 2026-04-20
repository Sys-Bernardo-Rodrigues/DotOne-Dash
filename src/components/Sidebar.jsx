import { NavLink } from "react-router-dom";
import { menuItems } from "../data/dashboardData";

const iconByPath = {
  "/": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l9 7h-2v10h-5v-6H10v6H5V10H3l9-7z" />
    </svg>
  ),
  "/plano-de-acao": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4v2h8V8H8zm0 4v2h8v-2H8z" />
    </svg>
  ),
  "/cronograma": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h3V2zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9z" />
    </svg>
  ),
  "/por-area": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 13h8v8H3v-8zm10-10h8v8h-8V3zM3 3h8v8H3V3zm10 10h8v8h-8v-8z" />
    </svg>
  ),
  "/responsaveis": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h10v-3.5C11 14.17 6.33 13 4 13zm12 0c-.29 0-.62.02-.97.05A4.97 4.97 0 0 1 21 16.5V20h3v-3.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  "/relatorios": (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V5a2 2 0 0 1 2-2zm3 4v2h8V7H8zm0 4v2h6v-2H8z" />
    </svg>
  ),
};

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="mobile-label">Abrir menu</div>
      <div className="brand-block">
        <div className="brand-mark">FI</div>
        <div>
          <div className="brand">DotONE - DASH</div>
          <div className="brand-subtitle">Dashboard Estratégico</div>
        </div>
      </div>

      <div className="client-badge">
        <h4>Cliente</h4>
        <strong>Flessak Energia</strong>
        <p>Plano Estratégico 2026</p>
      </div>

      <nav className="nav-links">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link${isActive ? " active" : ""}`
            }
          >
            <span className="nav-icon">{iconByPath[item.path]}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mission-card">
        <h3>Missão</h3>
        <p>Proporcionar energia limpa renovável</p>
      </div>
      <div className="sidebar-footer">Plano Estratégico 2026</div>
    </aside>
  );
}

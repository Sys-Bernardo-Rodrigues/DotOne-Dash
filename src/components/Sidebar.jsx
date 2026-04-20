import { NavLink } from "react-router-dom";
import { menuItems } from "../data/dashboardData";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="mobile-label">Abrir menu</div>
      <div className="brand-block">
        <div className="brand-mark">FI</div>
        <div>
          <div className="brand">Flessak Indústria</div>
          <div className="brand-subtitle">Dashboard Estratégico</div>
        </div>
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
            {item.label}
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

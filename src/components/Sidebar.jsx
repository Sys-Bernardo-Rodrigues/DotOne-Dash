import { useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronLeft,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { navGroups } from "../data/dashboardData";
import { useClientData } from "../context/ClientDataContext";
import { clearAdminToken } from "../lib/adminApi";

const GROUP_TONE = {
  Estratégia: "violet",
  Marketing: "cyan",
  Sistema: "slate",
};

const MOBILE_QUICK = ["", "plano-de-acao", "kpis", "configuracao"];

const ICON_SIZE = 16;
const ICON_STROKE = 2;

const iconBySegment = {
  "": LayoutDashboard,
  "plano-de-acao": ClipboardList,
  cronograma: Calendar,
  "por-area": LayoutGrid,
  responsaveis: Users,
  relatorios: FileText,
  investimentos: Wallet,
  "campanhas-marketing": Megaphone,
  kpis: BarChart3,
  "dashboard-performance": LineChart,
  configuracao: Settings,
};

function NavIcon({ segment }) {
  const Icon = iconBySegment[segment] || LayoutDashboard;
  return <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />;
}

function menuHref(clientSlug, segment) {
  if (!clientSlug) return "/";
  if (!segment) return `/${clientSlug}`;
  return `/${clientSlug}/${segment}`;
}

function clientInitial(nome) {
  const n = String(nome || "").trim();
  return n ? n.charAt(0).toUpperCase() : "?";
}

export default function Sidebar() {
  const { clientSlug } = useParams();
  const { activeClient, clientConfig } = useClientData();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const nomeCliente = activeClient.nome || "Workspace";
  const slugLabel = clientSlug || "…";
  const textoMissao =
    clientConfig.missao?.trim() ||
    "Configure a missão em Configurações → Geral.";

  const flatItems = useMemo(
    () => navGroups.flatMap((g) => g.items),
    [],
  );

  const quickMobileItems = useMemo(() => {
    const bySegment = new Map(flatItems.map((item) => [item.segment, item]));
    return MOBILE_QUICK.map((seg) => bySegment.get(seg)).filter(Boolean);
  }, [flatItems]);

  return (
    <div className="workspace-nav-col">
      <aside
        className={`workspace-nav${expanded ? " workspace-nav--open" : " workspace-nav--compact"}`}
        aria-label="Navegação do workspace"
      >
        <header className="workspace-nav__head">
          <Link to="/adm/home" className="workspace-nav__brand" title="Trocar workspace">
            <span className="workspace-nav__avatar">{clientInitial(nomeCliente)}</span>
            {expanded ? (
              <span className="workspace-nav__brand-copy">
                <strong title={nomeCliente}>{nomeCliente}</strong>
                <small>/{slugLabel}</small>
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            className="workspace-nav__fold"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Compactar menu" : "Expandir menu"}
            aria-expanded={expanded}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <nav className="workspace-nav__menu">
          {navGroups.map((group) => {
            const tone = GROUP_TONE[group.title] || "slate";
            return (
              <section
                key={group.title}
                className={`workspace-nav__group workspace-nav__group--${tone}`}
              >
                {expanded ? (
                  <h3 className="workspace-nav__group-title">{group.title}</h3>
                ) : (
                  <span className="workspace-nav__group-rule" title={group.title} aria-hidden="true" />
                )}
                <ul className="workspace-nav__list">
                  {group.items.map((item) => (
                    <li key={item.segment || "inicio"}>
                      <NavLink
                        to={menuHref(clientSlug, item.segment)}
                        end={item.segment === "" || item.segment !== "configuracao"}
                        title={item.label}
                        className={({ isActive }) =>
                          `workspace-nav__link${isActive ? " is-active" : ""}`
                        }
                      >
                        <span className="workspace-nav__link-icon">
                          <NavIcon segment={item.segment} />
                        </span>
                        {expanded ? (
                          <span className="workspace-nav__link-label">{item.label}</span>
                        ) : null}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </nav>

        {expanded ? (
          <div className="workspace-nav__mission">
            <span>Missão</span>
            <p>{textoMissao}</p>
          </div>
        ) : null}

        <footer className="workspace-nav__foot">
          <Link to="/adm/home" className="workspace-nav__foot-link" title="Trocar cliente">
            <Building2 size={15} strokeWidth={2} aria-hidden="true" />
            {expanded ? <span>Clientes</span> : null}
          </Link>
          <Link
            to="/login"
            className="workspace-nav__foot-link workspace-nav__foot-link--muted"
            title="Sair"
            onClick={() => clearAdminToken()}
          >
            <LogOut size={15} strokeWidth={2} aria-hidden="true" />
            {expanded ? <span>Sair</span> : null}
          </Link>
        </footer>
      </aside>

      <div className={`workspace-nav-mobile${mobileOpen ? " is-open" : ""}`}>
        <nav className="workspace-nav-mobile__bar" aria-label="Atalhos rápidos">
          {quickMobileItems.map((item) => (
            <NavLink
              key={item.segment || "inicio"}
              to={menuHref(clientSlug, item.segment)}
              end={item.segment === "" || item.segment !== "configuracao"}
              className={({ isActive }) =>
                `workspace-nav-mobile__chip${isActive ? " is-active" : ""}`
              }
            >
              <span className="workspace-nav-mobile__chip-icon">
                <NavIcon segment={item.segment} />
              </span>
              <span>{item.label.split(" ")[0]}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className="workspace-nav-mobile__more"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu completo"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            Menu
          </button>
        </nav>

        {mobileOpen ? (
          <div className="workspace-nav-mobile__sheet">
            <div className="workspace-nav-mobile__sheet-head">
              <strong>{nomeCliente}</strong>
              <span>/{slugLabel}</span>
            </div>
            {navGroups.map((group) => (
              <div key={group.title} className="workspace-nav-mobile__group">
                <span>{group.title}</span>
                <div className="workspace-nav-mobile__grid">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.segment || "inicio"}
                      to={menuHref(clientSlug, item.segment)}
                      end={item.segment === "" || item.segment !== "configuracao"}
                      className={({ isActive }) =>
                        `workspace-nav-mobile__tile${isActive ? " is-active" : ""}`
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

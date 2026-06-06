import { NavLink, Outlet, useParams } from "react-router-dom";
import { Building2, KeyRound, Plug } from "lucide-react";
import { useClientData } from "../context/ClientDataContext";

const settingsTabs = [
  {
    segment: "geral",
    label: "Geral",
    description: "Missão, visão e valores",
    icon: Building2,
    adminOnly: false,
  },
  {
    segment: "credenciais",
    label: "Credenciais",
    description: "Apps Meta/Google, SMTP e automação",
    icon: KeyRound,
    adminOnly: true,
  },
  {
    segment: "integracoes",
    label: "Integrações",
    description: "Conectar contas e sync por cliente",
    icon: Plug,
    adminOnly: false,
  },
];

export default function ConfiguracaoLayout() {
  const { clientSlug } = useParams();
  const { activeClient, integrationsState } = useClientData();
  const nome = activeClient.nome?.trim() || "Cliente";

  const metaOn = integrationsState?.integrations?.meta?.status === "connected";
  const googleOn = integrationsState?.integrations?.google?.status === "connected";
  const canConfigurePlatform = integrationsState?.canConfigurePlatform;

  const visibleTabs = settingsTabs.filter(
    (tab) => !tab.adminOnly || canConfigurePlatform
  );

  return (
    <div className="cfg">
      <header className="cfg-hero">
        <div className="cfg-hero__copy">
          <span className="cfg-hero__eyebrow">Sistema · Workspace</span>
          <h1>Configurações</h1>
          <p>Preferências e conexões de {nome}</p>
        </div>

        <div className="cfg-hero__badges" aria-label="Estado das integrações">
          <span className={`cfg-hero__badge${metaOn ? " cfg-hero__badge--on" : " cfg-hero__badge--off"}`}>
            Meta · {metaOn ? "Conectado" : "Desconectado"}
          </span>
          <span className={`cfg-hero__badge${googleOn ? " cfg-hero__badge--on" : " cfg-hero__badge--off"}`}>
            Google · {googleOn ? "Conectado" : "Desconectado"}
          </span>
        </div>
      </header>

      <nav className="cfg-tabs" aria-label="Seções de configuração">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.segment}
              to={`/${clientSlug}/configuracao/${tab.segment}`}
              className={({ isActive }) => `cfg-tab${isActive ? " active" : ""}`}
            >
              <span className="cfg-tab__icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span>
                <span className="cfg-tab__label">{tab.label}</span>
                <span className="cfg-tab__desc">{tab.description}</span>
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="cfg-body">
        <Outlet />
      </div>
    </div>
  );
}

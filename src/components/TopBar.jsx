import { Link, useLocation, useParams } from "react-router-dom";
import { getRouteMeta } from "../lib/routeMeta";
import { useClientData } from "../context/ClientDataContext";

export default function TopBar() {
  const { clientSlug } = useParams();
  const location = useLocation();
  const { activeClient } = useClientData();
  const meta = getRouteMeta(location.pathname, clientSlug);
  const nomeCliente = activeClient.nome?.trim() || "Carregando…";

  return (
    <header className="topbar">
      <div className="topbar__left">
        <nav className="topbar__breadcrumb" aria-label="Localização">
          <Link to={`/${clientSlug}`} className="topbar__crumb topbar__crumb--brand">
            Workspace
          </Link>
          <span className="topbar__sep" aria-hidden="true">
            /
          </span>
          <span className="topbar__crumb topbar__crumb--client">{nomeCliente}</span>
          {meta.section ? (
            <>
              <span className="topbar__sep" aria-hidden="true">
                /
              </span>
              <span className="topbar__crumb topbar__crumb--current">
                {meta.settingsTab ? `${meta.section} · ${meta.settingsTab}` : meta.section}
              </span>
            </>
          ) : null}
        </nav>
      </div>

      <div className="topbar__right">
        <div className="topbar__status" title="Sincronização com a API">
          <span className="topbar__pulse" aria-hidden="true" />
          Live
        </div>
        <Link
          to={`/${clientSlug}/configuracao`}
          className="topbar__icon-btn"
          title="Configurações"
          aria-label="Abrir configurações"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.14 7.14 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0-.05.94 7.49 7.49 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

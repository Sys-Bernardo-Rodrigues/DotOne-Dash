import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminFetch, clearAdminToken, getAdminToken } from "../lib/adminApi";
import { canAccessFullAdmPanel, decodeJwtPayload } from "../lib/session";
import { slugify } from "../utils/slugify";

function clientSlug(client) {
  const s = String(client?.slug || "").trim();
  if (s) return s;
  return slugify(client?.nome || "");
}

export default function AdmHomePage() {
  const navigate = useNavigate();
  const payload = useMemo(() => decodeJwtPayload(getAdminToken()), []);
  const isFullAdmin = canAccessFullAdmPanel(payload);
  const userName = payload?.nome || payload?.email || "";

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isFullAdmin) return;
    const slugs = payload?.clienteSlugs || [];
    if (slugs.length === 1) {
      navigate(`/${slugs[0]}`, { replace: true });
    }
  }, [isFullAdmin, payload, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (isFullAdmin) {
          const response = await adminFetch("/clients");
          if (!response.ok) throw new Error("fetch");
          const data = await response.json();
          if (!cancelled) setClients(Array.isArray(data) ? data : []);
        } else {
          const response = await adminFetch("/me/accessible-clients");
          if (!response.ok) throw new Error("fetch");
          const data = await response.json();
          if (!cancelled) {
            setClients(Array.isArray(data.clients) ? data.clients : []);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar os workspaces. Verifique se a API está no ar.");
          setClients([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isFullAdmin]);

  function handleLogout() {
    clearAdminToken();
  }

  const displayName = userName ? userName.split("@")[0] : null;

  return (
    <div className="landing adm-home">
      <div className="landing__mesh" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-header__inner">
          <Link to="/adm/home" className="landing-brand">
            <img src="/brand-icon-blue.png" alt="" />
            <div>
              <strong>My Dot Growth</strong>
              <span>Growth Command Center</span>
            </div>
          </Link>
          <div className="adm-home-header__actions">
            {isFullAdmin ? (
              <Link to="/adm" className="landing-btn landing-btn--ghost adm-home-header__link">
                Painel admin
              </Link>
            ) : null}
            <Link
              to="/login"
              className="landing-header__btn adm-home-header__exit"
              onClick={handleLogout}
            >
              Sair
            </Link>
          </div>
        </div>
      </header>

      <main className="adm-home-main">
        <div className="adm-home-layout">
          <aside className="adm-home-aside">
            <div className="landing-hero__badge">
              <span className="landing-hero__pulse" />
              Workspaces
            </div>
            <h1>
              {displayName ? (
                <>
                  Olá, <em>{displayName}</em>
                </>
              ) : (
                <>
                  Escolha o <em>workspace</em>
                </>
              )}
            </h1>
            <p>
              {isFullAdmin
                ? "Cada cliente tem um painel dedicado. Selecione à direita qual deseja operar agora."
                : "Tem acesso a vários clientes. Escolha na lista ao lado qual dashboard abrir."}
            </p>

            {!loading && !error ? (
              <dl className="adm-home-stats">
                <div className="landing-stat landing-stat--violet">
                  <dt>Workspaces</dt>
                  <dd>{clients.length}</dd>
                </div>
                <div className="landing-stat landing-stat--cyan">
                  <dt>Perfil</dt>
                  <dd>{payload?.perfil || "Utilizador"}</dd>
                </div>
              </dl>
            ) : null}
          </aside>

          <section className="adm-home-panel" aria-labelledby="adm-home-panel-title">
            <div className="adm-home-panel__head">
              <div>
                <span className="landing-eyebrow">Clientes</span>
                <h2 id="adm-home-panel-title">
                  {isFullAdmin ? "Workspaces disponíveis" : "Os seus workspaces"}
                </h2>
                <p>
                  {loading
                    ? "A carregar…"
                    : `${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`}
                </p>
              </div>
            </div>

            {error ? (
              <div className="adm-home-alert" role="alert">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="adm-home-loading">
                <span className="adm-home-loading__dot" />
                A carregar workspaces…
              </div>
            ) : null}

            {!loading && !error && clients.length === 0 ? (
              <div className="adm-home-empty">
                <p>Nenhum workspace disponível para a sua conta.</p>
                {isFullAdmin ? (
                  <Link to="/adm" className="landing-btn landing-btn--primary">
                    Ir ao painel administrativo
                  </Link>
                ) : null}
              </div>
            ) : null}

            {!loading && clients.length > 0 ? (
              <>
                <div className="adm-home-table-wrap">
                  <table className="adm-home-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Segmento</th>
                        <th>Responsável</th>
                        <th aria-label="Ação" />
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => {
                        const slug = clientSlug(client);
                        const inactive = client.status === "Inativo";
                        return (
                          <tr
                            key={client._id || client.id || slug}
                            className={inactive ? "adm-home-table__row--inactive" : undefined}
                          >
                            <td>
                              <strong>{client.nome}</strong>
                              <code className="adm-home-table__slug">/{slug}</code>
                            </td>
                            <td>{client.segmento || "—"}</td>
                            <td>{client.responsavel || "—"}</td>
                            <td>
                              {inactive ? (
                                <span className="adm-home-table__badge">Inativo</span>
                              ) : (
                                <Link
                                  to={`/${slug}`}
                                  className="landing-btn landing-btn--primary adm-home-table__btn"
                                >
                                  Abrir
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="adm-home-list" aria-label="Lista de workspaces">
                  {clients.map((client) => {
                    const slug = clientSlug(client);
                    const inactive = client.status === "Inativo";
                    return (
                      <li
                        key={`mobile-${client._id || client.id || slug}`}
                        className={inactive ? "adm-home-list__item--inactive" : undefined}
                      >
                        <div className="adm-home-list__info">
                          <strong>{client.nome}</strong>
                          <span>
                            {client.segmento || "Sem segmento"}
                            {client.responsavel ? ` · ${client.responsavel}` : ""}
                          </span>
                          <code>/{slug}</code>
                        </div>
                        {inactive ? (
                          <span className="adm-home-table__badge">Inativo</span>
                        ) : (
                          <Link
                            to={`/${slug}`}
                            className="landing-btn landing-btn--primary adm-home-list__btn"
                          >
                            Abrir
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

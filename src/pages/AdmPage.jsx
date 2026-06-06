import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { slugify } from "../utils/slugify";
import { adminFetch, clearAdminToken, getAdminToken } from "../lib/adminApi";
import { PERFIS_ACESSO } from "../constants/accessProfiles";
import { canAccessFullAdmPanel, decodeJwtPayload } from "../lib/session";

const initialUsers = [
  {
    id: "USR-001",
    nome: "Ilson",
    email: "ilson@flessak.com",
    perfil: "Administrador",
    status: "Ativo",
    cliente: "Flessak Energia",
    clienteSlugs: ["flessak-energia"],
    temSenha: true,
  },
  {
    id: "USR-002",
    nome: "Marco",
    email: "marco@flessak.com",
    perfil: "Gestor",
    status: "Ativo",
    cliente: "Empresa Demo",
    clienteSlugs: ["empresa-demo"],
    temSenha: true,
  },
];

const initialClients = [
  {
    id: "CLI-001",
    nome: "Flessak Energia",
    slug: "flessak-energia",
    segmento: "Indústria",
    responsavel: "Ilson",
    status: "Ativo",
  },
  {
    id: "CLI-002",
    nome: "Empresa Demo",
    slug: "empresa-demo",
    segmento: "Tecnologia",
    responsavel: "Marco",
    status: "Ativo",
  },
];

function statusClass(status) {
  if (status === "Ativo") return "chip andamento";
  return "chip pendente";
}

function perfilChipClass(perfil) {
  if (perfil === "Administrador") return "chip andamento adm-perfil-chip";
  if (perfil === "Gestor") return "chip adm-perfil-chip adm-perfil-chip--gestor";
  if (perfil === "Operador") return "chip pendente adm-perfil-chip";
  return "chip adm-perfil-chip adm-perfil-chip--leitura";
}

const USER_FORM_INITIAL = {
  nome: "",
  email: "",
  senha: "",
  perfil: "Operador",
  status: "Ativo",
  /** Slugs dos clientes a associar (vários permitidos). */
  clienteSlugs: [],
};

const CLIENT_FORM_INITIAL = {
  nome: "",
  segmento: "",
  responsavel: "",
  status: "Ativo",
};

const SECOES_ADM = {
  usuarios: {
    badge: "Utilizadores",
    titulo: "Gestão de",
    tituloEm: "contas",
    descricao: "Crie contas, perfis de acesso e associe clientes a cada utilizador.",
  },
  clientes: {
    badge: "Clientes",
    titulo: "Carteira de",
    tituloEm: "workspaces",
    descricao: "Registe organizações e abra o dashboard de cada slug.",
  },
  configuracoes: {
    badge: "Configurações",
    titulo: "Parâmetros da",
    tituloEm: "plataforma",
    descricao: "Preferências globais do ambiente My Dot Growth.",
  },
};

function slugClienteDashboard(client) {
  const s = String(client?.slug || "").trim();
  if (s) return s;
  return slugify(client?.nome || "");
}

/** Texto de ligação a clientes (campo legado + slugs resolvidos na lista de clientes). */
function textoLigacaoClientes(user, clientsList) {
  const slugs = Array.isArray(user.clienteSlugs) ? user.clienteSlugs : [];
  const nomesPorSlug = slugs.map((s) => {
    const c = clientsList.find((x) => x.slug === s);
    return c?.nome || s;
  });
  if (nomesPorSlug.length) return nomesPorSlug.join(", ");
  if (user.cliente?.trim()) return user.cliente.trim();
  if (user.perfil === "Administrador") return "Todos (administrador)";
  return "—";
}

export default function AdmPage({ defaultSection = "usuarios" }) {
  const navigate = useNavigate();
  const layoutMode = useMemo(() => {
    const p = decodeJwtPayload(getAdminToken());
    return canAccessFullAdmPanel(p) ? "full" : "restricted-picker";
  }, []);

  const [accessibleClients, setAccessibleClients] = useState([]);

  const [secaoAtiva, setSecaoAtiva] = useState(defaultSection);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [users, setUsers] = useState(initialUsers);
  const [clients, setClients] = useState(initialClients);
  const [apiError, setApiError] = useState("");
  const [userForm, setUserForm] = useState(() => ({ ...USER_FORM_INITIAL }));
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [clientForm, setClientForm] = useState(() => ({ ...CLIENT_FORM_INITIAL }));
  const [filtroUsuarios, setFiltroUsuarios] = useState("");
  const [filtroClientes, setFiltroClientes] = useState("");

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      usersActive: users.filter((item) => item.status === "Ativo").length,
      totalClients: clients.length,
      clientsActive: clients.filter((item) => item.status === "Ativo").length,
    }),
    [users, clients]
  );

  const usuariosFiltrados = useMemo(() => {
    const q = filtroUsuarios.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const lig = textoLigacaoClientes(u, clients).toLowerCase();
      return (
        (u.nome || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.perfil || "").toLowerCase().includes(q) ||
        lig.includes(q)
      );
    });
  }, [users, clients, filtroUsuarios]);

  const clientesFiltrados = useMemo(() => {
    const q = filtroClientes.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const slug = slugClienteDashboard(c).toLowerCase();
      return (
        (c.nome || "").toLowerCase().includes(q) ||
        (c.segmento || "").toLowerCase().includes(q) ||
        (c.responsavel || "").toLowerCase().includes(q) ||
        slug.includes(q) ||
        String(c.id || "").toLowerCase().includes(q)
      );
    });
  }, [clients, filtroClientes]);

  async function loadUsers() {
    const response = await adminFetch("/users");
    if (!response.ok) throw new Error("Falha ao carregar usuários.");
    const data = await response.json();
    setUsers(data);
  }

  async function loadClients() {
    const response = await adminFetch("/clients");
    if (!response.ok) throw new Error("Falha ao carregar clientes.");
    const data = await response.json();
    setClients(data);
  }

  useEffect(() => {
    if (layoutMode !== "full") return;
    Promise.all([loadUsers(), loadClients()]).catch(() => {
      setApiError(
        "API indisponível no momento. Inicie o backend para salvar e carregar dados do MongoDB."
      );
    });
  }, [layoutMode]);

  useEffect(() => {
    setSecaoAtiva(defaultSection);
  }, [defaultSection]);

  useEffect(() => {
    if (layoutMode !== "restricted-picker") return;
    setSecaoAtiva("home");
  }, [layoutMode]);

  useEffect(() => {
    if (layoutMode !== "restricted-picker") return;
    const p = decodeJwtPayload(getAdminToken());
    const slugs = p?.clienteSlugs || [];
    if (slugs.length === 1) {
      navigate(`/${slugs[0]}`, { replace: true });
    }
  }, [layoutMode, navigate]);

  useEffect(() => {
    if (layoutMode !== "restricted-picker") return;
    adminFetch("/me/accessible-clients")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setAccessibleClients(Array.isArray(d.clients) ? d.clients : []))
      .catch(() => setAccessibleClients([]));
  }, [layoutMode]);

  const perfilModalInfo = useMemo(
    () => PERFIS_ACESSO.find((p) => p.value === userForm.perfil),
    [userForm.perfil]
  );

  const closeUserModal = useCallback(() => {
    setShowUserModal(false);
    setShowUserPassword(false);
    setUserForm({ ...USER_FORM_INITIAL });
    setApiError("");
  }, []);

  function openUserModal() {
    setApiError("");
    setShowUserPassword(false);
    setUserForm({ ...USER_FORM_INITIAL });
    setShowUserModal(true);
  }

  useEffect(() => {
    if (!showUserModal) return;
    const id = requestAnimationFrame(() => {
      document.getElementById("adm-user-nome")?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [showUserModal]);

  useEffect(() => {
    if (!showUserModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeUserModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showUserModal, closeUserModal]);

  const closeClientModal = useCallback(() => {
    setShowClientModal(false);
    setClientForm({ ...CLIENT_FORM_INITIAL });
    setApiError("");
  }, []);

  function openClientModal() {
    setApiError("");
    setClientForm({ ...CLIENT_FORM_INITIAL });
    setShowClientModal(true);
  }

  const clientModalSlugPreview = useMemo(() => {
    const n = clientForm.nome.trim();
    if (!n) return null;
    return slugify(n);
  }, [clientForm.nome]);

  useEffect(() => {
    if (!showClientModal) return;
    const id = requestAnimationFrame(() => {
      document.getElementById("adm-client-nome")?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [showClientModal]);

  useEffect(() => {
    if (!showClientModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeClientModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showClientModal, closeClientModal]);

  async function createUser(event) {
    event.preventDefault();
    if (!userForm.nome.trim() || !userForm.email.trim()) return;
    if (!userForm.senha || userForm.senha.length < 6) {
      setApiError("Defina uma senha com pelo menos 6 caracteres para o novo utilizador.");
      return;
    }
    const slugsSel = Array.isArray(userForm.clienteSlugs)
      ? userForm.clienteSlugs.filter(Boolean)
      : [];
    if (userForm.perfil !== "Administrador" && slugsSel.length === 0) {
      setApiError(
        "Selecione pelo menos um cliente para este perfil (obrigatório para não administradores)."
      );
      return;
    }

    const response = await adminFetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: userForm.nome,
        email: userForm.email,
        senha: userForm.senha,
        perfil: userForm.perfil,
        status: userForm.status,
        clienteSlugs: slugsSel,
      }),
    });

    const errBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      setApiError(errBody.message || "Não foi possível criar o utilizador.");
      return;
    }

    await loadUsers();
    setApiError("");
    closeUserModal();
  }

  async function createClient(event) {
    event.preventDefault();
    if (!clientForm.nome.trim() || !clientForm.segmento.trim()) return;

    const response = await adminFetch("/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientForm),
    });

    const errBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      setApiError(errBody.message || "Não foi possível criar o cliente.");
      return;
    }

    await loadClients();
    setApiError("");
    closeClientModal();
  }

  async function deleteUser(mongoId, nome) {
    if (!mongoId) return;
    const label = (nome || "").trim() || "este utilizador";
    if (
      !window.confirm(
        `Remover ${label}? Esta ação não pode ser anulada e o acesso deixará de funcionar de imediato.`
      )
    ) {
      return;
    }
    const response = await adminFetch(`/users/${mongoId}`, { method: "DELETE" });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      setApiError(errBody.message || "Não foi possível remover o utilizador.");
      return;
    }
    setApiError("");
    await loadUsers();
  }

  async function deleteClient(mongoId, nome) {
    if (!mongoId) return;
    const label = (nome || "").trim() || "este cliente";
    if (
      !window.confirm(
        `Remover ${label}? Os dashboards deixarão de estar disponíveis neste URL e utilizadores associados podem perder acesso.`
      )
    ) {
      return;
    }
    const response = await adminFetch(`/clients/${mongoId}`, { method: "DELETE" });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      setApiError(errBody.message || "Não foi possível remover o cliente.");
      return;
    }
    setApiError("");
    await loadClients();
  }

  const secaoInfo = SECOES_ADM[secaoAtiva] || SECOES_ADM.usuarios;

  return (
    <div className="landing adm-panel">
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
          <div className="adm-panel-header__actions">
            <Link to="/adm/home" className="landing-btn landing-btn--ghost adm-panel-header__link">
              Workspaces
            </Link>
            <Link
              to="/login"
              className="landing-header__btn adm-panel-header__exit"
              onClick={() => clearAdminToken()}
            >
              Sair
            </Link>
          </div>
        </div>
      </header>

      <main className="adm-panel-main">
        <div className="adm-panel-layout">
          <aside className="adm-panel-aside">
            <div className="landing-hero__badge">
              <span className="landing-hero__pulse" />
              {secaoInfo.badge}
            </div>
            <h1>
              {secaoInfo.titulo}{" "}
              <em>{secaoInfo.tituloEm}</em>
            </h1>
            <p>{secaoInfo.descricao}</p>

            <nav className="adm-panel-nav" aria-label="Secções do painel">
              <button
                type="button"
                className={`adm-panel-nav__item${secaoAtiva === "usuarios" ? " is-active" : ""}`}
                onClick={() => setSecaoAtiva("usuarios")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
                </svg>
                Utilizadores
              </button>
              <button
                type="button"
                className={`adm-panel-nav__item${secaoAtiva === "clientes" ? " is-active" : ""}`}
                onClick={() => setSecaoAtiva("clientes")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 21h18v-2h-1V3H4v16H3v2zm3-2V5h12v14H6zm2-2h2v-2H8v2zm0-4h2v-2H8v2zm0-4h2V7H8v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V7h-2v2z" />
                </svg>
                Clientes
              </button>
              <button
                type="button"
                className={`adm-panel-nav__item${secaoAtiva === "configuracoes" ? " is-active" : ""}`}
                onClick={() => setSecaoAtiva("configuracoes")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.14 7.14 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0-.05.94 7.49 7.49 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z" />
                </svg>
                Configurações
              </button>
            </nav>
          </aside>

          <div className="adm-panel-content">
          {apiError ? (
            <div className="adm-panel-alert" role="alert">
              {apiError}
            </div>
          ) : null}

          {layoutMode === "full" && secaoAtiva === "usuarios" ? (
            <>
              <section className="adm-panel-stats">
                <div className="landing-stat landing-stat--violet">
                  <dt>Utilizadores</dt>
                  <dd>
                    {stats.totalUsers}
                    <span className="adm-panel-stat-note">
                      {stats.usersActive} ativos · {stats.totalUsers - stats.usersActive} inativos
                    </span>
                  </dd>
                </div>
                <div className="landing-stat landing-stat--cyan">
                  <dt>Perfis</dt>
                  <dd>
                    {PERFIS_ACESSO.length}
                    <span className="adm-panel-stat-note">Só administradores gerem contas neste painel.</span>
                  </dd>
                </div>
                <div className="landing-stat landing-stat--amber">
                  <dt>Segurança</dt>
                  <dd>
                    Senha obrigatória
                    <span className="adm-panel-stat-note">Cada conta precisa de senha para entrar em /login.</span>
                  </dd>
                </div>
              </section>

              <section className="adm-panel-card adm-users-card">
                <div className="section-title-row">
                  <div>
                    <h2>Utilizadores</h2>
                    <p className="adm-users-lead">
                      Contas com acesso ao login da plataforma. O perfil define se acede ao painel
                      /adm completo ou só aos dashboards dos clientes associados.
                    </p>
                  </div>
                  <button type="button" className="btn-primary" onClick={openUserModal}>
                    Criar utilizador
                  </button>
                </div>

                <div className="adm-users-toolbar">
                  <input
                    type="search"
                    className="filter-input adm-users-search"
                    placeholder="Pesquisar por nome, e-mail, perfil ou cliente…"
                    value={filtroUsuarios}
                    onChange={(e) => setFiltroUsuarios(e.target.value)}
                    aria-label="Pesquisar utilizadores"
                  />
                  <span className="adm-users-count">
                    {usuariosFiltrados.length === users.length
                      ? `${users.length} registo${users.length === 1 ? "" : "s"}`
                      : `${usuariosFiltrados.length} de ${users.length} mostrados`}
                  </span>
                </div>

                <div className="table-scroll">
                  <table className="timeline-table adm-users-table">
                    <thead>
                      <tr>
                        <th>Ref.</th>
                        <th>Utilizador</th>
                        <th>Perfil</th>
                        <th>Clientes</th>
                        <th>Senha</th>
                        <th>Estado</th>
                        <th className="adm-th-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="adm-users-empty">
                            {users.length === 0
                              ? "Ainda não existem utilizadores. Utilize «Criar utilizador»."
                              : "Nenhum resultado corresponde à pesquisa."}
                          </td>
                        </tr>
                      ) : (
                        usuariosFiltrados.map((user) => (
                          <tr key={user._id || user.id}>
                            <td className="adm-mono">{user.id}</td>
                            <td>
                              <div className="adm-user-name">{user.nome}</div>
                              <div className="adm-user-email">{user.email}</div>
                            </td>
                            <td>
                              <span className={perfilChipClass(user.perfil)}>{user.perfil}</span>
                            </td>
                            <td className="adm-user-clients">
                              {textoLigacaoClientes(user, clients)}
                            </td>
                            <td>
                              <span
                                className={
                                  user.temSenha ? "chip andamento adm-senha-sim" : "chip pendente"
                                }
                              >
                                {user.temSenha ? "Definida" : "Sem senha"}
                              </span>
                            </td>
                            <td>
                              <span className={statusClass(user.status)}>{user.status}</span>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="icon-btn danger"
                                  type="button"
                                  aria-label={`Remover utilizador ${user.nome}`}
                                  title="Remover utilizador"
                                  onClick={() => deleteUser(user._id, user.nome)}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="adm-panel-card adm-perfis-info">
                <details className="adm-perfis-details">
                  <summary className="adm-perfis-summary">
                    Perfis de acesso — referência para o cadastro
                  </summary>
                  <ul className="adm-perfis-list">
                    {PERFIS_ACESSO.map((p) => (
                      <li key={p.value}>
                        <strong>{p.value}</strong>
                        <span className="adm-perfil-resumo">{p.resumo}</span>
                        <p className="adm-perfil-detalhe">{p.detalhe}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            </>
          ) : null}

          {layoutMode === "full" && secaoAtiva === "clientes" ? (
            <>
              <section className="adm-panel-stats">
                <div className="landing-stat landing-stat--violet">
                  <dt>Carteira</dt>
                  <dd>
                    {stats.totalClients}
                    <span className="adm-panel-stat-note">
                      {stats.clientsActive} ativos · {stats.totalClients - stats.clientsActive}{" "}
                      inativos
                    </span>
                  </dd>
                </div>
                <div className="landing-stat landing-stat--cyan">
                  <dt>Segmentos</dt>
                  <dd>
                    {new Set(clients.map((item) => item.segmento)).size}
                    <span className="adm-panel-stat-note">Etiquetas de negócio para relatórios e filtros.</span>
                  </dd>
                </div>
                <div className="landing-stat landing-stat--emerald">
                  <dt>Contacto</dt>
                  <dd>
                    {clients.filter((c) => (c.responsavel || "").trim()).length}
                    <span className="adm-panel-stat-note">Clientes com responsável principal preenchido.</span>
                  </dd>
                </div>
              </section>

              <section className="adm-panel-card adm-users-card">
                <div className="section-title-row">
                  <div>
                    <h2>Clientes</h2>
                    <p className="adm-users-lead">
                      Organizações com dashboard estratégico em{" "}
                      <span className="adm-mono-inline">/:slug</span>. O slug é gerado a partir do
                      nome e pode ser ajustado no servidor se já existir.
                    </p>
                  </div>
                  <button type="button" className="btn-primary" onClick={openClientModal}>
                    Criar cliente
                  </button>
                </div>

                <div className="adm-users-toolbar">
                  <input
                    type="search"
                    className="filter-input adm-users-search"
                    placeholder="Pesquisar por nome, segmento, responsável ou slug…"
                    value={filtroClientes}
                    onChange={(e) => setFiltroClientes(e.target.value)}
                    aria-label="Pesquisar clientes"
                  />
                  <span className="adm-users-count">
                    {clientesFiltrados.length === clients.length
                      ? `${clients.length} registo${clients.length === 1 ? "" : "s"}`
                      : `${clientesFiltrados.length} de ${clients.length} mostrados`}
                  </span>
                </div>

                <div className="table-scroll">
                  <table className="timeline-table adm-users-table">
                    <thead>
                      <tr>
                        <th>Ref.</th>
                        <th>Cliente</th>
                        <th>Segmento</th>
                        <th>Responsável</th>
                        <th>Estado</th>
                        <th>Dashboard</th>
                        <th className="adm-th-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="adm-users-empty">
                            {clients.length === 0
                              ? "Ainda não existem clientes. Utilize «Criar cliente»."
                              : "Nenhum resultado corresponde à pesquisa."}
                          </td>
                        </tr>
                      ) : (
                        clientesFiltrados.map((client) => {
                          const slug = slugClienteDashboard(client);
                          const rowKey = client._id || client.id;
                          return (
                            <tr key={rowKey}>
                              <td className="adm-mono">{client.id}</td>
                              <td>
                                <div className="adm-user-name">{client.nome}</div>
                                <div className="adm-user-email adm-mono">/{slug}</div>
                              </td>
                              <td>{client.segmento}</td>
                              <td>{client.responsavel?.trim() || "—"}</td>
                              <td>
                                <span className={statusClass(client.status)}>{client.status}</span>
                              </td>
                              <td>
                                <Link
                                  to={`/${slug}`}
                                  className="btn-secondary adm-access-btn adm-table-link"
                                >
                                  Abrir
                                </Link>
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="icon-btn danger"
                                    type="button"
                                    aria-label={`Remover cliente ${client.nome}`}
                                    title="Remover cliente"
                                    onClick={() => deleteClient(client._id, client.nome)}
                                  >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}

          {layoutMode === "full" && secaoAtiva === "configuracoes" ? (
            <section className="adm-panel-card">
              <h2>Configuracoes da Plataforma</h2>
              <form className="adm-form">
                <input
                  className="filter-input"
                  placeholder="Nome do sistema"
                  defaultValue="My Dot Growth"
                />
                <input
                  className="filter-input"
                  placeholder="Dominio principal"
                  defaultValue="app.mydotgrowth.local"
                />
                <select className="filter-select" defaultValue="Portugues (Brasil)">
                  <option>Portugues (Brasil)</option>
                  <option>English</option>
                  <option>Espanol</option>
                </select>
                <select className="filter-select" defaultValue="UTC-3">
                  <option>UTC-3</option>
                  <option>UTC-4</option>
                  <option>UTC-5</option>
                </select>
                <button type="button" className="btn-primary">
                  Salvar Configuracoes
                </button>
              </form>
            </section>
          ) : null}
          </div>
        </div>
      </main>

      {showUserModal ? (
        <div
          className="adm-modal-backdrop"
          role="presentation"
          onClick={closeUserModal}
        >
          <section
            className="card adm-modal adm-modal--user"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-user-modal-title"
            aria-describedby="adm-user-modal-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-modal-header">
              <div>
                <h2 id="adm-user-modal-title">Novo utilizador</h2>
                <p id="adm-user-modal-desc" className="adm-user-modal-lead">
                  O e-mail será o login em <span className="adm-mono-inline">/login</span>. A
                  senha pode ser alterada mais tarde quando existir fluxo de recuperação.
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={closeUserModal}>
                Fechar
              </button>
            </div>

            {apiError ? (
              <p className="adm-modal-alert" role="alert">
                {apiError}
              </p>
            ) : null}

            <form className="adm-form adm-form--user-modal" onSubmit={createUser}>
              <div className="adm-form-section">
                <h3 className="adm-form-section-title">Identidade</h3>
                <div className="adm-user-modal-grid">
                  <div className="adm-field">
                    <label className="adm-field-label" htmlFor="adm-user-nome">
                      Nome completo
                    </label>
                    <input
                      id="adm-user-nome"
                      className="filter-input"
                      autoComplete="name"
                      value={userForm.nome}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, nome: e.target.value }))
                      }
                    />
                  </div>
                  <div className="adm-field">
                    <label className="adm-field-label" htmlFor="adm-user-email">
                      E-mail
                    </label>
                    <input
                      id="adm-user-email"
                      className="filter-input"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={userForm.email}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="adm-form-section">
                <h3 className="adm-form-section-title">Acesso e permissões</h3>
                <div className="adm-field">
                  <label className="adm-field-label" htmlFor="adm-user-senha">
                    Senha inicial
                  </label>
                  <div className="adm-field-row">
                    <input
                      id="adm-user-senha"
                      className="filter-input"
                      type={showUserPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={userForm.senha}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, senha: e.target.value }))
                      }
                      placeholder="Mínimo 6 caracteres"
                      aria-describedby="adm-user-senha-hint"
                    />
                    <button
                      type="button"
                      className="btn-secondary adm-password-toggle"
                      onClick={() => setShowUserPassword((v) => !v)}
                      aria-pressed={showUserPassword}
                    >
                      {showUserPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                  <p id="adm-user-senha-hint" className="adm-field-hint">
                    Partilhe esta senha com o utilizador por um canal seguro.
                  </p>
                </div>

                <div className="adm-user-modal-grid adm-user-modal-grid--2 mt-12">
                  <div className="adm-field">
                    <label className="adm-field-label" htmlFor="adm-user-perfil">
                      Perfil de acesso
                    </label>
                    <select
                      id="adm-user-perfil"
                      className="filter-select"
                      value={userForm.perfil}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, perfil: e.target.value }))
                      }
                    >
                      {PERFIS_ACESSO.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.value}
                        </option>
                      ))}
                    </select>
                    {perfilModalInfo ? (
                      <p className="adm-field-hint adm-perfil-modal-hint">{perfilModalInfo.resumo}</p>
                    ) : null}
                  </div>
                  <div className="adm-field">
                    <label className="adm-field-label" htmlFor="adm-user-status">
                      Estado da conta
                    </label>
                    <select
                      id="adm-user-status"
                      className="filter-select"
                      value={userForm.status}
                      onChange={(e) =>
                        setUserForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                    >
                      <option value="Ativo">Ativo — pode iniciar sessão</option>
                      <option value="Inativo">Inativo — bloqueado até reativar</option>
                    </select>
                  </div>
                </div>

                <div className="adm-field mt-12">
                  <div className="adm-client-multilist-head">
                    <span className="adm-field-label" id="adm-user-clientes-label">
                      Clientes com acesso ao dashboard
                    </span>
                    {clients.length > 0 ? (
                      <div className="adm-client-multilist-actions">
                        <button
                          type="button"
                          className="btn-secondary adm-btn-compact"
                          onClick={() =>
                            setUserForm((prev) => ({
                              ...prev,
                              clienteSlugs: clients.map((c) => slugClienteDashboard(c)),
                            }))
                          }
                        >
                          Selecionar todos
                        </button>
                        <button
                          type="button"
                          className="btn-secondary adm-btn-compact"
                          onClick={() => setUserForm((prev) => ({ ...prev, clienteSlugs: [] }))}
                        >
                          Limpar
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {clients.length === 0 ? (
                    <p className="adm-field-hint">
                      Não há clientes registados. Crie clientes na secção «Clientes» antes de
                      associar utilizadores.
                    </p>
                  ) : (
                    <ul
                      className="adm-client-checklist"
                      role="group"
                      aria-labelledby="adm-user-clientes-label"
                    >
                      {clients.map((client) => {
                        const slug = slugClienteDashboard(client);
                        const checked = (userForm.clienteSlugs || []).includes(slug);
                        return (
                          <li key={client._id || client.id}>
                            <label className="adm-client-check-label">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setUserForm((prev) => {
                                    const cur = new Set(prev.clienteSlugs || []);
                                    if (cur.has(slug)) cur.delete(slug);
                                    else cur.add(slug);
                                    return { ...prev, clienteSlugs: [...cur] };
                                  });
                                }}
                              />
                              <span className="adm-client-check-text">
                                <strong>{client.nome}</strong>
                                <span className="adm-mono-inline"> /{slug}</span>
                                {client.segmento ? (
                                  <span className="adm-checklist-seg"> · {client.segmento}</span>
                                ) : null}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {userForm.perfil === "Administrador" &&
                  (!userForm.clienteSlugs || userForm.clienteSlugs.length === 0) ? (
                    <p className="adm-field-hint">
                      Administradores sem clientes marcados acedem a todos os dashboards (perfil
                      global).
                    </p>
                  ) : null}
                  {userForm.perfil !== "Administrador" &&
                  (!userForm.clienteSlugs || userForm.clienteSlugs.length === 0) ? (
                    <p className="adm-field-hint adm-field-hint--warn">
                      Marque pelo menos um cliente para perfis que não são administrador.
                    </p>
                  ) : null}
                  {(userForm.clienteSlugs || []).length > 0 ? (
                    <p className="adm-field-hint">
                      {(userForm.clienteSlugs || []).length > 1
                        ? "Com vários clientes, após o login o utilizador passa pelo ecrã de escolha (/adm/home) antes de abrir um dashboard."
                        : `URL do dashboard: /${userForm.clienteSlugs[0]}`}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="adm-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeUserModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Criar utilizador
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {showClientModal ? (
        <div className="adm-modal-backdrop" role="presentation" onClick={closeClientModal}>
          <section
            className="card adm-modal adm-modal--user"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-client-modal-title"
            aria-describedby="adm-client-modal-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="adm-modal-header">
              <div>
                <h2 id="adm-client-modal-title">Novo cliente</h2>
                <p id="adm-client-modal-desc" className="adm-user-modal-lead">
                  O nome público identifica a organização. O URL do dashboard é criado
                  automaticamente (slug) e pode ganhar um sufixo se o nome já existir.
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={closeClientModal}>
                Fechar
              </button>
            </div>

            {apiError ? (
              <p className="adm-modal-alert" role="alert">
                {apiError}
              </p>
            ) : null}

            <form className="adm-form adm-form--user-modal" onSubmit={createClient}>
              <div className="adm-form-section">
                <h3 className="adm-form-section-title">Identificação</h3>
                <div className="adm-field">
                  <label className="adm-field-label" htmlFor="adm-client-nome">
                    Nome do cliente
                  </label>
                  <input
                    id="adm-client-nome"
                    className="filter-input"
                    autoComplete="organization"
                    value={clientForm.nome}
                    onChange={(e) =>
                      setClientForm((prev) => ({ ...prev, nome: e.target.value }))
                    }
                  />
                  {clientModalSlugPreview ? (
                    <p className="adm-field-hint">
                      URL provável do dashboard:{" "}
                      <span className="adm-mono-inline">/{clientModalSlugPreview}</span> — o
                      servidor confirma o slug final (único).
                    </p>
                  ) : (
                    <p className="adm-field-hint">
                      O endereço na app será gerado a partir deste nome.
                    </p>
                  )}
                </div>
                <div className="adm-field mt-12">
                  <label className="adm-field-label" htmlFor="adm-client-segmento">
                    Segmento
                  </label>
                  <input
                    id="adm-client-segmento"
                    className="filter-input"
                    placeholder="Ex.: Indústria, Serviços, Tecnologia"
                    value={clientForm.segmento}
                    onChange={(e) =>
                      setClientForm((prev) => ({ ...prev, segmento: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="adm-form-section">
                <h3 className="adm-form-section-title">Equipa e estado</h3>
                <div className="adm-user-modal-grid adm-user-modal-grid--2">
                  <div className="adm-field">
                    <label className="adm-field-label" htmlFor="adm-client-responsavel">
                      Responsável (opcional)
                    </label>
                    <input
                      id="adm-client-responsavel"
                      className="filter-input"
                      autoComplete="name"
                      placeholder="Nome do contacto principal"
                      value={clientForm.responsavel}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, responsavel: e.target.value }))
                      }
                    />
                  </div>
                  <div className="adm-field">
                    <label className="adm-field-label" htmlFor="adm-client-status">
                      Estado
                    </label>
                    <select
                      id="adm-client-status"
                      className="filter-select"
                      value={clientForm.status}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                    >
                      <option value="Ativo">Ativo — visível nos fluxos normais</option>
                      <option value="Inativo">Inativo — arquivado / sem uso ativo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="adm-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeClientModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Criar cliente
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

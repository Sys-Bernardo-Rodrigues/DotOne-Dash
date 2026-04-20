/**
 * Perfis de acesso — My Dot Growth
 * (Hoje o painel admin autentica só a conta sistema via JWT; estes perfis valem para usuários cadastrados e evolução da API.)
 */

export const PERFIS = [
  "Administrador",
  "Gestor",
  "Operador",
  "Visualizador",
];

/** Ações protegíveis na API (expandir conforme novas rotas) */
export const ACTIONS = {
  USERS_LIST: "users:list",
  USERS_CREATE: "users:create",
  USERS_DELETE: "users:delete",
  CLIENTS_LIST: "clients:list",
  CLIENTS_CREATE: "clients:create",
  CLIENTS_DELETE: "clients:delete",
};

/**
 * Quem pode executar cada ação (por perfil de usuário Mongo).
 * Super administrador (JWT conta sistema) ignora esta matriz no middleware atual.
 */
export const PERMISSOES_POR_PERFIL = {
  Administrador: [
    ACTIONS.USERS_LIST,
    ACTIONS.USERS_CREATE,
    ACTIONS.USERS_DELETE,
    ACTIONS.CLIENTS_LIST,
    ACTIONS.CLIENTS_CREATE,
    ACTIONS.CLIENTS_DELETE,
  ],
  Gestor: [
    ACTIONS.USERS_LIST,
    ACTIONS.CLIENTS_LIST,
    ACTIONS.CLIENTS_CREATE,
    ACTIONS.CLIENTS_DELETE,
  ],
  Operador: [ACTIONS.USERS_LIST, ACTIONS.CLIENTS_LIST],
  Visualizador: [ACTIONS.USERS_LIST, ACTIONS.CLIENTS_LIST],
};

export function perfilPode(perfil, action) {
  const lista = PERMISSOES_POR_PERFIL[perfil];
  return Array.isArray(lista) && lista.includes(action);
}

export function assertPerfilValido(perfil) {
  return PERFIS.includes(perfil);
}

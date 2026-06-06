const ROUTE_LABELS = {
  "": "Visão Geral",
  "plano-de-acao": "Plano de Ação",
  cronograma: "Cronograma",
  "por-area": "Por Área",
  responsaveis: "Responsáveis",
  relatorios: "Relatórios",
  investimentos: "Investimentos",
  "campanhas-marketing": "Campanhas",
  kpis: "KPIs",
  "dashboard-performance": "Performance",
  configuracao: "Configurações",
};

const SETTINGS_LABELS = {
  geral: "Geral",
  credenciais: "Credenciais",
  integracoes: "Integrações",
};

export function getRouteMeta(pathname, clientSlug) {
  if (!clientSlug) return { section: null, settingsTab: null };

  const prefix = `/${clientSlug}`;
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  const parts = rest.replace(/^\//, "").split("/").filter(Boolean);

  if (parts[0] === "configuracao") {
    const tab = parts[1] || "geral";
    return {
      section: ROUTE_LABELS.configuracao,
      settingsTab: SETTINGS_LABELS[tab] || null,
    };
  }

  return {
    section: ROUTE_LABELS[parts[0]] || null,
    settingsTab: null,
  };
}

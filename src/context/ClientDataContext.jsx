import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { normalizePlanoAcaoItems } from "../utils/planoAcaoNormalize";
import { buildChartPayload } from "../utils/chartData";
import { authHeaders, clearAdminToken } from "../lib/adminApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const ClientDataContext = createContext(null);

function deriveDashboardData(planoAcaoItems) {
  const charts = buildChartPayload(planoAcaoItems);
  return {
    planoAcaoItems,
    ...charts,
  };
}

const defaultClientConfig = () => ({
  missao: "",
  visao: "",
  valores: "",
});

export function ClientDataProvider({ children }) {
  const { clientSlug } = useParams();
  const [activeClient, setActiveClientState] = useState({ slug: "", nome: "" });
  const [clientConfig, setClientConfig] = useState(defaultClientConfig);
  const [planoAcaoItems, setPlanoAcaoItems] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  const [campanhasMarketing, setCampanhasMarketing] = useState([]);
  const [kpisMarketing, setKpisMarketing] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientNotFound, setClientNotFound] = useState(false);
  const [workspaceForbidden, setWorkspaceForbidden] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [integrationsState, setIntegrationsState] = useState(null);
  const integrationAlerts = integrationsState?.alerts || [];
  const pixelSnapshot = integrationsState?.pixelSnapshot || null;
  const [marketingPerformance, setMarketingPerformance] = useState(null);

  const dashboardData = useMemo(
    () => deriveDashboardData(planoAcaoItems),
    [planoAcaoItems]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const slug = clientSlug?.trim();
      if (!slug) {
        setPlanoAcaoItems([]);
        setInvestimentos([]);
        setCampanhasMarketing([]);
        setKpisMarketing([]);
        setActiveClientState({ slug: "", nome: "" });
        setClientConfig(defaultClientConfig());
        setClientNotFound(false);
        setWorkspaceForbidden(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setClientNotFound(false);
      setWorkspaceForbidden(false);

      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/dashboard`,
          { headers: { ...authHeaders() } }
        );
        if (cancelled) return;

        if (response.status === 401) {
          clearAdminToken();
          window.location.assign(
            `/login?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`
          );
          return;
        }

        if (response.status === 403) {
          setWorkspaceForbidden(true);
          setPlanoAcaoItems([]);
          setInvestimentos([]);
          setCampanhasMarketing([]);
          setKpisMarketing([]);
          setClientConfig(defaultClientConfig());
          setActiveClientState({ slug, nome: "" });
          return;
        }

        if (response.status === 404) {
          setClientNotFound(true);
          setPlanoAcaoItems([]);
          setInvestimentos([]);
          setCampanhasMarketing([]);
          setKpisMarketing([]);
          setClientConfig(defaultClientConfig());
          setActiveClientState({ slug, nome: "" });
          return;
        }

        if (!response.ok) throw new Error("Falha ao carregar dados do cliente.");

        const data = await response.json();
        setPlanoAcaoItems(normalizePlanoAcaoItems(data.planoAcaoItems));
        setInvestimentos(Array.isArray(data.investimentos) ? data.investimentos : []);
        setCampanhasMarketing(
          Array.isArray(data.campanhasMarketing) ? data.campanhasMarketing : []
        );
        setKpisMarketing(Array.isArray(data.kpisMarketing) ? data.kpisMarketing : []);
        setClientConfig({
          missao: String(data.missao ?? "").trim(),
          visao: String(data.visao ?? "").trim(),
          valores: String(data.valores ?? "").trim(),
        });
        setActiveClientState({
          slug: data.slug || slug,
          nome: data.nome || "",
        });
        setLastUpdatedAt(new Date().toISOString());
      } catch {
        if (!cancelled) {
          setPlanoAcaoItems([]);
          setInvestimentos([]);
          setCampanhasMarketing([]);
          setKpisMarketing([]);
          setClientConfig(defaultClientConfig());
          setActiveClientState({ slug: clientSlug || "", nome: "" });
          setClientNotFound(false);
          setWorkspaceForbidden(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clientSlug, reloadKey]);

  const refreshClientData = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const addPlanoAcaoItem = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) {
        return { ok: false, message: "Cliente não identificado." };
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/plano-acao-items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            ok: false,
            message: data.message || "Não foi possível salvar o plano de ação.",
          };
        }
        setPlanoAcaoItems(normalizePlanoAcaoItems(data.planoAcaoItems));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar." };
      }
    },
    [clientSlug]
  );

  const updatePlanoAcaoItem = useCallback(
    async (itemId, payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      if (!itemId) return { ok: false, message: "Ação inválida." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/plano-acao-items/${encodeURIComponent(itemId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            ok: false,
            message: data.message || "Não foi possível atualizar o plano de ação.",
          };
        }
        setPlanoAcaoItems(normalizePlanoAcaoItems(data.planoAcaoItems));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao atualizar." };
      }
    },
    [clientSlug]
  );

  const deletePlanoAcaoItem = useCallback(
    async (itemId) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      if (!itemId) return { ok: false, message: "Ação inválida." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/plano-acao-items/${encodeURIComponent(itemId)}`,
          {
            method: "DELETE",
            headers: { ...authHeaders() },
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            ok: false,
            message: data.message || "Não foi possível excluir o plano de ação.",
          };
        }
        setPlanoAcaoItems(normalizePlanoAcaoItems(data.planoAcaoItems));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao excluir." };
      }
    },
    [clientSlug]
  );

  const updateClientConfig = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) {
        return { ok: false, message: "Cliente não identificado." };
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/config`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            ok: false,
            message: data.message || "Não foi possível salvar as configurações.",
          };
        }
        setClientConfig({
          missao: String(data.missao ?? "").trim(),
          visao: String(data.visao ?? "").trim(),
          valores: String(data.valores ?? "").trim(),
        });
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar." };
      }
    },
    [clientSlug]
  );

  const addInvestimento = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/investimentos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível salvar investimento." };
        }
        setInvestimentos(Array.isArray(data.investimentos) ? data.investimentos : []);
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar investimento." };
      }
    },
    [clientSlug]
  );

  const updateInvestimento = useCallback(
    async (investimentoId, payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/investimentos/${encodeURIComponent(investimentoId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível atualizar investimento." };
        }
        setInvestimentos(Array.isArray(data.investimentos) ? data.investimentos : []);
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao atualizar investimento." };
      }
    },
    [clientSlug]
  );

  const deleteInvestimento = useCallback(
    async (investimentoId) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/investimentos/${encodeURIComponent(investimentoId)}`,
          {
            method: "DELETE",
            headers: { ...authHeaders() },
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível excluir investimento." };
        }
        setInvestimentos(Array.isArray(data.investimentos) ? data.investimentos : []);
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao excluir investimento." };
      }
    },
    [clientSlug]
  );

  const addCampanhaMarketing = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/campanhas-marketing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível salvar campanha." };
        }
        setCampanhasMarketing(
          Array.isArray(data.campanhasMarketing) ? data.campanhasMarketing : []
        );
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar campanha." };
      }
    },
    [clientSlug]
  );

  const updateCampanhaMarketing = useCallback(
    async (campanhaId, payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/campanhas-marketing/${encodeURIComponent(campanhaId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível atualizar campanha." };
        }
        setCampanhasMarketing(
          Array.isArray(data.campanhasMarketing) ? data.campanhasMarketing : []
        );
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao atualizar campanha." };
      }
    },
    [clientSlug]
  );

  const deleteCampanhaMarketing = useCallback(
    async (campanhaId) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/campanhas-marketing/${encodeURIComponent(campanhaId)}`,
          {
            method: "DELETE",
            headers: { ...authHeaders() },
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível excluir campanha." };
        }
        setCampanhasMarketing(
          Array.isArray(data.campanhasMarketing) ? data.campanhasMarketing : []
        );
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao excluir campanha." };
      }
    },
    [clientSlug]
  );

  const addKpiMarketing = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/kpis-marketing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível salvar KPI." };
        }
        setKpisMarketing(Array.isArray(data.kpisMarketing) ? data.kpisMarketing : []);
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar KPI." };
      }
    },
    [clientSlug]
  );

  const updateKpiMarketing = useCallback(
    async (kpiId, payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/kpis-marketing/${encodeURIComponent(kpiId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível atualizar KPI." };
        }
        setKpisMarketing(Array.isArray(data.kpisMarketing) ? data.kpisMarketing : []);
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao atualizar KPI." };
      }
    },
    [clientSlug]
  );

  const deleteKpiMarketing = useCallback(
    async (kpiId) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/kpis-marketing/${encodeURIComponent(kpiId)}`,
          {
            method: "DELETE",
            headers: { ...authHeaders() },
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Não foi possível excluir KPI." };
        }
        setKpisMarketing(Array.isArray(data.kpisMarketing) ? data.kpisMarketing : []);
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao excluir KPI." };
      }
    },
    [clientSlug]
  );

  const loadIntegrations = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) {
      setIntegrationsState(null);
      return { ok: false, message: "Cliente não identificado." };
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations`,
        { headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Falha ao carregar integrações." };
      }
      setIntegrationsState(data);
      return { ok: true, data };
    } catch {
      return { ok: false, message: "Falha de rede ao carregar integrações." };
    }
  }, [clientSlug]);

  const loadMarketingPerformance = useCallback(
    async (competencia) => {
      const slug = clientSlug?.trim();
      if (!slug) {
        setMarketingPerformance(null);
        return { ok: false };
      }
      try {
        const params = competencia ? `?competencia=${encodeURIComponent(competencia)}` : "";
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/marketing/performance${params}`,
          { headers: { ...authHeaders() } }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Falha ao carregar performance." };
        }
        setMarketingPerformance(data);
        return { ok: true, data };
      } catch {
        return { ok: false, message: "Falha de rede." };
      }
    },
    [clientSlug]
  );

  useEffect(() => {
    if (!clientSlug?.trim() || clientNotFound || workspaceForbidden) {
      setIntegrationsState(null);
      return;
    }
    loadIntegrations();
  }, [clientSlug, reloadKey, clientNotFound, workspaceForbidden, loadIntegrations]);

  const dismissIntegrationAlert = useCallback(
    async (alertId) => {
      const slug = clientSlug?.trim();
      if (!slug || !alertId) return { ok: false };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/alerts/dismiss`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ alertId }),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return { ok: false, message: data.message };
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          alerts: data.alerts || [],
        }));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha ao dispensar alerta." };
      }
    },
    [clientSlug]
  );

  const syncMetaPixel = useCallback(
    async ({ competencia } = {}) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/meta/pixel/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ competencia }),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (data.integrations || data.alerts) {
            setIntegrationsState((prev) => ({
              ...(prev || {}),
              integrations: data.integrations || prev?.integrations,
              alerts: data.alerts || prev?.alerts,
            }));
          }
          return { ok: false, message: data.message || "Falha ao sincronizar Pixel." };
        }
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          integrations: data.integrations,
          alerts: data.alerts || [],
          pixelSnapshot: data.pixelSnapshot || prev?.pixelSnapshot,
        }));
        return { ok: true, competencia: data.competencia };
      } catch {
        return { ok: false, message: "Falha de rede ao sincronizar Pixel." };
      }
    },
    [clientSlug]
  );

  const connectMeta = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) return { ok: false, message: "Cliente não identificado." };
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/meta/connect`,
        { headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Não foi possível iniciar conexão Meta." };
      }
      return { ok: true, authUrl: data.authUrl };
    } catch {
      return { ok: false, message: "Falha de rede ao conectar Meta." };
    }
  }, [clientSlug]);

  const disconnectMeta = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) return { ok: false, message: "Cliente não identificado." };
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/meta/disconnect`,
        { method: "POST", headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Falha ao desconectar Meta." };
      }
      setIntegrationsState((prev) => ({
        ...(prev || {}),
        integrations: data.integrations,
      }));
      return { ok: true };
    } catch {
      return { ok: false, message: "Falha de rede ao desconectar Meta." };
    }
  }, [clientSlug]);

  const fetchMetaAdAccounts = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) return { ok: false, message: "Cliente não identificado." };
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/meta/ad-accounts`,
        { headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Falha ao listar contas Meta." };
      }
      return { ok: true, accounts: data.accounts || [] };
    } catch {
      return { ok: false, message: "Falha de rede ao listar contas Meta." };
    }
  }, [clientSlug]);

  const saveMetaSettings = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/meta`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Falha ao salvar configurações Meta." };
        }
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          integrations: data.integrations,
        }));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar configurações Meta." };
      }
    },
    [clientSlug]
  );

  const syncMeta = useCallback(
    async ({ competencia } = {}) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/meta/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ competencia }),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (data.integrations) {
            setIntegrationsState((prev) => ({
              ...(prev || {}),
              integrations: data.integrations,
            }));
          }
          return { ok: false, message: data.message || "Falha ao sincronizar Meta." };
        }
        setKpisMarketing(Array.isArray(data.kpisMarketing) ? data.kpisMarketing : []);
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          integrations: data.integrations,
          alerts: data.alerts || prev?.alerts || [],
          pixelSnapshot: data.pixelSnapshot || prev?.pixelSnapshot,
        }));
        setLastUpdatedAt(new Date().toISOString());
        return { ok: true, competencia: data.competencia };
      } catch {
        return { ok: false, message: "Falha de rede ao sincronizar Meta." };
      }
    },
    [clientSlug]
  );

  const connectGoogle = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) return { ok: false, message: "Cliente não identificado." };
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/google/connect`,
        { headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Não foi possível iniciar conexão Google." };
      }
      return { ok: true, authUrl: data.authUrl };
    } catch {
      return { ok: false, message: "Falha de rede ao conectar Google." };
    }
  }, [clientSlug]);

  const disconnectGoogle = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) return { ok: false, message: "Cliente não identificado." };
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/google/disconnect`,
        { method: "POST", headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Falha ao desconectar Google." };
      }
      setIntegrationsState((prev) => ({
        ...(prev || {}),
        integrations: data.integrations,
      }));
      return { ok: true };
    } catch {
      return { ok: false, message: "Falha de rede ao desconectar Google." };
    }
  }, [clientSlug]);

  const fetchGoogleCustomers = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) return { ok: false, message: "Cliente não identificado." };
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/google/customers`,
        { headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Falha ao listar contas Google." };
      }
      return { ok: true, customers: data.customers || [] };
    } catch {
      return { ok: false, message: "Falha de rede ao listar contas Google." };
    }
  }, [clientSlug]);

  const saveGoogleSettings = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/google`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Falha ao salvar configurações Google." };
        }
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          integrations: data.integrations,
        }));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar configurações Google." };
      }
    },
    [clientSlug]
  );

  const syncGoogle = useCallback(
    async ({ competencia } = {}) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/google/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ competencia }),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (data.integrations) {
            setIntegrationsState((prev) => ({
              ...(prev || {}),
              integrations: data.integrations,
            }));
          }
          return { ok: false, message: data.message || "Falha ao sincronizar Google." };
        }
        setKpisMarketing(Array.isArray(data.kpisMarketing) ? data.kpisMarketing : []);
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          integrations: data.integrations,
        }));
        setLastUpdatedAt(new Date().toISOString());
        return { ok: true, competencia: data.competencia };
      } catch {
        return { ok: false, message: "Falha de rede ao sincronizar Google." };
      }
    },
    [clientSlug]
  );

  const saveNotificationSettings = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/notifications`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Falha ao salvar notificações." };
        }
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          notifications: data.notifications,
          notificationCapabilities: data.notificationCapabilities,
        }));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar notificações." };
      }
    },
    [clientSlug]
  );

  const sendTestNotification = useCallback(async () => {
    const slug = clientSlug?.trim();
    if (!slug) return { ok: false, message: "Cliente não identificado." };
    try {
      const response = await fetch(
        `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/notifications/test`,
        { method: "POST", headers: { ...authHeaders() } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.message || "Falha ao enviar teste." };
      }
      setIntegrationsState((prev) => ({
        ...(prev || {}),
        notifications: data.notifications || prev?.notifications,
      }));
      return { ok: true, message: data.message };
    } catch {
      return { ok: false, message: "Falha de rede ao enviar teste." };
    }
  }, [clientSlug]);

  const savePlatformIntegrationConfig = useCallback(
    async (payload) => {
      const slug = clientSlug?.trim();
      if (!slug) return { ok: false, message: "Cliente não identificado." };
      try {
        const response = await fetch(
          `${API_BASE_URL}/clients/slug/${encodeURIComponent(slug)}/integrations/platform-config`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { ok: false, message: data.message || "Falha ao salvar configuração." };
        }
        setIntegrationsState((prev) => ({
          ...(prev || {}),
          platform: data.platform,
          configured: data.configured || prev?.configured,
          notificationCapabilities: data.notificationCapabilities || prev?.notificationCapabilities,
        }));
        return { ok: true };
      } catch {
        return { ok: false, message: "Falha de rede ao salvar configuração." };
      }
    },
    [clientSlug]
  );

  return (
    <ClientDataContext.Provider
      value={{
        activeClient,
        clientConfig,
        isLoading,
        clientNotFound,
        workspaceForbidden,
        lastUpdatedAt,
        refreshClientData,
        addPlanoAcaoItem,
        updatePlanoAcaoItem,
        deletePlanoAcaoItem,
        investimentos,
        addInvestimento,
        updateInvestimento,
        deleteInvestimento,
        campanhasMarketing,
        addCampanhaMarketing,
        updateCampanhaMarketing,
        deleteCampanhaMarketing,
        kpisMarketing,
        addKpiMarketing,
        updateKpiMarketing,
        deleteKpiMarketing,
        updateClientConfig,
        integrationsState,
        integrationAlerts,
        pixelSnapshot,
        loadIntegrations,
        dismissIntegrationAlert,
        connectMeta,
        disconnectMeta,
        fetchMetaAdAccounts,
        saveMetaSettings,
        syncMeta,
        syncMetaPixel,
        connectGoogle,
        disconnectGoogle,
        fetchGoogleCustomers,
        saveGoogleSettings,
        syncGoogle,
        saveNotificationSettings,
        sendTestNotification,
        savePlatformIntegrationConfig,
        marketingPerformance,
        loadMarketingPerformance,
        ...dashboardData,
      }}
    >
      {children}
    </ClientDataContext.Provider>
  );
}

export function useClientData() {
  const context = useContext(ClientDataContext);
  if (!context) {
    throw new Error("useClientData deve ser usado dentro de ClientDataProvider.");
  }
  return context;
}

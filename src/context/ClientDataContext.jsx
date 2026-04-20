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
  const [isLoading, setIsLoading] = useState(true);
  const [clientNotFound, setClientNotFound] = useState(false);
  const [workspaceForbidden, setWorkspaceForbidden] = useState(false);

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
          setClientConfig(defaultClientConfig());
          setActiveClientState({ slug, nome: "" });
          return;
        }

        if (response.status === 404) {
          setClientNotFound(true);
          setPlanoAcaoItems([]);
          setClientConfig(defaultClientConfig());
          setActiveClientState({ slug, nome: "" });
          return;
        }

        if (!response.ok) throw new Error("Falha ao carregar dados do cliente.");

        const data = await response.json();
        setPlanoAcaoItems(normalizePlanoAcaoItems(data.planoAcaoItems));
        setClientConfig({
          missao: String(data.missao ?? "").trim(),
          visao: String(data.visao ?? "").trim(),
          valores: String(data.valores ?? "").trim(),
        });
        setActiveClientState({
          slug: data.slug || slug,
          nome: data.nome || "",
        });
      } catch {
        if (!cancelled) {
          setPlanoAcaoItems([]);
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
  }, [clientSlug]);

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

  return (
    <ClientDataContext.Provider
      value={{
        activeClient,
        clientConfig,
        isLoading,
        clientNotFound,
        workspaceForbidden,
        addPlanoAcaoItem,
        updateClientConfig,
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

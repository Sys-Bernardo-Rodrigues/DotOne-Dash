import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import { ClientDataProvider, useClientData } from "./context/ClientDataContext";
import VisaoGeralPage from "./pages/VisaoGeralPage";
import PlanoAcaoPage from "./pages/PlanoAcaoPage";
import CronogramaPage from "./pages/CronogramaPage";
import PorAreaPage from "./pages/PorAreaPage";
import ResponsaveisPage from "./pages/ResponsaveisPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import ConfiguracaoLayout from "./layouts/ConfiguracaoLayout";
import ConfiguracaoClientePage from "./pages/ConfiguracaoClientePage";
import InvestimentosPage from "./pages/InvestimentosPage";
import CampanhasMarketingPage from "./pages/CampanhasMarketingPage";
import KpisPage from "./pages/KpisPage";
import DashboardPerformancePage from "./pages/DashboardPerformancePage";
import IntegracoesMarketingPage from "./pages/IntegracoesMarketingPage";
import CredenciaisPlataformaPage from "./pages/CredenciaisPlataformaPage";
import ExplicandoSistemaPage from "./pages/ExplicandoSistemaPage";
import LoginPage from "./pages/LoginPage";
import AdmPage from "./pages/AdmPage";
import AdmHomePage from "./pages/AdmHomePage";
import { clearAdminToken, getAdminToken } from "./lib/adminApi";
import {
  canAccessClientSlug,
  canAccessFullAdmPanel,
  decodeJwtPayload,
  isMultiClientNonAdmin,
  postLoginDestination,
} from "./lib/session";

function ClientDashboardShell() {
  const { clientNotFound, isLoading, workspaceForbidden } = useClientData();
  if (!isLoading && workspaceForbidden) {
    return (
      <section className="card" style={{ margin: 24 }}>
        <h2>Acesso negado</h2>
        <p>Não tem permissão para ver este cliente.</p>
        <p>
          <Link to="/adm/home">Ir para a seleção de clientes</Link>
        </p>
      </section>
    );
  }
  if (!isLoading && clientNotFound) {
    return <Navigate to="/adm/home" replace />;
  }
  return <DashboardLayout />;
}

function ClientWorkspace() {
  return (
    <RequireToken>
      <RequireClientSlugAccess>
        <ClientDataProvider>
          <ClientDashboardShell />
        </ClientDataProvider>
      </RequireClientSlugAccess>
    </RequireToken>
  );
}

function RequireToken({ children }) {
  const location = useLocation();
  const token = getAdminToken();
  if (!token) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  return children;
}

function RequireFullAdmPanel({ children }) {
  const token = getAdminToken();
  const payload = decodeJwtPayload(token);
  if (!canAccessFullAdmPanel(payload)) {
    const slugs = payload?.clienteSlugs || [];
    if (slugs.length >= 2) return <Navigate to="/adm/home" replace />;
    if (slugs.length === 1) return <Navigate to={`/${slugs[0]}`} replace />;
    clearAdminToken();
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireClientSlugAccess({ children }) {
  const { clientSlug } = useParams();
  const token = getAdminToken();
  const payload = decodeJwtPayload(token);
  if (!canAccessClientSlug(payload, clientSlug)) {
    if (isMultiClientNonAdmin(payload)) return <Navigate to="/adm/home" replace />;
    if ((payload?.clienteSlugs || []).length === 1) {
      return <Navigate to={`/${payload.clienteSlugs[0]}`} replace />;
    }
    clearAdminToken();
    return <Navigate to="/login" replace />;
  }
  return children;
}

function HomeRoute() {
  const token = getAdminToken();
  if (!token) return <ExplicandoSistemaPage />;
  const payload = decodeJwtPayload(token);
  if (!payload) {
    clearAdminToken();
    return <ExplicandoSistemaPage />;
  }
  return <Navigate to={postLoginDestination(payload)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/explicando" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/adm"
        element={
          <RequireToken>
            <RequireFullAdmPanel>
              <AdmPage defaultSection="usuarios" />
            </RequireFullAdmPanel>
          </RequireToken>
        }
      />
      <Route
        path="/adm/home"
        element={
          <RequireToken>
            <AdmHomePage />
          </RequireToken>
        }
      />
      <Route path="/:clientSlug" element={<ClientWorkspace />}>
        <Route index element={<VisaoGeralPage />} />
        <Route path="plano-de-acao" element={<PlanoAcaoPage />} />
        <Route path="cronograma" element={<CronogramaPage />} />
        <Route path="por-area" element={<PorAreaPage />} />
        <Route path="responsaveis" element={<ResponsaveisPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="investimentos" element={<InvestimentosPage />} />
        <Route path="campanhas-marketing" element={<CampanhasMarketingPage />} />
        <Route path="kpis" element={<KpisPage />} />
        <Route
          path="integracoes-marketing"
          element={<Navigate to="configuracao/integracoes" replace />}
        />
        <Route path="dashboard-performance" element={<DashboardPerformancePage />} />
        <Route path="configuracao" element={<ConfiguracaoLayout />}>
          <Route index element={<Navigate to="geral" replace />} />
          <Route path="geral" element={<ConfiguracaoClientePage />} />
          <Route path="credenciais" element={<CredenciaisPlataformaPage />} />
          <Route path="integracoes" element={<IntegracoesMarketingPage />} />
        </Route>
      </Route>
      <Route path="*" element={<HomeRoute />} />
    </Routes>
  );
}

import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import { ClientDataProvider, useClientData } from "./context/ClientDataContext";
import VisaoGeralPage from "./pages/VisaoGeralPage";
import PlanoAcaoPage from "./pages/PlanoAcaoPage";
import CronogramaPage from "./pages/CronogramaPage";
import PorAreaPage from "./pages/PorAreaPage";
import ResponsaveisPage from "./pages/ResponsaveisPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import ConfiguracaoClientePage from "./pages/ConfiguracaoClientePage";
import InvestimentosPage from "./pages/InvestimentosPage";
import CampanhasMarketingPage from "./pages/CampanhasMarketingPage";
import LoginPage from "./pages/LoginPage";
import AdmPage from "./pages/AdmPage";
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

function RootRedirect() {
  const token = getAdminToken();
  if (!token) return <Navigate to="/login" replace />;
  const payload = decodeJwtPayload(token);
  if (!payload) {
    clearAdminToken();
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={postLoginDestination(payload)} replace />;
}

export default function App() {
  return (
    <Routes>
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
            <AdmPage defaultSection="home" />
          </RequireToken>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="/:clientSlug" element={<ClientWorkspace />}>
        <Route index element={<VisaoGeralPage />} />
        <Route path="plano-de-acao" element={<PlanoAcaoPage />} />
        <Route path="cronograma" element={<CronogramaPage />} />
        <Route path="por-area" element={<PorAreaPage />} />
        <Route path="responsaveis" element={<ResponsaveisPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="investimentos" element={<InvestimentosPage />} />
        <Route path="campanhas-marketing" element={<CampanhasMarketingPage />} />
        <Route path="configuracao" element={<ConfiguracaoClientePage />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

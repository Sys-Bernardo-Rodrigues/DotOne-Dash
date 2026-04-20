import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import VisaoGeralPage from "./pages/VisaoGeralPage";
import PlanoAcaoPage from "./pages/PlanoAcaoPage";
import CronogramaPage from "./pages/CronogramaPage";
import PorAreaPage from "./pages/PorAreaPage";
import ResponsaveisPage from "./pages/ResponsaveisPage";
import RelatoriosPage from "./pages/RelatoriosPage";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<VisaoGeralPage />} />
        <Route path="/plano-de-acao" element={<PlanoAcaoPage />} />
        <Route path="/cronograma" element={<CronogramaPage />} />
        <Route path="/por-area" element={<PorAreaPage />} />
        <Route path="/responsaveis" element={<ResponsaveisPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

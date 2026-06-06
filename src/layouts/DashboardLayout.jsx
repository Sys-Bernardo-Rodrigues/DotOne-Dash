import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import IntegrationAlertsBanner from "../components/IntegrationAlertsBanner";

export default function DashboardLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="app-main__mesh" aria-hidden="true" />
        <TopBar />
        <main className="content">
          <IntegrationAlertsBanner />
          <div className="content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

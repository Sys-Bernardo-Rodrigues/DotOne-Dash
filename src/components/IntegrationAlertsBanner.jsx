import { Link, useParams } from "react-router-dom";
import { useClientData } from "../context/ClientDataContext";

export default function IntegrationAlertsBanner() {
  const { clientSlug } = useParams();
  const { integrationAlerts, dismissIntegrationAlert, isLoading } = useClientData();

  if (isLoading || !integrationAlerts?.length) return null;

  return (
    <div className="integration-alerts" role="region" aria-label="Alertas de integrações">
      {integrationAlerts.map((alert) => (
        <article
          key={alert.id}
          className={`integration-alert integration-alert--${alert.severity || "warning"}`}
        >
          <div className="integration-alert-body">
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
          </div>
          <div className="integration-alert-actions">
            <Link
              to={`/${clientSlug}/configuracao/integracoes`}
              className="integration-alert-link"
            >
              Ir para integrações
            </Link>
            <button
              type="button"
              className="integration-alert-dismiss"
              onClick={() => dismissIntegrationAlert(alert.id)}
              aria-label={`Dispensar alerta: ${alert.title}`}
            >
              Dispensar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

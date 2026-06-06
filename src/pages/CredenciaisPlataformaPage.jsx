import { useClientData } from "../context/ClientDataContext";
import PlatformIntegrationConfig from "../components/PlatformIntegrationConfig";

export default function CredenciaisPlataformaPage() {
  const { integrationsState } = useClientData();
  const canConfigure = integrationsState?.canConfigurePlatform;

  if (!canConfigure) {
    return (
      <div className="cfg-empty-access">
        <strong>Sem permissão</strong>
        <p>
          Apenas administradores podem gerir credenciais da plataforma (Meta, Google, SMTP e
          automação).
        </p>
      </div>
    );
  }

  return (
    <div className="cfg-credenciais">
      <p className="cfg-hint">
        App IDs, secrets OAuth, SMTP e automação global. Depois de guardar, use a aba{" "}
        <strong>Integrações</strong> para conectar contas por cliente.
      </p>
      <PlatformIntegrationConfig />
    </div>
  );
}

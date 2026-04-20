import MetricsGrid from "../components/MetricsGrid";
import PageHeader from "../components/PageHeader";
import { relatorioMetricas } from "../data/dashboardData";

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Análises e exportações do plano estratégico"
        action={<button className="btn-primary">Exportar PDF</button>}
      />

      <section className="card reports-export-card">
        <div className="section-title-row">
          <h2>Exportar Relatórios</h2>
          <span>Gere relatórios em diferentes formatos para compartilhamento</span>
        </div>
        <div className="exports-grid">
          <article className="export-item"><h3>Resumo Executivo</h3><p>PDF</p></article>
          <article className="export-item"><h3>Plano de Ação Completo</h3><p>Excel</p></article>
          <article className="export-item"><h3>Análise SWOT</h3><p>PDF</p></article>
          <article className="export-item"><h3>Indicadores KPI</h3><p>CSV</p></article>
        </div>
      </section>

      <div className="reports-metrics">
        <MetricsGrid items={relatorioMetricas} />
      </div>

      <section className="charts-grid reports-charts-grid">
        <article className="card chart-card reports-chart">
          <h2>Progresso por Fase</h2>
          <p>Percentual de conclusão de cada fase estratégica</p>
          <div className="bars">
            <div className="bar-row"><span>Fase 1</span><div className="bar"><div style={{ width: "35%" }} /></div><em>35%</em></div>
            <div className="bar-row"><span>Fase 2</span><div className="bar"><div style={{ width: "20%" }} /></div><em>20%</em></div>
            <div className="bar-row"><span>Fase 3</span><div className="bar"><div style={{ width: "12%" }} /></div><em>12%</em></div>
            <div className="bar-row"><span>Fase 4</span><div className="bar"><div style={{ width: "5%" }} /></div><em>5%</em></div>
            <div className="bar-row"><span>Fase 5</span><div className="bar"><div style={{ width: "0%" }} /></div><em>0%</em></div>
          </div>
        </article>

        <article className="card chart-card reports-chart">
          <h2>Análise de Tendência</h2>
          <p>Comparação entre situação atual e meta 2025</p>
          <div className="line-visual">
            <svg viewBox="0 0 360 180" aria-hidden="true">
              <polyline points="20,145 95,118 170,105 245,88 320,78" className="line current" />
              <polyline points="20,150 95,130 170,110 245,90 320,70" className="line target" />
              <circle cx="20" cy="145" r="4" /><circle cx="95" cy="118" r="4" />
              <circle cx="170" cy="105" r="4" /><circle cx="245" cy="88" r="4" />
              <circle cx="320" cy="78" r="4" />
            </svg>
          </div>
          <div className="line-legend">
            <span><i className="dot-line current" /> Atual</span>
            <span><i className="dot-line target" /> Meta</span>
          </div>
        </article>

        <article className="card chart-card reports-chart">
          <h2>Distribuição por Área</h2>
          <p>Número de ações e progresso por área funcional</p>
          <ul className="area-list">
            <li><span>Operações</span><strong>5 ações</strong><em>28%</em></li>
            <li><span>Comercial</span><strong>4 ações</strong><em>16%</em></li>
            <li><span>Financeiro</span><strong>3 ações</strong><em>10%</em></li>
            <li><span>RH</span><strong>3 ações</strong><em>12%</em></li>
            <li><span>Tecnologia</span><strong>2 ações</strong><em>8%</em></li>
          </ul>
        </article>

        <article className="card chart-card reports-chart">
          <h2>Análise SWOT</h2>
          <p>Pontuação da matriz SWOT do diagnóstico</p>
          <div className="swot-grid">
            <div><h4>Forças</h4><strong>8.4</strong></div>
            <div><h4>Fraquezas</h4><strong>5.2</strong></div>
            <div><h4>Oportunidades</h4><strong>7.9</strong></div>
            <div><h4>Ameaças</h4><strong>6.1</strong></div>
          </div>
        </article>
      </section>

      <section className="card company-info reports-company-card">
        <h2>Informações da Empresa</h2>
        <p>Dados estratégicos da Flessak Indústria</p>
        <div className="company-grid">
          <div><h3>Missão</h3><p>Proporcionar energia limpa renovável</p></div>
          <div><h3>Visão</h3><p>Desenvolvimento sustentável</p></div>
          <div><h3>Core Business</h3><p>Tecnologia para energia sustentável</p></div>
          <div><h3>Valores</h3><p>Comprometimento, Inovação e Conhecimento</p></div>
        </div>
        <div className="differentials">
          <h3>Diferenciais</h3>
          <ul>
            <li>Qualidade superior inquestionável</li>
            <li>Conhecimento do segmento</li>
            <li>Cases de sucesso</li>
            <li>Facilidade de integração de projetos</li>
          </ul>
        </div>
      </section>
    </>
  );
}

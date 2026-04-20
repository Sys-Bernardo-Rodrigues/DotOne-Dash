import PageHeader from "../components/PageHeader";
import { planoAcaoItems } from "../data/dashboardData";

const areaLabels = {
  Comercial: "Comercial / Vendas",
  Marketing: "Marketing / Growth",
  Produção: "Produção / Operações",
  Engenharia: "Engenharia / Projetos",
  Administrativo: "Administrativo / Financeiro / RH",
  TI: "TI / Sistemas",
};

function statusClass(status) {
  if (status === "Atrasado") return "chip atraso";
  if (status === "Em Andamento") return "chip andamento";
  return "chip pendente";
}

function mediaProgresso(items) {
  if (!items.length) return 0;
  const soma = items.reduce(
    (acc, item) => acc + Number(item.progresso.replace("%", "")),
    0
  );
  return Math.round(soma / items.length);
}

export default function PorAreaPage() {
  const areasMap = planoAcaoItems.reduce((acc, item) => {
    if (!acc[item.area]) acc[item.area] = [];
    acc[item.area].push(item);
    return acc;
  }, {});

  const cards = Object.entries(areasMap)
    .map(([area, items]) => {
      const andamento = items.filter((i) => i.status === "Em Andamento").length;
      const atrasadas = items.filter((i) => i.status === "Atrasado").length;
      const pendentes = items.filter((i) => i.status === "Não Iniciado").length;
      const concluidas = items.filter((i) => i.status === "Concluído").length;
      const progresso = mediaProgresso(items);

      return {
        area,
        titulo: areaLabels[area] || area,
        items,
        progresso,
        stats: { concluidas, andamento, atrasadas, pendentes },
      };
    })
    .sort((a, b) => b.items.length - a.items.length);

  return (
    <>
      <PageHeader
        title="Visão por Área"
        subtitle="Acompanhamento das ações por departamento"
        action={<button className="btn-primary">Exportar PDF</button>}
      />

      <section className="area-vision-grid">
        {cards.map((card) => (
          <article key={card.area} className="card area-vision-card">
            <header className="area-vision-header">
              <div>
                <h2>{card.titulo}</h2>
                <p>{card.items.length} ações</p>
              </div>
              <div className="area-progress-badge">
                <strong>{card.progresso}%</strong>
                <span>progresso</span>
              </div>
            </header>

            <div className="area-progress-track">
              <div style={{ width: `${card.progresso}%` }} />
            </div>

            <div className="area-quick-stats">
              <div><strong>{card.stats.concluidas}</strong><span>Concluídas</span></div>
              <div><strong>{card.stats.andamento}</strong><span>Andamento</span></div>
              <div><strong>{card.stats.atrasadas}</strong><span>Atrasadas</span></div>
              <div><strong>{card.stats.pendentes}</strong><span>Pendentes</span></div>
            </div>

            <h3>Ações da Área</h3>
            <ul className="area-actions-list">
              {card.items.map((item) => (
                <li key={item.id}>
                  <div className="action-line-top">
                    <span>{item.id}</span>
                    <em className={statusClass(item.status)}>{item.status}</em>
                  </div>
                  <p>{item.acao}</p>
                  <small>{item.responsavel} • {item.prazo}</small>
                  <strong>{item.progresso}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}

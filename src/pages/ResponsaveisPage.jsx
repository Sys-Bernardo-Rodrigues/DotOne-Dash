import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { planoAcaoItems } from "../data/dashboardData";

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

function parseResponsaveis(raw) {
  return raw
    .replaceAll(" e ", ", ")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ResponsaveisPage() {
  const [paginaAcoesPorCard, setPaginaAcoesPorCard] = useState({});
  const itensPorCard = 3;
  const mapaResponsavel = {};

  planoAcaoItems.forEach((item) => {
    const pessoas = parseResponsaveis(item.responsavel);
    pessoas.forEach((pessoa) => {
      if (!mapaResponsavel[pessoa]) mapaResponsavel[pessoa] = [];
      mapaResponsavel[pessoa].push(item);
    });
  });

  const cards = Object.entries(mapaResponsavel)
    .map(([nome, items]) => {
      const andamento = items.filter((i) => i.status === "Em Andamento").length;
      const atrasadas = items.filter((i) => i.status === "Atrasado").length;
      const pendentes = items.filter((i) => i.status === "Não Iniciado").length;
      const concluidas = items.filter((i) => i.status === "Concluído").length;
      const progresso = mediaProgresso(items);
      return {
        nome,
        items,
        progresso,
        stats: { concluidas, andamento, atrasadas, pendentes },
      };
    })
    .sort((a, b) => b.items.length - a.items.length);

  function obterPaginaAtualCard(nome) {
    return paginaAcoesPorCard[nome] || 1;
  }

  function alterarPaginaCard(nome, novaPagina, totalPaginas) {
    setPaginaAcoesPorCard((prev) => ({
      ...prev,
      [nome]: Math.max(1, Math.min(totalPaginas, novaPagina)),
    }));
  }

  return (
    <>
      <PageHeader
        title="Responsáveis"
        subtitle="Acompanhamento das ações por pessoa"
        action={<button className="btn-primary">Exportar PDF</button>}
      />

      <section className="area-vision-grid">
        {cards.map((card) => {
          const totalPaginas = Math.max(
            1,
            Math.ceil(card.items.length / itensPorCard)
          );
          const paginaAtual = obterPaginaAtualCard(card.nome);
          const inicio = (paginaAtual - 1) * itensPorCard;
          const itensVisiveis = card.items.slice(inicio, inicio + itensPorCard);

          return (
            <article key={card.nome} className="card area-vision-card">
              <header className="area-vision-header">
                <div>
                  <h2>{card.nome}</h2>
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

              <h3>Ações do Responsável</h3>
              <ul className="area-actions-list">
                {itensVisiveis.map((item) => (
                  <li key={`${card.nome}-${item.id}`}>
                    <div className="action-line-top">
                      <span>{item.id}</span>
                      <em className={statusClass(item.status)}>{item.status}</em>
                    </div>
                    <p>{item.acao}</p>
                    <small>{item.area} • {item.prazo}</small>
                    <strong>{item.progresso}</strong>
                  </li>
                ))}
              </ul>

              {card.items.length > itensPorCard ? (
                <div className="card-actions-pagination">
                  <button
                    className="pager-btn"
                    onClick={() =>
                      alterarPaginaCard(card.nome, paginaAtual - 1, totalPaginas)
                    }
                    disabled={paginaAtual === 1}
                  >
                    Anterior
                  </button>
                  <span>
                    Ações {paginaAtual} de {totalPaginas}
                  </span>
                  <button
                    className="pager-btn"
                    onClick={() =>
                      alterarPaginaCard(card.nome, paginaAtual + 1, totalPaginas)
                    }
                    disabled={paginaAtual === totalPaginas}
                  >
                    Próxima
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </>
  );
}

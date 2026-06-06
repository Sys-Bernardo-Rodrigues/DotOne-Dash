import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useClientData } from "../context/ClientDataContext";
import { parsePlanoProgress } from "../utils/planoAcaoNormalize";

const AREA_LABELS = {
  Comercial: "Comercial / Vendas",
  Marketing: "Marketing / Growth",
  Produção: "Produção / Operações",
  Engenharia: "Engenharia / Projetos",
  Administrativo: "Administrativo / Financeiro / RH",
  TI: "TI / Sistemas",
  "Sem área": "Sem área definida",
};

const CARD_TONES = ["violet", "cyan", "emerald", "amber", "rose", "slate"];

const STATUS_META = {
  Atrasado: { tone: "danger", label: "Atrasado" },
  "Em Andamento": { tone: "active", label: "Em andamento" },
  Concluído: { tone: "done", label: "Concluído" },
  "Não Iniciado": { tone: "idle", label: "Não iniciado" },
};

const ITENS_POR_CARD = 3;

function mediaProgresso(items) {
  if (!items.length) return 0;
  const soma = items.reduce((acc, item) => acc + parsePlanoProgress(item.progresso), 0);
  return Math.round(soma / items.length);
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { tone: "idle", label: status };
  return <span className={`areas-badge areas-badge--${meta.tone}`}>{meta.label}</span>;
}

export default function PorAreaPage() {
  const { planoAcaoItems } = useClientData();
  const [paginaAcoesPorCard, setPaginaAcoesPorCard] = useState({});
  const [busca, setBusca] = useState("");

  const cards = useMemo(() => {
    const areasMap = planoAcaoItems.reduce((acc, item) => {
      const chave = item.area || "Sem área";
      if (!acc[chave]) acc[chave] = [];
      acc[chave].push(item);
      return acc;
    }, {});

    return Object.entries(areasMap)
      .map(([area, items]) => {
        const andamento = items.filter((i) => i.status === "Em Andamento").length;
        const atrasadas = items.filter((i) => i.status === "Atrasado").length;
        const pendentes = items.filter((i) => i.status === "Não Iniciado").length;
        const concluidas = items.filter((i) => i.status === "Concluído").length;

        return {
          area,
          titulo: AREA_LABELS[area] || area,
          items,
          progresso: mediaProgresso(items),
          stats: { concluidas, andamento, atrasadas, pendentes },
        };
      })
      .sort((a, b) => b.items.length - a.items.length);
  }, [planoAcaoItems]);

  const cardsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cards;

    return cards.filter((card) => {
      const hay = [
        card.area,
        card.titulo,
        ...card.items.flatMap((i) => [i.id, i.acao, i.responsavel]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(termo);
    });
  }, [cards, busca]);

  const resumo = useMemo(() => {
    const totalAcoes = planoAcaoItems.length;
    const totalAreas = cards.length;
    const atrasadas = planoAcaoItems.filter((i) => i.status === "Atrasado").length;
    const progresso =
      totalAcoes > 0
        ? Math.round(
            planoAcaoItems.reduce((acc, i) => acc + parsePlanoProgress(i.progresso), 0) /
              totalAcoes,
          )
        : 0;
    return { totalAcoes, totalAreas, atrasadas, progresso };
  }, [planoAcaoItems, cards.length]);

  function obterPaginaAtualCard(area) {
    return paginaAcoesPorCard[area] || 1;
  }

  function alterarPaginaCard(area, novaPagina, totalPaginas) {
    setPaginaAcoesPorCard((prev) => ({
      ...prev,
      [area]: Math.max(1, Math.min(totalPaginas, novaPagina)),
    }));
  }

  return (
    <div className="areas">
      <header className="areas-hero">
        <div className="areas-hero__copy">
          <span className="areas-hero__eyebrow">Estratégia · Departamentos</span>
          <h1>Visão por Área</h1>
          <p>Acompanhamento das ações agrupadas por departamento</p>
        </div>

        <div className="areas-hero__stats">
          <div className="areas-stat">
            <span>Áreas</span>
            <strong>{resumo.totalAreas}</strong>
          </div>
          <div className="areas-stat">
            <span>Ações</span>
            <strong>{resumo.totalAcoes}</strong>
          </div>
          <div className="areas-stat areas-stat--danger">
            <span>Atrasadas</span>
            <strong>{resumo.atrasadas}</strong>
          </div>
          <div className="areas-stat areas-stat--active">
            <span>Progresso</span>
            <strong>{resumo.progresso}%</strong>
          </div>
        </div>
      </header>

      {cards.length > 0 ? (
        <section className="areas-toolbar" aria-label="Filtrar áreas">
          <label className="areas-toolbar__search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar área, ação ou responsável…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
        </section>
      ) : null}

      <section className="areas-grid" aria-label="Painéis por área">
        {cards.length === 0 ? (
          <div className="areas-empty">
            <strong>Nenhuma ação no plano</strong>
            <p>
              Cadastre itens em Plano de Ação para ver o painel organizado por departamento.
            </p>
          </div>
        ) : cardsFiltrados.length === 0 ? (
          <div className="areas-empty">
            <strong>Nenhuma área encontrada</strong>
            <p>Tente outro termo de busca.</p>
          </div>
        ) : (
          cardsFiltrados.map((card, index) => {
            const totalPaginas = Math.max(1, Math.ceil(card.items.length / ITENS_POR_CARD));
            const paginaAtual = obterPaginaAtualCard(card.area);
            const inicio = (paginaAtual - 1) * ITENS_POR_CARD;
            const itensVisiveis = card.items.slice(inicio, inicio + ITENS_POR_CARD);
            const tone = CARD_TONES[index % CARD_TONES.length];

            return (
              <article
                key={card.area}
                className={`areas-card areas-card--${tone}`}
              >
                <header className="areas-card__head">
                  <div>
                    <h2>{card.titulo}</h2>
                    <p>
                      {card.items.length} aç{card.items.length === 1 ? "ão" : "ões"}
                    </p>
                  </div>
                  <div className="areas-card__progress-ring">
                    <strong>{card.progresso}%</strong>
                    <span>Progresso</span>
                  </div>
                </header>

                <div className="areas-card__bar" aria-hidden="true">
                  <div style={{ width: `${card.progresso}%` }} />
                </div>

                <div className="areas-card__metrics">
                  <div className="areas-card__metric areas-card__metric--done">
                    <strong>{card.stats.concluidas}</strong>
                    <span>Concluídas</span>
                  </div>
                  <div className="areas-card__metric areas-card__metric--active">
                    <strong>{card.stats.andamento}</strong>
                    <span>Andamento</span>
                  </div>
                  <div className="areas-card__metric areas-card__metric--danger">
                    <strong>{card.stats.atrasadas}</strong>
                    <span>Atrasadas</span>
                  </div>
                  <div className="areas-card__metric">
                    <strong>{card.stats.pendentes}</strong>
                    <span>Pendentes</span>
                  </div>
                </div>

                <h3 className="areas-card__section-title">Ações da área</h3>
                <ul className="areas-card__list">
                  {itensVisiveis.map((item) => (
                    <li key={item.id} className="areas-card__item">
                      <div className="areas-card__item-top">
                        <span className="areas-card__item-id">{item.id}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p>{item.acao}</p>
                      <div className="areas-card__item-meta">
                        <span>
                          {item.responsavel}
                          {item.prazo ? ` · ${item.prazo}` : ""}
                        </span>
                        <em>{item.progresso}</em>
                      </div>
                    </li>
                  ))}
                </ul>

                {card.items.length > ITENS_POR_CARD ? (
                  <footer className="areas-card__pager">
                    <span>
                      Página {paginaAtual} de {totalPaginas}
                    </span>
                    <div className="areas-card__pager-btns">
                      <button
                        type="button"
                        onClick={() =>
                          alterarPaginaCard(card.area, paginaAtual - 1, totalPaginas)
                        }
                        disabled={paginaAtual === 1}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          alterarPaginaCard(card.area, paginaAtual + 1, totalPaginas)
                        }
                        disabled={paginaAtual === totalPaginas}
                      >
                        Próxima
                      </button>
                    </div>
                  </footer>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      {cardsFiltrados.length > 0 ? (
        <p className="areas-foot">
          {cardsFiltrados.length} ár{cardsFiltrados.length === 1 ? "ea" : "eas"} exibida
          {cardsFiltrados.length === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

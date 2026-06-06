import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useClientData } from "../context/ClientDataContext";
import { parsePlanoProgress } from "../utils/planoAcaoNormalize";

const CARD_TONES = ["cyan", "violet", "emerald", "amber", "rose", "slate"];

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

function parseResponsaveis(raw) {
  const s = String(raw ?? "");
  return s
    .replaceAll(" e ", ", ")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function personInitial(nome) {
  const n = String(nome || "").trim();
  return n ? n.charAt(0).toUpperCase() : "?";
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { tone: "idle", label: status };
  return <span className={`resp-badge resp-badge--${meta.tone}`}>{meta.label}</span>;
}

export default function ResponsaveisPage() {
  const { planoAcaoItems } = useClientData();
  const [paginaAcoesPorCard, setPaginaAcoesPorCard] = useState({});
  const [busca, setBusca] = useState("");

  const cards = useMemo(() => {
    const mapaResponsavel = {};

    planoAcaoItems.forEach((item) => {
      const pessoas = parseResponsaveis(item.responsavel);
      const alvo = pessoas.length ? pessoas : ["Não definido"];
      alvo.forEach((pessoa) => {
        if (!mapaResponsavel[pessoa]) mapaResponsavel[pessoa] = [];
        mapaResponsavel[pessoa].push(item);
      });
    });

    return Object.entries(mapaResponsavel)
      .map(([nome, items]) => {
        const andamento = items.filter((i) => i.status === "Em Andamento").length;
        const atrasadas = items.filter((i) => i.status === "Atrasado").length;
        const pendentes = items.filter((i) => i.status === "Não Iniciado").length;
        const concluidas = items.filter((i) => i.status === "Concluído").length;

        return {
          nome,
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
        card.nome,
        ...card.items.flatMap((i) => [i.id, i.acao, i.area, i.fase]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(termo);
    });
  }, [cards, busca]);

  const resumo = useMemo(() => {
    const totalAcoes = planoAcaoItems.length;
    const totalPessoas = cards.length;
    const atrasadas = planoAcaoItems.filter((i) => i.status === "Atrasado").length;
    const progresso =
      totalAcoes > 0
        ? Math.round(
            planoAcaoItems.reduce((acc, i) => acc + parsePlanoProgress(i.progresso), 0) /
              totalAcoes,
          )
        : 0;
    return { totalAcoes, totalPessoas, atrasadas, progresso };
  }, [planoAcaoItems, cards.length]);

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
    <div className="resp">
      <header className="resp-hero">
        <div className="resp-hero__copy">
          <span className="resp-hero__eyebrow">Estratégia · Pessoas</span>
          <h1>Responsáveis</h1>
          <p>Acompanhamento das ações agrupadas por pessoa</p>
        </div>

        <div className="resp-hero__stats">
          <div className="resp-stat">
            <span>Pessoas</span>
            <strong>{resumo.totalPessoas}</strong>
          </div>
          <div className="resp-stat">
            <span>Ações</span>
            <strong>{resumo.totalAcoes}</strong>
          </div>
          <div className="resp-stat resp-stat--danger">
            <span>Atrasadas</span>
            <strong>{resumo.atrasadas}</strong>
          </div>
          <div className="resp-stat resp-stat--active">
            <span>Progresso</span>
            <strong>{resumo.progresso}%</strong>
          </div>
        </div>
      </header>

      {cards.length > 0 ? (
        <section className="resp-toolbar" aria-label="Filtrar responsáveis">
          <label className="resp-toolbar__search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar pessoa, ação ou área…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
        </section>
      ) : null}

      <section className="resp-grid" aria-label="Painéis por responsável">
        {cards.length === 0 ? (
          <div className="resp-empty">
            <strong>Nenhuma ação com responsável</strong>
            <p>
              Defina o campo Quem nas ações do Plano de Ação ou revise itens sem responsável
              atribuído.
            </p>
          </div>
        ) : cardsFiltrados.length === 0 ? (
          <div className="resp-empty">
            <strong>Nenhum responsável encontrado</strong>
            <p>Tente outro termo de busca.</p>
          </div>
        ) : (
          cardsFiltrados.map((card, index) => {
            const totalPaginas = Math.max(1, Math.ceil(card.items.length / ITENS_POR_CARD));
            const paginaAtual = obterPaginaAtualCard(card.nome);
            const inicio = (paginaAtual - 1) * ITENS_POR_CARD;
            const itensVisiveis = card.items.slice(inicio, inicio + ITENS_POR_CARD);
            const tone = CARD_TONES[index % CARD_TONES.length];

            return (
              <article key={card.nome} className={`resp-card resp-card--${tone}`}>
                <header className="resp-card__head">
                  <div className="resp-card__identity">
                    <span className="resp-card__avatar" aria-hidden="true">
                      {personInitial(card.nome)}
                    </span>
                    <div>
                      <h2>{card.nome}</h2>
                      <p>
                        {card.items.length} aç{card.items.length === 1 ? "ão" : "ões"}
                      </p>
                    </div>
                  </div>
                  <div className="resp-card__progress-ring">
                    <strong>{card.progresso}%</strong>
                    <span>Progresso</span>
                  </div>
                </header>

                <div className="resp-card__bar" aria-hidden="true">
                  <div style={{ width: `${card.progresso}%` }} />
                </div>

                <div className="resp-card__metrics">
                  <div className="resp-card__metric resp-card__metric--done">
                    <strong>{card.stats.concluidas}</strong>
                    <span>Concluídas</span>
                  </div>
                  <div className="resp-card__metric resp-card__metric--active">
                    <strong>{card.stats.andamento}</strong>
                    <span>Andamento</span>
                  </div>
                  <div className="resp-card__metric resp-card__metric--danger">
                    <strong>{card.stats.atrasadas}</strong>
                    <span>Atrasadas</span>
                  </div>
                  <div className="resp-card__metric">
                    <strong>{card.stats.pendentes}</strong>
                    <span>Pendentes</span>
                  </div>
                </div>

                <h3 className="resp-card__section-title">Ações do responsável</h3>
                <ul className="resp-card__list">
                  {itensVisiveis.map((item) => (
                    <li key={`${card.nome}-${item.id}`} className="resp-card__item">
                      <div className="resp-card__item-top">
                        <span className="resp-card__item-id">{item.id}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p>{item.acao}</p>
                      <div className="resp-card__item-meta">
                        <span>
                          {item.area}
                          {item.prazo ? ` · ${item.prazo}` : ""}
                        </span>
                        <em>{item.progresso}</em>
                      </div>
                    </li>
                  ))}
                </ul>

                {card.items.length > ITENS_POR_CARD ? (
                  <footer className="resp-card__pager">
                    <span>
                      Página {paginaAtual} de {totalPaginas}
                    </span>
                    <div className="resp-card__pager-btns">
                      <button
                        type="button"
                        onClick={() =>
                          alterarPaginaCard(card.nome, paginaAtual - 1, totalPaginas)
                        }
                        disabled={paginaAtual === 1}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          alterarPaginaCard(card.nome, paginaAtual + 1, totalPaginas)
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
        <p className="resp-foot">
          {cardsFiltrados.length} responsável{cardsFiltrados.length === 1 ? "" : "es"} exibido
          {cardsFiltrados.length === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

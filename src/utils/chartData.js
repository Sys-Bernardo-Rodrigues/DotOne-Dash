import { normalizePlanoAcaoItems, parsePlanoProgress } from "./planoAcaoNormalize.js";

function groupBy(items, key, fallback = "Sem categoria") {
  return items.reduce((acc, item) => {
    const raw = item[key];
    const groupKey =
      raw !== undefined && raw !== null && String(raw).trim() !== ""
        ? String(raw).trim()
        : fallback;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {});
}

/**
 * Dados agregados para gráficos e cards (Visão Geral, Relatórios, APIs).
 * Aceita itens crus do Mongo ou já normalizados.
 */
export function buildChartPayload(rawItems) {
  const planoAcaoItems = normalizePlanoAcaoItems(
    Array.isArray(rawItems) ? rawItems : []
  );

  const total = planoAcaoItems.length;
  const concluidas = planoAcaoItems.filter((i) => i.status === "Concluído").length;
  const andamento = planoAcaoItems.filter((i) => i.status === "Em Andamento").length;
  const atrasadas = planoAcaoItems.filter((i) => i.status === "Atrasado").length;
  const naoIniciado = planoAcaoItems.filter((i) => i.status === "Não Iniciado").length;
  const progressoGeral = total
    ? Math.round(
        planoAcaoItems.reduce((acc, item) => acc + parsePlanoProgress(item.progresso), 0) /
          total
      )
    : 0;

  const fasesMap = groupBy(planoAcaoItems, "fase", "Sem fase");
  const fases = Object.entries(fasesMap).map(([nome, items]) => ({
    nome,
    progresso: items.length
      ? Math.round(
          items.reduce((acc, item) => acc + parsePlanoProgress(item.progresso), 0) / items.length
        )
      : 0,
    atrasadas: items.filter((item) => item.status === "Atrasado").length,
  }));

  const areasMap = groupBy(planoAcaoItems, "area", "Sem área");
  const areas = Object.entries(areasMap).map(([nome, items]) => ({
    nome,
    quantidade: items.length,
    acoes: `${items.length} ações no plano`,
    percentual: total ? Math.round((items.length / total) * 100) : 0,
  }));

  const topAreaAtraso = Object.entries(areasMap)
    .map(([nome, items]) => ({
      nome,
      atrasadas: items.filter((item) => item.status === "Atrasado").length,
      total: items.length,
    }))
    .sort((a, b) => b.atrasadas - a.atrasadas)[0];

  const responsavelMap = groupBy(planoAcaoItems, "responsavel", "Não definido");
  const topResponsavel = Object.entries(responsavelMap)
    .map(([nome, items]) => ({ nome, total: items.length }))
    .sort((a, b) => b.total - a.total)[0];

  const topFase = [...fases].sort((a, b) => b.atrasadas - a.atrasadas)[0];

  const insights = [
    topAreaAtraso
      ? `Área com Maior Atraso: ${topAreaAtraso.nome} (${topAreaAtraso.atrasadas} atrasadas)`
      : "Área com Maior Atraso: sem dados",
    topResponsavel
      ? `Responsável com Mais Demandas: ${topResponsavel.nome} (${topResponsavel.total} ações)`
      : "Responsável com Mais Demandas: sem dados",
    topFase
      ? `Fase Mais Crítica: ${topFase.nome} (${topFase.atrasadas} atrasadas)`
      : "Fase Mais Crítica: sem dados",
  ];

  const metricasVisaoGeral = [
    { titulo: "Total de Ações", valor: String(total) },
    { titulo: "Concluídas", valor: String(concluidas) },
    { titulo: "Em Andamento", valor: String(andamento) },
    { titulo: "Atrasadas", valor: String(atrasadas), warning: atrasadas > 0 },
  ];

  const statusAcoes = [
    { nome: "Atrasado", valor: atrasadas },
    { nome: "Em andamento", valor: andamento },
    { nome: "Não iniciado", valor: naoIniciado },
    { nome: "Concluído", valor: concluidas },
  ];

  const acoesCriticas = planoAcaoItems
    .filter((item) => item.status === "Atrasado")
    .slice(0, 8)
    .map((item) => ({
      codigo: item.id,
      status: String(item.status || "").toUpperCase(),
      descricao: item.acao,
      meta: `${item.responsavel} • ${item.prazo || "Sem prazo"}`,
      progresso: item.progresso,
    }));

  const relatorioMetricas = [
    { titulo: "Total de Ações", valor: String(total), desc: "Distribuídas nas fases cadastradas" },
    { titulo: "Progresso Geral", valor: `${progressoGeral}%`, desc: "Média de progresso das ações" },
    {
      titulo: "Taxa de Atraso",
      valor: `${total ? Math.round((atrasadas / total) * 100) : 0}%`,
      desc: `${atrasadas} ações atrasadas`,
      warning: atrasadas > 0,
    },
    { titulo: "Em Execução", valor: String(andamento), desc: "Ações em andamento" },
  ];

  /** Séries simples para bibliotecas de gráfico (Recharts, Chart.js, etc.) */
  const series = {
    status: statusAcoes.map((s) => ({ label: s.nome, value: s.valor })),
    fases: fases.map((f) => ({
      label: f.nome,
      progresso: f.progresso,
      atrasadas: f.atrasadas,
    })),
    areas: areas.map((a) => ({
      label: a.nome,
      percentual: a.percentual,
      quantidade: a.quantidade,
    })),
  };

  /** Fases ordenadas: progresso médio (atual) vs. meta linear entre primeira e última fase */
  const fasesOrdenadas = [...fases].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
  );
  const nFases = fasesOrdenadas.length;
  let trendPorFase = { labels: [], atual: [], meta: [] };
  if (nFases >= 2) {
    trendPorFase = {
      labels: fasesOrdenadas.map((f) => f.nome),
      atual: fasesOrdenadas.map((f) => f.progresso),
      meta: fasesOrdenadas.map((_, i) =>
        Math.round((i / Math.max(1, nFases - 1)) * 100)
      ),
    };
  } else if (nFases === 1) {
    const p = fasesOrdenadas[0].progresso;
    const nome = fasesOrdenadas[0].nome;
    trendPorFase = {
      labels: [nome, nome],
      atual: [p, p],
      meta: [0, 100],
    };
  }

  /** Indicadores tipo SWOT derivados das proporções do plano (escala 0–10) */
  const swotPlano = total
    ? {
        forcas: Number(((concluidas / total) * 10).toFixed(1)),
        fraquezas: Number(((atrasadas / total) * 10).toFixed(1)),
        oportunidades: Number(((andamento / total) * 10).toFixed(1)),
        ameacas: Number(((naoIniciado / total) * 10).toFixed(1)),
      }
    : { forcas: null, fraquezas: null, oportunidades: null, ameacas: null };

  return {
    contadores: {
      total,
      concluidas,
      andamento,
      atrasadas,
      naoIniciado,
    },
    progressoGeral,
    metricasVisaoGeral,
    fases,
    areas,
    statusAcoes,
    insights,
    relatorioMetricas,
    acoesCriticas,
    series,
    trendPorFase,
    swotPlano,
  };
}

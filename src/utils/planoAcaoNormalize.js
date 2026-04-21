export function parsePlanoProgress(value) {
  const n = Number(String(value ?? "0").replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function formatPlanoProgress(value) {
  return `${parsePlanoProgress(value)}%`;
}

export function parsePrazoBR(prazo) {
  const txt = String(prazo ?? "").trim();
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computePlanoStatus({ progresso, prazo }) {
  const p = parsePlanoProgress(progresso);
  if (p >= 100) return "Concluído";
  if (p <= 0) {
    const prazoDate = parsePrazoBR(prazo);
    if (!prazoDate) return "Não Iniciado";
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return prazoDate < hoje ? "Atrasado" : "Não Iniciado";
  }
  const prazoDate = parsePrazoBR(prazo);
  if (!prazoDate) return "Em Andamento";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return prazoDate < hoje ? "Atrasado" : "Em Andamento";
}

/**
 * Garante shape estável para todas as telas (visão geral, cronograma, áreas, responsáveis, relatórios).
 */
export function normalizePlanoAcaoItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((raw, idx) => {
    const item = raw && typeof raw === "object" ? raw : {};
    const id = String(item.id ?? "").trim();
    const acao = String(item.acao ?? "").trim();
    const progresso = formatPlanoProgress(item.progresso);
    const statusComputado = computePlanoStatus({
      progresso,
      prazo: String(item.prazo ?? "").trim(),
    });
    const status = statusComputado;

    return {
      ...item,
      id: id || `ITEM-${idx + 1}`,
      acao: acao || "(Sem descrição)",
      fase: String(item.fase ?? "").trim() || "Sem fase",
      responsavel: String(item.responsavel ?? "").trim() || "Não definido",
      prazo: String(item.prazo ?? "").trim(),
      area: String(item.area ?? "").trim() || "Sem área",
      status,
      progresso,
      porQue: String(item.porQue ?? "").trim(),
      como: String(item.como ?? "").trim(),
      quanto: String(item.quanto ?? "").trim(),
    };
  });
}

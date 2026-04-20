const STATUS_OK = new Set(["Não Iniciado", "Em Andamento", "Atrasado", "Concluído"]);

export function parsePlanoProgress(value) {
  return Number(String(value ?? "0").replace("%", "")) || 0;
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
    const status = STATUS_OK.has(item.status) ? item.status : "Não Iniciado";
    const progressoRaw = item.progresso;
    const progresso =
      progressoRaw !== undefined && progressoRaw !== null && String(progressoRaw).trim() !== ""
        ? String(progressoRaw).trim()
        : "0%";

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

export function monthBounds(competencia) {
  const match = String(competencia || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return {
      competencia: `${y}-${m}`,
      since: `${y}-${m}-01`,
      until: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    competencia: `${match[1]}-${match[2]}`,
    since: `${match[1]}-${match[2]}-01`,
    until: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function currentCompetencia() {
  return monthBounds("").competencia;
}

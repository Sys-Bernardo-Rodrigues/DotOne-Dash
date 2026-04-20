import { useMemo } from "react";

const STATUS_ORDER = ["Atrasado", "Em andamento", "Não iniciado", "Concluído"];
const COLORS = ["#dc2626", "#2563eb", "#d97706", "#16a34a"];

function statusGradient(statusAcoes) {
  const byName = Object.fromEntries(statusAcoes.map((s) => [s.nome, s.valor]));
  const values = STATUS_ORDER.map((nome) => Number(byName[nome] ?? 0));
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return {
      background:
        "conic-gradient(from -90deg, #e2e8f0 0deg 360deg)",
      label: "Sem ações no plano",
    };
  }
  let acc = 0;
  const parts = [];
  values.forEach((v, i) => {
    if (v <= 0) return;
    const pct = (v / total) * 100;
    const start = acc;
    acc += pct;
    parts.push(`${COLORS[i]} ${start}% ${acc}%`);
  });
  return {
    background: `conic-gradient(from -90deg, ${parts.join(", ")})`,
    label: `Distribuição de ${total} ações por status`,
  };
}

export default function DonutStatusChart({ statusAcoes }) {
  const { background, label } = useMemo(() => statusGradient(statusAcoes), [statusAcoes]);

  return (
    <div
      className="chart-donut"
      style={{ background }}
      role="img"
      aria-label={label}
    />
  );
}

import { useId } from "react";

/**
 * Gráfico de linhas (atual vs. meta) com eixos discretos.
 * `atual` e `meta` são percentagens 0–100; `labels` alinha com cada ponto.
 */
export default function TrendLineChart({ labels, atual, meta }) {
  const gradId = useId().replace(/:/g, "");
  const invalid =
    !Array.isArray(atual) ||
    !Array.isArray(meta) ||
    atual.length < 2 ||
    meta.length < 2 ||
    atual.length !== meta.length;
  if (invalid) {
    return null;
  }

  const n = atual.length;
  const W = 400;
  const H = 220;
  const pad = { top: 28, right: 14, bottom: 44, left: 40 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const xAt = (i) => pad.left + (n <= 1 ? 0 : i / (n - 1)) * pw;
  const yAt = (v) => pad.top + ph - (Math.min(100, Math.max(0, v)) / 100) * ph;

  const pointsAtual = atual.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const pointsMeta = meta.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const bottomY = pad.top + ph;
  const areaPolygonPoints = `${xAt(0)},${bottomY} ${pointsAtual} ${xAt(n - 1)},${bottomY}`;

  const gridYs = [0, 25, 50, 75, 100];
  const showLabel = (i) => {
    if (n <= 3) return true;
    if (i === 0 || i === n - 1) return true;
    if (i === Math.floor((n - 1) / 2)) return true;
    return false;
  };

  return (
    <div className="chart-trend-wrap">
      <svg
        className="chart-trend-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridYs.map((g) => (
          <g key={g}>
            <line
              className="chart-trend-grid"
              x1={pad.left}
              x2={W - pad.right}
              y1={yAt(g)}
              y2={yAt(g)}
            />
            <text className="chart-trend-axis-y" x={pad.left - 8} y={yAt(g) + 4} textAnchor="end">
              {g}%
            </text>
          </g>
        ))}

        <polygon className="chart-trend-area" points={areaPolygonPoints} fill={`url(#${gradId})`} />

        <polyline className="chart-trend-line chart-trend-line--meta" points={pointsMeta} />
        <polyline className="chart-trend-line chart-trend-line--atual" points={pointsAtual} />

        {atual.map((v, i) => (
          <circle key={`a-${i}`} className="chart-trend-dot chart-trend-dot--atual" cx={xAt(i)} cy={yAt(v)} r="4.5" />
        ))}
        {meta.map((v, i) => (
          <circle key={`m-${i}`} className="chart-trend-dot chart-trend-dot--meta" cx={xAt(i)} cy={yAt(v)} r="3.5" />
        ))}

        {labels.map((raw, i) =>
          showLabel(i) ? (
            <text key={`l-${i}`} className="chart-trend-axis-x" x={xAt(i)} y={H - 12} textAnchor="middle">
              <title>{raw}</title>
              {String(raw).length > 14 ? `${String(raw).slice(0, 12)}…` : raw}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

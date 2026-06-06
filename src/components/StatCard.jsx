const ACCENTS = ["violet", "cyan", "amber", "rose", "emerald"];

export default function StatCard({
  title,
  value,
  description,
  accent,
  warning = false,
  index = 0,
}) {
  const accentClass = warning ? "danger" : accent || ACCENTS[index % ACCENTS.length];

  return (
    <article className={`metric-card metric-card--${accentClass}${warning ? " warning" : ""}`}>
      <div className="metric-card__glow" aria-hidden="true" />
      <div className="metric-card__inner">
        <h3>{title}</h3>
        <strong>{value}</strong>
        {description ? <p>{description}</p> : null}
      </div>
    </article>
  );
}

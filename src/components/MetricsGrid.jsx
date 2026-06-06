const accentByIndex = ["violet", "cyan", "amber", "rose", "emerald"];

export default function MetricsGrid({ items, cols = 4 }) {
  return (
    <section className={`metrics-grid ${cols === 3 ? "metrics-grid-3" : ""}`}>
      {items.map((item, index) => {
        const accent = item.warning ? "danger" : accentByIndex[index % accentByIndex.length];
        return (
          <article
            key={item.titulo}
            className={`metric-card metric-card--${accent}${item.warning ? " warning" : ""}`}
          >
            <div className="metric-card__glow" aria-hidden="true" />
            <div className="metric-card__inner">
              <h3>{item.titulo}</h3>
              <strong>{item.valor}</strong>
              {item.desc ? <p>{item.desc}</p> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

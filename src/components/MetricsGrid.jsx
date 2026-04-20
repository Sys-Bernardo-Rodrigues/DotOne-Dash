export default function MetricsGrid({ items, cols = 4 }) {
  return (
    <section className={`metrics-grid ${cols === 3 ? "metrics-grid-3" : ""}`}>
      {items.map((item) => (
        <article
          key={item.titulo}
          className={`metric-card${item.warning ? " warning" : ""}`}
        >
          <h3>{item.titulo}</h3>
          <strong>{item.valor}</strong>
          {item.desc ? <p>{item.desc}</p> : null}
        </article>
      ))}
    </section>
  );
}

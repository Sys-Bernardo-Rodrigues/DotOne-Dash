export default function PageHeader({ eyebrow, title, subtitle, action, children }) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {eyebrow ? (
          <div className="landing-hero__badge page-header__badge">
            <span className="landing-hero__pulse" />
            {eyebrow}
          </div>
        ) : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </header>
  );
}

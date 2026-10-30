import { Link } from "react-router-dom";

export function PlaceholderPage({
  title,
  description,
  emptySrc = "/empty-states/no-results.svg",
}: {
  title: string;
  description: string;
  emptySrc?: string;
}) {
  return (
    <section className="section placeholder-page">
      <div className="container">
        <div className="state-block placeholder-shell">
          <img src={emptySrc} alt="" />
          <h1 className="section-title">{title}</h1>
          <p className="section-lede">{description}</p>
          <Link className="btn btn-secondary" to="/">
            חזרה לבית
          </Link>
        </div>
      </div>
    </section>
  );
}

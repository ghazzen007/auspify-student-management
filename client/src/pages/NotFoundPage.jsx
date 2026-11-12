import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="empty">
      <h1>This page doesn't exist</h1>
      <p className="muted">The link may be old or mistyped.</p>
      <Link to="/" className="btn btn--primary">
        Back to students
      </Link>
    </div>
  );
}

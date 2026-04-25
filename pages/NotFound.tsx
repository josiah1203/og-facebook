import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <div className="text-center">
        <img src="/og-logo.png" alt="OG" className="h-16 mx-auto mb-6 opacity-50" />
        <h1
          className="text-4xl font-bold mb-4"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--og-text-primary)" }}
        >
          404
        </h1>
        <p className="text-lg mb-6" style={{ color: "var(--og-text-secondary)" }}>
          This page doesn't exist on OG.
        </p>
        <Link
          to="/feed"
          className="inline-block px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "var(--og-blue)" }}
        >
          Go to Feed
        </Link>
      </div>
    </div>
  );
}

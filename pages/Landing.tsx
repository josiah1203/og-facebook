import { Link } from "react-router";
import { ShieldCheck, ArrowDownWideNarrow, Heart } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--og-warm-white)" }}>
      {/* Hero Section */}
      <section className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          <img src="/og-logo.png" alt="OG" className="h-20 mx-auto mb-6" />
          <h1
            className="text-5xl md:text-6xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--og-blue)" }}
          >
            OG
          </h1>
          <p
            className="text-xl md:text-2xl italic mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--og-text-secondary)" }}
          >
            Social media the way it was meant to be.
          </p>
          <p className="text-base md:text-lg mb-10" style={{ color: "var(--og-text-muted)" }}>
            No algorithms. No ads. Just your campus, in order.
          </p>
          <div className="space-y-4">
            <Link
              to="/signup"
              className="inline-block px-8 py-3.5 rounded-lg text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "var(--og-blue)" }}
            >
              Join with your .edu email
            </Link>
            <p className="text-sm" style={{ color: "var(--og-blue)" }}>
              <Link to="/login" className="hover:underline">
                Already on OG? Log in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white border-t">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Why OG?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6" />}
              title="College Only"
              description="Verified .edu emails. Your network is your campus — no bots, no brands, no noise."
            />
            <FeatureCard
              icon={<ArrowDownWideNarrow className="w-6 h-6" />}
              title="Chronological Feed"
              description="Posts appear in order. What you see is what your friends shared, when they shared it. No algorithmic meddling."
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="No Ads. Ever."
              description="We don't sell your attention. OG is a tool for connection, not a marketplace for engagement."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs" style={{ color: "var(--og-text-muted)" }}>
        &copy; 2025 OG — Built for students.
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4" style={{ color: "var(--og-blue)" }}>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

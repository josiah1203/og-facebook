import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const loginMutation = trpc.ogAuth.login.useMutation({
    onSuccess: async () => {
      await refresh();
      navigate("/feed");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/og-logo.png" alt="OG" className="h-12 mx-auto mb-4" />
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Welcome back
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-md">
              {error}
            </div>
          )}

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3 rounded-md text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "var(--og-blue)" }}
          >
            {loginMutation.isPending ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: "var(--og-blue)" }}>
            <Link to="/signup" className="hover:underline">
              Join with .edu email
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--og-text-muted)" }}>
          By logging in, you agree to OG's Honor Code
        </p>
      </div>
    </div>
  );
}

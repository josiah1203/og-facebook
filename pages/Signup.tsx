import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ArrowRight, CheckCircle, GraduationCap } from "lucide-react";

type Step = "email" | "verify" | "profile" | "welcome";

export default function Signup() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState<string>("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const sendCodeMutation = trpc.ogAuth.sendVerificationCode.useMutation({
    onSuccess: (data) => {
      setMessage(data.message);
      setStep("verify");
    },
    onError: (err) => setError(err.message),
  });

  const verifyMutation = trpc.ogAuth.verifyEmail.useMutation({
    onSuccess: () => {
      setError("");
      setStep("profile");
    },
    onError: (err) => setError(err.message),
  });

  const signupMutation = trpc.ogAuth.signup.useMutation({
    onSuccess: async () => {
      await refresh();
      setStep("welcome");
    },
    onError: (err) => setError(err.message),
  });

  const extractCollege = (emailVal: string): string => {
    const domain = emailVal.split("@")[1];
    if (!domain) return "";
    const parts = domain.split(".");
    const name = parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim().endsWith(".edu")) {
      setError("Please use a valid .edu email address.");
      return;
    }
    sendCodeMutation.mutate({ email: email.trim() });
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    verifyMutation.mutate({ email, code });
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !password || password.length < 8) {
      setError("Name is required and password must be at least 8 characters.");
      return;
    }
    const finalCollege = college || extractCollege(email);
    signupMutation.mutate({
      email,
      password,
      name: name.trim(),
      college: finalCollege,
      major: major || undefined,
      gradYear: gradYear ? parseInt(gradYear) : undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/og-logo.png" alt="OG" className="h-12 mx-auto mb-4" />
          {step === "email" && (
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Join OG
            </h1>
          )}
          {step === "verify" && (
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Check your inbox
            </h1>
          )}
          {step === "profile" && (
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tell us about yourself
            </h1>
          )}
          {step === "welcome" && (
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Welcome to OG, {name.split(" ")[0]}!
            </h1>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-md mb-4">
            {error}
          </div>
        )}

        {message && step === "verify" && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-md mb-4">
            {message}
          </div>
        )}

        {/* Step 1: Email */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Enter your college email to get started.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="w-full px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={sendCodeMutation.isPending}
              className="w-full py-3 rounded-md text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: "var(--og-blue)" }}
            >
              {sendCodeMutation.isPending ? "Sending..." : "Continue"}
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
            <p className="text-center text-sm" style={{ color: "var(--og-blue)" }}>
              <Link to="/login" className="hover:underline">Already have an account? Log in</Link>
            </p>
          </form>
        )}

        {/* Step 2: Verification */}
        {step === "verify" && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-md border text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full py-3 rounded-md text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: "var(--og-blue)" }}
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setCode("");
                sendCodeMutation.mutate({ email });
              }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full py-2 text-sm flex items-center justify-center gap-1"
              style={{ color: "var(--og-blue)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Change email
            </button>
          </form>
        )}

        {/* Step 3: Profile */}
        {step === "profile" && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="col-span-2 px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
              <div className="col-span-2 flex items-center gap-2 px-4 py-3 rounded-md border bg-gray-50">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{college || extractCollege(email)}</span>
              </div>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="College name (auto-detected)"
                className="col-span-2 px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="Major (optional)"
                className="px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
              <select
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                className="px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
              >
                <option value="">Grad Year</option>
                {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
                className="col-span-2 px-4 py-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="w-full py-3 rounded-md text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: "var(--og-blue)" }}
            >
              {signupMutation.isPending ? "Creating..." : "Create Profile"}
            </button>
          </form>
        )}

        {/* Step 4: Welcome */}
        {step === "welcome" && (
          <div className="text-center space-y-6">
            <CheckCircle className="w-16 h-16 mx-auto" style={{ color: "var(--og-success)" }} />
            <p className="text-sm text-gray-500">
              Your campus network is waiting. Start by finding friends or share your first post.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/feed")}
                className="w-full py-3 rounded-md text-sm font-semibold text-white transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--og-blue)" }}
              >
                Go to Feed
              </button>
              <button
                onClick={() => navigate("/friends")}
                className="w-full py-3 rounded-md text-sm font-semibold border transition-all active:scale-[0.98]"
                style={{ color: "var(--og-blue)", borderColor: "var(--og-blue)" }}
              >
                Find Friends
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

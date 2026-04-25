import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Search, Home, Users, User, Settings, LogOut, Menu, X } from "lucide-react";

export default function OGHeader() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = [
    { path: "/feed", label: "Home", icon: Home },
    { path: "/friends", label: "Friends", icon: Users },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const isActive = (path: string) => {
    if (path === "/profile") {
      return location.pathname.startsWith("/profile");
    }
    return location.pathname === path;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/friends?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50" style={{ backgroundColor: "var(--og-blue)" }}>
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/feed" className="flex items-center gap-2 shrink-0">
          <img src="/og-logo.png" alt="OG" className="h-8 w-auto" />
        </Link>

        {/* Search - Desktop */}
        {isAuthenticated && (
          <form onSubmit={handleSearch} className="hidden md:flex items-center mx-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Search OG..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-full bg-white/90 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
          </form>
        )}

        {/* Nav Links - Desktop */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "text-white border-b-2 border-white pb-0.5"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* User Section */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="relative group">
                <button className="flex items-center gap-2 focus:outline-none">
                  <Avatar name={user?.name || ""} url={user?.avatarUrl} size="sm" />
                  <span className="text-white text-sm font-medium hidden sm:block">{user?.name?.split(" ")[0]}</span>
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  <Link to="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 rounded-b-lg w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-white text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                style={{ color: "var(--og-blue)" }}
              >
                Join OG
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          {isAuthenticated && (
            <button
              className="md:hidden text-white p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b shadow-lg">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive(link.path)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-28 h-28 text-xl",
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white/20`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ backgroundColor: "var(--og-blue-dark)" }}
    >
      {initials}
    </div>
  );
}

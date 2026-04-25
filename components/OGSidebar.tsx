import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Home, Users, User, Settings, GraduationCap, ShieldCheck } from "lucide-react";

export default function OGSidebar() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) return null;

  const navItems = [
    { path: "/feed", label: "Home", icon: Home },
    { path: "/friends", label: "Friends", icon: Users },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/profile") return location.pathname.startsWith("/profile");
    return location.pathname === path;
  };

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Profile Mini Card */}
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <Link to="/profile" className="flex items-center gap-3">
            <Avatar name={user.name || ""} url={user.avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.college}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "text-blue-700 bg-blue-50"
                    : "text-gray-600 hover:text-blue-700 hover:bg-blue-50/50"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* College Badge */}
        <div className="bg-green-50 border border-green-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Verified</span>
          </div>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            {user.college}
          </p>
        </div>
      </div>
    </aside>
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

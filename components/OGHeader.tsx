import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Search, Home, Users, User, Settings, LogOut, Menu, X, Bell, Grid } from "lucide-react";

function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-28 h-28 text-xl",
  };

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
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

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: countData } = trpc.notification.unreadCount.useQuery(undefined, { refetchInterval: 30000 });
  const unread = (countData as any)?.count ?? 0;

  const { data: notifs = [], isLoading } = trpc.notification.list.useQuery(undefined, { enabled: open });

  const markAll = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const typeLabel: Record<string, string> = {
    friend_request: "sent you a friend request",
    friend_accepted: "accepted your friend request",
    post_like: "liked your post",
    post_comment: "commented on your post",
    group_invite: "joined your group",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: "#E74C3C" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden" style={{ borderColor: "var(--og-border)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--og-border)" }}>
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--og-blue)" }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: "var(--og-border)" }}>
            {isLoading && (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && (notifs as any[]).length === 0 && (
              <div className="p-6 text-center text-sm text-gray-400">No notifications yet</div>
            )}

            {(notifs as any[]).map((n: any) => (
              <div
                key={n.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                style={{ backgroundColor: !n.read ? "rgba(59,89,152,0.04)" : undefined }}
              >
                <div className="shrink-0 mt-0.5">
                  <Avatar name={n.actor?.name || "?"} url={n.actor?.avatarUrl} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">
                    <span className="font-semibold">{n.actor?.name || "Someone"}</span>{" "}
                    {typeLabel[n.type] ?? n.type}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: "var(--og-blue)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OGHeader() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = [
    { path: "/feed", label: "Home", icon: Home },
    { path: "/groups", label: "Groups", icon: Grid },
    { path: "/friends", label: "Friends", icon: Users },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const isActive = (path: string) => {
    if (path === "/profile") return location.pathname.startsWith("/profile");
    if (path === "/groups") return location.pathname.startsWith("/groups");
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
          <img src="/og-logo.png" alt="OG" className="h-8 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-white font-bold text-lg hidden sm:block" style={{ fontFamily: "'Playfair Display', serif" }}>OG</span>
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
          <nav className="hidden md:flex items-center gap-5">
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
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <NotificationBell />

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

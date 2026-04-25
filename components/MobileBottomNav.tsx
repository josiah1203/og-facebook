import { Link, useLocation } from "react-router";
import { Home, Users, User, Bell, Grid } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

export default function MobileBottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { data } = trpc.notification.unreadCount.useQuery(undefined, { enabled: isAuthenticated });
  const unread = (data as any)?.count ?? 0;

  const isActive = (path: string) => {
    if (path === "/profile") return location.pathname.startsWith("/profile");
    if (path === "/groups") return location.pathname.startsWith("/groups");
    return location.pathname === path;
  };

  const tabs = [
    { path: "/feed", label: "Home", icon: Home },
    { path: "/groups", label: "Groups", icon: Grid },
    { path: "/friends", label: "Friends", icon: Users },
    { path: "/notifications", label: "Alerts", icon: Bell, badge: unread },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t" style={{ borderColor: "var(--og-border)" }}>
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex-1 flex flex-col items-center justify-center py-2 relative"
              style={{ color: active ? "var(--og-blue)" : "var(--og-text-muted)" }}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: "#E74C3C" }}>
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              {active && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-b-full" style={{ backgroundColor: "var(--og-blue)" }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

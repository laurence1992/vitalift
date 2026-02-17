import { Home, MessageSquare, TrendingUp, UtensilsCrossed, Heart, Settings, Users, List } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const clientTabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/inbox", icon: MessageSquare, label: "Inbox", badge: true },
  { path: "/progress", icon: TrendingUp, label: "Progress" },
  { path: "/recipes", icon: UtensilsCrossed, label: "Recipes" },
  { path: "/health", icon: Heart, label: "Health" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const coachTabs = [
  { path: "/", icon: Users, label: "Clients" },
  { path: "/inbox", icon: MessageSquare, label: "Inbox", badge: true },
  { path: "/progress", icon: TrendingUp, label: "Progress" },
  { path: "/recipes", icon: UtensilsCrossed, label: "Recipes" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const unreadCount = useUnreadCount();

  // Hide nav during active workout or conversation or on auth page
  if (
    location.pathname.startsWith("/workout/") ||
    location.pathname.startsWith("/inbox/") ||
    location.pathname === "/auth"
  ) return null;

  const tabs = profile?.role === "coach" ? coachTabs : clientTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {tab.badge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

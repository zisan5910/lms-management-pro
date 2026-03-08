import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, User, LayoutDashboard, Upload, Clock, PlusCircle, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const userTabs = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/my-courses", icon: BookOpen, label: "My Courses" },
  { to: "/profile", icon: User, label: "Profile" },
];

const adminTabs = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/videos/add", icon: Upload, label: "Upload" },
  { to: "/admin/users?status=pending", icon: Clock, label: "Pending" },
  { to: "/admin/courses?add=true", icon: PlusCircle, label: "Add Course" },
];

interface Props {
  onMoreClick: () => void;
}

export function BottomNav({ onMoreClick }: Props) {
  const { pathname } = useLocation();
  const { userDoc } = useAuth();
  const isAdmin = userDoc?.role === "admin";
  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = pathname === tab.to || (tab.to !== "/" && pathname.startsWith(tab.to.split("?")[0]));
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        {!isAdmin && (
          <button
            onClick={onMoreClick}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        )}
      </div>
    </nav>
  );
}

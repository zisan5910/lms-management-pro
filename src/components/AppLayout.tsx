import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { UserSidebar } from "@/components/UserSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DesktopUserSidebar } from "@/components/DesktopUserSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userDoc } = useAuth();
  const isAdmin = userDoc?.role === "admin";
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  const showBottomNav = isMobile || isAdmin;
  const isVideoPage = pathname.startsWith("/video/");
  const showDesktopSidebar = !isMobile && !isAdmin && !isVideoPage;

  // Hide hamburger when a sidebar is already visible on screen
  const hideHamburger = (!isMobile && isAdmin) || showDesktopSidebar;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav onMenuClick={() => setSidebarOpen(true)} hideMenu={hideHamburger} />
      
      {isAdmin ? (
        <>
          {isMobile && <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
          <div className="flex flex-1">
            {!isMobile && <AdminSidebar open={true} onClose={() => {}} />}
            <main className="flex-1 pb-16 overflow-x-hidden">
              <Outlet />
            </main>
          </div>
        </>
      ) : (
        <>
          <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-1">
            {showDesktopSidebar && <DesktopUserSidebar />}
            <main className={`flex-1 overflow-x-hidden ${showBottomNav ? "pb-16" : ""}`}>
              <Outlet />
            </main>
          </div>
        </>
      )}

      {showBottomNav && <BottomNav onMoreClick={() => setSidebarOpen(true)} />}
    </div>
  );
}
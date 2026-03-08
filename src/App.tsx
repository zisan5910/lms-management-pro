import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { AppLayout } from "@/components/AppLayout";
import { ExternalRedirect } from "@/components/ExternalRedirect";
import IndexRedirect from "@/pages/IndexRedirect";
import HomePage from "@/pages/HomePage";
import CourseDetailsPage from "@/pages/CourseDetailsPage";
import AuthPage from "@/pages/AuthPage";
import MyCoursesPage from "@/pages/MyCoursesPage";
import CourseContentPage from "@/pages/CourseContentPage";
import VideoPlayerPage from "@/pages/VideoPlayerPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCoursesPage from "@/pages/admin/AdminCoursesPage";
import AdminVideosPage from "@/pages/admin/AdminVideosPage";
import AdminAddVideoPage from "@/pages/admin/AdminAddVideoPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminPendingPage from "@/pages/admin/AdminPendingPage";
import AdminDataPage from "@/pages/admin/AdminDataPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppSettingsProvider>
            <ExternalRedirect />
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<IndexRedirect />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/course/:courseId" element={<CourseDetailsPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/my-courses" element={<MyCoursesPage />} />
                <Route path="/my-courses/:courseId" element={<CourseContentPage />} />
                <Route path="/video/:videoId" element={<VideoPlayerPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/courses" element={<AdminCoursesPage />} />
                <Route path="/admin/videos" element={<AdminVideosPage />} />
                <Route path="/admin/videos/add" element={<AdminAddVideoPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
                <Route path="/admin/pending" element={<AdminPendingPage />} />
                <Route path="/admin/data" element={<AdminDataPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

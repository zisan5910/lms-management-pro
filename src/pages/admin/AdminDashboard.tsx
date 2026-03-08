import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Link } from "react-router-dom";
import { Users, Clock, BookOpen, Video, Youtube, HardDrive } from "lucide-react";
import { AdminDashboardSkeleton } from "@/components/skeletons/AdminSkeleton";

export default function AdminDashboard() {
  const settings = useAppSettings();
  const [stats, setStats] = useState({ users: 0, pending: 0, courses: 0, videos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [usersSnap, pendingSnap, coursesSnap, videosSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "enrollRequests"), where("status", "==", "pending"))),
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "videos")),
      ]);
      setStats({
        users: usersSnap.size,
        pending: pendingSnap.size,
        courses: coursesSnap.size,
        videos: videosSnap.size,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const cards = [
    { label: "Total Students", value: stats.users, icon: Users, to: "/admin/users" },
    { label: "Pending", value: stats.pending, icon: Clock, to: "/admin/pending" },
    { label: "Courses", value: stats.courses, icon: BookOpen, to: "/admin/courses" },
    { label: "Videos", value: stats.videos, icon: Video, to: "/admin/videos" },
  ];

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="p-4 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="p-4 bg-card rounded-lg border border-border shadow-card"
          >
            <card.icon className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-2xl font-semibold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {settings.youtubeChannel && (
          <a
            href={settings.youtubeChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-4 bg-card rounded-lg border border-border text-sm text-foreground"
          >
            <Youtube className="h-5 w-5 text-destructive" />
            YouTube
          </a>
        )}
        {settings.googleDrive && (
          <a
            href={settings.googleDrive}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-4 bg-card rounded-lg border border-border text-sm text-foreground"
          >
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            Drive
          </a>
        )}
      </div>
    </div>
  );
}

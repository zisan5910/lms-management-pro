import { Link } from "react-router-dom";
import { X, Home, BookOpen, User, FileText, MessageCircle, Link as LinkIcon, Share2, Download, Sun, Moon, ExternalLink, FolderOpen } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UserSidebar({ open, onClose }: Props) {
  const settings = useAppSettings();
  const { userDoc } = useAuth();
  const { dark, toggle } = useTheme();
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (userDoc?.activeCourseId) {
      getDoc(doc(db, "courses", userDoc.activeCourseId)).then((snap) => {
        if (snap.exists()) setActiveCourse({ id: snap.id, ...snap.data() } as Course);
      });
    }
  }, [userDoc?.activeCourseId]);

  if (!open) return null;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: settings.appName, url: window.location.origin });
    }
    onClose();
  };

  const handleInstall = async () => {
    if (installPrompt) { installPrompt.prompt(); setInstallPrompt(null); }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 z-50" onClick={onClose} />
      <div className="fixed top-0 left-0 bottom-0 w-72 bg-background z-50 border-r border-border flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">{settings.appName || "LMS"}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <nav className="p-2">
          <SidebarLink to="/home" icon={Home} label="Home" onClick={onClose} />
          <SidebarLink to="/my-courses" icon={BookOpen} label="My Courses" onClick={onClose} />
          <SidebarLink to="/profile" icon={User} label="Profile" onClick={onClose} />

          {activeCourse && (
            <>
              <div className="my-2 border-t border-border" />
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase">Course</p>


              {activeCourse.allMaterialsLink && (
                <a href={activeCourse.allMaterialsLink} target="_blank" rel="noopener noreferrer" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  All Materials PDF
                  <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                </a>
              )}

              {activeCourse.routinePDF && (
                <a href={activeCourse.routinePDF} target="_blank" rel="noopener noreferrer" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Routine PDF
                  <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                </a>
              )}

              {activeCourse.discussionGroups?.filter(g => g.name && g.link).length > 0 && (
                <>
                  <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase mt-2">Discussion Groups</p>
                  {activeCourse.discussionGroups.filter(g => g.name && g.link).map((g, i) => (
                    <a key={i} href={g.link} target="_blank" rel="noopener noreferrer" onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      {g.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                    </a>
                  ))}
                </>
              )}
            </>
          )}

          {settings.usefulLinks?.length > 0 && (
            <>
              <div className="my-2 border-t border-border" />
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase">Useful Links</p>
              {settings.usefulLinks.map((link, i) => (
                <a key={i} href={link.link} target="_blank" rel="noopener noreferrer" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  {link.name}
                </a>
              ))}
            </>
          )}

          {settings.socialLinks?.length > 0 && (
            <>
              <div className="my-2 border-t border-border" />
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase">Follow Us</p>
              {settings.socialLinks.map((sl, i) => (
                <a key={i} href={sl.link} target="_blank" rel="noopener noreferrer" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  {sl.name}
                </a>
              ))}
            </>
          )}

          <div className="my-2 border-t border-border" />

          <button onClick={toggle}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent w-full">
            {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>

          <button onClick={handleShare}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent w-full">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            Share App
          </button>

          {installPrompt && (
            <button onClick={handleInstall}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent w-full">
              <Download className="h-4 w-4 text-muted-foreground" />
              Install App
            </button>
          )}
        </nav>
      </div>
    </>
  );
}

function SidebarLink({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}

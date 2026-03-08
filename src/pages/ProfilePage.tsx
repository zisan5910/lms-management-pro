import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LogOut, KeyRound, FileText, MessageCircle, ExternalLink, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { Course } from "@/types";
import { FloatingButtons } from "@/components/FloatingButtons";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const { user, userDoc, logout, resetPassword, refreshUserDoc } = useAuth();
  const settings = useAppSettings();
  const navigate = useNavigate();
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  useEffect(() => { if (!user) navigate("/auth?mode=login"); }, [user]);

  useEffect(() => {
    if (userDoc?.activeCourseId) {
      getDoc(doc(db, "courses", userDoc.activeCourseId)).then((snap) => {
        if (snap.exists()) setActiveCourse({ id: snap.id, ...snap.data() } as Course);
      });
    }
  }, [userDoc?.activeCourseId]);

  if (!user || !userDoc) return null;

  const handleLogout = async () => { await logout(); navigate("/"); };
  const handleResetPassword = async () => {
    try { await resetPassword(userDoc.email); toast.success("Password reset email sent"); }
    catch { toast.error("Failed to send reset email"); }
  };
  const handleSwitchCourse = async (courseId: string) => {
    await updateDoc(doc(db, "users", user.uid), { activeCourseId: courseId });
    await refreshUserDoc();
    toast.success("Active course changed");
  };

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in">
      <div className="bg-card rounded-lg border border-border p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold mx-auto">
          {userDoc.name?.[0]?.toUpperCase() || "U"}
        </div>
        <h2 className="text-lg font-semibold text-foreground mt-3">{userDoc.name}</h2>
        <p className="text-sm text-muted-foreground">{userDoc.email}</p>
      </div>

      {userDoc.enrolledCourses?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-foreground mb-3">Enrolled Courses</h3>
          <div className="space-y-2">
            {userDoc.enrolledCourses.map((c) => (
              <div key={c.courseId} className={`flex items-center justify-between p-3 rounded-lg border ${c.courseId === userDoc.activeCourseId ? "border-primary bg-accent" : "border-border bg-card"}`}>
                <div className="flex items-center gap-3">
                  {c.courseThumbnail && <img src={c.courseThumbnail} alt="" className="w-10 h-10 rounded-md object-cover" />}
                  <span className="text-sm font-medium text-foreground">{c.courseName}</span>
                </div>
                {c.courseId !== userDoc.activeCourseId && userDoc.enrolledCourses.length > 1 && (
                  <button onClick={() => handleSwitchCourse(c.courseId)} className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground">Select</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCourse?.allMaterialsLink && (
        <div className="mt-6">
          <h3 className="font-semibold text-foreground mb-3">All Materials</h3>
          <div className="space-y-2">
            <a href={activeCourse.allMaterialsLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-accent">
              <FileText className="h-4 w-4 text-muted-foreground" />
              All Materials PDF
              <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
            </a>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {activeCourse?.routinePDF && (
          <a href={activeCourse.routinePDF} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg text-sm text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground" /> Routine PDF
            <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
          </a>
        )}
        {activeCourse?.discussionGroups?.filter(g => g.name && g.link).map((g, i) => (
          <a key={i} href={g.link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg text-sm text-foreground">
            <MessageCircle className="h-4 w-4 text-muted-foreground" /> {g.name}
            <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <button onClick={handleResetPassword} className="flex items-center gap-3 w-full p-3 bg-card border border-border rounded-lg text-sm text-foreground">
          <KeyRound className="h-4 w-4 text-muted-foreground" /> Reset Password
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-3 w-full p-3 bg-card border border-border rounded-lg text-sm text-destructive">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Logout</AlertDialogTitle><AlertDialogDescription>Are you sure you want to logout?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <FloatingButtons />
    </div>
  );
}

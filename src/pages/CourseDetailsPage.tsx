import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Course } from "@/types";
import { FileText, Users, Clock, BookOpen, MessageSquare, ExternalLink } from "lucide-react";
import { CourseDetailsSkeleton } from "@/components/skeletons/CourseDetailsSkeleton";
import { FloatingButtons } from "@/components/FloatingButtons";

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const { user, userDoc } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      const snap = await getDoc(doc(db, "courses", courseId));
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() } as Course);
      
      if (user) {
        const q = query(collection(db, "enrollRequests"), where("userId", "==", user.uid), where("courseId", "==", courseId), where("status", "==", "pending"));
        const reqSnap = await getDocs(q);
        setHasPendingRequest(!reqSnap.empty);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [courseId, user]);

  if (loading) return <CourseDetailsSkeleton />;
  if (!course) return <div className="p-4 text-center text-muted-foreground">Course not found.</div>;

  const isEnrolled = userDoc?.enrolledCourses?.some((c) => c.courseId === courseId);

  const handleEnroll = () => {
    if (!user) navigate(`/auth?mode=register&courseId=${courseId}`);
    else if (!isEnrolled) navigate(`/auth?mode=register&courseId=${courseId}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Desktop: Split View | Mobile: Stacked */}
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <div className="lg:grid lg:grid-cols-5 lg:gap-8">
          {/* Left: Thumbnail (desktop: sticky) */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-20">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.courseName}
                  className="w-full aspect-video lg:aspect-[3/4] object-cover rounded-xl shadow-lg"
                />
              ) : (
                <div className="w-full aspect-video lg:aspect-[3/4] bg-muted rounded-xl flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}

              {/* CTA on desktop below image */}
              <div className="hidden lg:block mt-4">
                {isEnrolled && !hasPendingRequest ? (
                  <Link to="/my-courses" className="block w-full text-center px-6 py-3.5 text-sm font-semibold rounded-xl bg-success text-success-foreground shadow-sm hover:opacity-90 transition-opacity">
                    ✅ Visit Course
                  </Link>
                ) : hasPendingRequest ? (
                  <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium rounded-xl bg-warning/15 text-warning border border-warning/30">
                    <Clock className="h-4 w-4" /> Pending Approval
                  </div>
                ) : (
                  <button onClick={handleEnroll} className="w-full px-6 py-3.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity active:scale-[0.98]">
                    Enroll Now — ৳{course.price}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-3 mt-5 lg:mt-0 space-y-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{course.courseName}</h1>
              <p className="text-xl font-semibold text-primary mt-2">৳{course.price}</p>
            </div>

            {/* Overview */}
            {course.overview?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Overview
                </h3>
                <ul className="space-y-2">
                  {course.overview.map((point, i) => (
                    <li key={i} className="text-muted-foreground text-sm flex gap-2.5">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Subjects */}
            {course.subjects?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Subjects ({course.subjects.length})
                </h3>
                <div className="space-y-2">
                  {course.subjects.map((s) => (
                    <div key={s.subjectId} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-accent/30">
                      <span className="text-sm font-medium text-foreground">{s.subjectName}</span>
                      {s.chapters?.length ? (
                        <span className="text-xs text-muted-foreground">{s.chapters.length} chapters</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructors */}
            {course.instructors?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Instructors
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.instructors.map((inst, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                      {inst.image ? (
                        <img src={inst.image} alt={inst.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{inst.name[0]}</div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">{inst.subject}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {(course.routinePDF || course.allMaterialsLink) && (
              <div className="flex flex-wrap gap-3">
                {course.routinePDF && (
                  <a href={course.routinePDF} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-card border border-border hover:bg-accent transition-colors">
                    <FileText className="h-4 w-4 text-primary" /> Routine PDF
                  </a>
                )}
                {course.allMaterialsLink && (
                  <a href={course.allMaterialsLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-card border border-border hover:bg-accent transition-colors">
                    <ExternalLink className="h-4 w-4 text-primary" /> All Materials
                  </a>
                )}
              </div>
            )}

            {/* Mobile CTA */}
            <div className="lg:hidden pt-2">
              {isEnrolled && !hasPendingRequest ? (
                <Link to="/my-courses" className="block w-full text-center px-6 py-3.5 text-sm font-semibold rounded-xl bg-success text-success-foreground shadow-sm">
                  ✅ Visit Course
                </Link>
              ) : hasPendingRequest ? (
                <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium rounded-xl bg-warning/15 text-warning border border-warning/30">
                  <Clock className="h-4 w-4" /> Pending Approval
                </div>
              ) : (
                <button onClick={handleEnroll} className="w-full px-6 py-3.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground shadow-sm active:scale-[0.98] transition-all">
                  Enroll Now — ৳{course.price}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingButtons course={course} />
    </div>
  );
}

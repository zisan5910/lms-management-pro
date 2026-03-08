import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Course } from "@/types";
import { FileText, Users } from "lucide-react";
import { CourseDetailsSkeleton } from "@/components/skeletons/CourseDetailsSkeleton";
import { FloatingButtons } from "@/components/FloatingButtons";

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const { user, userDoc } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!courseId) return;
      const snap = await getDoc(doc(db, "courses", courseId));
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() } as Course);
      setLoading(false);
    };
    fetch();
  }, [courseId]);

  if (loading) return <CourseDetailsSkeleton />;
  if (!course) return <div className="p-4 text-center text-muted-foreground">Course not found.</div>;

  const isEnrolled = userDoc?.enrolledCourses?.some((c) => c.courseId === courseId);

  const handleEnroll = () => {
    if (!user) navigate(`/auth?mode=register&courseId=${courseId}`);
    else if (!isEnrolled) navigate(`/auth?mode=register&courseId=${courseId}`);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto animate-fade-in">
      {course.thumbnail && (
        <img src={course.thumbnail} alt={course.courseName} className="w-full h-48 sm:h-64 object-cover rounded-lg" />
      )}
      <h1 className="text-2xl font-semibold text-foreground mt-4">{course.courseName}</h1>
      <p className="text-xl font-medium text-foreground mt-1">৳{course.price}</p>

      {course.overview?.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-foreground mb-2">Overview</h3>
          <ul className="space-y-1">
            {course.overview.map((point, i) => (
              <li key={i} className="text-muted-foreground text-sm flex gap-2">
                <span className="text-foreground">•</span>{point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {course.instructors?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Instructors
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {course.instructors.map((inst, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                {inst.image ? (
                  <img src={inst.image} alt={inst.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">{inst.name[0]}</div>
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

      {course.routinePDF && (
        <a href={course.routinePDF} target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 text-sm text-foreground underline">
          <FileText className="h-4 w-4" /> Routine PDF
        </a>
      )}

      <div className="mt-6">
        {isEnrolled ? (
          <Link to="/my-courses" className="inline-block px-6 py-3 text-sm font-medium rounded-md bg-success text-success-foreground">
            Visit Course
          </Link>
        ) : (
          <button onClick={handleEnroll} className="px-6 py-3 text-sm font-medium rounded-md bg-primary text-primary-foreground">
            Enroll Now
          </button>
        )}
      </div>

      <FloatingButtons course={course} />
    </div>
  );
}

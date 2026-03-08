import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EnrollRequest, UserDoc, EnrolledCourse } from "@/types";
import { toast } from "sonner";
import { Check, X, Eye, ChevronLeft, BookOpen } from "lucide-react";
import { AdminPendingSkeleton } from "@/components/skeletons/AdminSkeleton";
import { ImagePreview } from "@/components/ImagePreview";

interface EnrollRequestWithUser extends EnrollRequest {
  previousCourses: EnrolledCourse[];
  userStatus: string;
}

export default function AdminPendingPage() {
  const [requests, setRequests] = useState<EnrollRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrollRequestWithUser | null>(null);

  const fetchRequests = async () => {
    const snap = await getDocs(query(collection(db, "enrollRequests"), where("status", "==", "pending")));
    const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EnrollRequest));

    // Fetch user data for each request to get previous courses
    const enriched: EnrollRequestWithUser[] = await Promise.all(
      reqs.map(async (req) => {
        try {
          const userSnap = await getDoc(doc(db, "users", req.userId));
          const userData = userSnap.data() as UserDoc | undefined;
          return {
            ...req,
            previousCourses: userData?.enrolledCourses?.filter(c => c.courseId !== req.courseId) || [],
            userStatus: userData?.status || "pending",
          };
        } catch {
          return { ...req, previousCourses: [], userStatus: "pending" };
        }
      })
    );

    setRequests(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (req: EnrollRequestWithUser) => {
    await updateDoc(doc(db, "enrollRequests", req.id), { status: "approved" });
    // Only set user status to approved if they're not already approved
    if (req.userStatus !== "approved") {
      await updateDoc(doc(db, "users", req.userId), { status: "approved" });
    }
    toast.success(`${req.name} - ${req.courseName} approved`);
    if (selected?.id === req.id) setSelected(null);
    fetchRequests();
  };

  const handleReject = async (req: EnrollRequestWithUser) => {
    await updateDoc(doc(db, "enrollRequests", req.id), { status: "rejected" });
    // Don't change user status if they have other approved courses
    if (req.previousCourses.length === 0) {
      await updateDoc(doc(db, "users", req.userId), { status: "rejected" });
    }
    toast.success(`${req.name} - ${req.courseName} rejected`);
    if (selected?.id === req.id) setSelected(null);
    fetchRequests();
  };

  if (loading) return <AdminPendingSkeleton count={4} />;

  // Detail view
  if (selected) {
    return (
      <div className="p-3 sm:p-4 animate-fade-in max-w-2xl mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold flex-shrink-0">
              {selected.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">{selected.name}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{selected.email}</p>
              {selected.previousCourses.length > 0 && (
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                  Existing Student
                </span>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[65vh]">
            {/* Previous Courses */}
            {selected.previousCourses.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Previously Enrolled Courses</p>
                <div className="space-y-2">
                  {selected.previousCourses.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-success/5 border border-success/20 rounded-lg">
                      {c.courseThumbnail && <img src={c.courseThumbnail} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground truncate block">{c.courseName}</span>
                        <span className="text-[11px] text-success">Approved</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Course Request */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase mb-2">New Course Request</p>
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-warning flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{selected.courseName}</span>
                </div>
                <span className="text-[11px] text-warning ml-6">Pending Approval</span>
              </div>
            </div>

            {/* Payment Details */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Payment Details</p>
              <div className="space-y-3">
                <DetailRow label="Payment Method" value={selected.paymentMethod} />
                <DetailRow label="Payment Number" value={selected.paymentNumber} />
                <DetailRow label="Transaction ID" value={selected.transactionId} />
                {selected.screenshot && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Screenshot</p>
                    <ImagePreview file={null} url={selected.screenshot} size="lg" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border flex gap-2">
            <button onClick={() => handleApprove(selected)} className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-success/10 text-success font-medium hover:bg-success/20 transition-colors">
              Approve
            </button>
            <button onClick={() => handleReject(selected)} className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors">
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground mb-4">Pending Requests ({requests.length})</h2>
      
      {requests.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No pending requests.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <button key={req.id} onClick={() => setSelected(req)} className="w-full text-left p-3 bg-card rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{req.name}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New: <span className="text-foreground">{req.courseName}</span>
                  </p>
                  {req.previousCourses.length > 0 && (
                    <p className="text-[11px] text-success mt-0.5">
                      +{req.previousCourses.length} existing course{req.previousCourses.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleApprove(req); }} className="p-1.5 rounded-md hover:bg-accent"><Check className="h-4 w-4 text-success" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleReject(req); }} className="p-1.5 rounded-md hover:bg-accent"><X className="h-4 w-4 text-destructive" /></button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground text-sm">{value || "—"}</p>
    </div>
  );
}

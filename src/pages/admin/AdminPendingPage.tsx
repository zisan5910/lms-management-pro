import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, arrayUnion, Timestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EnrollRequest } from "@/types";
import { toast } from "sonner";
import { Check, X, Trash2, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminPendingSkeleton } from "@/components/skeletons/AdminSkeleton";

export default function AdminPendingPage() {
  const [requests, setRequests] = useState<EnrollRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrollRequest | null>(null);

  const fetchRequests = async () => {
    const snap = await getDocs(query(collection(db, "enrollRequests"), where("status", "==", "pending")));
    setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EnrollRequest)));
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (req: EnrollRequest) => {
    // Update enrollRequest status
    await updateDoc(doc(db, "enrollRequests", req.id), { status: "approved" });

    // Get course thumbnail
    let courseThumbnail = "";
    try {
      const courseSnap = await getDoc(doc(db, "courses", req.courseId));
      if (courseSnap.exists()) courseThumbnail = courseSnap.data().thumbnail || "";
    } catch {}

    // Add course to user's enrolledCourses
    await updateDoc(doc(db, "users", req.userId), {
      status: "approved",
      enrolledCourses: arrayUnion({
        courseId: req.courseId,
        courseName: req.courseName,
        courseThumbnail,
        enrolledAt: Timestamp.now(),
      }),
    });

    toast.success(`${req.name} approved for ${req.courseName}`);
    fetchRequests();
  };

  const handleReject = async (req: EnrollRequest) => {
    await updateDoc(doc(db, "enrollRequests", req.id), { status: "rejected" });
    await updateDoc(doc(db, "users", req.userId), { status: "rejected" });
    toast.success(`${req.name} rejected`);
    fetchRequests();
  };

  if (loading) return <AdminPendingSkeleton count={4} />;

  return (
    <div className="p-4 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground mb-4">Pending Requests ({requests.length})</h2>
      
      {requests.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No pending requests.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <div key={req.id} className="p-3 bg-card rounded-lg border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">{req.name}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{req.courseName}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setSelected(req)} className="p-1.5 rounded-md hover:bg-accent"><Eye className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => handleApprove(req)} className="p-1.5 rounded-md hover:bg-accent"><Check className="h-4 w-4 text-success" /></button>
                  <button onClick={() => handleReject(req)} className="p-1.5 rounded-md hover:bg-accent"><X className="h-4 w-4 text-destructive" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Name</p><p className="text-foreground">{selected.name}</p></div>
              <div><p className="text-muted-foreground text-xs">Email</p><p className="text-foreground">{selected.email}</p></div>
              <div><p className="text-muted-foreground text-xs">Course</p><p className="text-foreground">{selected.courseName}</p></div>
              <div><p className="text-muted-foreground text-xs">Payment Method</p><p className="text-foreground">{selected.paymentMethod || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Payment Number</p><p className="text-foreground">{selected.paymentNumber || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Transaction ID</p><p className="text-foreground">{selected.transactionId || "—"}</p></div>
              {selected.screenshot && (
                <div><p className="text-muted-foreground text-xs">Screenshot</p><img src={selected.screenshot} alt="Payment" className="w-full rounded-md mt-1" /></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

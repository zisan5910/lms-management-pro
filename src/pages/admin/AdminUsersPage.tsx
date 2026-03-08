import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserDoc, EnrollRequest } from "@/types";
import { toast } from "sonner";
import { Check, X, Trash2, Eye, ChevronLeft, Search, Users, BookOpen } from "lucide-react";
import { AdminListSkeleton } from "@/components/skeletons/AdminSkeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ImagePreview } from "@/components/ImagePreview";

interface UserWithId extends UserDoc { id: string; }

interface UserEnrollments {
  user: UserWithId;
  enrollRequests: EnrollRequest[];
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminUsersPage() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [enrollRequests, setEnrollRequests] = useState<EnrollRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const initialStatus = (searchParams.get("status") as StatusFilter) || "all";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    ["all", "pending", "approved", "rejected"].includes(initialStatus) ? initialStatus : "all"
  );
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null);

  const fetchData = async () => {
    const [usersSnap, requestsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "enrollRequests")),
    ]);
    setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as UserWithId)));
    setEnrollRequests(requestsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EnrollRequest)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRequests = (userId: string) => enrollRequests.filter(r => r.userId === userId);
  const hasPendingRequest = (userId: string) => getUserRequests(userId).some(r => r.status === "pending");
  const hasApprovedRequest = (userId: string) => getUserRequests(userId).some(r => r.status === "approved");

  const handleApprove = async (userId: string) => {
    await updateDoc(doc(db, "users", userId), { status: "approved" });
    toast.success("User approved");
    fetchData();
  };

  const handleReject = async (userId: string) => {
    await updateDoc(doc(db, "users", userId), { status: "rejected" });
    toast.success("User rejected");
    fetchData();
  };

  const handleDelete = async (userId: string) => {
    await deleteDoc(doc(db, "users", userId));
    toast.success("User deleted");
    fetchData();
  };

  const handleApproveRequest = async (reqId: string, userId: string, courseName: string) => {
    await updateDoc(doc(db, "enrollRequests", reqId), { status: "approved" });
    // Ensure user is approved
    const userDoc = users.find(u => u.id === userId);
    if (userDoc?.status !== "approved") {
      await updateDoc(doc(db, "users", userId), { status: "approved" });
    }
    toast.success(`${courseName} approved`);
    fetchData();
  };

  const handleRejectRequest = async (reqId: string, userId: string, courseName: string) => {
    await updateDoc(doc(db, "enrollRequests", reqId), { status: "rejected" });
    toast.success(`${courseName} rejected`);
    fetchData();
  };

  const filtered = users.filter((u) => {
    if (u.role === "admin") return false;
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.enrolledCourses?.some((c) => c.courseName.toLowerCase().includes(search.toLowerCase()));
    const userHasPendingRequest = hasPendingRequest(u.id);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" ? (u.status === "pending" || userHasPendingRequest) : u.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const students = users.filter(u => u.role !== "admin");
  const statusCounts = {
    all: students.length,
    pending: students.filter(u => u.status === "pending" || hasPendingRequest(u.id)).length,
    approved: students.filter(u => u.status === "approved").length,
    rejected: students.filter(u => u.status === "rejected").length,
  };

  if (loading) return <AdminListSkeleton count={6} />;

  // Full detail view
  if (selectedUser) {
    const userRequests = getUserRequests(selectedUser.id);
    const pendingReqs = userRequests.filter(r => r.status === "pending");
    const approvedReqs = userRequests.filter(r => r.status === "approved");
    const rejectedReqs = userRequests.filter(r => r.status === "rejected");

    return (
      <div className="p-3 sm:p-4 animate-fade-in max-w-2xl mx-auto overflow-x-hidden">
        <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Users
        </button>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg sm:text-xl font-semibold flex-shrink-0">
              {selectedUser.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">{selectedUser.name}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{selectedUser.email}</p>
              <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                selectedUser.status === "approved" ? "bg-success/10 text-success" :
                selectedUser.status === "pending" ? "bg-warning/10 text-warning" :
                "bg-destructive/10 text-destructive"
              }`}>
                {selectedUser.status}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[60vh]">
            <DetailRow label="Role" value={selectedUser.role} />
            <DetailRow label="Created At" value={selectedUser.createdAt?.toDate?.()?.toLocaleString?.() || "—"} />

            {/* Enrolled Courses */}
            {selectedUser.enrolledCourses?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Enrolled Courses ({selectedUser.enrolledCourses.length})</p>
                <div className="space-y-2">
                  {selectedUser.enrolledCourses.map((c, i) => {
                    const courseReq = userRequests.find(r => r.courseId === c.courseId);
                    const reqStatus = courseReq?.status || "approved";
                    return (
                      <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                        reqStatus === "approved" ? "bg-success/5 border-success/20" :
                        reqStatus === "pending" ? "bg-warning/5 border-warning/20" :
                        "bg-destructive/5 border-destructive/20"
                      }`}>
                        {c.courseThumbnail && <img src={c.courseThumbnail} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-foreground truncate block">{c.courseName}</span>
                          <span className={`text-[11px] ${
                            reqStatus === "approved" ? "text-success" :
                            reqStatus === "pending" ? "text-warning" :
                            "text-destructive"
                          }`}>{reqStatus}</span>
                        </div>
                        {reqStatus === "pending" && courseReq && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleApproveRequest(courseReq.id, selectedUser.id, c.courseName)} className="p-1.5 rounded-md hover:bg-accent"><Check className="h-4 w-4 text-success" /></button>
                            <button onClick={() => handleRejectRequest(courseReq.id, selectedUser.id, c.courseName)} className="p-1.5 rounded-md hover:bg-accent"><X className="h-4 w-4 text-destructive" /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending Enrollment Requests with Payment Details */}
            {pendingReqs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Pending Payment Details</p>
                {pendingReqs.map((req) => (
                  <div key={req.id} className="p-3 bg-warning/5 border border-warning/20 rounded-lg space-y-2 mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium text-foreground">{req.courseName}</span>
                    </div>
                    <div className="ml-6 space-y-1.5">
                      <DetailRow label="Payment Method" value={req.paymentMethod} />
                      <DetailRow label="Payment Number" value={req.paymentNumber} />
                      <DetailRow label="Transaction ID" value={req.transactionId} />
                      {req.screenshot && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Screenshot</p>
                          <ImagePreview file={null} url={req.screenshot} size="lg" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Approved Enrollment Details */}
            {approvedReqs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Approved Enrollments</p>
                {approvedReqs.map((req) => (
                  <div key={req.id} className="p-3 bg-success/5 border border-success/20 rounded-lg space-y-2 mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-foreground">{req.courseName}</span>
                    </div>
                    <div className="ml-6 space-y-1.5">
                      <DetailRow label="Payment Method" value={req.paymentMethod} />
                      <DetailRow label="Transaction ID" value={req.transactionId} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Original Payment Info */}
            {selectedUser.paymentInfo && !userRequests.some(r => r.courseId) && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Payment Information</p>
                </div>
                <DetailRow label="Payment Method" value={selectedUser.paymentInfo.method} />
                <DetailRow label="Payment Number" value={selectedUser.paymentInfo.paymentNumber} />
                <DetailRow label="Transaction ID" value={selectedUser.paymentInfo.transactionId} />
                {selectedUser.paymentInfo.screenshot && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Transaction Screenshot</p>
                    <ImagePreview file={null} url={selectedUser.paymentInfo.screenshot} size="lg" />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t border-border flex gap-2 flex-wrap">
            {selectedUser.status !== "approved" && (
              <button onClick={() => { handleApprove(selectedUser.id); setSelectedUser(null); }} className="px-4 py-2 text-sm rounded-lg bg-success/10 text-success font-medium transition-colors hover:bg-success/20">
                Approve
              </button>
            )}
            {selectedUser.status !== "rejected" && (
              <button onClick={() => { handleReject(selectedUser.id); setSelectedUser(null); }} className="px-4 py-2 text-sm rounded-lg bg-warning/10 text-warning font-medium transition-colors hover:bg-warning/20">
                Reject
              </button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="px-4 py-2 text-sm rounded-lg bg-destructive/10 text-destructive font-medium transition-colors hover:bg-destructive/20">Delete</button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete {selectedUser.name}.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { handleDelete(selectedUser.id); setSelectedUser(null); }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 animate-fade-in max-w-4xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5" /> Users ({students.length})
        </h2>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, email, or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-1 opacity-70">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No users found</div>
        )}
        {filtered.map((u) => {
          const pendingCount = getUserRequests(u.id).filter(r => r.status === "pending").length;
          return (
            <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left p-3 bg-card rounded-xl border border-border flex items-center gap-3 hover:bg-accent/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {u.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                {u.enrolledCourses?.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                    {u.enrolledCourses.map(c => c.courseName).join(", ")}
                  </p>
                )}
                {pendingCount > 0 && (
                  <p className="text-[11px] text-warning mt-0.5">{pendingCount} pending request{pendingCount > 1 ? "s" : ""}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                u.status === "approved" ? "bg-success/10 text-success" :
                u.status === "pending" ? "bg-warning/10 text-warning" :
                "bg-destructive/10 text-destructive"
              }`}>
                {u.status}
              </span>
            </button>
          );
        })}
      </div>
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

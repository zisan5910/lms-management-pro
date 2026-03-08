import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserDoc } from "@/types";
import { toast } from "sonner";
import { Check, X, Trash2, Eye, ChevronLeft, Filter, Search, Users } from "lucide-react";
import { AdminListSkeleton } from "@/components/skeletons/AdminSkeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ImagePreview } from "@/components/ImagePreview";

interface UserWithId extends UserDoc { id: string; }

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const initialStatus = (searchParams.get("status") as StatusFilter) || "all";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    ["all", "pending", "approved", "rejected"].includes(initialStatus) ? initialStatus : "all"
  );
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null);

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserWithId)));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (userId: string) => {
    await updateDoc(doc(db, "users", userId), { status: "approved" });
    toast.success("User approved");
    fetchUsers();
  };

  const handleReject = async (userId: string) => {
    await updateDoc(doc(db, "users", userId), { status: "rejected" });
    toast.success("User rejected");
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    await deleteDoc(doc(db, "users", userId));
    toast.success("User deleted");
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.enrolledCourses?.some((c) => c.courseName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: users.length,
    pending: users.filter(u => u.status === "pending").length,
    approved: users.filter(u => u.status === "approved").length,
    rejected: users.filter(u => u.status === "rejected").length,
  };

  if (loading) return <AdminListSkeleton count={6} />;

  // Full detail view
  if (selectedUser) {
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

          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            <DetailRow label="Role" value={selectedUser.role} />
            <DetailRow label="Status" value={selectedUser.status} />

            {selectedUser.enrolledCourses?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Enrolled Courses</p>
                <div className="space-y-1">
                  {selectedUser.enrolledCourses.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg">
                      {c.courseThumbnail && <img src={c.courseThumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                      <span className="text-sm text-foreground truncate">{c.courseName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser.paymentInfo && (
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

            <DetailRow label="Created At" value={selectedUser.createdAt?.toDate?.()?.toLocaleString?.() || "—"} />
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
          <Users className="h-5 w-5" /> Users ({users.length})
        </h2>
      </div>

      {/* Search */}
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

      {/* Status Filter Chips */}
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

      {/* User List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No users found</div>
        )}
        {filtered.map((u) => (
          <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left p-3 bg-card rounded-xl border border-border flex items-center gap-3 hover:bg-accent/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {u.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              {u.enrolledCourses?.[0] && (
                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{u.enrolledCourses[0].courseName}</p>
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
        ))}
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

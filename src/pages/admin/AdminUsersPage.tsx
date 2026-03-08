import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserDoc } from "@/types";
import { toast } from "sonner";
import { Check, X, Trash2, Eye, ChevronLeft } from "lucide-react";
import { AdminListSkeleton } from "@/components/skeletons/AdminSkeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserWithId extends UserDoc { id: string; }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.enrolledCourses?.some((c) => c.courseName.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <AdminListSkeleton count={6} />;

  // Full detail view for a selected user
  if (selectedUser) {
    return (
      <div className="p-4 animate-fade-in max-w-2xl mx-auto">
        <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Users
        </button>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold flex-shrink-0">
              {selectedUser.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">{selectedUser.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                selectedUser.status === "approved" ? "bg-success/10 text-success" :
                selectedUser.status === "pending" ? "bg-warning/10 text-warning" :
                "bg-destructive/10 text-destructive"
              }`}>
                {selectedUser.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
            <DetailRow label="Role" value={selectedUser.role} />
            <DetailRow label="Status" value={selectedUser.status} />

            {selectedUser.enrolledCourses?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Enrolled Courses</p>
                <div className="space-y-1">
                  {selectedUser.enrolledCourses.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-accent/50 rounded-md">
                      {c.courseThumbnail && <img src={c.courseThumbnail} alt="" className="w-8 h-8 rounded object-cover" />}
                      <span className="text-sm text-foreground">{c.courseName}</span>
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
                    <img src={selectedUser.paymentInfo.screenshot} alt="Payment Screenshot" className="w-full max-w-sm rounded-lg border border-border" />
                  </div>
                )}
              </>
            )}

            <DetailRow label="Created At" value={selectedUser.createdAt?.toDate?.()?.toLocaleString?.() || "—"} />
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border flex gap-2 flex-wrap">
            {selectedUser.status !== "approved" && (
              <button onClick={() => { handleApprove(selectedUser.id); setSelectedUser(null); }} className="px-4 py-2 text-sm rounded-md bg-success/10 text-success font-medium">
                Approve
              </button>
            )}
            {selectedUser.status !== "rejected" && (
              <button onClick={() => { handleReject(selectedUser.id); setSelectedUser(null); }} className="px-4 py-2 text-sm rounded-md bg-warning/10 text-warning font-medium">
                Reject
              </button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="px-4 py-2 text-sm rounded-md bg-destructive/10 text-destructive font-medium">Delete</button>
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
    <div className="p-4 animate-fade-in max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-foreground mb-4">Users ({users.length})</h2>
      <input
        type="text"
        placeholder="Search by name, email, or course..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-md bg-card border border-border text-foreground text-sm mb-4"
      />

      <div className="space-y-2">
        {filtered.map((u) => (
          <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left p-3 bg-card rounded-lg border border-border flex items-center gap-3 hover:bg-accent/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {u.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
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

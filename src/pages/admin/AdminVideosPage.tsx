import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Video, Course } from "@/types";
import { uploadToImgBB } from "@/lib/imgbb";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, ChevronLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ImagePreview } from "@/components/ImagePreview";
import { AdminVideoListSkeleton } from "@/components/skeletons/AdminSkeleton";

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [search, setSearch] = useState("");

  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState("");
  const [pdfURL, setPdfURL] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    const [vSnap, cSnap] = await Promise.all([
      getDocs(collection(db, "videos")),
      getDocs(collection(db, "courses")),
    ]);
    const vids = vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Video));
    vids.sort((a, b) => (a.order || 0) - (b.order || 0));
    setVideos(vids);
    setCourses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const selectedCourse = courses.find((c) => c.id === courseId);

  const resetForm = () => {
    setCourseId(""); setSubjectId(""); setTitle(""); setThumbnail(""); setThumbnailFile(null); setVideoURL(""); setPdfURL(""); setEditVideo(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (v: Video) => {
    setEditVideo(v); setCourseId(v.courseId); setSubjectId(v.subjectId); setTitle(v.title);
    setThumbnail(v.thumbnail); setThumbnailFile(null); setVideoURL(v.videoURL); setPdfURL(v.pdfURL); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      let thumb = thumbnail;
      if (thumbnailFile) thumb = await uploadToImgBB(thumbnailFile);
      const course = courses.find((c) => c.id === courseId);
      const subject = course?.subjects?.find((s) => s.subjectId === subjectId);
      
      const sameSubjectVideos = videos.filter(v => v.courseId === courseId && v.subjectId === subjectId);
      const maxOrder = sameSubjectVideos.length > 0 ? Math.max(...sameSubjectVideos.map(v => v.order || 0)) : -1;

      const data: any = {
        courseId, courseName: course?.courseName || "", subjectId, subjectName: subject?.subjectName || "",
        title, thumbnail: thumb, videoURL, pdfURL, createdAt: Timestamp.now(),
      };
      if (editVideo) {
        data.order = editVideo.order;
        await updateDoc(doc(db, "videos", editVideo.id), data);
        toast.success("Video updated");
      } else {
        data.order = maxOrder + 1;
        await addDoc(collection(db, "videos"), data);
        toast.success("Video added");
      }
      setShowForm(false); resetForm(); fetchData();
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "videos", id));
    toast.success("Video deleted"); fetchData();
  };

  const moveVideo = async (index: number, direction: "up" | "down") => {
    const filteredList = [...filtered];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= filteredList.length) return;

    const batch = writeBatch(db);
    const orderA = filteredList[index].order || index;
    const orderB = filteredList[swapIndex].order || swapIndex;
    
    batch.update(doc(db, "videos", filteredList[index].id), { order: orderB });
    batch.update(doc(db, "videos", filteredList[swapIndex].id), { order: orderA });
    await batch.commit();
    toast.success("Order updated");
    fetchData();
  };

  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.courseName.toLowerCase().includes(search.toLowerCase()) ||
    v.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <AdminVideoListSkeleton count={5} />;

  // Full page form
  if (showForm) {
    return (
      <div className="p-4 animate-fade-in max-w-2xl mx-auto">
        <button onClick={() => { setShowForm(false); resetForm(); }} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Videos
        </button>
        <h2 className="text-xl font-semibold text-foreground mb-4">{editVideo ? "Edit Video" : "Add Video"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Course</label>
              <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSubjectId(""); }} required className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1">
                <option value="">Select Course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.courseName}</option>)}
              </select>
            </div>
            {selectedCourse?.subjects?.length ? (
              <div>
                <label className="text-xs text-muted-foreground">Subject</label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1">
                  <option value="">Select Subject</option>
                  {selectedCourse.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
                </select>
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Video Title</label>
            <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Thumbnail</label>
            <ImagePreview file={thumbnailFile} url={thumbnail} />
            <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} className="w-full text-sm mt-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">YouTube Video URL</label>
              <input type="text" placeholder="Video URL" value={videoURL} onChange={(e) => setVideoURL(e.target.value)} required className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">PDF URL</label>
              <input type="text" placeholder="PDF URL" value={pdfURL} onChange={(e) => setPdfURL(e.target.value)} className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1" />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
            {submitting ? "Saving..." : editVideo ? "Update Video" : "Add Video"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Videos ({videos.length})</h2>
        <button onClick={openAdd} className="flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Add</button>
      </div>

      <input type="text" placeholder="Search videos..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-2.5 rounded-md bg-card border border-border text-foreground text-sm mb-4" />

      <div className="space-y-2">
        {filtered.map((v, idx) => (
          <div key={v.id} className="p-3 bg-card rounded-lg border border-border flex gap-3 items-center">
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => moveVideo(idx, "up")} disabled={idx === 0} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => moveVideo(idx, "down")} disabled={idx === filtered.length - 1} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {v.thumbnail ? <img src={v.thumbnail} alt="" className="w-20 h-12 rounded-md object-cover flex-shrink-0" /> : <div className="w-20 h-12 bg-muted rounded-md flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm line-clamp-1">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.courseName} • {v.subjectName}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(v)} className="p-1.5 rounded-md hover:bg-accent"><Edit className="h-4 w-4 text-muted-foreground" /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild><button className="p-1.5 rounded-md hover:bg-accent"><Trash2 className="h-4 w-4 text-destructive" /></button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete Video</AlertDialogTitle><AlertDialogDescription>Delete "{v.title}"?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(v.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

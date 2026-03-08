import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Video } from "@/types";
import { uploadToImgBB } from "@/lib/imgbb";
import { toast } from "sonner";
import { ImagePreview } from "@/components/ImagePreview";

export default function AdminAddVideoPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState("");
  const [pdfURL, setPdfURL] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "courses")),
      getDocs(collection(db, "videos")),
    ]).then(([cSnap, vSnap]) => {
      setCourses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
      setVideos(vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Video)));
    });
  }, []);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedSubject = selectedCourse?.subjects?.find((s) => s.subjectId === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      let thumbnail = "";
      if (thumbnailFile) thumbnail = await uploadToImgBB(thumbnailFile);
      const course = courses.find((c) => c.id === courseId);
      const subject = course?.subjects?.find((s) => s.subjectId === subjectId);
      const chapter = subject?.chapters?.find((ch) => ch.chapterId === chapterId);
      
      const sameSubjectVideos = videos.filter(v => v.courseId === courseId && v.subjectId === subjectId);
      const maxOrder = sameSubjectVideos.length > 0 ? Math.max(...sameSubjectVideos.map(v => v.order || 0)) : -1;

      await addDoc(collection(db, "videos"), {
        courseId, courseName: course?.courseName || "", subjectId, subjectName: subject?.subjectName || "",
        chapterId: chapterId || "", chapterName: chapter?.chapterName || "",
        title, thumbnail, videoURL, pdfURL, order: maxOrder + 1, createdAt: Timestamp.now(),
      });
      toast.success("Video added");
      setTitle(""); setThumbnailFile(null); setVideoURL(""); setPdfURL(""); setChapterId("");
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground mb-4">Add Video</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Course</label>
            <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSubjectId(""); setChapterId(""); }} required className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1">
              <option value="">Select Course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.courseName}</option>)}
            </select>
          </div>
          {selectedCourse?.subjects?.length ? (
            <div>
              <label className="text-xs text-muted-foreground">Subject</label>
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); }} required className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1">
                <option value="">Select Subject</option>
                {selectedCourse.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
              </select>
            </div>
          ) : null}
        </div>

        {selectedSubject?.chapters?.length ? (
          <div>
            <label className="text-xs text-muted-foreground">Chapter</label>
            <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1">
              <option value="">Select Chapter (Optional)</option>
              {selectedSubject.chapters.map((ch) => <option key={ch.chapterId} value={ch.chapterId}>{ch.chapterName}</option>)}
            </select>
          </div>
        ) : null}

        <div>
          <label className="text-xs text-muted-foreground">Video Title</label>
          <input type="text" placeholder="Video Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground text-sm mt-1" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Thumbnail</label>
          <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} className="w-full text-sm mt-1" />
          <ImagePreview file={thumbnailFile} />
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
          {submitting ? "Adding..." : "Add Video"}
        </button>
      </form>
    </div>
  );
}

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Video, Course } from "@/types";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { ChevronLeft, ChevronRight, FileText, Play, Pause, Maximize, Minimize, RotateCcw, RotateCw, ArrowLeft, Filter, ListVideo } from "lucide-react";
import { FloatingButtons } from "@/components/FloatingButtons";
import { useIsMobile } from "@/hooks/use-mobile";
import { VideoPlayerSkeleton } from "@/components/skeletons/VideoPlayerSkeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&#]+)/);
  return match?.[1] || "";
};

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

let ytApiLoaded = false;
let ytApiCallbacks: (() => void)[] = [];

function ensureYTApi(cb: () => void) {
  if (window.YT && window.YT.Player) { cb(); return; }
  ytApiCallbacks.push(cb);
  if (!ytApiLoaded) {
    ytApiLoaded = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytApiCallbacks.forEach(fn => fn());
      ytApiCallbacks = [];
    };
  }
}

export default function VideoPlayerPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const settings = useAppSettings();
  const isMobile = useIsMobile();
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [allChapters, setAllChapters] = useState<{ chapterId: string; chapterName: string }[]>([]);
  const [chapterFilter, setChapterFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{ side: "left" | "right"; visible: boolean }>({ side: "left", visible: false });
  const seekFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTap = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user) { navigate("/auth?mode=login"); return; }
    if (!videoId) return;

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "videos", videoId));
        if (cancelled) return;
        if (!snap.exists()) { setVideo(null); setLoading(false); return; }
        const v = { id: snap.id, ...snap.data() } as Video;
        setVideo(v);

        try {
          const courseSnap = await getDoc(doc(db, "courses", v.courseId));
          if (!cancelled && courseSnap.exists()) {
            const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
            const sub = course.subjects?.find(s => s.subjectId === v.subjectId);
            setAllChapters(sub?.chapters || []);
          }
        } catch {}

        const q = query(collection(db, "videos"), where("courseId", "==", v.courseId), where("subjectId", "==", v.subjectId));
        const relSnap = await getDocs(q);
        if (cancelled) return;
        const vids = relSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Video));
        vids.sort((a, b) => (a.order || 0) - (b.order || 0));
        setRelatedVideos(vids);
        setChapterFilter("All");
      } catch {
        if (!cancelled) setRelatedVideos([]);
      }
      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [videoId, user]);

  useEffect(() => {
    if (!video || loading) return;
    const ytId = getYouTubeId(video.videoURL);
    if (!ytId) return;

    setPlayerReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSpeedIndex(0);

    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    const container = playerDivRef.current;
    if (!container) return;
    container.innerHTML = '';
    const playerEl = document.createElement('div');
    playerEl.id = `yt-player-${video.id}`;
    playerEl.className = 'absolute inset-0 w-full h-full pointer-events-none';
    container.appendChild(playerEl);

    const currentVideoId = video.id;

    const initPlayer = () => {
      if (!mountedRef.current) return;
      const el = document.getElementById(`yt-player-${currentVideoId}`);
      if (!el) return;

      playerRef.current = new window.YT.Player(el, {
        videoId: ytId,
        playerVars: {
          autoplay: 1, controls: 0, modestbranding: 1, rel: 0,
          showinfo: 0, iv_load_policy: 3, fs: 0, disablekb: 1,
          playsinline: 1, origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            if (!mountedRef.current) return;
            setPlayerReady(true);
            setDuration(e.target.getDuration());
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (!mountedRef.current) return;
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    ensureYTApi(() => {
      setTimeout(initPlayer, 100);
    });

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [video?.id, loading]);

  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (playerReady && isPlaying) {
      progressInterval.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
          setDuration(playerRef.current.getDuration());
        }
      }, 500);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [playerReady, isPlaying]);

  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [showControls, isPlaying]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo(); else playerRef.current.playVideo();
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    if (!playerRef.current) return;
    const t = playerRef.current.getCurrentTime() + seconds;
    playerRef.current.seekTo(Math.max(0, Math.min(t, duration)), true);
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (playerRef.current) playerRef.current.setPlaybackRate(SPEEDS[next]);
  }, [speedIndex]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      try { (screen.orientation as any)?.lock?.("landscape").catch(() => {}); } catch {}
    } else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!playerReady) return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": case "j": e.preventDefault(); seek(-10); break;
        case "ArrowRight": case "l": e.preventDefault(); seek(10); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [playerReady, togglePlay, seek, toggleFullscreen]);

  const handlePlayerTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setShowControls(true);
    const now = Date.now();
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const half = rect.width / 2;
    if (now - lastTap.current.time < 300) {
      const side = x < half ? "left" : "right";
      seek(side === "left" ? -10 : 10);
      setSeekFeedback({ side, visible: true });
      if (seekFeedbackTimeout.current) clearTimeout(seekFeedbackTimeout.current);
      seekFeedbackTimeout.current = setTimeout(() => setSeekFeedback(p => ({ ...p, visible: false })), 600);
    }
    lastTap.current = { time: now, x };
  }, [seek]);

  const handleSeekBar = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    playerRef.current?.seekTo(t, true);
  }, []);

  if (!video && loading) return <VideoPlayerSkeleton />;
  if (!video && !loading) return <div className="p-4 text-center text-muted-foreground">Video not found.</div>;

  const currentIndex = relatedVideos.findIndex((v) => v.id === videoId);
  const prevVideo = currentIndex > 0 ? relatedVideos[currentIndex - 1] : null;
  const nextVideo = currentIndex < relatedVideos.length - 1 ? relatedVideos[currentIndex + 1] : null;
  const filteredVideos = chapterFilter === "All" ? relatedVideos : relatedVideos.filter(v => v.chapterName === chapterFilter);

  return (
    <div className="animate-fade-in lg:flex lg:gap-0 h-[calc(100vh-3.5rem)]" onContextMenu={(e) => e.preventDefault()}>
      {/* Main video area */}
      <div className="lg:flex-1 flex flex-col h-full min-w-0">
        {/* Video player - sticky on mobile */}
        <div className="sticky top-14 z-30 bg-background shrink-0">
          <div
            ref={containerRef}
            className="relative aspect-video bg-black overflow-hidden select-none"
            onClick={handlePlayerTap}
            onMouseMove={() => setShowControls(true)}
          >
            <div ref={playerDivRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 z-10" style={{ pointerEvents: "auto" }} />

            {seekFeedback.visible && (
              <div className={`absolute top-1/2 -translate-y-1/2 z-20 bg-foreground/20 rounded-full w-16 h-16 flex items-center justify-center animate-fade-in ${seekFeedback.side === "left" ? "left-8" : "right-8"}`}>
                <span className="text-white text-sm font-medium">{seekFeedback.side === "left" ? "-10s" : "+10s"}</span>
              </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <input
                type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeekBar}
                className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="text-white p-1">
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white p-1">
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="text-white p-1">
                    <RotateCw className="h-5 w-5" />
                  </button>
                  <span className="text-white text-xs ml-1">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); cycleSpeed(); }} className="text-white text-xs font-medium px-2 py-0.5 bg-white/20 rounded">
                    {SPEEDS[speedIndex]}x
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white p-1">
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video info & action buttons */}
          <div className="p-3 md:p-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm md:text-base leading-snug">{video.title}</h2>
            {video.chapterName && (
              <p className="text-xs text-muted-foreground mt-1">{video.subjectName} · {video.chapterName}</p>
            )}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button onClick={() => prevVideo && navigate(`/video/${prevVideo.id}`)} disabled={!prevVideo}
                className="flex items-center gap-1 px-3 py-1.5 text-xs md:text-sm rounded-lg bg-card border border-border text-foreground disabled:opacity-30 transition-colors hover:bg-accent">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button onClick={() => nextVideo && navigate(`/video/${nextVideo.id}`)} disabled={!nextVideo}
                className="flex items-center gap-1 px-3 py-1.5 text-xs md:text-sm rounded-lg bg-card border border-border text-foreground disabled:opacity-30 transition-colors hover:bg-accent">
                Next <ChevronRight className="h-4 w-4" />
              </button>
              {video.pdfURL && (
                <a href={video.pdfURL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs md:text-sm rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
                  <FileText className="h-4 w-4" /> PDF
                </a>
              )}
              {!isMobile && (
                <button onClick={() => navigate("/my-courses")}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs md:text-sm rounded-lg bg-accent border border-border text-foreground ml-auto transition-colors hover:bg-accent/80">
                  <ArrowLeft className="h-4 w-4" /> My Courses
                </button>
              )}
            </div>
          </div>
        </div>

        {/* More videos - mobile/tablet only */}
        <div className="flex-1 overflow-y-auto lg:hidden">
          <MoreVideosSection
            allChapters={allChapters}
            chapterFilter={chapterFilter}
            setChapterFilter={setChapterFilter}
            filteredVideos={filteredVideos}
            videoId={videoId}
            settings={settings}
          />
        </div>
      </div>

      {/* Sidebar - desktop only */}
      <div className="hidden lg:flex lg:flex-col lg:w-[360px] xl:w-[400px] border-l border-border h-full bg-background">
        <MoreVideosSection
          allChapters={allChapters}
          chapterFilter={chapterFilter}
          setChapterFilter={setChapterFilter}
          filteredVideos={filteredVideos}
          videoId={videoId}
          settings={settings}
          isDesktop
        />
      </div>
      <FloatingButtons />
    </div>
  );
}

function MoreVideosSection({
  allChapters,
  chapterFilter,
  setChapterFilter,
  filteredVideos,
  videoId,
  settings,
  isDesktop = false,
}: {
  allChapters: { chapterId: string; chapterName: string }[];
  chapterFilter: string;
  setChapterFilter: (v: string) => void;
  filteredVideos: Video[];
  videoId?: string;
  settings: any;
  isDesktop?: boolean;
}) {
  return (
    <div className={`flex flex-col ${isDesktop ? "h-full" : ""}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-2">
          <ListVideo className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">More Videos</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 ml-auto">
            {filteredVideos.length}
          </Badge>
        </div>

        {/* Chapter filter chips */}
        {allChapters.length > 0 && (
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-1">
              <button
                onClick={() => setChapterFilter("All")}
                className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-colors ${
                  chapterFilter === "All"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                }`}
              >
                All
              </button>
              {allChapters.map(ch => (
                <button
                  key={ch.chapterId}
                  onClick={() => setChapterFilter(ch.chapterName)}
                  className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                    chapterFilter === ch.chapterName
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {ch.chapterName}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Video list */}
      <div className={`${isDesktop ? "flex-1 overflow-y-auto" : ""} p-2`}>
        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Filter className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No videos in this chapter</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredVideos.map((v, index) => (
              <VideoListItem key={v.id} v={v} videoId={videoId} settings={settings} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoListItem({ v, videoId, settings, index }: { v: Video; videoId?: string; settings: any; index: number }) {
  const navigate = useNavigate();
  const isActive = v.id === videoId;

  return (
    <button
      onClick={() => navigate(`/video/${v.id}`)}
      className={`flex gap-3 w-full text-left p-2 rounded-lg transition-all duration-200 group ${
        isActive
          ? "bg-primary/10 border border-primary/30 shadow-sm"
          : "hover:bg-accent/60 border border-transparent"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-28 sm:w-32 flex-shrink-0">
        <div className="aspect-video rounded-md overflow-hidden bg-muted">
          {v.thumbnail ? (
            <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
        </div>
        {isActive && (
          <div className="absolute inset-0 bg-primary/20 rounded-md flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Play className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <p className={`text-sm font-medium line-clamp-2 leading-snug ${isActive ? "text-primary" : "text-foreground group-hover:text-foreground"}`}>
          {v.title}
        </p>
        {v.chapterName && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate">{v.chapterName}</p>
        )}
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{settings.appName || "LMS"}</p>
      </div>
    </button>
  );
}

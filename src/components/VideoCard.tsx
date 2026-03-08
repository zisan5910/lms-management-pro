import { useNavigate } from "react-router-dom";
import { Video } from "@/types";
import { useAppSettings } from "@/contexts/AppSettingsContext";

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const navigate = useNavigate();
  const settings = useAppSettings();

  return (
    <button
      onClick={() => navigate(`/video/${video.id}`)}
      className="w-full text-left group"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No Thumbnail</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2.5 px-0.5">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {settings.appName || "LMS"}
        </p>
      </div>
    </button>
  );
}

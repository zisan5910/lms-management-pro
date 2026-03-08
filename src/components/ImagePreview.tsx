import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  file: File | null;
  url?: string;
  onRemove?: () => void;
}

export function ImagePreview({ file, url, onRemove }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (url) {
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [file, url]);

  if (!preview) return null;

  return (
    <div className="relative mt-2 inline-block">
      <img src={preview} alt="Preview" className="w-24 h-24 rounded-md object-cover border border-border" />
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

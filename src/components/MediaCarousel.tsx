import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Camera } from "lucide-react";

interface MediaCarouselProps {
  photos: string[];
  videoUrl?: string;
  title: string;
  className?: string;
}

const MediaCarousel = ({ photos, videoUrl, title, className = "" }: MediaCarouselProps) => {
  const mediaItems: { type: "image" | "video"; url: string }[] = [
    ...photos.map((url) => ({ type: "image" as const, url })),
    ...(videoUrl ? [{ type: "video" as const, url: videoUrl }] : []),
  ];

  const [current, setCurrent] = useState(0);

  if (mediaItems.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-muted-foreground bg-muted ${className}`}>
        <Camera className="w-8 h-8" />
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c > 0 ? c - 1 : mediaItems.length - 1));
  const next = () => setCurrent((c) => (c < mediaItems.length - 1 ? c + 1 : 0));

  const item = mediaItems[current];

  return (
    <div className={`relative w-full h-full group ${className}`}>
      {item.type === "image" ? (
        <img src={item.url} alt={title} className="w-full h-full object-cover" />
      ) : (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          controls
          preload="metadata"
        />
      )}

      {mediaItems.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {mediaItems.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current ? "bg-primary" : "bg-background/60"
                }`}
              />
            ))}
          </div>
          {/* Video indicator */}
          {item.type === "video" && (
            <div className="absolute top-2 left-2">
              <span className="bg-background/70 backdrop-blur-sm text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Play className="w-3 h-3" /> Video
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MediaCarousel;

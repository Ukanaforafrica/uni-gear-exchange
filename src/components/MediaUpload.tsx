import { useRef } from "react";
import { Camera, Video, X, Play } from "lucide-react";
import { Label } from "@/components/ui/label";

interface MediaUploadProps {
  photos: File[];
  photoPreviews: string[];
  video: File | null;
  videoPreview: string | null;
  maxPhotos: number;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveVideo: () => void;
}

const MediaUpload = ({
  photos,
  photoPreviews,
  video,
  videoPreview,
  maxPhotos,
  onPhotoSelect,
  onRemovePhoto,
  onVideoSelect,
  onRemoveVideo,
}: MediaUploadProps) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Photos */}
      <div className="space-y-2">
        <Label>Photos (up to {maxPhotos})</Label>
        <p className="text-xs text-muted-foreground">
          💡 Clear photos help buyers trust your listing
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {photoPreviews.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {photos.length < maxPhotos && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-medium">Add Photo</span>
            </button>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onPhotoSelect}
          className="hidden"
        />
      </div>

      {/* Video */}
      <div className="space-y-2">
        <Label>Video walkthrough (optional, max 1)</Label>
        <p className="text-xs text-muted-foreground">
          🎥 A short video builds extra trust — show the item working or from all angles
        </p>
        {videoPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-border max-w-xs group">
            <video
              src={videoPreview}
              className="w-full aspect-video object-cover"
              controls
              preload="metadata"
            />
            <button
              type="button"
              onClick={onRemoveVideo}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="w-32 aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <Video className="w-5 h-5" />
            <span className="text-[10px] font-medium">Add Video</span>
          </button>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={onVideoSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default MediaUpload;

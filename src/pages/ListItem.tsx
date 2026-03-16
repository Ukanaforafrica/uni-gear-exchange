import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ITEM_CATEGORIES, CONDITION_RATINGS, USAGE_DURATIONS } from "@/lib/types";
import { Upload, ShoppingBag, AlertTriangle, Clock } from "lucide-react";
import MediaUpload from "@/components/MediaUpload";

const MAX_PHOTOS = 5;

const ListItem = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // fileInputRef removed - handled by MediaUpload

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [condition, setCondition] = useState("");
  const [usageDuration, setUsageDuration] = useState("");
  const [defects, setDefects] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center max-w-lg">
            <div className="bg-card rounded-2xl shadow-elevated p-10">
              <ShoppingBag className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-3">Sign in to Sell Items</h1>
              <p className="text-muted-foreground mb-6">
                You need to be logged in to list items on your campus marketplace.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/login")}>Log In</Button>
                <Button variant="outline" onClick={() => navigate("/signup")}>Sign Up</Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      toast({ title: `Maximum ${MAX_PHOTOS} photos allowed`, variant: "destructive" });
    }
    const newPreviews = selected.map((file) => URL.createObjectURL(file));
    setPhotos((prev) => [...prev, ...selected]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Video must be under 50MB", variant: "destructive" });
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("item-photos").upload(path, photo);
      if (error) throw error;
      const { data } = supabase.storage.from("item-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const uploadVideo = async (): Promise<string> => {
    if (!video) return "";
    const ext = video.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("item-photos").upload(path, video);
    if (error) throw error;
    const { data } = supabase.storage.from("item-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      toast({ title: "Select a category", variant: "destructive" });
      return;
    }
    if (!condition) {
      toast({ title: "Select the item condition", variant: "destructive" });
      return;
    }
    if (photos.length === 0) {
      toast({ title: "Add at least one photo", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const photoUrls = await uploadPhotos();
      const videoUrl = await uploadVideo();

      const { error } = await (supabase as any).from("items").insert({
        user_id: user.id,
        title,
        category,
        price: parseInt(price),
        negotiable,
        condition,
        usage_duration: usageDuration,
        defects,
        description,
        university: profile.university,
        photos: photoUrls,
        video_url: videoUrl,
      } as any);

      if (error) throw error;

      toast({
        title: "Item listed! 🎉",
        description: "Your item is now live for 7 days on your campus marketplace.",
      });
      navigate("/marketplace");
    } catch (err: any) {
      toast({ title: "Failed to list item", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-semibold mb-4">
              📍 {profile.university} Marketplace
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Sell an Item
            </h1>
            <p className="text-muted-foreground">
              List your item for students at {profile.university}. Be honest about the condition — it builds trust!
            </p>
          </div>

          {/* 7-day notice */}
          <div className="flex items-start gap-3 bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
            <Clock className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Listings last 7 days</p>
              <p className="text-sm text-muted-foreground">
                Your item will automatically expire after 7 days. You can relist it for ₦1,000.
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Section 1: The Basics */}
              <div className="space-y-5">
                <h2 className="font-display text-lg font-bold text-foreground border-b border-border pb-2">
                  📦 The Basics
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="title">Product Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='e.g. "iPhone 13 Pro" or "Wooden Study Desk"'
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (₦)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 25000"
                      required
                      min="0"
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="negotiable"
                        checked={negotiable}
                        onCheckedChange={(checked) => setNegotiable(checked === true)}
                      />
                      <Label htmlFor="negotiable" className="text-sm font-normal cursor-pointer">
                        Negotiable
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell buyers more about your item — brand, model, colour, what's included..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>

              {/* Section 2: Condition & Transparency */}
              <div className="space-y-5">
                <h2 className="font-display text-lg font-bold text-foreground border-b border-border pb-2">
                  🔍 Condition & Transparency
                </h2>

                <div className="space-y-2">
                  <Label>Condition Rating</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger>
                      <SelectValue placeholder="How would you rate the condition?" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_RATINGS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Usage Duration</Label>
                  <Select value={usageDuration} onValueChange={setUsageDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="How long have you owned/used it?" />
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_DURATIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defects">Known Defects or Issues</Label>
                  <Textarea
                    id="defects"
                    value={defects}
                    onChange={(e) => setDefects(e.target.value)}
                    placeholder="List any scratches, missing parts, battery health, etc. Honesty = faster sales!"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Being upfront about defects avoids disputes and builds your reputation.
                  </p>
                </div>
              </div>

              {/* Section 3: Photos & Video */}
              <div className="space-y-5">
                <h2 className="font-display text-lg font-bold text-foreground border-b border-border pb-2">
                  📸 Photos & Video
                </h2>
                <MediaUpload
                  photos={photos}
                  photoPreviews={photoPreviews}
                  video={video}
                  videoPreview={videoPreview}
                  maxPhotos={MAX_PHOTOS}
                  onPhotoSelect={handlePhotoSelect}
                  onRemovePhoto={removePhoto}
                  onVideoSelect={handleVideoSelect}
                  onRemoveVideo={removeVideo}
                />
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                <Upload className="w-4 h-4" />
                {loading ? "Uploading & Listing..." : "List Item for Sale"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListItem;

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ITEM_CATEGORIES } from "@/lib/types";
import { Search, Send, ImagePlus, X } from "lucide-react";

const MAX_PHOTOS = 3;

const RequestItem = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    const selected = files.slice(0, remaining);
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...selected]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("item-photos").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("item-photos").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center max-w-lg">
            <div className="bg-card rounded-2xl shadow-elevated p-10">
              <Search className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-3">Sign in to Request Items</h1>
              <p className="text-muted-foreground mb-6">
                You need to be logged in to request items from your campus marketplace.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast({ title: "Select a category", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const photoUrls = photos.length > 0 ? await uploadPhotos() : [];

      const { error } = await (supabase as any).from("item_requests").insert({
        user_id: user.id,
        title,
        description,
        category,
        budget_min: budgetMin ? parseInt(budgetMin) : 0,
        budget_max: budgetMax ? parseInt(budgetMax) : 0,
        university: profile.university,
        photos: photoUrls,
      } as any);

      setLoading(false);

      if (error) {
        toast({ title: "Failed to submit request", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Request posted!", description: "Students at your campus can now see your request." });
        navigate("/marketplace");
      }
    } catch (err: any) {
      setLoading(false);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const uniLabel = profile.university;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-semibold mb-4">
              📍 {uniLabel} Marketplace
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Request an Item
            </h1>
            <p className="text-muted-foreground">
              Tell fellow students at {uniLabel} what you're looking for. Sellers will reach out to you!
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">What are you looking for?</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Engineering textbook, iPhone charger, Study desk..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details about what you need, preferred condition, etc."
                  rows={3}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetMin">Min Budget (₦)</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetMax">Max Budget (₦)</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="50000"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Photos (optional, up to {MAX_PHOTOS})</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <div className="flex flex-wrap gap-3">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-[10px] mt-1">Add</span>
                    </button>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                <Send className="w-4 h-4" />
                {loading ? "Posting..." : "Post Request"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RequestItem;

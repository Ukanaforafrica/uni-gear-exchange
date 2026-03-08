import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Package, History, Bell, Camera, Loader2, Edit2, Check, X, Star } from "lucide-react";
import { UNIVERSITIES, type NigerianUniversity } from "@/lib/types";
import type { Item, ItemRequest, Negotiation } from "@/lib/types";

interface Review {
  id: string;
  negotiation_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
}

const Profile = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState<NigerianUniversity | "">("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Listings
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [myRequests, setMyRequests] = useState<ItemRequest[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Deals
  const [deals, setDeals] = useState<(Negotiation & { itemTitle: string; otherName: string })[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);

  // Notifications
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone);
      setUniversity(profile.university);
      setEmailEnabled((profile as any).email_notifications ?? true);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Check push subscription status
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
        });
      });
    }

    fetchListings();
    fetchDeals();
    fetchReviews();
  }, [user]);

  const fetchListings = async () => {
    if (!user) return;
    setLoadingListings(true);
    const [itemsRes, reqRes] = await Promise.all([
      (supabase as any).from("items").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("item_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setMyItems((itemsRes.data || []) as Item[]);
    setMyRequests((reqRes.data || []) as ItemRequest[]);
    setLoadingListings(false);
  };

  const fetchDeals = async () => {
    if (!user) return;
    setLoadingDeals(true);
    const { data: negs } = await (supabase as any)
      .from("negotiations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .eq("deal_closed", true)
      .order("closed_at", { ascending: false });

    if (!negs || negs.length === 0) {
      setDeals([]);
      setLoadingDeals(false);
      return;
    }

    const enriched = await Promise.all(
      (negs as Negotiation[]).map(async (neg) => {
        let itemTitle = "Unknown item";
        if (neg.item_id) {
          const { data } = await (supabase as any).from("items").select("title").eq("id", neg.item_id).single();
          if (data) itemTitle = data.title;
        } else if (neg.item_request_id) {
          const { data } = await (supabase as any).from("item_requests").select("title").eq("id", neg.item_request_id).single();
          if (data) itemTitle = data.title;
        }
        const otherId = neg.buyer_id === user!.id ? neg.seller_id : neg.buyer_id;
        const { data: prof } = await (supabase as any).from("profiles").select("full_name").eq("id", otherId).single();
        return { ...neg, itemTitle, otherName: prof?.full_name || "Unknown" };
      })
    );
    setDeals(enriched);
    setLoadingDeals(false);
  };

  const fetchReviews = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("reviews")
      .select("*")
      .eq("reviewee_id", user.id)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Fetch reviewer names
      const enriched: Review[] = await Promise.all(
        data.map(async (r: any) => {
          const { data: prof } = await (supabase as any).from("profiles").select("full_name").eq("id", r.reviewer_id).single();
          return { ...r, reviewer_name: prof?.full_name || "Anonymous" };
        })
      );
      setReviews(enriched);
      const avg = enriched.reduce((sum, r) => sum + r.rating, 0) / enriched.length;
      setAvgRating(Math.round(avg * 10) / 10);
    } else {
      setReviews([]);
      setAvgRating(0);
    }
  };

    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim(), university })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("item-photos").upload(path, file, { upsert: true });

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("item-photos").getPublicUrl(path);
    await (supabase as any).from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    await refreshProfile();
    setUploadingAvatar(false);
    toast({ title: "Avatar updated!" });
  };

  const handleTogglePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast({ title: "Not supported", description: "Push notifications not supported on this device.", variant: "destructive" });
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    if (sub) {
      // Unsubscribe
      await sub.unsubscribe();
      if (user) {
        await (supabase as any).from("push_subscriptions").delete().eq("user_id", user.id);
      }
      setPushEnabled(false);
      toast({ title: "Push notifications disabled" });
    } else {
      // Subscribe
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast({ title: "Permission denied", description: "Please allow notifications in your browser settings.", variant: "destructive" });
          return;
        }

        // Fetch VAPID key
        const vapidRes = await supabase.functions.invoke("push-notifications", { body: { action: "vapid-key" } });
        const publicKey = vapidRes.data?.publicKey;
        if (!publicKey) {
          toast({ title: "Error", description: "Could not get push key.", variant: "destructive" });
          return;
        }

        // Convert base64url to Uint8Array
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = atob(base64);
        const applicationServerKey = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) applicationServerKey[i] = rawData.charCodeAt(i);

        const newSub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        const subJson = newSub.toJSON();

        // Save to backend
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.functions.invoke("push-notifications", {
          body: {
            action: "subscribe",
            subscription: { endpoint: subJson.endpoint, keys: subJson.keys },
          },
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        });

        setPushEnabled(true);
        toast({ title: "Push notifications enabled!" });
      } catch (err: any) {
        console.error("Push subscribe error:", err);
        toast({ title: "Error", description: err.message || "Failed to enable push notifications.", variant: "destructive" });
      }
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Sign in to view your profile</h1>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/login")}>Log In</Button>
            <Button variant="outline" onClick={() => navigate("/signup")}>Sign Up</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 pb-16 container mx-auto px-4 max-w-3xl">
        {/* Profile header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative group">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              {uploadingAvatar ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" /> : <Camera className="w-5 h-5 text-primary-foreground" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.full_name || "Your Profile"}</h1>
            <p className="text-muted-foreground text-sm">📍 {UNIVERSITIES.find(u => u.value === profile.university)?.label || profile.university}</p>
            <p className="text-muted-foreground text-xs">Joined {formatDate(profile.created_at)}</p>
          </div>
        </div>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-11">
            <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm"><User className="w-4 h-4 hidden sm:block" />Info</TabsTrigger>
            <TabsTrigger value="listings" className="gap-1.5 text-xs sm:text-sm"><Package className="w-4 h-4 hidden sm:block" />Listings</TabsTrigger>
            <TabsTrigger value="deals" className="gap-1.5 text-xs sm:text-sm"><History className="w-4 h-4 hidden sm:block" />Deals</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm"><Bell className="w-4 h-4 hidden sm:block" />Alerts</TabsTrigger>
          </TabsList>

          {/* === INFO TAB === */}
          <TabsContent value="info">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>Manage your profile details</CardDescription>
                </div>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setFullName(profile.full_name); setPhone(profile.phone); setUniversity(profile.university); }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Full Name</Label>
                  {editing ? (
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                  ) : (
                    <p className="font-medium text-foreground">{profile.full_name || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium text-foreground">{user.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  {editing ? (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+234..." />
                  ) : (
                    <p className="font-medium text-foreground">{profile.phone || "—"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">University</Label>
                  {editing ? (
                    <Select value={university} onValueChange={(v) => setUniversity(v as NigerianUniversity)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIVERSITIES.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium text-foreground">{UNIVERSITIES.find(u => u.value === profile.university)?.label || profile.university}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === LISTINGS TAB === */}
          <TabsContent value="listings">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Items for Sale ({myItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingListings ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : myItems.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No items listed yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {myItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                          <div className="flex items-center gap-3">
                            {item.photos?.[0] && <img src={item.photos[0]} alt={item.title} className="w-10 h-10 rounded-md object-cover" />}
                            <div>
                              <p className="font-medium text-foreground text-sm">{item.title}</p>
                              <p className="text-xs text-muted-foreground">₦{item.price.toLocaleString()} • {item.category}</p>
                            </div>
                          </div>
                          <Badge variant={item.status === "active" ? "default" : "secondary"} className="text-xs">{item.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Item Requests ({myRequests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingListings ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : myRequests.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No requests yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {myRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                          <div>
                            <p className="font-medium text-foreground text-sm">{req.title}</p>
                            <p className="text-xs text-muted-foreground">₦{req.budget_min.toLocaleString()} – ₦{req.budget_max.toLocaleString()} • {req.category}</p>
                          </div>
                          <Badge variant={req.status === "active" ? "default" : "secondary"} className="text-xs">{req.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* === DEALS TAB === */}
          <TabsContent value="deals">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completed Deals</CardTitle>
                <CardDescription>Negotiations that have been closed</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDeals ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : deals.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No completed deals yet.</p>
                ) : (
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                        <div>
                          <p className="font-medium text-foreground text-sm">{deal.itemTitle}</p>
                          <p className="text-xs text-muted-foreground">with {deal.otherName} • {deal.closed_at ? formatDate(deal.closed_at) : "—"}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-secondary/10 text-secondary">Closed</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === NOTIFICATIONS TAB === */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive deal updates and alerts via email</p>
                  </div>
                  <Switch
                    checked={emailEnabled}
                    disabled={savingEmail}
                    onCheckedChange={async (checked) => {
                      if (!user) return;
                      setSavingEmail(true);
                      setEmailEnabled(checked);
                      const { error } = await (supabase as any)
                        .from("profiles")
                        .update({ email_notifications: checked })
                        .eq("id", user.id);
                      if (error) {
                        setEmailEnabled(!checked);
                        toast({ title: "Error", description: "Failed to update preference.", variant: "destructive" });
                      } else {
                        toast({ title: checked ? "Email notifications enabled" : "Email notifications disabled" });
                      }
                      setSavingEmail(false);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive alerts when the app is closed</p>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={handleTogglePush} />
                </div>
                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Notifications alert you about new messages, meetup proposals, and deal updates even when you're not using the app.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;

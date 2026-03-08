import { useState, useEffect, useRef } from "react";
import ReviewPrompt from "@/components/ReviewPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendPushToUser } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Clock,
  Check,
  Edit2,
  HandshakeIcon,
  Bell,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { MeetupProposal as MeetupProposalType } from "@/lib/types";

interface MeetupProposalProps {
  negotiationId: string;
  buyerId: string;
  sellerId: string;
  itemId?: string | null;
  itemRequestId?: string | null;
  itemType: 'item' | 'request';
}

const MeetupProposal = ({ negotiationId, buyerId, sellerId, itemId, itemRequestId, itemType }: MeetupProposalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [proposal, setProposal] = useState<MeetupProposalType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCloseDeal, setShowCloseDeal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meetupTime, setMeetupTime] = useState("");
  const [meetupLocation, setMeetupLocation] = useState("");
  const [editing, setEditing] = useState(false);
  const reminderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reminderActive, setReminderActive] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const isSeller = user?.id === sellerId;
  const isBuyer = user?.id === buyerId;

  useEffect(() => {
    fetchProposal();

    const channel = supabase
      .channel(`meetup-${negotiationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meetup_proposals",
          filter: `negotiation_id=eq.${negotiationId}`,
        },
        () => fetchProposal()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
    };
  }, [negotiationId]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const sendBrowserNotification = (title: string, body: string) => {
    // Always show toast
    toast({ title, description: body });

    // Also send browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const options: NotificationOptions & { renotify?: boolean } = {
          body,
          icon: "/favicon.ico",
          tag: `meetup-${negotiationId}`,
          renotify: true,
        };
        new Notification(title, options as NotificationOptions);
      } catch {
        // Fallback: notification API may not work in all contexts
      }
    }
  };

  // Reminder logic
  useEffect(() => {
    if (!proposal || proposal.status !== "accepted") return;
    if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);

    const checkReminder = () => {
      const meetupDate = new Date(proposal.meetup_time);
      const now = new Date();
      const diffMs = meetupDate.getTime() - now.getTime();
      const diffMin = diffMs / (1000 * 60);

      if (diffMin <= 0) {
        setShowCloseDeal(true);
        setReminderActive(false);
        if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
        sendBrowserNotification(
          "🤝 It's meetup time!",
          `Head to ${proposal.meetup_location} now to complete your deal.`
        );
        return;
      }

      if (diffMin <= 60) {
        setReminderActive(true);
        sendBrowserNotification(
          "⏰ Meetup Reminder",
          `Your meetup is in ${Math.ceil(diffMin)} minute${Math.ceil(diffMin) !== 1 ? "s" : ""}! Location: ${proposal.meetup_location}`
        );
      }
    };

    checkReminder();
    reminderIntervalRef.current = setInterval(checkReminder, 20 * 60 * 1000);

    return () => {
      if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
    };
  }, [proposal?.status, proposal?.meetup_time]);

  const fetchProposal = async () => {
    const { data } = await (supabase as any)
      .from("meetup_proposals")
      .select("*")
      .eq("negotiation_id", negotiationId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setProposal(data[0] as MeetupProposalType);
      // Check if meetup time has passed
      const meetupDate = new Date(data[0].meetup_time);
      if (data[0].status === "accepted" && meetupDate <= new Date()) {
        setShowCloseDeal(true);
      }
    }
  };

  const handleSubmitProposal = async () => {
    if (!meetupTime || !meetupLocation.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both time and location.", variant: "destructive" });
      return;
    }
    setLoading(true);

    if (editing && proposal) {
      // Update existing proposal with counter
      await (supabase as any).from("meetup_proposals").update({
        meetup_time: meetupTime,
        meetup_location: meetupLocation.trim(),
        proposed_by: user!.id,
        status: "pending",
        buyer_accepted: isBuyer,
        seller_accepted: isSeller,
        updated_at: new Date().toISOString(),
      }).eq("id", proposal.id);
    } else {
      // Create new proposal
      await (supabase as any).from("meetup_proposals").insert({
        negotiation_id: negotiationId,
        proposed_by: user!.id,
        meetup_time: meetupTime,
        meetup_location: meetupLocation.trim(),
        buyer_accepted: isBuyer,
        seller_accepted: isSeller,
      });
    }

    setShowForm(false);
    setEditing(false);
    setLoading(false);
    toast({ title: "Proposal sent", description: "Meetup details sent to the other party." });
    // Push notification to the other party
    const recipientId = user!.id === buyerId ? sellerId : buyerId;
    sendPushToUser(recipientId, "📍 New Meetup Proposal", `${meetupLocation.trim()} at ${new Date(meetupTime).toLocaleString()}`, "/negotiations");
  };

  const handleAccept = async () => {
    if (!proposal) return;
    setLoading(true);

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (isBuyer) updates.buyer_accepted = true;
    if (isSeller) updates.seller_accepted = true;

    // Check if both will have accepted
    const bothAccepted =
      (isBuyer && proposal.seller_accepted) ||
      (isSeller && proposal.buyer_accepted);

    if (bothAccepted) updates.status = "accepted";

    await (supabase as any).from("meetup_proposals").update(updates).eq("id", proposal.id);
    setLoading(false);
    toast({ title: bothAccepted ? "✅ Meetup confirmed!" : "Accepted", description: bothAccepted ? "Both parties agreed. See you there!" : "Waiting for the other party to accept." });
    // Push notification to the other party
    const recipientId = user!.id === buyerId ? sellerId : buyerId;
    if (bothAccepted) {
      sendPushToUser(recipientId, "✅ Meetup Confirmed!", "Both parties agreed on the meetup. See you there!", "/negotiations");
    } else {
      sendPushToUser(recipientId, "👍 Meetup Accepted", "The other party accepted your meetup proposal.", "/negotiations");
    }
  };

  const handleCounter = () => {
    if (!proposal) return;
    setMeetupTime(proposal.meetup_time.slice(0, 16)); // format for datetime-local
    setMeetupLocation(proposal.meetup_location);
    setEditing(true);
    setShowForm(true);
  };

  const handleCloseDeal = async () => {
    if (!proposal) return;
    setLoading(true);
    
    // Update negotiation status
    await (supabase as any).from("negotiations").update({
      deal_closed: true,
      closed_by: user!.id,
      closed_at: new Date().toISOString(),
      status: "completed",
    }).eq("id", negotiationId);

    // Mark the item or request as sold/fulfilled
    if (itemType === "item" && itemId) {
      await (supabase as any).from("items").update({
        status: "sold",
        updated_at: new Date().toISOString(),
      }).eq("id", itemId);
    } else if (itemType === "request" && itemRequestId) {
      await (supabase as any).from("item_requests").update({
        status: "fulfilled",
        updated_at: new Date().toISOString(),
      }).eq("id", itemRequestId);
    }

    setLoading(false);
    toast({ title: "🎉 Deal Closed!", description: "The transaction has been marked as complete." });
    setShowCloseDeal(false);
    setShowReview(true);
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };

  const myAccepted = isBuyer ? proposal?.buyer_accepted : proposal?.seller_accepted;
  const otherAccepted = isBuyer ? proposal?.seller_accepted : proposal?.buyer_accepted;
  const wasProposedByMe = proposal?.proposed_by === user?.id;

  return (
    <>
      {/* Initiate Deal button - visible to seller */}
      {isSeller && !proposal && (
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          onClick={() => {
            setMeetupTime("");
            setMeetupLocation("");
            setEditing(false);
            setShowForm(true);
          }}
        >
          <HandshakeIcon className="w-3.5 h-3.5" />
          Complete Deal
        </Button>
      )}

      {/* Active proposal banner */}
      {proposal && proposal.status !== "accepted" && (
        <div className="mx-4 mb-2 rounded-xl border border-border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <HandshakeIcon className="w-3.5 h-3.5 text-primary" />
            Meetup Proposal {wasProposedByMe ? "(sent by you)" : "(from other party)"}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{formatDateTime(proposal.meetup_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{proposal.meetup_location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {proposal.seller_accepted && <span className="text-primary">✓ Seller accepted</span>}
            {proposal.buyer_accepted && <span className="text-primary">✓ Buyer accepted</span>}
            {!proposal.seller_accepted && <span>⏳ Seller pending</span>}
            {!proposal.buyer_accepted && <span>⏳ Buyer pending</span>}
          </div>
          {!myAccepted && !wasProposedByMe && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="text-xs flex-1 gap-1" onClick={handleAccept} disabled={loading}>
                <Check className="w-3 h-3" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="text-xs flex-1 gap-1" onClick={handleCounter} disabled={loading}>
                <Edit2 className="w-3 h-3" /> Change
              </Button>
            </div>
          )}
          {myAccepted && !otherAccepted && (
            <p className="text-xs text-muted-foreground">✓ You accepted. Waiting for the other party...</p>
          )}
        </div>
      )}

      {/* Accepted meetup banner */}
      {proposal?.status === "accepted" && !showCloseDeal && (
        <div className="mx-4 mb-2 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Meetup Confirmed!
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{formatDateTime(proposal.meetup_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{proposal.meetup_location}</span>
          </div>
          {reminderActive && (
            <div className="flex items-center gap-1.5 text-xs text-accent-foreground animate-pulse">
              <Bell className="w-3 h-3" />
              Meetup is coming up soon!
            </div>
          )}
        </div>
      )}

      {/* Close Deal banner */}
      {showCloseDeal && (
        <div className="mx-4 mb-2 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <HandshakeIcon className="w-3.5 h-3.5 text-primary" />
            It's meetup time!
          </div>
          <p className="text-xs text-muted-foreground">
            Once you have received the goods and made payment, hit Close to complete the deal.
          </p>
          <Button
            size="sm"
            className="w-full text-xs gap-1"
            onClick={handleCloseDeal}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Close Deal
          </Button>
        </div>
      )}

      {/* Proposal form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HandshakeIcon className="w-4 h-4 text-primary" />
              {editing ? "Update Meetup Details" : "Propose Meetup"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="meetup-time" className="text-sm">Meetup Time</Label>
              <Input
                id="meetup-time"
                type="datetime-local"
                value={meetupTime}
                onChange={(e) => setMeetupTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetup-location" className="text-sm">Meetup Location</Label>
              <Input
                id="meetup-location"
                placeholder="e.g. Main gate, Faculty of Engineering"
                value={meetupLocation}
                onChange={(e) => setMeetupLocation(e.target.value)}
                maxLength={200}
              />
            </div>
            <Button className="w-full" onClick={handleSubmitProposal} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Proposal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review prompt after deal close */}
      <ReviewPrompt
        open={showReview}
        onOpenChange={setShowReview}
        negotiationId={negotiationId}
        revieweeId={user?.id === buyerId ? sellerId : buyerId}
        revieweeName="the other party"
      />
    </>
  );
};

export default MeetupProposal;

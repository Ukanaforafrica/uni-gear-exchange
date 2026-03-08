import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";

interface ReviewPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiationId: string;
  revieweeId: string;
  revieweeName: string;
  onReviewSubmitted?: () => void;
}

const ReviewPrompt = ({
  open,
  onOpenChange,
  negotiationId,
  revieweeId,
  revieweeName,
  onReviewSubmitted,
}: ReviewPromptProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await (supabase as any).from("reviews").insert({
      negotiation_id: negotiationId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim(),
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already reviewed", description: "You've already left a review for this deal." });
      } else {
        toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
      }
    } else {
      toast({ title: "⭐ Review submitted!", description: "Thanks for your feedback." });
      onReviewSubmitted?.();
    }

    setSubmitting(false);
    onOpenChange(false);
    setRating(0);
    setComment("");
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-base">
            How was your experience with {revieweeName}?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Star rating */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= displayRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {displayRating === 1 && "Poor"}
            {displayRating === 2 && "Fair"}
            {displayRating === 3 && "Good"}
            {displayRating === 4 && "Very Good"}
            {displayRating === 5 && "Excellent"}
            {displayRating === 0 && "Tap a star to rate"}
          </p>

          {/* Comment */}
          <Textarea
            placeholder="Leave a comment (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            className="resize-none text-sm"
            rows={3}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewPrompt;

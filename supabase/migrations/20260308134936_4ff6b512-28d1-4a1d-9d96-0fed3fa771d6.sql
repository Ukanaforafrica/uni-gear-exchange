
CREATE TABLE public.meetup_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL,
  meetup_time timestamp with time zone NOT NULL,
  meetup_location text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  buyer_accepted boolean NOT NULL DEFAULT false,
  seller_accepted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.meetup_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view meetup proposals"
ON public.meetup_proposals FOR SELECT TO authenticated
USING (negotiation_id IN (
  SELECT id FROM public.negotiations WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
));

CREATE POLICY "Participants can create meetup proposals"
ON public.meetup_proposals FOR INSERT TO authenticated
WITH CHECK (
  proposed_by = auth.uid() AND
  negotiation_id IN (
    SELECT id FROM public.negotiations WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
  )
);

CREATE POLICY "Participants can update meetup proposals"
ON public.meetup_proposals FOR UPDATE TO authenticated
USING (negotiation_id IN (
  SELECT id FROM public.negotiations WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
));

-- Add status to negotiations for deal closure
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS deal_closed boolean NOT NULL DEFAULT false;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS closed_by uuid;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- Enable realtime for meetup_proposals
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetup_proposals;

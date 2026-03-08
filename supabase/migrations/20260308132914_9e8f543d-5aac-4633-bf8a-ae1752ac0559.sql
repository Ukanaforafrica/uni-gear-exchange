
-- Create chat-media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true);

-- Allow authenticated users to upload to chat-media
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow authenticated users to view chat media
CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media');

-- Add message_type column to negotiation_messages
ALTER TABLE public.negotiation_messages
ADD COLUMN message_type text NOT NULL DEFAULT 'text',
ADD COLUMN media_url text NOT NULL DEFAULT '';

-- Concierge chat persistence
CREATE TABLE public.concierge_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concierge_conversations_user ON public.concierge_conversations(user_id, updated_at DESC);

ALTER TABLE public.concierge_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations"
  ON public.concierge_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users create own conversations"
  ON public.concierge_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own conversations"
  ON public.concierge_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own conversations"
  ON public.concierge_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_concierge_conversations_updated_at
  BEFORE UPDATE ON public.concierge_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.concierge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.concierge_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concierge_messages_conv ON public.concierge_messages(conversation_id, created_at);

ALTER TABLE public.concierge_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages"
  ON public.concierge_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.concierge_conversations c
            WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users create own messages"
  ON public.concierge_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.concierge_conversations c
            WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users delete own messages"
  ON public.concierge_messages FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.concierge_conversations c
            WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );
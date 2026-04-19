-- Upcoming events for occasion-aware discovery
CREATE TABLE public.upcoming_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other',
  event_date DATE NOT NULL,
  location TEXT,
  vibe TEXT,
  budget_hint TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.upcoming_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own events"
ON public.upcoming_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own events"
ON public.upcoming_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own events"
ON public.upcoming_events FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own events"
ON public.upcoming_events FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_upcoming_events_updated_at
BEFORE UPDATE ON public.upcoming_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_upcoming_events_user_date ON public.upcoming_events(user_id, event_date);

-- Product engagements (signals for predictive + social intelligence)
CREATE TABLE public.product_engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT,
  vendor TEXT,
  price NUMERIC,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  action TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own engagements"
ON public.product_engagements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own engagements"
ON public.product_engagements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_product_engagements_user ON public.product_engagements(user_id, created_at DESC);
CREATE INDEX idx_product_engagements_product ON public.product_engagements(product_id, created_at DESC);
CREATE INDEX idx_product_engagements_action ON public.product_engagements(action, created_at DESC);

-- Aggregated trending function (no per-user data leak)
CREATE OR REPLACE FUNCTION public.get_trending_products(days_back INTEGER DEFAULT 7, max_items INTEGER DEFAULT 20)
RETURNS TABLE (
  product_id TEXT,
  product_title TEXT,
  vendor TEXT,
  category TEXT,
  tags TEXT[],
  total_score BIGINT,
  unique_users BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pe.product_id,
    MAX(pe.product_title) AS product_title,
    MAX(pe.vendor) AS vendor,
    MAX(pe.category) AS category,
    (ARRAY_AGG(DISTINCT t))[1:8] AS tags,
    SUM(pe.weight)::BIGINT AS total_score,
    COUNT(DISTINCT pe.user_id)::BIGINT AS unique_users
  FROM public.product_engagements pe
  LEFT JOIN LATERAL UNNEST(COALESCE(pe.tags, '{}')) AS t ON TRUE
  WHERE pe.created_at >= now() - (days_back || ' days')::INTERVAL
  GROUP BY pe.product_id
  ORDER BY total_score DESC, unique_users DESC
  LIMIT max_items;
$$;
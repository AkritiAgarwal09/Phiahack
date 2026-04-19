-- =========================================
-- Swipe events
-- =========================================
CREATE TABLE public.swipe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('product','outfit','moodboard','aesthetic','color')),
  target_id text NOT NULL,
  target_title text,
  target_image text,
  vendor text,
  category text,
  tags text[] DEFAULT '{}',
  price numeric,
  direction text NOT NULL CHECK (direction IN ('left','right','up','tap')),
  reason text,
  dwell_ms integer DEFAULT 0,
  context text DEFAULT 'studio', -- 'onboarding' | 'studio' | 'concierge'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_swipe_events_user_created ON public.swipe_events (user_id, created_at DESC);
CREATE INDEX idx_swipe_events_target ON public.swipe_events (target_type, target_id);

ALTER TABLE public.swipe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own swipes"
  ON public.swipe_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own swipes"
  ON public.swipe_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own swipes"
  ON public.swipe_events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- Style profile
-- =========================================
CREATE TABLE public.style_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  top_categories text[] DEFAULT '{}',
  color_palette text[] DEFAULT '{}',
  aesthetic_clusters text[] DEFAULT '{}',
  price_tolerance text DEFAULT 'mid',          -- 'budget' | 'mid' | 'premium' | 'luxury'
  bold_minimal_score integer DEFAULT 50,        -- 0 minimal -> 100 bold
  casual_formal_score integer DEFAULT 50,       -- 0 casual -> 100 formal
  brand_affinity text[] DEFAULT '{}',
  ai_summary text,
  total_swipes integer DEFAULT 0,
  onboarding_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own style profile"
  ON public.style_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own style profile"
  ON public.style_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own style profile"
  ON public.style_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_style_profiles_updated_at
  BEFORE UPDATE ON public.style_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- RPC: cluster trending
-- Products that users sharing any aesthetic with the caller have right-swiped recently.
-- =========================================
CREATE OR REPLACE FUNCTION public.get_style_cluster_trending(
  days_back integer DEFAULT 14,
  max_items integer DEFAULT 12
)
RETURNS TABLE(
  target_id text,
  target_title text,
  target_image text,
  vendor text,
  category text,
  tags text[],
  price numeric,
  love_count bigint,
  unique_users bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH my_aes AS (
    SELECT COALESCE(aesthetic_clusters, '{}') AS clusters
    FROM public.style_profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  ),
  peers AS (
    SELECT sp.user_id
    FROM public.style_profiles sp, my_aes
    WHERE sp.user_id <> auth.uid()
      AND sp.aesthetic_clusters && my_aes.clusters
  )
  SELECT
    se.target_id,
    MAX(se.target_title) AS target_title,
    MAX(se.target_image) AS target_image,
    MAX(se.vendor) AS vendor,
    MAX(se.category) AS category,
    (ARRAY_AGG(DISTINCT t))[1:6] AS tags,
    AVG(se.price)::numeric AS price,
    COUNT(*)::bigint AS love_count,
    COUNT(DISTINCT se.user_id)::bigint AS unique_users
  FROM public.swipe_events se
  LEFT JOIN LATERAL UNNEST(COALESCE(se.tags, '{}')) AS t ON TRUE
  WHERE se.created_at >= now() - (days_back || ' days')::interval
    AND se.direction IN ('right','up')
    AND se.target_type = 'product'
    AND (
      EXISTS (SELECT 1 FROM peers p WHERE p.user_id = se.user_id)
      OR NOT EXISTS (SELECT 1 FROM peers)
    )
  GROUP BY se.target_id
  ORDER BY love_count DESC, unique_users DESC
  LIMIT max_items;
$$;

-- =========================================
-- RPC: mark onboarding complete
-- =========================================
CREATE OR REPLACE FUNCTION public.mark_onboarding_completed()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.style_profiles (user_id, onboarding_completed_at)
  VALUES (auth.uid(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET onboarding_completed_at = now(), updated_at = now();
END;
$$;
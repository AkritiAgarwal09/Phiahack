
-- ============================================================
-- 1. Default new mood boards to PRIVATE
-- ============================================================
ALTER TABLE public.mood_boards
  ALTER COLUMN is_public SET DEFAULT false;

-- ============================================================
-- 2. Mood board view tracking (for "X people have viewed" + creator stats)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mood_board_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.mood_boards(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS mood_board_views_board_idx ON public.mood_board_views (board_id);
CREATE INDEX IF NOT EXISTS mood_board_views_viewer_idx ON public.mood_board_views (viewer_id);

ALTER TABLE public.mood_board_views ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can record their own view of a board they can see (board is public OR they own it)
CREATE POLICY "Viewers record own view"
ON public.mood_board_views
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = viewer_id
  AND EXISTS (
    SELECT 1 FROM public.mood_boards b
    WHERE b.id = mood_board_views.board_id
      AND (b.is_public = true OR b.user_id = auth.uid())
  )
);

CREATE POLICY "Viewers update own view timestamp"
ON public.mood_board_views
FOR UPDATE
TO authenticated
USING (auth.uid() = viewer_id);

-- Creators see all viewers of their boards; viewers see their own row
CREATE POLICY "Creators read views of own boards"
ON public.mood_board_views
FOR SELECT
TO authenticated
USING (
  auth.uid() = viewer_id
  OR EXISTS (
    SELECT 1 FROM public.mood_boards b
    WHERE b.id = mood_board_views.board_id AND b.user_id = auth.uid()
  )
);

-- ============================================================
-- 3. Price history table (real history, builds over time)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_title text,
  vendor text,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_history_product_idx ON public.price_history (product_id, recorded_at DESC);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Read freely (price intelligence is a public feature of Phia)
CREATE POLICY "Price history is public"
ON public.price_history
FOR SELECT
TO public
USING (true);

-- Any signed-in user can append a snapshot (used when products are viewed)
CREATE POLICY "Authenticated can append price snapshots"
ON public.price_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- 4. RPC: viral product + sparkline (last N days, top across all users)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_viral_product(days_back integer DEFAULT 7)
RETURNS TABLE (
  product_id text,
  product_title text,
  vendor text,
  category text,
  tags text[],
  total_score bigint,
  unique_users bigint,
  growth_pct numeric,
  sparkline jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win interval := (days_back || ' days')::interval;
  prev_win interval := (days_back || ' days')::interval;
BEGIN
  RETURN QUERY
  WITH recent AS (
    SELECT pe.product_id,
           MAX(pe.product_title) AS product_title,
           MAX(pe.vendor) AS vendor,
           MAX(pe.category) AS category,
           (ARRAY_AGG(DISTINCT t))[1:8] AS tags,
           SUM(pe.weight)::bigint AS total_score,
           COUNT(DISTINCT pe.user_id)::bigint AS unique_users
    FROM public.product_engagements pe
    LEFT JOIN LATERAL UNNEST(COALESCE(pe.tags, '{}')) AS t ON TRUE
    WHERE pe.created_at >= now() - win
    GROUP BY pe.product_id
  ),
  previous AS (
    SELECT pe.product_id, SUM(pe.weight)::bigint AS prev_score
    FROM public.product_engagements pe
    WHERE pe.created_at >= now() - win - prev_win
      AND pe.created_at <  now() - win
    GROUP BY pe.product_id
  ),
  combined AS (
    SELECT r.*,
           COALESCE(p.prev_score, 0)::bigint AS prev_score,
           CASE WHEN COALESCE(p.prev_score, 0) = 0
                THEN 100.0
                ELSE ROUND(((r.total_score - p.prev_score)::numeric / p.prev_score) * 100.0, 1)
           END AS growth_pct
    FROM recent r
    LEFT JOIN previous p ON p.product_id = r.product_id
  ),
  pick AS (
    SELECT * FROM combined
    ORDER BY growth_pct DESC NULLS LAST, total_score DESC
    LIMIT 1
  ),
  spark AS (
    SELECT pick.product_id,
           jsonb_agg(jsonb_build_object(
             'day', to_char(d::date, 'YYYY-MM-DD'),
             'score', COALESCE(SUM(pe.weight), 0)
           ) ORDER BY d) AS sparkline
    FROM pick
    CROSS JOIN generate_series(
      (now() - win)::date,
      now()::date,
      interval '1 day'
    ) AS d
    LEFT JOIN public.product_engagements pe
      ON pe.product_id = pick.product_id
     AND pe.created_at::date = d::date
    GROUP BY pick.product_id
  )
  SELECT pick.product_id, pick.product_title, pick.vendor, pick.category, pick.tags,
         pick.total_score, pick.unique_users, pick.growth_pct,
         COALESCE(spark.sparkline, '[]'::jsonb) AS sparkline
  FROM pick
  LEFT JOIN spark ON spark.product_id = pick.product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_viral_product(integer) TO authenticated, anon;

-- ============================================================
-- 5. RPC: mood-board view count (public, for any public board)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mood_board_view_count(_board_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.mood_board_views
  WHERE board_id = _board_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_mood_board_view_count(uuid) TO authenticated, anon;

-- ============================================================
-- 6. RPC: mood-board purchase stats (creator-only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mood_board_purchase_stats(_board_id uuid)
RETURNS TABLE (
  purchase_count bigint,
  total_revenue numeric,
  total_points_earned bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  owner uuid;
BEGIN
  SELECT user_id INTO owner FROM public.mood_boards WHERE id = _board_id;
  IF owner IS NULL OR owner <> caller THEN
    RETURN QUERY SELECT 0::bigint, 0::numeric, 0::bigint;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT COUNT(*)::bigint AS purchase_count,
           COALESCE(SUM(o.total), 0)::numeric AS total_revenue,
           COALESCE(SUM(o.points_awarded_to_board_creator), 0)::bigint AS total_points_earned
    FROM public.orders o
    WHERE o.shared_mood_board_id = _board_id
      AND o.points_awarded_to_board_creator > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mood_board_purchase_stats(uuid) TO authenticated;

-- ============================================================
-- 7. RPC: New from people you follow
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_followed_user_engagements(days_back integer DEFAULT 14, max_items integer DEFAULT 30)
RETURNS TABLE (
  product_id text,
  product_title text,
  vendor text,
  category text,
  tags text[],
  total_score bigint,
  unique_users bigint
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
    SUM(pe.weight)::bigint AS total_score,
    COUNT(DISTINCT pe.user_id)::bigint AS unique_users
  FROM public.product_engagements pe
  LEFT JOIN LATERAL UNNEST(COALESCE(pe.tags, '{}')) AS t ON TRUE
  WHERE pe.created_at >= now() - (days_back || ' days')::interval
    AND pe.user_id IN (
      SELECT following_id FROM public.social_follows WHERE follower_id = auth.uid()
    )
    AND pe.action IN ('wishlist','moodboard','cart','purchase')
  GROUP BY pe.product_id
  ORDER BY total_score DESC, unique_users DESC
  LIMIT max_items;
$$;

GRANT EXECUTE ON FUNCTION public.get_followed_user_engagements(integer, integer) TO authenticated;

-- ============================================================
-- 8. RPC: public mood boards gallery (with creator + counts)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_mood_boards(
  search_query text DEFAULT NULL,
  max_items integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  cover_image text,
  user_id uuid,
  creator_name text,
  creator_avatar text,
  item_count bigint,
  view_count bigint,
  preview_images text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.name,
    b.description,
    b.cover_image,
    b.user_id,
    pr.display_name AS creator_name,
    pr.avatar_url AS creator_avatar,
    COALESCE(item_counts.cnt, 0)::bigint AS item_count,
    COALESCE(view_counts.cnt, 0)::bigint AS view_count,
    COALESCE(preview.images, '{}')::text[] AS preview_images,
    b.created_at
  FROM public.mood_boards b
  LEFT JOIN public.profiles pr ON pr.user_id = b.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.mood_board_items mi
    WHERE mi.board_id = b.id
  ) item_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.mood_board_views v
    WHERE v.board_id = b.id
  ) view_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(mi.product_image ORDER BY mi.created_at DESC) FILTER (WHERE mi.product_image IS NOT NULL) AS images
    FROM (
      SELECT product_image, created_at
      FROM public.mood_board_items
      WHERE board_id = b.id AND product_image IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 4
    ) mi
  ) preview ON TRUE
  WHERE b.is_public = true
    AND (
      search_query IS NULL
      OR search_query = ''
      OR b.name ILIKE '%' || search_query || '%'
      OR COALESCE(b.description, '') ILIKE '%' || search_query || '%'
      OR COALESCE(pr.display_name, '') ILIKE '%' || search_query || '%'
    )
  ORDER BY view_counts.cnt DESC NULLS LAST, item_counts.cnt DESC NULLS LAST, b.created_at DESC
  LIMIT max_items;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_mood_boards(text, integer) TO authenticated, anon;

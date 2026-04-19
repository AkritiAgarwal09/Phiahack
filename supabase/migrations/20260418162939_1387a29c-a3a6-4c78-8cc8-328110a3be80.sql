DROP FUNCTION IF EXISTS public.get_public_mood_boards(text, integer);

CREATE OR REPLACE FUNCTION public.get_public_mood_boards(search_query text DEFAULT NULL::text, max_items integer DEFAULT 30)
 RETURNS TABLE(id uuid, name text, description text, cover_image text, user_id uuid, creator_name text, creator_avatar text, item_count bigint, view_count bigint, preview_images text[], top_caption text, top_caption_pin_id uuid, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    top_cap.note AS top_caption,
    top_cap.pin_id AS top_caption_pin_id,
    b.created_at
  FROM public.mood_boards b
  LEFT JOIN public.profiles pr ON pr.user_id = b.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM public.mood_board_items mi WHERE mi.board_id = b.id
  ) item_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt FROM public.mood_board_views v WHERE v.board_id = b.id
  ) view_counts ON TRUE
  LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(mi.product_image ORDER BY mi.created_at DESC) FILTER (WHERE mi.product_image IS NOT NULL) AS images
    FROM (
      SELECT product_image, created_at FROM public.mood_board_items
      WHERE board_id = b.id AND product_image IS NOT NULL
      ORDER BY created_at DESC LIMIT 4
    ) mi
  ) preview ON TRUE
  LEFT JOIN LATERAL (
    SELECT mi.id AS pin_id, mi.notes AS note
    FROM public.mood_board_items mi
    WHERE mi.board_id = b.id AND mi.notes IS NOT NULL AND length(trim(mi.notes)) > 0
    ORDER BY length(mi.notes) DESC, mi.created_at DESC
    LIMIT 1
  ) top_cap ON TRUE
  WHERE b.is_public = true
    AND (
      search_query IS NULL OR search_query = ''
      OR b.name ILIKE '%' || search_query || '%'
      OR COALESCE(b.description, '') ILIKE '%' || search_query || '%'
      OR COALESCE(pr.display_name, '') ILIKE '%' || search_query || '%'
    )
  ORDER BY view_counts.cnt DESC NULLS LAST, item_counts.cnt DESC NULLS LAST, b.created_at DESC
  LIMIT max_items;
$function$;
-- 1. Add attribution columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shared_mood_board_id UUID REFERENCES public.mood_boards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points_awarded_to_board_creator INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_shared_mood_board_id
  ON public.orders(shared_mood_board_id)
  WHERE shared_mood_board_id IS NOT NULL;

-- 2. Notify the mood board creator when their shared board converts
CREATE OR REPLACE FUNCTION public.notify_creator_mood_board_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator UUID;
  buyer_name TEXT;
  board_name TEXT;
BEGIN
  IF NEW.shared_mood_board_id IS NULL OR NEW.points_awarded_to_board_creator <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT user_id, name INTO creator, board_name
  FROM public.mood_boards WHERE id = NEW.shared_mood_board_id;

  IF creator IS NULL OR creator = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'A friend') INTO buyer_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    creator,
    'mood_board_purchase',
    'Your mood board led to a purchase',
    buyer_name || ' bought from "' || COALESCE(board_name, 'your board') || '". You earned ' || NEW.points_awarded_to_board_creator || ' points 🎉',
    '/mood-board/' || NEW.shared_mood_board_id,
    jsonb_build_object(
      'order_id', NEW.id,
      'mood_board_id', NEW.shared_mood_board_id,
      'points', NEW.points_awarded_to_board_creator
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_creator_mood_board_purchase ON public.orders;
CREATE TRIGGER trg_notify_creator_mood_board_purchase
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_creator_mood_board_purchase();
-- 1. Soft revoke
ALTER TABLE public.shared_carts
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;

-- 2. Wishlist dedupe (per user, per product URL)
DELETE FROM public.wishlists w
USING public.wishlists w2
WHERE w.user_id = w2.user_id
  AND lower(w.product_url) = lower(w2.product_url)
  AND w.created_at > w2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wishlist_user_url
  ON public.wishlists(user_id, lower(product_url));

-- 3. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERTS happen from SECURITY DEFINER triggers; no client-side insert policy needed.

-- 4. Trigger: shared cart created -> notify recipient (if they have an account)
CREATE OR REPLACE FUNCTION public.notify_recipient_shared_cart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sharer_name TEXT;
BEGIN
  IF NEW.recipient_user_id IS NULL OR NEW.recipient_user_id = NEW.sharer_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'A friend') INTO sharer_name
  FROM public.profiles WHERE user_id = NEW.sharer_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    NEW.recipient_user_id,
    'shared_cart_received',
    sharer_name || ' shared a cart with you',
    COALESCE(NEW.title, 'Tap to see what they picked for you.'),
    '/shared-cart/' || NEW.id,
    jsonb_build_object('shared_cart_id', NEW.id, 'sharer_id', NEW.sharer_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_recipient_shared_cart ON public.shared_carts;
CREATE TRIGGER trg_notify_recipient_shared_cart
AFTER INSERT ON public.shared_carts
FOR EACH ROW EXECUTE FUNCTION public.notify_recipient_shared_cart();

-- 5. Trigger: order placed against a shared cart with points awarded -> notify sharer
CREATE OR REPLACE FUNCTION public.notify_sharer_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sharer UUID;
  buyer_name TEXT;
BEGIN
  IF NEW.shared_cart_id IS NULL OR NEW.points_awarded_to_sharer <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT sharer_id INTO sharer FROM public.shared_carts WHERE id = NEW.shared_cart_id;
  IF sharer IS NULL OR sharer = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'A friend') INTO buyer_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    sharer,
    'shared_cart_purchase',
    'Your shared cart led to a purchase',
    buyer_name || ' bought from your shared cart. You earned ' || NEW.points_awarded_to_sharer || ' points 🎉',
    '/shared-cart/' || NEW.shared_cart_id,
    jsonb_build_object(
      'order_id', NEW.id,
      'shared_cart_id', NEW.shared_cart_id,
      'points', NEW.points_awarded_to_sharer
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_sharer_purchase ON public.orders;
CREATE TRIGGER trg_notify_sharer_purchase
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_sharer_purchase();
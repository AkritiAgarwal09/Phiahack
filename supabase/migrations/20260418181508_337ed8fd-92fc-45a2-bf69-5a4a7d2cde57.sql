-- 1. Add lifetime_points to profiles (current `points` becomes available balance)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lifetime_points integer NOT NULL DEFAULT 0;

-- Back-fill lifetime points from positive ledger entries (sum of all earned points)
UPDATE public.profiles p
SET lifetime_points = GREATEST(
  COALESCE((
    SELECT SUM(amount)::int FROM public.point_ledger l
    WHERE l.user_id = p.user_id AND l.amount > 0
  ), 0),
  p.points
);

-- Recompute tier from lifetime_points (one-time correction)
UPDATE public.profiles
SET tier = CASE
  WHEN lifetime_points >= 50000 THEN 'circle_black'
  WHEN lifetime_points >= 20000 THEN 'elite'
  WHEN lifetime_points >= 5000 THEN 'insider'
  ELSE 'explorer'
END;

-- 2. Vouchers catalog (public read for authenticated)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  cost_points integer NOT NULL CHECK (cost_points > 0),
  reward_type text NOT NULL CHECK (reward_type IN ('amount_off','percent_off','free_shipping','perk')),
  reward_value numeric NOT NULL DEFAULT 0,
  min_subtotal numeric NOT NULL DEFAULT 0,
  required_tier text,
  active boolean NOT NULL DEFAULT true,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active vouchers" ON public.vouchers;
CREATE POLICY "Anyone can view active vouchers"
  ON public.vouchers FOR SELECT
  USING (active = true);

-- 3. User wallet of redeemed vouchers
CREATE TABLE IF NOT EXISTS public.user_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at timestamptz,
  cost_points integer NOT NULL,
  reward_type text NOT NULL,
  reward_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','used','expired'))
);
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own vouchers" ON public.user_vouchers;
CREATE POLICY "Users view own vouchers"
  ON public.user_vouchers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own vouchers" ON public.user_vouchers;
CREATE POLICY "Users insert own vouchers"
  ON public.user_vouchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own vouchers" ON public.user_vouchers;
CREATE POLICY "Users update own vouchers"
  ON public.user_vouchers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_vouchers_user ON public.user_vouchers(user_id, status);

-- 4. Orders gain redemption tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applied_voucher_id uuid REFERENCES public.user_vouchers(id) ON DELETE SET NULL;

-- 5. Seed catalog
INSERT INTO public.vouchers (code, title, description, cost_points, reward_type, reward_value, min_subtotal, icon)
VALUES
  ('FIVE_OFF',     '$5 off your order',     'Apply at checkout on any cart over $25.',           50,   'amount_off',     5,  25, '🎁'),
  ('TEN_OFF',      '$10 off your order',    'Apply at checkout on any cart over $60.',          100,   'amount_off',    10,  60, '💸'),
  ('TWENTY_OFF',   '$20 off your order',    'Apply at checkout on any cart over $120.',         200,   'amount_off',    20, 120, '💎'),
  ('FREE_SHIP',    'Free shipping',         'Skip shipping on your next order.',                 75,   'free_shipping',  0,   0, '🚚'),
  ('EARLY_ACCESS', '24h early sale access', 'See flash drops a day before everyone else.',      150,   'perk',           0,   0, '⏰'),
  ('PRIVATE_EDIT', 'Member-only style edit','A curated capsule selected by our stylists.',      250,   'perk',           0,   0, '✨')
ON CONFLICT (code) DO NOTHING;
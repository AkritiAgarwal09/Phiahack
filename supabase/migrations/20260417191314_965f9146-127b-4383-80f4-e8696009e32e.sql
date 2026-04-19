
-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for lookups
CREATE INDEX idx_referrals_invite_code ON public.referrals(invite_code);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can create their own referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Anyone can view by invite code for signup"
  ON public.referrals FOR SELECT
  USING (true);

CREATE POLICY "System can update referral on completion"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referred_user_id OR auth.uid() = referrer_id);

-- Helper function to generate unique short invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update handle_new_user to process referral on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code_meta TEXT;
  referral_record RECORD;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  -- Check for referral code in metadata
  invite_code_meta := NEW.raw_user_meta_data->>'invite_code';

  IF invite_code_meta IS NOT NULL THEN
    SELECT * INTO referral_record
    FROM public.referrals
    WHERE invite_code = invite_code_meta
      AND status = 'pending'
      AND referrer_id != NEW.id
    LIMIT 1;

    IF referral_record.id IS NOT NULL THEN
      -- Mark referral as completed
      UPDATE public.referrals
      SET referred_user_id = NEW.id,
          status = 'completed',
          points_awarded = 500,
          completed_at = now()
      WHERE id = referral_record.id;

      -- Award 500 points to referrer
      INSERT INTO public.point_ledger (user_id, amount, source_type, source_id, reason)
      VALUES (referral_record.referrer_id, 500, 'refer_friend', referral_record.id::text, 'Referred a friend');

      UPDATE public.profiles
      SET points = points + 500,
          tier = CASE
            WHEN points + 500 >= 50000 THEN 'circle_black'
            WHEN points + 500 >= 20000 THEN 'elite'
            WHEN points + 500 >= 5000 THEN 'insider'
            ELSE 'explorer'
          END
      WHERE user_id = referral_record.referrer_id;

      -- Log activity
      INSERT INTO public.activity_feed (user_id, action_type, metadata, is_public)
      VALUES (referral_record.referrer_id, 'refer_friend', jsonb_build_object('points_earned', 500), true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure latest function is bound
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

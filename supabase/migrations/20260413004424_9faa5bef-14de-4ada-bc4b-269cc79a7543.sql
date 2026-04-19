
-- Point Ledger (immutable)
CREATE TABLE public.point_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point history"
ON public.point_ledger FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points"
ON public.point_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_point_ledger_user ON public.point_ledger(user_id);
CREATE INDEX idx_point_ledger_created ON public.point_ledger(created_at DESC);

-- Wishlists
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_url TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  target_price DECIMAL(10,2),
  current_price DECIMAL(10,2),
  alert_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlists" ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own wishlists" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wishlists" ON public.wishlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wishlists" ON public.wishlists FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

CREATE TRIGGER update_wishlists_updated_at
BEFORE UPDATE ON public.wishlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mood Boards
CREATE TABLE public.mood_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public boards visible to all" ON public.mood_boards FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can create own boards" ON public.mood_boards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own boards" ON public.mood_boards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own boards" ON public.mood_boards FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_mood_boards_user ON public.mood_boards(user_id);

CREATE TRIGGER update_mood_boards_updated_at
BEFORE UPDATE ON public.mood_boards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mood Board Items
CREATE TABLE public.mood_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.mood_boards(id) ON DELETE CASCADE,
  product_url TEXT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board items visible if board is visible"
ON public.mood_board_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.mood_boards b
  WHERE b.id = board_id AND (b.is_public = true OR b.user_id = auth.uid())
));

CREATE POLICY "Board owners can insert items"
ON public.mood_board_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mood_boards b WHERE b.id = board_id AND b.user_id = auth.uid()
));

CREATE POLICY "Board owners can update items"
ON public.mood_board_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.mood_boards b WHERE b.id = board_id AND b.user_id = auth.uid()
));

CREATE POLICY "Board owners can delete items"
ON public.mood_board_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.mood_boards b WHERE b.id = board_id AND b.user_id = auth.uid()
));

CREATE INDEX idx_mood_board_items_board ON public.mood_board_items(board_id);

-- Social Follows
CREATE TABLE public.social_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON public.social_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.social_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.social_follows FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX idx_follows_follower ON public.social_follows(follower_id);
CREATE INDEX idx_follows_following ON public.social_follows(following_id);

-- Activity Feed
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public activities visible to all" ON public.activity_feed FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can create own activities" ON public.activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activity_feed_user ON public.activity_feed(user_id);
CREATE INDEX idx_activity_feed_created ON public.activity_feed(created_at DESC);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

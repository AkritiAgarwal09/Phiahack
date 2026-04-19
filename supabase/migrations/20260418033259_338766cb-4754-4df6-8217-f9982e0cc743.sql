-- =========================================================
-- SHARED CARTS
-- =========================================================
CREATE TABLE public.shared_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sharer_id UUID NOT NULL,
  title TEXT,
  message TEXT,
  recipient_user_id UUID,
  recipient_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_shared_carts_sharer ON public.shared_carts(sharer_id);
CREATE INDEX idx_shared_carts_recipient_user ON public.shared_carts(recipient_user_id);
CREATE INDEX idx_shared_carts_recipient_email ON public.shared_carts(recipient_email);

ALTER TABLE public.shared_carts ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can view a shared cart (link sharing model, but auth required)
CREATE POLICY "Authenticated users can view shared carts"
  ON public.shared_carts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own shared carts"
  ON public.shared_carts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sharer_id);

CREATE POLICY "Sharers can update their own shared carts"
  ON public.shared_carts FOR UPDATE
  TO authenticated
  USING (auth.uid() = sharer_id);

CREATE POLICY "Sharers can delete their own shared carts"
  ON public.shared_carts FOR DELETE
  TO authenticated
  USING (auth.uid() = sharer_id);

-- =========================================================
-- SHARED CART ITEMS
-- =========================================================
CREATE TABLE public.shared_cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_cart_id UUID NOT NULL REFERENCES public.shared_carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_image TEXT,
  vendor TEXT,
  variant_title TEXT,
  selected_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_cart_items_cart ON public.shared_cart_items(shared_cart_id);

ALTER TABLE public.shared_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items follow parent cart visibility"
  ON public.shared_cart_items FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shared_carts sc WHERE sc.id = shared_cart_id));

CREATE POLICY "Sharers can insert items into their own carts"
  ON public.shared_cart_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_carts sc
      WHERE sc.id = shared_cart_id AND sc.sharer_id = auth.uid()
    )
  );

CREATE POLICY "Sharers can delete items from their own carts"
  ON public.shared_cart_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_carts sc
      WHERE sc.id = shared_cart_id AND sc.sharer_id = auth.uid()
    )
  );

-- =========================================================
-- SHARED CART VIEWS  (Shared With Me inbox auto-tracking)
-- =========================================================
CREATE TABLE public.shared_cart_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_cart_id UUID NOT NULL REFERENCES public.shared_carts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  first_opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shared_cart_id, viewer_id)
);

CREATE INDEX idx_shared_cart_views_viewer ON public.shared_cart_views(viewer_id);

ALTER TABLE public.shared_cart_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers can read their own view records"
  ON public.shared_cart_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewer_id);

CREATE POLICY "Viewers can insert their own view records"
  ON public.shared_cart_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Viewers can update their own view records"
  ON public.shared_cart_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = viewer_id);

CREATE POLICY "Viewers can delete their own view records"
  ON public.shared_cart_views FOR DELETE
  TO authenticated
  USING (auth.uid() = viewer_id);

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  shared_cart_id UUID REFERENCES public.shared_carts(id) ON DELETE SET NULL,
  points_awarded_to_sharer INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_shared_cart ON public.orders(shared_cart_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- ORDER ITEMS
-- =========================================================
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_image TEXT,
  vendor TEXT,
  variant_title TEXT,
  selected_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items of their own orders"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items for their own orders"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Sharers can update items in their own carts" ON public.shared_cart_items;
CREATE POLICY "Sharers can update items in their own carts"
  ON public.shared_cart_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_carts sc
      WHERE sc.id = shared_cart_id AND sc.sharer_id = auth.uid()
    )
  );
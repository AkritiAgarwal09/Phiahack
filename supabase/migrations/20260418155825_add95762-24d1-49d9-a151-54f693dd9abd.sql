
DROP POLICY IF EXISTS "Authenticated can append price snapshots" ON public.price_history;

CREATE POLICY "Authenticated can append price snapshots"
ON public.price_history
FOR INSERT
TO authenticated
WITH CHECK (
  price > 0
  AND length(product_id) BETWEEN 1 AND 200
  AND length(coalesce(product_title, '')) <= 300
  AND length(coalesce(vendor, '')) <= 200
  AND length(coalesce(currency, 'USD')) <= 8
);

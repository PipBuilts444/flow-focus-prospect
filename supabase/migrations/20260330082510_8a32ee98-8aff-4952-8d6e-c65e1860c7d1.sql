
CREATE TABLE public.deal_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  name text NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  estimated_delivery_cost numeric NOT NULL DEFAULT 0,
  gross_margin_value numeric GENERATED ALWAYS AS (revenue - estimated_delivery_cost) STORED,
  gross_margin_percent numeric GENERATED ALWAYS AS (
    CASE WHEN revenue > 0 THEN ROUND(((revenue - estimated_delivery_cost) / revenue) * 100, 2) ELSE 0 END
  ) STORED,
  start_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read deal_line_items" ON public.deal_line_items FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert deal_line_items" ON public.deal_line_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update deal_line_items" ON public.deal_line_items FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete deal_line_items" ON public.deal_line_items FOR DELETE TO public USING (true);

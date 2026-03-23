
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS estimated_delivery_days numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contractor_day_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_delivery_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_margin_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_margin_percent numeric DEFAULT 0;


-- Add missing columns to deal_line_items
ALTER TABLE public.deal_line_items ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.deal_line_items ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'initial_scope';
ALTER TABLE public.deal_line_items ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.deal_line_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.deal_line_items ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.deal_line_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Rename revenue to revenue_value for clarity
ALTER TABLE public.deal_line_items RENAME COLUMN revenue TO revenue_value;

-- Drop and recreate generated columns with new source column name
ALTER TABLE public.deal_line_items DROP COLUMN IF EXISTS gross_margin_value;
ALTER TABLE public.deal_line_items DROP COLUMN IF EXISTS gross_margin_percent;
ALTER TABLE public.deal_line_items ADD COLUMN gross_margin_value numeric GENERATED ALWAYS AS (revenue_value - estimated_delivery_cost) STORED;
ALTER TABLE public.deal_line_items ADD COLUMN gross_margin_percent numeric GENERATED ALWAYS AS (
  CASE WHEN revenue_value > 0 THEN ROUND(((revenue_value - estimated_delivery_cost)::numeric / revenue_value) * 100, 2) ELSE 0 END
) STORED;

-- Auto-update updated_at
CREATE TRIGGER set_line_item_updated_at
  BEFORE UPDATE ON public.deal_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function to sync deal totals from line items
CREATE OR REPLACE FUNCTION public.sync_deal_totals_from_line_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  target_deal_id uuid;
  agg_revenue numeric;
  agg_cost numeric;
BEGIN
  -- Determine the affected deal_id
  IF TG_OP = 'DELETE' THEN
    target_deal_id := OLD.deal_id;
  ELSE
    target_deal_id := NEW.deal_id;
  END IF;

  -- Aggregate from non-deleted line items
  SELECT
    COALESCE(SUM(revenue_value), 0),
    COALESCE(SUM(estimated_delivery_cost), 0)
  INTO agg_revenue, agg_cost
  FROM public.deal_line_items
  WHERE deal_id = target_deal_id AND is_deleted = false;

  -- Only sync if line items exist
  IF agg_revenue > 0 OR agg_cost > 0 THEN
    UPDATE public.deals
    SET value = agg_revenue,
        estimated_delivery_cost = agg_cost
    WHERE id = target_deal_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_deal_totals_after_line_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.deal_line_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_deal_totals_from_line_items();

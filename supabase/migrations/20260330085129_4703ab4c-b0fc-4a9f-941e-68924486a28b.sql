
-- Create trigger to calculate line item margins before insert/update
CREATE OR REPLACE FUNCTION public.calculate_line_item_margin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.gross_margin_value = NEW.revenue_value - NEW.estimated_delivery_cost;
  IF NEW.revenue_value > 0 THEN
    NEW.gross_margin_percent = ROUND(((NEW.revenue_value - NEW.estimated_delivery_cost)::numeric / NEW.revenue_value) * 100, 2);
  ELSE
    NEW.gross_margin_percent = 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach margin calc trigger to line items
CREATE TRIGGER trg_line_item_margin
BEFORE INSERT OR UPDATE ON public.deal_line_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_line_item_margin();

-- Attach the existing sync function as triggers on deal_line_items
CREATE TRIGGER trg_sync_deal_totals_insert
AFTER INSERT ON public.deal_line_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_deal_totals_from_line_items();

CREATE TRIGGER trg_sync_deal_totals_update
AFTER UPDATE ON public.deal_line_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_deal_totals_from_line_items();

CREATE TRIGGER trg_sync_deal_totals_delete
AFTER DELETE ON public.deal_line_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_deal_totals_from_line_items();

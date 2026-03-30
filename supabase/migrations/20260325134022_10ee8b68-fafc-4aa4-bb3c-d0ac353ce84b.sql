
-- 1. Drop unused day-rate columns
ALTER TABLE public.deals DROP COLUMN IF EXISTS contractor_day_rate;
ALTER TABLE public.deals DROP COLUMN IF EXISTS estimated_delivery_days;

-- 2. Create trigger to auto-calculate gross margin on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.calculate_deal_margin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only calculate if delivery cost is set
  IF NEW.estimated_delivery_cost IS NOT NULL AND NEW.estimated_delivery_cost > 0 THEN
    NEW.gross_margin_value = NEW.value - NEW.estimated_delivery_cost;
    IF NEW.value > 0 THEN
      NEW.gross_margin_percent = ROUND(((NEW.value - NEW.estimated_delivery_cost)::numeric / NEW.value) * 100, 2);
    ELSE
      NEW.gross_margin_percent = 0;
    END IF;
  ELSE
    NEW.gross_margin_value = 0;
    NEW.gross_margin_percent = 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deal_margin_calculator
  BEFORE INSERT OR UPDATE OF value, estimated_delivery_cost
  ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_deal_margin();

-- 3. Backfill existing deals with correct margin values
UPDATE public.deals
SET gross_margin_value = CASE 
    WHEN estimated_delivery_cost > 0 THEN value - estimated_delivery_cost 
    ELSE 0 
  END,
  gross_margin_percent = CASE 
    WHEN estimated_delivery_cost > 0 AND value > 0 THEN ROUND(((value - estimated_delivery_cost)::numeric / value) * 100, 2)
    ELSE 0
  END
WHERE estimated_delivery_cost > 0;

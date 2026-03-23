CREATE OR REPLACE FUNCTION public.track_deal_slippage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Set original_close_date on first set
  IF OLD.original_close_date IS NULL AND NEW.expected_close_date IS NOT NULL THEN
    NEW.original_close_date = NEW.expected_close_date;
  END IF;

  -- Track slippage
  IF OLD.expected_close_date IS NOT NULL
     AND NEW.expected_close_date IS NOT NULL
     AND NEW.expected_close_date > OLD.expected_close_date THEN
    NEW.slip_count = OLD.slip_count + 1;
  END IF;

  -- Always update latest
  IF NEW.expected_close_date IS NOT NULL THEN
    NEW.latest_close_date = NEW.expected_close_date;
  END IF;

  -- Status transitions: preserve explicit historical dates if already provided
  IF NEW.stage = 'Closed Won' AND OLD.stage != 'Closed Won' THEN
    NEW.status = 'closed_won';
    NEW.won_date = COALESCE(NEW.won_date, OLD.won_date, CURRENT_DATE);
    NEW.confidence_percent = 100;
    NEW.forecast_category = 'Closed Won';
  END IF;

  IF NEW.stage = 'Closed Lost' AND OLD.stage != 'Closed Lost' THEN
    NEW.status = 'closed_lost';
    NEW.lost_date = COALESCE(NEW.lost_date, OLD.lost_date, CURRENT_DATE);
    NEW.confidence_percent = 0;
    NEW.forecast_category = 'Closed Lost';
  END IF;

  RETURN NEW;
END;
$$;
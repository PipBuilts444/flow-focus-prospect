CREATE TABLE public.stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_stage deal_stage,
  to_stage deal_stage NOT NULL,
  transitioned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_history_deal ON public.stage_history(deal_id);
CREATE INDEX idx_stage_history_stage_time ON public.stage_history(to_stage, transitioned_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_history TO authenticated;
GRANT SELECT, INSERT ON public.stage_history TO anon;
GRANT ALL ON public.stage_history TO service_role;

ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stage_history" ON public.stage_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stage_history" ON public.stage_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stage_history" ON public.stage_history FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete stage_history" ON public.stage_history FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.record_stage_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  ts timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ts := COALESCE(NEW.lead_date::timestamptz, NEW.created_at, now());
    INSERT INTO public.stage_history (deal_id, from_stage, to_stage, transitioned_at)
    VALUES (NEW.id, NULL, NEW.stage, ts);
    RETURN NEW;
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.stage = 'Closed Won' THEN
      ts := COALESCE(NEW.won_date::timestamptz, now());
    ELSIF NEW.stage = 'Closed Lost' THEN
      ts := COALESCE(NEW.lost_date::timestamptz, now());
    ELSE
      ts := now();
    END IF;
    INSERT INTO public.stage_history (deal_id, from_stage, to_stage, transitioned_at)
    VALUES (NEW.id, OLD.stage, NEW.stage, ts);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_stage_history_insert
AFTER INSERT ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.record_stage_history();

CREATE TRIGGER trg_record_stage_history_update
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.record_stage_history();

-- Backfill: every existing deal entered as a Lead at lead_date/created_at
INSERT INTO public.stage_history (deal_id, from_stage, to_stage, transitioned_at)
SELECT d.id, NULL, 'Lead'::deal_stage, COALESCE(d.lead_date::timestamptz, d.created_at)
FROM public.deals d;

-- Backfill: current stage entry for deals beyond Lead
INSERT INTO public.stage_history (deal_id, from_stage, to_stage, transitioned_at)
SELECT d.id, 'Lead'::deal_stage, d.stage,
  CASE
    WHEN d.stage = 'Closed Won' THEN COALESCE(d.won_date::timestamptz, d.updated_at)
    WHEN d.stage = 'Closed Lost' THEN COALESCE(d.lost_date::timestamptz, d.updated_at)
    ELSE d.updated_at
  END
FROM public.deals d
WHERE d.stage <> 'Lead';
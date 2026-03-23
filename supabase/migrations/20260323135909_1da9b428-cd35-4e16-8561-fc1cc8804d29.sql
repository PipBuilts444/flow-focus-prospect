
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS problem_challenge text DEFAULT '',
  ADD COLUMN IF NOT EXISTS urgency_why_now text DEFAULT '',
  ADD COLUMN IF NOT EXISTS key_stakeholder text DEFAULT '',
  ADD COLUMN IF NOT EXISTS refined_problem text DEFAULT '',
  ADD COLUMN IF NOT EXISTS scope_hypothesis text DEFAULT '',
  ADD COLUMN IF NOT EXISTS likely_service_area text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_considerations text DEFAULT '',
  ADD COLUMN IF NOT EXISTS procurement_status text DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS commit_confidence text DEFAULT '',
  ADD COLUMN IF NOT EXISTS likely_start_month text DEFAULT '',
  ADD COLUMN IF NOT EXISTS final_commercial_assumptions text DEFAULT '',
  ADD COLUMN IF NOT EXISTS lost_notes text DEFAULT '';

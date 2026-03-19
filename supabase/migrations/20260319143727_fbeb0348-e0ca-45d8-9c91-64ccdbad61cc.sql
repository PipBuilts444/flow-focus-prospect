
-- Activity type enum
CREATE TYPE public.activity_type AS ENUM ('Meeting', 'Call', 'Email', 'Note');

-- Activity status enum
CREATE TYPE public.activity_status AS ENUM ('Scheduled', 'Completed', 'Cancelled');

-- Meeting type enum
CREATE TYPE public.meeting_type AS ENUM ('Intro', 'Qualification', 'Discovery', 'Proposal Review', 'Commercial', 'Internal');

-- Activities table
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type public.activity_type NOT NULL DEFAULT 'Meeting',
  title text NOT NULL,
  description text DEFAULT '',
  activity_date timestamp with time zone NOT NULL DEFAULT now(),
  owner text DEFAULT '',
  outcome text DEFAULT '',
  next_step text DEFAULT '',
  next_step_date date,
  status public.activity_status NOT NULL DEFAULT 'Scheduled',
  meeting_type public.meeting_type,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Public RLS policies (matching existing pattern)
CREATE POLICY "Anyone can read activities" ON public.activities FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert activities" ON public.activities FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update activities" ON public.activities FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete activities" ON public.activities FOR DELETE TO public USING (true);

-- Updated_at trigger
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

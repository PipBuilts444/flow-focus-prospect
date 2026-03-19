
-- Create enum types
CREATE TYPE public.deal_stage AS ENUM (
  'Lead', 'Qualified', 'Discovery', 'Proposal',
  'Commercials / Procurement', 'Verbal Commit', 'Closed Won', 'Closed Lost'
);

CREATE TYPE public.forecast_category AS ENUM (
  'Pipeline', 'Best Case', 'Commit', 'Closed Won', 'Closed Lost'
);

CREATE TYPE public.deal_type AS ENUM (
  'Discovery', 'PoC', 'MVP', 'Implementation', 'Retainer', 'Managed Service'
);

CREATE TYPE public.deal_status AS ENUM ('open', 'closed_won', 'closed_lost');

CREATE TYPE public.revenue_profile AS ENUM ('equal_spread', 'custom');

CREATE TYPE public.company_status AS ENUM ('active', 'inactive', 'prospect');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  website TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  account_owner TEXT DEFAULT '',
  status public.company_status NOT NULL DEFAULT 'prospect',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update companies" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete companies" ON public.companies FOR DELETE USING (true);

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role_or_title TEXT DEFAULT '',
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete contacts" ON public.contacts FOR DELETE USING (true);

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contacts_company ON public.contacts(company_id);

-- Deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner TEXT DEFAULT '',
  stage public.deal_stage NOT NULL DEFAULT 'Lead',
  forecast_category public.forecast_category NOT NULL DEFAULT 'Pipeline',
  deal_type public.deal_type NOT NULL DEFAULT 'Discovery',
  value NUMERIC NOT NULL DEFAULT 0,
  confidence_percent INT NOT NULL DEFAULT 10,
  weighted_value NUMERIC GENERATED ALWAYS AS (value * confidence_percent / 100) STORED,
  expected_close_date DATE,
  expected_start_date DATE,
  delivery_duration_months INT NOT NULL DEFAULT 1,
  revenue_profile_type public.revenue_profile NOT NULL DEFAULT 'equal_spread',
  next_action TEXT DEFAULT '',
  next_action_date DATE,
  blocker_or_risk TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  source TEXT DEFAULT '',
  original_close_date DATE,
  latest_close_date DATE,
  slip_count INT NOT NULL DEFAULT 0,
  status public.deal_status NOT NULL DEFAULT 'open',
  lost_reason TEXT DEFAULT '',
  won_date DATE,
  lost_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read deals" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert deals" ON public.deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update deals" ON public.deals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete deals" ON public.deals FOR DELETE USING (true);

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_deals_company ON public.deals(company_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_deals_forecast ON public.deals(forecast_category);
CREATE INDEX idx_deals_start ON public.deals(expected_start_date);
CREATE INDEX idx_deals_status ON public.deals(status);

-- Deal revenue schedule table
CREATE TABLE public.deal_revenue_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  revenue_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_revenue_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read schedules" ON public.deal_revenue_schedule FOR SELECT USING (true);
CREATE POLICY "Anyone can insert schedules" ON public.deal_revenue_schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update schedules" ON public.deal_revenue_schedule FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete schedules" ON public.deal_revenue_schedule FOR DELETE USING (true);

CREATE INDEX idx_revenue_deal ON public.deal_revenue_schedule(deal_id);
CREATE INDEX idx_revenue_month ON public.deal_revenue_schedule(month);

-- Trigger for slippage tracking on deals
CREATE OR REPLACE FUNCTION public.track_deal_slippage()
RETURNS TRIGGER AS $$
BEGIN
  -- Set original_close_date on first set
  IF OLD.original_close_date IS NULL AND NEW.expected_close_date IS NOT NULL THEN
    NEW.original_close_date = NEW.expected_close_date;
  END IF;
  
  -- Track slippage
  IF OLD.expected_close_date IS NOT NULL AND NEW.expected_close_date IS NOT NULL 
     AND NEW.expected_close_date > OLD.expected_close_date THEN
    NEW.slip_count = OLD.slip_count + 1;
  END IF;
  
  -- Always update latest
  IF NEW.expected_close_date IS NOT NULL THEN
    NEW.latest_close_date = NEW.expected_close_date;
  END IF;
  
  -- Status transitions
  IF NEW.stage = 'Closed Won' AND OLD.stage != 'Closed Won' THEN
    NEW.status = 'closed_won';
    NEW.won_date = CURRENT_DATE;
    NEW.confidence_percent = 100;
    NEW.forecast_category = 'Closed Won';
  END IF;
  
  IF NEW.stage = 'Closed Lost' AND OLD.stage != 'Closed Lost' THEN
    NEW.status = 'closed_lost';
    NEW.lost_date = CURRENT_DATE;
    NEW.confidence_percent = 0;
    NEW.forecast_category = 'Closed Lost';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER deal_slippage_tracker
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.track_deal_slippage();

-- Trigger to set original_close_date on insert
CREATE OR REPLACE FUNCTION public.set_deal_defaults_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expected_close_date IS NOT NULL AND NEW.original_close_date IS NULL THEN
    NEW.original_close_date = NEW.expected_close_date;
    NEW.latest_close_date = NEW.expected_close_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER deal_defaults_on_insert
BEFORE INSERT ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.set_deal_defaults_on_insert();

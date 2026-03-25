
-- Create deal_owners table for split ownership
CREATE TABLE public.deal_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  ownership_percent numeric NOT NULL DEFAULT 100 CHECK (ownership_percent > 0 AND ownership_percent <= 100),
  role text NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'shared')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_owners ENABLE ROW LEVEL SECURITY;

-- RLS policies (match existing pattern)
CREATE POLICY "Anyone can read deal_owners" ON public.deal_owners FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert deal_owners" ON public.deal_owners FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update deal_owners" ON public.deal_owners FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete deal_owners" ON public.deal_owners FOR DELETE TO public USING (true);

-- Index for fast lookups
CREATE INDEX idx_deal_owners_deal_id ON public.deal_owners(deal_id);
CREATE INDEX idx_deal_owners_user_name ON public.deal_owners(user_name);

-- Migrate existing owner data into deal_owners
INSERT INTO public.deal_owners (deal_id, user_name, ownership_percent, role)
SELECT id, owner, 100, 'primary'
FROM public.deals
WHERE owner IS NOT NULL AND owner != '' AND NOT is_deleted;

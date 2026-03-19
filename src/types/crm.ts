import { Tables, Enums } from '@/integrations/supabase/types';

export type Company = Tables<'companies'>;
export type Contact = Tables<'contacts'>;
export type Deal = Tables<'deals'>;
export type DealRevenueSchedule = Tables<'deal_revenue_schedule'>;

export type DealStage = Enums<'deal_stage'>;
export type ForecastCategory = Enums<'forecast_category'>;
export type DealType = Enums<'deal_type'>;
export type DealStatus = Enums<'deal_status'>;
export type RevenueProfileType = Enums<'revenue_profile'>;
export type CompanyStatus = Enums<'company_status'>;

export type HealthStatus = 'green' | 'amber' | 'red';

export const STAGE_CONFIDENCE: Record<DealStage, number> = {
  'Lead': 10,
  'Qualified': 25,
  'Discovery': 40,
  'Proposal': 60,
  'Commercials / Procurement': 75,
  'Verbal Commit': 90,
  'Closed Won': 100,
  'Closed Lost': 0,
};

export const DEAL_STAGES: DealStage[] = [
  'Lead', 'Qualified', 'Discovery', 'Proposal',
  'Commercials / Procurement', 'Verbal Commit', 'Closed Won', 'Closed Lost',
];

export const FORECAST_CATEGORIES: ForecastCategory[] = [
  'Pipeline', 'Best Case', 'Commit', 'Closed Won', 'Closed Lost',
];

export const DEAL_TYPES: DealType[] = [
  'Discovery', 'PoC', 'MVP', 'Implementation', 'Retainer', 'Managed Service',
];

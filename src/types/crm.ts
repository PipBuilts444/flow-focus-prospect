export type DealStage =
  | 'Lead'
  | 'Qualified'
  | 'Discovery'
  | 'Proposal'
  | 'Commercials / Procurement'
  | 'Verbal Commit'
  | 'Closed Won'
  | 'Closed Lost';

export type ForecastCategory = 'Pipeline' | 'Best Case' | 'Commit' | 'Closed Won' | 'Closed Lost';

export type DealType = 'Discovery' | 'PoC' | 'MVP' | 'Implementation' | 'Retainer' | 'Managed Service';

export type DealStatus = 'open' | 'closed_won' | 'closed_lost';

export type RevenueProfileType = 'equal_spread' | 'custom';

export type HealthStatus = 'green' | 'amber' | 'red';

export interface Company {
  id: string;
  company_name: string;
  industry: string;
  website: string;
  notes: string;
  account_owner: string;
  status: 'active' | 'inactive' | 'prospect';
  created_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  role_or_title: string;
  company_id: string;
  notes: string;
  created_at: string;
}

export interface Deal {
  id: string;
  deal_name: string;
  company_id: string;
  primary_contact_id: string;
  owner: string;
  stage: DealStage;
  forecast_category: ForecastCategory;
  deal_type: DealType;
  value: number;
  confidence_percent: number;
  weighted_value: number;
  expected_close_date: string;
  expected_start_date: string;
  delivery_duration_months: number;
  revenue_profile_type: RevenueProfileType;
  monthly_revenue?: number[];
  next_action: string;
  next_action_date: string;
  blocker_or_risk: string;
  notes: string;
  source: string;
  original_close_date: string;
  latest_close_date: string;
  slip_count: number;
  status: DealStatus;
  lost_reason: string;
  won_date: string;
  lost_date: string;
  created_at: string;
  updated_at: string;
}

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
  'Lead',
  'Qualified',
  'Discovery',
  'Proposal',
  'Commercials / Procurement',
  'Verbal Commit',
  'Closed Won',
  'Closed Lost',
];

export const FORECAST_CATEGORIES: ForecastCategory[] = [
  'Pipeline',
  'Best Case',
  'Commit',
  'Closed Won',
  'Closed Lost',
];

export const DEAL_TYPES: DealType[] = [
  'Discovery',
  'PoC',
  'MVP',
  'Implementation',
  'Retainer',
  'Managed Service',
];

export const STAGE_COLORS: Record<DealStage, string> = {
  'Lead': 'bg-stage-lead',
  'Qualified': 'bg-stage-qualified',
  'Discovery': 'bg-stage-discovery',
  'Proposal': 'bg-stage-proposal',
  'Commercials / Procurement': 'bg-stage-commercials',
  'Verbal Commit': 'bg-stage-verbal',
  'Closed Won': 'bg-stage-won',
  'Closed Lost': 'bg-stage-lost',
};

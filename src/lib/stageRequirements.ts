import type { DealStage } from '@/types/crm';

export interface StageField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'currency';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export const STAGE_FIELDS: Record<DealStage, StageField[]> = {
  'Lead': [
    { key: 'deal_name', label: 'Deal Name', type: 'text', required: true, placeholder: 'Enter deal name' },
    { key: 'lead_date', label: 'Lead Date', type: 'date', required: false, placeholder: '' },
    { key: 'owner', label: 'Owner', type: 'select', required: true, options: ['Pippa Bradley-Dixon', 'Craig Davies', 'Adam Solomons', 'Henry Hickley'] },
    { key: 'deal_originator', label: 'Deal Originator', type: 'select', required: false, options: ['Pippa Bradley-Dixon', 'Craig Davies', 'Adam Solomons', 'Henry Hickley'] },
    { key: 'source', label: 'Source', type: 'text', required: true, placeholder: 'Referral, Inbound, Event…' },
  ],
  'Qualified': [
    { key: 'problem_challenge', label: 'Problem / Challenge', type: 'textarea', required: true, placeholder: 'What problem is the client facing?' },
    { key: 'urgency_why_now', label: 'Urgency / Why Now', type: 'textarea', required: true, placeholder: 'Why is this important now?' },
    { key: 'key_stakeholder', label: 'Key Stakeholder', type: 'text', required: true, placeholder: 'Decision maker or sponsor' },
    { key: 'next_action', label: 'Next Action', type: 'text', required: true, placeholder: 'e.g. Schedule discovery call' },
    { key: 'next_action_date', label: 'Next Action Date', type: 'date', required: true },
  ],
  'Discovery': [
    { key: 'refined_problem', label: 'Refined Problem Statement', type: 'textarea', required: true, placeholder: 'Refined understanding of the problem' },
    { key: 'scope_hypothesis', label: 'Scope Hypothesis', type: 'textarea', required: true, placeholder: 'Initial view of what the engagement could look like' },
    { key: 'deal_type', label: 'Deal Type', type: 'select', required: true, options: ['Discovery', 'PoC', 'MVP', 'Implementation', 'Retainer', 'Managed Service'] },
    { key: 'likely_service_area', label: 'Likely Service Area', type: 'text', required: true, placeholder: 'e.g. Data, Engineering, Strategy' },
    { key: 'delivery_considerations', label: 'Delivery Considerations', type: 'textarea', placeholder: 'Timeline, resource, or technical considerations' },
    { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any additional context…' },
  ],
  'Proposal': [
    { key: 'value', label: 'Proposal Value', type: 'currency', required: true, placeholder: '0' },
    { key: 'expected_close_date', label: 'Expected Close Date', type: 'date', required: true },
    { key: 'expected_start_date', label: 'Expected Start Date', type: 'date', required: true },
    { key: 'delivery_duration_months', label: 'Delivery Duration (months)', type: 'number', required: true, placeholder: '1' },
    { key: 'forecast_category', label: 'Forecast Category', type: 'select', required: true, options: ['Pipeline', 'Best Case', 'Commit'] },
  ],
  'Commercials / Procurement': [
    { key: 'procurement_status', label: 'Procurement Status', type: 'text', required: true, placeholder: 'e.g. PO raised, Legal review' },
    { key: 'blocker_or_risk', label: 'Blocker / Risk', type: 'textarea', required: true, placeholder: 'What could stop this deal?' },
    { key: 'commercial_notes', label: 'Commercial Notes', type: 'textarea', placeholder: 'Rate card, terms, special conditions' },
    { key: 'confidence_percent', label: 'Confidence (%)', type: 'number', required: true, placeholder: '75' },
  ],
  'Verbal Commit': [
    { key: 'commit_confidence', label: 'Commit Confidence', type: 'text', required: true, placeholder: 'e.g. Strong verbal, awaiting sign-off' },
    { key: 'likely_start_month', label: 'Likely Start Month', type: 'text', required: true, placeholder: 'e.g. March 2026' },
    { key: 'final_commercial_assumptions', label: 'Final Commercial Assumptions', type: 'textarea', required: true, placeholder: 'Agreed rate, scope, and terms' },
  ],
  'Closed Won': [
    { key: 'won_date', label: 'Won Date', type: 'date', required: true },
    { key: 'value', label: 'Final Value', type: 'currency', required: true },
    { key: 'expected_start_date', label: 'Delivery Start Date', type: 'date', required: true },
  ],
  'Closed Lost': [
    { key: 'lost_reason', label: 'Lost Reason', type: 'text', required: true, placeholder: 'Why was this deal lost?' },
    { key: 'lost_notes', label: 'Lost Notes', type: 'textarea', placeholder: 'Additional context on the loss' },
  ],
};

// Get all fields required up to and including a target stage
const STAGE_ORDER: DealStage[] = [
  'Lead', 'Qualified', 'Discovery', 'Proposal',
  'Commercials / Procurement', 'Verbal Commit', 'Closed Won', 'Closed Lost',
];

export function getRequiredFieldsForStage(targetStage: DealStage): StageField[] {
  const fields: StageField[] = [];
  for (const stage of STAGE_ORDER) {
    fields.push(...(STAGE_FIELDS[stage] || []));
    if (stage === targetStage) break;
  }
  return fields;
}

export function getMissingFieldsForStage(targetStage: DealStage, deal: Record<string, any>): { stage: DealStage; fields: StageField[] }[] {
  const missing: { stage: DealStage; fields: StageField[] }[] = [];

  // For Closed Lost, only check Closed Lost fields (not full pipeline)
  if (targetStage === 'Closed Lost') {
    const stageFields = STAGE_FIELDS['Closed Lost'];
    const missingFields = stageFields.filter(f => f.required && !hasValue(deal, f));
    if (missingFields.length > 0) missing.push({ stage: 'Closed Lost', fields: missingFields });
    return missing;
  }

  for (const stage of STAGE_ORDER) {
    if (stage === 'Closed Won' || stage === 'Closed Lost') {
      if (stage === targetStage) {
        const stageFields = STAGE_FIELDS[stage];
        const missingFields = stageFields.filter(f => f.required && !hasValue(deal, f));
        if (missingFields.length > 0) missing.push({ stage, fields: missingFields });
      }
      continue;
    }
    const stageFields = STAGE_FIELDS[stage];
    const missingFields = stageFields.filter(f => f.required && !hasValue(deal, f));
    if (missingFields.length > 0) missing.push({ stage, fields: missingFields });
    if (stage === targetStage) break;
  }
  return missing;
}

function hasValue(deal: Record<string, any>, field: StageField): boolean {
  const val = deal[field.key];
  if (val === null || val === undefined || val === '') return false;
  if (field.type === 'number' || field.type === 'currency') return val !== 0 && val !== '0';
  return true;
}

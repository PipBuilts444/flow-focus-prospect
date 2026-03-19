export type ActivityType = 'Meeting' | 'Call' | 'Email' | 'Note';
export type ActivityStatus = 'Scheduled' | 'Completed' | 'Cancelled';
export type MeetingType = 'Intro' | 'Qualification' | 'Discovery' | 'Proposal Review' | 'Commercial' | 'Internal';

export const ACTIVITY_TYPES: ActivityType[] = ['Meeting', 'Call', 'Email', 'Note'];
export const ACTIVITY_STATUSES: ActivityStatus[] = ['Scheduled', 'Completed', 'Cancelled'];
export const MEETING_TYPES: MeetingType[] = ['Intro', 'Qualification', 'Discovery', 'Proposal Review', 'Commercial', 'Internal'];

export interface Activity {
  id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  activity_date: string;
  owner: string | null;
  outcome: string | null;
  next_step: string | null;
  next_step_date: string | null;
  status: ActivityStatus;
  meeting_type: MeetingType | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
}

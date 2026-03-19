import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { ACTIVITY_TYPES, ACTIVITY_STATUSES, MEETING_TYPES } from '@/types/activity';
import type { ActivityType, ActivityStatus, MeetingType } from '@/types/activity';

const NewActivityPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companies, contacts, deals } = useCrm();
  const [submitting, setSubmitting] = useState(false);

  // Prefill from query params
  const prefillContactId = searchParams.get('contact_id') || '';
  const prefillCompanyId = searchParams.get('company_id') || '';
  const prefillDealId = searchParams.get('deal_id') || '';

  const [activityType, setActivityType] = useState<ActivityType>('Meeting');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 16));
  const [owner, setOwner] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextStepDate, setNextStepDate] = useState('');
  const [status, setStatus] = useState<ActivityStatus>('Scheduled');
  const [meetingType, setMeetingType] = useState<MeetingType | ''>('');
  const [contactId, setContactId] = useState(prefillContactId);
  const [companyId, setCompanyId] = useState(prefillCompanyId);
  const [dealId, setDealId] = useState(prefillDealId);

  // Auto-resolve company from contact or deal prefill
  useMemo(() => {
    if (prefillContactId && !prefillCompanyId) {
      const c = contacts.find(c => c.id === prefillContactId);
      if (c?.company_id) setCompanyId(c.company_id);
    }
    if (prefillDealId && !prefillCompanyId) {
      const d = deals.find(d => d.id === prefillDealId);
      if (d?.company_id) setCompanyId(d.company_id);
      if (d?.primary_contact_id && !prefillContactId) setContactId(d.primary_contact_id);
    }
  }, [prefillContactId, prefillCompanyId, prefillDealId, contacts, deals]);

  const filteredContacts = useMemo(() => {
    if (companyId) return contacts.filter(c => c.company_id === companyId);
    return contacts;
  }, [contacts, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('activities').insert({
        activity_type: activityType,
        title: title.trim(),
        description: description.trim() || null,
        activity_date: activityDate,
        owner: owner.trim() || null,
        outcome: outcome.trim() || null,
        next_step: nextStep.trim() || null,
        next_step_date: nextStepDate || null,
        status,
        meeting_type: meetingType || null,
        contact_id: contactId || null,
        company_id: companyId || null,
        deal_id: dealId || null,
      } as any);

      if (error) throw error;
      toast.success('Activity logged');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium text-foreground mb-1";
  const selectClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <CalendarPlus size={22} className="text-primary" />
        Log Activity
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type & Status */}
        <section className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Activity Type</label>
              <select value={activityType} onChange={e => setActivityType(e.target.value as ActivityType)} className={selectClass}>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ActivityStatus)} className={selectClass}>
                {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {activityType === 'Meeting' && (
              <div>
                <label className={labelClass}>Meeting Type</label>
                <select value={meetingType} onChange={e => setMeetingType(e.target.value as MeetingType)} className={selectClass}>
                  <option value="">— Select —</option>
                  {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Discovery call with CTO" className={inputClass} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date & Time</label>
              <input type="datetime-local" value={activityDate} onChange={e => setActivityDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Owner</label>
              <select value={owner} onChange={e => setOwner(e.target.value)} className={selectClass}>
                <option value="">Select owner…</option>
                <option value="Pippa Bradley-Dixon">Pippa Bradley-Dixon</option>
                <option value="Craig Davies">Craig Davies</option>
                <option value="Adam Solomons">Adam Solomons</option>
              </select>
            </div>
          </div>
        </section>

        {/* Linked Records */}
        <section className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-card-foreground">Link to Records</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Company</label>
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={selectClass}>
                <option value="">— None —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Contact</label>
              <select value={contactId} onChange={e => setContactId(e.target.value)} className={selectClass}>
                <option value="">— None —</option>
                {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.full_name || `${c.first_name} ${c.last_name}`}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Deal</label>
              <select value={dealId} onChange={e => setDealId(e.target.value)} className={selectClass}>
                <option value="">— None —</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.deal_name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Notes & Outcome */}
        <section className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div>
            <label className={labelClass}>Description / Notes</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Meeting notes, context…" className={inputClass + ' resize-none'} />
          </div>
          <div>
            <label className={labelClass}>Outcome</label>
            <input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="What was decided or agreed?" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Next Step</label>
              <input value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="Follow-up action" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Next Step Date</label>
              <input type="date" value={nextStepDate} onChange={e => setNextStepDate(e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting ? 'Saving…' : 'Log Activity'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-md border border-input bg-card text-card-foreground font-medium text-sm hover:bg-accent transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewActivityPage;

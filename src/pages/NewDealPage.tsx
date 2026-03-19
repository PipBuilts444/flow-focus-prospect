import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { DEAL_STAGES, FORECAST_CATEGORIES, DEAL_TYPES, STAGE_CONFIDENCE } from '@/types/crm';
import type { DealStage, ForecastCategory, DealType } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Building2, User, Briefcase, ChevronDown } from 'lucide-react';

const OPEN_STAGES = DEAL_STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost');

const NewDealPage = () => {
  const navigate = useNavigate();
  const { companies, contacts, refresh } = useCrm();
  const [submitting, setSubmitting] = useState(false);

  // Deal fields
  const [dealName, setDealName] = useState('');
  const [stage, setStage] = useState<DealStage>('Lead');
  const [forecastCategory, setForecastCategory] = useState<ForecastCategory>('Pipeline');
  const [dealType, setDealType] = useState<DealType>('Discovery');
  const [value, setValue] = useState('');
  const [confidenceOverride, setConfidenceOverride] = useState<string>('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [deliveryMonths, setDeliveryMonths] = useState('1');
  const [owner, setOwner] = useState('');
  const [source, setSource] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [notes, setNotes] = useState('');

  // Company - pick existing or create new
  const [companyMode, setCompanyMode] = useState<'existing' | 'new'>('new');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyIndustry, setNewCompanyIndustry] = useState('');

  // Contact - pick existing or create new
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('new');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [newContactFirst, setNewContactFirst] = useState('');
  const [newContactLast, setNewContactLast] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('');

  const confidence = confidenceOverride !== '' ? parseInt(confidenceOverride) : STAGE_CONFIDENCE[stage];
  const numericValue = parseFloat(value) || 0;
  const weightedValue = numericValue * (confidence / 100);

  // Filter contacts by selected company
  const filteredContacts = useMemo(() => {
    if (companyMode === 'existing' && selectedCompanyId) {
      return contacts.filter(c => c.company_id === selectedCompanyId);
    }
    return contacts;
  }, [contacts, companyMode, selectedCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealName.trim()) { toast.error('Deal name is required'); return; }

    setSubmitting(true);
    try {
      // 1. Resolve or create company
      let companyId: string | null = null;
      if (companyMode === 'existing' && selectedCompanyId) {
        companyId = selectedCompanyId;
      } else if (companyMode === 'new' && newCompanyName.trim()) {
        // Check if company already exists (case-insensitive)
        const existing = companies.find(c => c.company_name.toLowerCase() === newCompanyName.trim().toLowerCase());
        if (existing) {
          companyId = existing.id;
        } else {
          const { data } = await supabase.from('companies').insert({
            company_name: newCompanyName.trim(),
            industry: newCompanyIndustry.trim() || null,
          }).select().single();
          if (data) companyId = data.id;
        }
      }

      // 2. Resolve or create contact
      let contactId: string | null = null;
      if (contactMode === 'existing' && selectedContactId) {
        contactId = selectedContactId;
      } else if (contactMode === 'new' && newContactFirst.trim()) {
        const { data } = await supabase.from('contacts').insert({
          first_name: newContactFirst.trim(),
          last_name: newContactLast.trim(),
          full_name: `${newContactFirst.trim()} ${newContactLast.trim()}`.trim(),
          email: newContactEmail.trim() || null,
          role_or_title: newContactRole.trim() || null,
          company_id: companyId,
        }).select().single();
        if (data) contactId = data.id;
      }

      // 3. Create the deal
      const { data: deal, error } = await supabase.from('deals').insert({
        deal_name: dealName.trim(),
        company_id: companyId,
        primary_contact_id: contactId,
        stage,
        forecast_category: forecastCategory,
        deal_type: dealType,
        value: numericValue,
        confidence_percent: confidence,
        expected_close_date: expectedCloseDate || null,
        expected_start_date: expectedStartDate || null,
        delivery_duration_months: parseInt(deliveryMonths) || 1,
        owner: owner.trim() || null,
        source: source.trim() || null,
        next_action: nextAction.trim() || null,
        next_action_date: nextActionDate || null,
        notes: notes.trim() || null,
      }).select().single();

      if (error) throw error;

      // 4. Generate revenue schedule if we have start date and value
      if (deal && expectedStartDate && numericValue > 0) {
        const months = parseInt(deliveryMonths) || 1;
        const monthlyAmount = numericValue / months;
        const scheduleRows = [];
        const start = new Date(expectedStartDate + '-01');
        for (let i = 0; i < months; i++) {
          const d = new Date(start);
          d.setMonth(d.getMonth() + i);
          scheduleRows.push({
            deal_id: deal.id,
            month: d.toISOString().slice(0, 10),
            revenue_amount: Math.round(monthlyAmount * 100) / 100,
          });
        }
        await supabase.from('deal_revenue_schedule').insert(scheduleRows);
      }

      await refresh();
      toast.success('Deal created successfully');
      navigate(`/deals/${deal?.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create deal');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium text-foreground mb-1";
  const selectClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/deals')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Deals
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-6">Create New Deal</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Section */}
        <section className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Building2 size={18} className="text-primary" />
            Company
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="radio" checked={companyMode === 'new'} onChange={() => setCompanyMode('new')} className="accent-primary" />
              Create new
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="radio" checked={companyMode === 'existing'} onChange={() => setCompanyMode('existing')} className="accent-primary" />
              Select existing
            </label>
          </div>
          {companyMode === 'new' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Company Name</label>
                <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Enter company name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Industry</label>
                <input value={newCompanyIndustry} onChange={e => setNewCompanyIndustry(e.target.value)} placeholder="e.g. Technology, Finance" className={inputClass} />
              </div>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Select Company</label>
              <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} className={selectClass}>
                <option value="">— Choose company —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          )}
        </section>

        {/* Contact Section */}
        <section className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <User size={18} className="text-primary" />
            Primary Contact
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="radio" checked={contactMode === 'new'} onChange={() => setContactMode('new')} className="accent-primary" />
              Create new
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="radio" checked={contactMode === 'existing'} onChange={() => setContactMode('existing')} className="accent-primary" />
              Select existing
            </label>
          </div>
          {contactMode === 'new' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name</label>
                <input value={newContactFirst} onChange={e => setNewContactFirst(e.target.value)} placeholder="First name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input value={newContactLast} onChange={e => setNewContactLast(e.target.value)} placeholder="Smith" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="jane@acme.com" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Role / Title</label>
                <input value={newContactRole} onChange={e => setNewContactRole(e.target.value)} placeholder="CTO" className={inputClass} />
              </div>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Select Contact</label>
              <select value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)} className={selectClass}>
                <option value="">— Choose contact —</option>
                {filteredContacts.map(c => <option key={c.id} value={c.id}>{c.full_name || `${c.first_name} ${c.last_name}`}</option>)}
              </select>
            </div>
          )}
        </section>

        {/* Deal Details */}
        <section className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Briefcase size={18} className="text-primary" />
            Deal Details
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Deal Name *</label>
              <input required value={dealName} onChange={e => setDealName(e.target.value)} placeholder="Platform Modernisation" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Stage</label>
              <select value={stage} onChange={e => { setStage(e.target.value as DealStage); setConfidenceOverride(''); }} className={selectClass}>
                {OPEN_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Forecast Category</label>
              <select value={forecastCategory} onChange={e => setForecastCategory(e.target.value as ForecastCategory)} className={selectClass}>
                {FORECAST_CATEGORIES.filter(c => c !== 'Closed Won' && c !== 'Closed Lost').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Deal Type</label>
              <select value={dealType} onChange={e => setDealType(e.target.value as DealType)} className={selectClass}>
                {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Owner</label>
              <select value={owner} onChange={e => setOwner(e.target.value)} className={inputClass}>
                <option value="">Select owner…</option>
                <option value="Pippa Bradley-Dixon">Pippa Bradley-Dixon</option>
                <option value="Craig Davies">Craig Davies</option>
                <option value="Adam Solomons">Adam Solomons</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Value (£)</label>
              <input type="number" min="0" step="100" value={value} onChange={e => setValue(e.target.value)} placeholder="50000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Confidence (%) — default: {STAGE_CONFIDENCE[stage]}%</label>
              <input type="number" min="0" max="100" value={confidenceOverride} onChange={e => setConfidenceOverride(e.target.value)} placeholder={String(STAGE_CONFIDENCE[stage])} className={inputClass} />
            </div>

            <div className="md:col-span-2 bg-secondary/50 rounded-md px-4 py-3 text-sm text-muted-foreground">
              Weighted value: <span className="font-semibold text-foreground">£{weightedValue.toLocaleString()}</span> ({confidence}% of £{numericValue.toLocaleString()})
            </div>

            <div>
              <label className={labelClass}>Expected Close Date</label>
              <input type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Expected Start Date</label>
              <input type="date" value={expectedStartDate} onChange={e => setExpectedStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Delivery Duration (months)</label>
              <input type="number" min="1" max="60" value={deliveryMonths} onChange={e => setDeliveryMonths(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <input value={source} onChange={e => setSource(e.target.value)} placeholder="Referral, Inbound…" className={inputClass} />
            </div>
          </div>
        </section>

        {/* Next Action & Notes */}
        <section className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Next Action</label>
              <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Send proposal" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Next Action Date</label>
              <input type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional context…" className={inputClass + ' resize-none'} />
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting ? 'Creating…' : 'Create Deal'}
          </button>
          <button type="button" onClick={() => navigate('/deals')} className="px-6 py-2.5 rounded-md border border-input bg-card text-card-foreground font-medium text-sm hover:bg-accent transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDealPage;

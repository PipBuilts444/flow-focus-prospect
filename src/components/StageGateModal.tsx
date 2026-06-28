import { useState, useEffect } from 'react';
import type { DealStage, Deal } from '@/types/crm';
import { getMissingFieldsForStage, STAGE_FIELDS, type StageField } from '@/lib/stageRequirements';
import { stripFormatting } from '@/lib/currency';

interface Props {
  open: boolean;
  deal: Deal;
  targetStage: DealStage;
  onConfirm: (updates: Record<string, any>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const StageGateModal = ({ open, deal, targetStage, onConfirm, onCancel, loading }: Props) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [initialPriorMissing, setInitialPriorMissing] = useState<{ stage: DealStage; fields: StageField[] }[]>([]);

  const missingGroups = getMissingFieldsForStage(targetStage, { ...deal, ...values });
  // Show ALL fields for the target stage (not just missing), plus missing from prior stages
  const targetFields = STAGE_FIELDS[targetStage] || [];
  const priorMissing = missingGroups.filter(g => g.stage !== targetStage);

  useEffect(() => {
    if (open) {
      const initial = getMissingFieldsForStage(targetStage, deal).filter(g => g.stage !== targetStage);
      setInitialPriorMissing(initial);
      // Pre-populate with existing deal values
      const init: Record<string, any> = {};
      const allFields = [...initial.flatMap(g => g.fields), ...targetFields];
      allFields.forEach(f => {
        const existing = (deal as any)[f.key];
        if (existing !== null && existing !== undefined && existing !== '') {
          init[f.key] = f.type === 'currency' ? String(existing) : existing;
        }
      });
      setValues(init);
    }
  }, [open]);

  if (!open) return null;

  const set = (key: string, val: any) => setValues(prev => ({ ...prev, [key]: val }));

  const allComplete = getMissingFieldsForStage(targetStage, { ...deal, ...values }).length === 0;

  const handleSubmit = () => {
    const updates: Record<string, any> = { ...values, stage: targetStage };
    // Convert currency fields back to numbers
    targetFields.concat(initialPriorMissing.flatMap(g => g.fields)).forEach(f => {
      if (f.type === 'currency' && updates[f.key] !== undefined) {
        updates[f.key] = parseFloat(stripFormatting(String(updates[f.key]))) || 0;
      }
      if (f.type === 'number' && updates[f.key] !== undefined) {
        updates[f.key] = parseFloat(updates[f.key]) || 0;
      }
    });
    onConfirm(updates);
  };

  const renderField = (field: StageField) => {
    const val = values[field.key] ?? (deal as any)[field.key] ?? '';
    const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

    if (field.type === 'select') {
      return (
        <select value={val} onChange={e => set(field.key, e.target.value)} className={inputClass + ' appearance-none'}>
          <option value="">Select…</option>
          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (field.type === 'textarea') {
      return <textarea rows={2} value={val} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder} className={inputClass + ' resize-none'} />;
    }
    if (field.type === 'currency') {
      return (
        <div className="relative">
          <span className="absolute left-3 top-2 text-sm text-muted-foreground">£</span>
          <input type="text" inputMode="numeric" value={String(val)} onChange={e => set(field.key, stripFormatting(e.target.value))} placeholder={field.placeholder} className={inputClass + ' pl-7'} />
        </div>
      );
    }
    if (field.type === 'date') {
      return <input type="date" value={val} onChange={e => set(field.key, e.target.value)} className={inputClass} />;
    }
    if (field.type === 'number') {
      return <input type="number" value={val} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder} className={inputClass} />;
    }
    return <input type="text" value={val} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder} className={inputClass} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Move to {targetStage}</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete the required fields to advance this deal.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {priorMissing.map(group => (
            <div key={group.stage}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Missing from {group.stage}</p>
              <div className="space-y-3">
                {group.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </label>
                    {renderField(f)}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{targetStage}</p>
            <div className="space-y-3">
              {targetFields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </label>
                  {renderField(f)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-input bg-card text-card-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allComplete || loading}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : `Move to ${targetStage}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StageGateModal;

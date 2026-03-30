import { useState, useEffect } from 'react';
import { OWNERS } from '@/context/UserViewContext';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

export interface OwnerEntry {
  user_name: string;
  ownership_percent: number;
  role: 'primary' | 'shared';
}

interface Props {
  value: OwnerEntry[];
  onChange: (owners: OwnerEntry[]) => void;
}

const OwnershipSplitEditor = ({ value, onChange }: Props) => {
  const totalPercent = value.reduce((s, o) => s + o.ownership_percent, 0);
  const isValid = value.length > 0 && totalPercent === 100 && value.filter(o => o.role === 'primary').length === 1;
  const usedNames = value.map(o => o.user_name);
  const availableOwners = OWNERS.filter(o => !usedNames.includes(o));

  const updateEntry = (idx: number, updates: Partial<OwnerEntry>) => {
    const next = value.map((o, i) => i === idx ? { ...o, ...updates } : o);
    // If setting someone as primary, demote others
    if (updates.role === 'primary') {
      next.forEach((o, i) => { if (i !== idx) o.role = 'shared'; });
    }
    onChange(next);
  };

  const removeEntry = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    // If we removed the primary, promote the first remaining
    if (next.length > 0 && !next.some(o => o.role === 'primary')) {
      next[0].role = 'primary';
    }
    onChange(next);
  };

  const addOwner = () => {
    if (availableOwners.length === 0) return;
    const remaining = 100 - totalPercent;
    onChange([...value, {
      user_name: availableOwners[0],
      ownership_percent: Math.max(remaining, 0),
      role: value.length === 0 ? 'primary' : 'shared',
    }]);
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const selectClass = "px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-3">
      {value.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select
            value={entry.user_name}
            onChange={e => updateEntry(idx, { user_name: e.target.value })}
            className={selectClass + ' flex-1'}
          >
            {OWNERS.map(o => (
              <option key={o} value={o} disabled={usedNames.includes(o) && o !== entry.user_name}>{o}</option>
            ))}
          </select>
          <div className="relative w-20">
            <input
              type="number"
              min={1}
              max={100}
              value={entry.ownership_percent}
              onChange={e => updateEntry(idx, { ownership_percent: parseInt(e.target.value) || 0 })}
              className={inputClass + ' pr-6 text-right'}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
          <button
            type="button"
            onClick={() => updateEntry(idx, { role: entry.role === 'primary' ? 'shared' : 'primary' })}
            className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
              entry.role === 'primary'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-input hover:border-primary/50'
            }`}
            title={entry.role === 'primary' ? 'Primary owner' : 'Click to make primary'}
          >
            {entry.role === 'primary' ? 'Primary' : 'Shared'}
          </button>
          {value.length > 1 && (
            <button type="button" onClick={() => removeEntry(idx)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {availableOwners.length > 0 && value.length < OWNERS.length && (
        <button type="button" onClick={addOwner} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          <Plus size={14} /> Add shared owner
        </button>
      )}

      {value.length > 0 && totalPercent !== 100 && (
        <div className="flex items-center gap-1.5 text-xs text-health-amber">
          <AlertTriangle size={12} />
          Total is {totalPercent}% — must equal 100%
        </div>
      )}
    </div>
  );
};

export default OwnershipSplitEditor;

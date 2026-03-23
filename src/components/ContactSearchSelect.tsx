import { useState, useRef, useEffect } from 'react';
import { useCrm } from '@/context/CrmContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X } from 'lucide-react';

interface Props {
  value: string | null;
  companyId?: string | null;
  onChange: (contactId: string | null) => void;
}

const ContactSearchSelect = ({ value, companyId, onChange }: Props) => {
  const { contacts, addContact } = useCrm();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = contacts.find(c => c.id === value);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.full_name?.toLowerCase().includes(q) || '') ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) || '')
    );
  }).slice(0, 10);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = async () => {
    if (!newFirst.trim() || !newLast.trim()) return;
    const contact = await addContact({
      first_name: newFirst.trim(),
      last_name: newLast.trim(),
      email: newEmail.trim() || null,
      company_id: companyId || null,
    });
    if (contact) {
      onChange(contact.id);
      setCreating(false);
      setOpen(false);
      setNewFirst('');
      setNewLast('');
      setNewEmail('');
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center gap-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:border-ring transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Search size={14} className="text-muted-foreground shrink-0" />
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.full_name || `${selected.first_name} ${selected.last_name}` : 'Select contact…'}
        </span>
        {selected && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-64 overflow-auto">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Search contacts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="h-8 text-xs"
            />
          </div>

          {!creating ? (
            <>
              {filtered.map(c => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                  onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                >
                  <span>{c.full_name || `${c.first_name} ${c.last_name}`}</span>
                  {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No contacts found</p>
              )}
              <button
                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent transition-colors flex items-center gap-1.5 border-t border-border"
                onClick={() => setCreating(true)}
              >
                <Plus size={14} /> Create new contact
              </button>
            </>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium text-card-foreground">New Contact</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First name" value={newFirst} onChange={e => setNewFirst(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Last name" value={newLast} onChange={e => setNewLast(e.target.value)} className="h-8 text-xs" />
              </div>
              <Input placeholder="Email (optional)" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8 text-xs" />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={!newFirst.trim() || !newLast.trim()}>
                  Create
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactSearchSelect;

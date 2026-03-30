import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatGBP } from '@/lib/currency';
import { formatInputDisplay, stripFormatting } from '@/lib/currency';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface LineItem {
  id: string;
  deal_id: string;
  name: string;
  description: string | null;
  revenue_value: number;
  estimated_delivery_cost: number;
  gross_margin_value: number | null;
  gross_margin_percent: number | null;
  item_type: string | null;
  start_date: string | null;
  end_date: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

const ITEM_TYPES = ['initial_scope', 'extension', 'phase', 'change_request'] as const;
const ITEM_TYPE_LABELS: Record<string, string> = {
  initial_scope: 'Initial Scope',
  extension: 'Extension',
  phase: 'Phase',
  change_request: 'Change Request',
};

interface Props {
  dealId: string;
  onTotalsChange?: (totals: { revenue: number; cost: number }) => void;
}

const emptyForm = { name: '', revenue: '', cost: '', item_type: 'initial_scope', start_date: '', end_date: '' };

export default function DealLineItems({ dealId, onTotalsChange }: Props) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('deal_line_items')
      .select('*')
      .eq('deal_id', dealId)
      .eq('is_deleted', false)
      .order('created_at');
    if (data) setItems(data as unknown as LineItem[]);
    setLoading(false);
  }, [dealId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (items.length > 0 && onTotalsChange) {
      const revenue = items.reduce((s, i) => s + Number(i.revenue_value), 0);
      const cost = items.reduce((s, i) => s + Number(i.estimated_delivery_cost), 0);
      onTotalsChange({ revenue, cost });
    }
  }, [items, onTotalsChange]);

  const totals = {
    revenue: items.reduce((s, i) => s + Number(i.revenue_value), 0),
    cost: items.reduce((s, i) => s + Number(i.estimated_delivery_cost), 0),
    margin: items.reduce((s, i) => s + Number(i.gross_margin_value ?? 0), 0),
  };
  const marginPct = totals.revenue > 0 ? Math.round((totals.margin / totals.revenue) * 100) : 0;

  const startEdit = (item: LineItem) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      revenue: String(item.revenue_value),
      cost: String(item.estimated_delivery_cost),
      item_type: item.item_type || 'initial_scope',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
    });
    setAdding(false);
  };

  const startAdd = () => {
    setAdding(true);
    setEditId(null);
    setForm({ ...emptyForm, item_type: items.length === 0 ? 'initial_scope' : 'extension' });
  };

  const cancel = () => { setAdding(false); setEditId(null); setForm(emptyForm); };

  const validate = (): boolean => {
    if (!form.name.trim()) { toast.error('Name is required'); return false; }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error('End date cannot be before start date');
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    const revenue_value = Number(stripFormatting(form.revenue)) || 0;
    const estimated_delivery_cost = Number(stripFormatting(form.cost)) || 0;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        revenue_value,
        estimated_delivery_cost,
        item_type: form.item_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editId) {
        const { error } = await supabase.from('deal_line_items').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('Line item updated');
      } else {
        const { error } = await supabase.from('deal_line_items').insert({ ...payload, deal_id: dealId });
        if (error) throw error;
        toast.success('Line item added');
      }
      cancel();
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('deal_line_items').update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      toast.success('Line item removed');
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const marginColor = (val: number | null) =>
    val == null ? '' : val >= 20 ? 'text-health-green' : val >= 0 ? 'text-health-amber' : 'text-health-red';

  if (loading) return null;

  const FormRow = ({ isNew }: { isNew: boolean }) => (
    <TableRow>
      <TableCell><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isNew ? 'e.g. Phase 2, Extension' : ''} className="h-8" /></TableCell>
      <TableCell>
        <Select value={form.item_type} onValueChange={v => setForm(f => ({ ...f, item_type: v }))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell><Input value={formatInputDisplay(form.revenue)} onChange={e => setForm(f => ({ ...f, revenue: stripFormatting(e.target.value) }))} className="h-8 text-right" /></TableCell>
      <TableCell><Input value={formatInputDisplay(form.cost)} onChange={e => setForm(f => ({ ...f, cost: stripFormatting(e.target.value) }))} className="h-8 text-right" /></TableCell>
      <TableCell />
      <TableCell />
      <TableCell>
        <div className="flex gap-1">
          <button onClick={save} disabled={saving} className="p-1 text-health-green hover:bg-secondary rounded"><Check size={14} /></button>
          <button onClick={cancel} className="p-1 text-muted-foreground hover:bg-secondary rounded"><X size={14} /></button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-card-foreground">Deal Breakdown</h2>
        {!adding && !editId && (
          <Button variant="outline" size="sm" onClick={startAdd} className="gap-1">
            <Plus size={14} /> Add Phase
          </Button>
        )}
      </div>

      {items.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No phases or extensions added yet. Add one to break down the deal commercially.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phase</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Margin £</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item =>
              editId === item.id ? (
                <FormRow key={item.id} isNew={false} />
              ) : (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-card-foreground">{item.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ITEM_TYPE_LABELS[item.item_type || ''] || item.item_type}</TableCell>
                  <TableCell className="text-right">{formatGBP(item.revenue_value)}</TableCell>
                  <TableCell className="text-right">{formatGBP(item.estimated_delivery_cost)}</TableCell>
                  <TableCell className={`text-right ${marginColor(item.gross_margin_percent)}`}>{formatGBP(item.gross_margin_value ?? 0)}</TableCell>
                  <TableCell className={`text-right ${marginColor(item.gross_margin_percent)}`}>{item.gross_margin_percent != null ? `${Math.round(item.gross_margin_percent)}%` : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(item)} className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary rounded"><Pencil size={14} /></button>
                      <button onClick={() => softDelete(item.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary rounded"><Trash2 size={14} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}
            {adding && <FormRow isNew />}
          </TableBody>
          {items.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold" colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-semibold">{formatGBP(totals.revenue)}</TableCell>
                <TableCell className="text-right font-semibold">{formatGBP(totals.cost)}</TableCell>
                <TableCell className={`text-right font-semibold ${marginColor(marginPct)}`}>{formatGBP(totals.margin)}</TableCell>
                <TableCell className={`text-right font-semibold ${marginColor(marginPct)}`}>{marginPct}%</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </div>
  );
}

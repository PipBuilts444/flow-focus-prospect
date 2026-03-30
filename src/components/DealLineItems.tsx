import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatGBP } from '@/lib/currency';
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
  billing_month: string | null;
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

interface FormData {
  name: string;
  revenue: string;
  cost: string;
  item_type: string;
  start_date: string;
  end_date: string;
}

const emptyForm: FormData = { name: '', revenue: '', cost: '', item_type: 'initial_scope', start_date: '', end_date: '' };

// Extracted as a stable component to prevent remounting on parent state changes
const LineItemFormRow = memo(function LineItemFormRow({
  initialData,
  onSave,
  onCancel,
  saving,
}: {
  initialData: FormData;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [local, setLocal] = useState<FormData>(initialData);

  return (
    <TableRow>
      <TableCell>
        <Input
          value={local.name}
          onChange={e => setLocal(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Phase 2, Extension"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Select value={local.item_type} onValueChange={v => setLocal(prev => ({ ...prev, item_type: v }))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={local.revenue}
          onChange={e => setLocal(prev => ({ ...prev, revenue: e.target.value.replace(/[^0-9.]/g, '') }))}
          className="h-8 text-right"
          placeholder="0"
        />
      </TableCell>
      <TableCell>
        <Input
          value={local.cost}
          onChange={e => setLocal(prev => ({ ...prev, cost: e.target.value.replace(/[^0-9.]/g, '') }))}
          className="h-8 text-right"
          placeholder="0"
        />
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell>
        <div className="flex gap-1">
          <button onClick={() => onSave(local)} disabled={saving} className="p-1 text-health-green hover:bg-secondary rounded"><Check size={14} /></button>
          <button onClick={onCancel} className="p-1 text-muted-foreground hover:bg-secondary rounded"><X size={14} /></button>
        </div>
      </TableCell>
    </TableRow>
  );
});

const LineItemDisplayRow = memo(function LineItemDisplayRow({
  item,
  onEdit,
  onDelete,
  marginColor,
}: {
  item: LineItem;
  onEdit: () => void;
  onDelete: () => void;
  marginColor: string;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium text-card-foreground">{item.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{ITEM_TYPE_LABELS[item.item_type || ''] || item.item_type}</TableCell>
      <TableCell className="text-right">{formatGBP(item.revenue_value)}</TableCell>
      <TableCell className="text-right">{formatGBP(item.estimated_delivery_cost)}</TableCell>
      <TableCell className={`text-right ${marginColor}`}>{formatGBP(item.gross_margin_value ?? 0)}</TableCell>
      <TableCell className={`text-right ${marginColor}`}>{item.gross_margin_percent != null ? `${Math.round(item.gross_margin_percent)}%` : '—'}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary rounded"><Pencil size={14} /></button>
          <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary rounded"><Trash2 size={14} /></button>
        </div>
      </TableCell>
    </TableRow>
  );
});

interface Props {
  dealId: string;
  dealValue?: number;
  dealCost?: number;
  onTotalsChange?: (totals: { revenue: number; cost: number }) => void;
}

export default function DealLineItems({ dealId, dealValue = 0, dealCost = 0, onTotalsChange }: Props) {
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [defaultType, setDefaultType] = useState('initial_scope');

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

  const startEdit = useCallback((item: LineItem) => {
    setEditId(item.id);
    setAdding(false);
  }, []);

  const startAdd = useCallback(() => {
    setAdding(true);
    setEditId(null);
    setDefaultType(items.length === 0 ? 'initial_scope' : 'extension');
  }, [items.length]);

  const cancel = useCallback(() => {
    setAdding(false);
    setEditId(null);
  }, []);

  const handleSave = useCallback(async (form: FormData) => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error('End date cannot be before start date');
      return;
    }
    const revenue_value = Number(form.revenue) || 0;
    const estimated_delivery_cost = Number(form.cost) || 0;
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
        // If this is the first line item and the deal already has a value, backfill an "Initial Scope" item first
        if (items.length === 0 && (dealValue > 0 || dealCost > 0)) {
          const { error: backfillError } = await supabase.from('deal_line_items').insert({
            deal_id: dealId,
            name: 'Initial Scope',
            revenue_value: dealValue,
            estimated_delivery_cost: dealCost,
            item_type: 'initial_scope',
          });
          if (backfillError) throw backfillError;
        }
        const { error } = await supabase.from('deal_line_items').insert({ ...payload, deal_id: dealId });
        if (error) throw error;
        toast.success('Line item added');
      }
      cancel();
      await fetchItems();
      onTotalsChange?.({ revenue: 0, cost: 0 }); // signal parent to refresh deal data
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [editId, dealId, dealValue, dealCost, items.length, cancel, fetchItems]);

  const softDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('deal_line_items').update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      toast.success('Line item removed');
      await fetchItems();
      onTotalsChange?.({ revenue: 0, cost: 0 }); // signal parent to refresh deal data
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  }, [fetchItems]);

  const getMarginColor = (val: number | null) =>
    val == null ? '' : val >= 20 ? 'text-health-green' : val >= 0 ? 'text-health-amber' : 'text-health-red';

  if (loading) return null;

  const getEditInitialData = (item: LineItem): FormData => ({
    name: item.name,
    revenue: String(item.revenue_value),
    cost: String(item.estimated_delivery_cost),
    item_type: item.item_type || 'initial_scope',
    start_date: item.start_date || '',
    end_date: item.end_date || '',
  });

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
                <LineItemFormRow
                  key={`edit-${item.id}`}
                  initialData={getEditInitialData(item)}
                  onSave={handleSave}
                  onCancel={cancel}
                  saving={saving}
                />
              ) : (
                <LineItemDisplayRow
                  key={item.id}
                  item={item}
                  onEdit={() => startEdit(item)}
                  onDelete={() => softDelete(item.id)}
                  marginColor={getMarginColor(item.gross_margin_percent)}
                />
              )
            )}
            {adding && (
              <LineItemFormRow
                key="new-item"
                initialData={{ ...emptyForm, item_type: defaultType }}
                onSave={handleSave}
                onCancel={cancel}
                saving={saving}
              />
            )}
          </TableBody>
          {items.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold" colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-semibold">{formatGBP(totals.revenue)}</TableCell>
                <TableCell className="text-right font-semibold">{formatGBP(totals.cost)}</TableCell>
                <TableCell className={`text-right font-semibold ${getMarginColor(marginPct)}`}>{formatGBP(totals.margin)}</TableCell>
                <TableCell className={`text-right font-semibold ${getMarginColor(marginPct)}`}>{marginPct}%</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </div>
  );
}

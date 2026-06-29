import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useUserView } from '@/context/UserViewContext';
import { useMemo, useState, useEffect } from 'react';
import { format, addMonths, startOfMonth, isSameMonth, isBefore } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatGBP, formatGBPCompact } from '@/lib/currency';
import { safeParseDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ForecastPage = () => {
  const { deals, getCompany, loading } = useFilteredCrm();
  const { selectedView } = useUserView();
  const navigate = useNavigate();
  const [showCommit, setShowCommit] = useState(true);
  const [showBestCase, setShowBestCase] = useState(true);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showActuals, setShowActuals] = useState(false);
  const [lineItems, setLineItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('deal_line_items').select('*').eq('is_deleted', false).then(({ data, error }) => {
      if (error) console.error('Failed to fetch line items:', error);
      if (data) setLineItems(data);
    });
  }, [deals]);

  const now = useMemo(() => startOfMonth(new Date()), []);

  const months = useMemo(() => {
    const result: Date[] = [];
    for (let i = -12; i < 12; i++) result.push(addMonths(now, i));
    return result;
  }, [now]);

  // Build a map of deal_id -> line items for quick lookup
  const dealLineItemsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    lineItems.forEach(li => {
      const arr = map.get(li.deal_id) || [];
      arr.push(li);
      map.set(li.deal_id, arr);
    });
    return map;
  }, [lineItems]);

  const chartData = useMemo(() => {
    return months.map(month => {
      const label = format(month, 'MMM yy');
      const isPast = isBefore(month, now);
      let actuals = 0, pipeline = 0, bestCase = 0, commit = 0;

      deals.forEach(deal => {
        if (deal.status === 'closed_lost' || deal.forecast_category === 'Closed Lost') return;
        const fraction = deal.splitFraction;

        if (deal.status === 'closed_won') {
          const items = dealLineItemsMap.get(deal.id);
          if (items && items.length > 0) {
            // Use per-line-item billing_month; fall back to deal won_date
            items.forEach(li => {
              const billingDate = safeParseDate(li.billing_month);
              const fallback = safeParseDate(deal.won_date);
              const targetMonth = billingDate ? startOfMonth(billingDate) : (fallback ? startOfMonth(fallback) : null);
              if (targetMonth && isSameMonth(targetMonth, month)) {
                actuals += Number(li.revenue_value) * fraction;
              }
            });
          } else {
            // No line items — use deal won_date as before
            const wonParsed = safeParseDate(deal.won_date);
            if (!wonParsed) return;
            if (isSameMonth(startOfMonth(wonParsed), month)) actuals += deal.value * fraction;
          }
          return;
        }

        if (deal.status !== 'open') return;

        const rawStart = safeParseDate(deal.expected_start_date) ?? safeParseDate(deal.expected_close_date);
        const startDate = rawStart ? startOfMonth(rawStart) : null;

        if (!startDate || deal.delivery_duration_months <= 0) return;

        const monthlyAmt = (deal.value * fraction) / deal.delivery_duration_months;
        for (let i = 0; i < deal.delivery_duration_months; i++) {
          if (isSameMonth(addMonths(startDate, i), month)) {
            if (deal.forecast_category === 'Commit') commit += monthlyAmt;
            else if (deal.forecast_category === 'Best Case') bestCase += monthlyAmt;
            else pipeline += monthlyAmt;
          }
        }
      });

      return {
        month: label,
        isPast,
        Actuals: Math.round(actuals),
        Pipeline: Math.round(pipeline),
        'Best Case': Math.round(bestCase),
        Commit: Math.round(commit),
      };
    });
  }, [deals, months, now, dealLineItemsMap]);

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  const openDeals = deals.filter(d => d.status === 'open');
  const closedWonDeals = deals.filter(d => d.status === 'closed_won' && d.won_date);
  const totals = {
    actuals: closedWonDeals.reduce((s, d) => s + d.splitValue, 0),
    pipeline: openDeals.filter(d => d.forecast_category === 'Pipeline').reduce((s, d) => s + d.splitValue, 0),
    bestCase: openDeals.filter(d => d.forecast_category === 'Best Case').reduce((s, d) => s + d.splitValue, 0),
    commit: openDeals.filter(d => d.forecast_category === 'Commit').reduce((s, d) => s + d.splitValue, 0),
  };

  const commitDeals = openDeals.filter(d => d.forecast_category === 'Commit').sort((a, b) => b.splitValue - a.splitValue);
  const bestCaseDeals = openDeals.filter(d => d.forecast_category === 'Best Case').sort((a, b) => b.splitValue - a.splitValue);
  const pipelineDeals = openDeals.filter(d => d.forecast_category === 'Pipeline').sort((a, b) => b.splitValue - a.splitValue);
  const actualsDeals = [...closedWonDeals].sort((a, b) => b.splitValue - a.splitValue);

  const renderSection = (
    label: string,
    list: typeof openDeals,
    total: number,
    open: boolean,
    setOpen: (v: boolean) => void,
    variant: 'open' | 'actuals' = 'open',
  ) => (
    <div>
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-card-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{list.length} deals</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold">{formatGBP(total)}</span>
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {open && (
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Deal</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Owner</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">{variant === 'actuals' ? 'Won Date' : 'Expected Close'}</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Value</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Weighted Value</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-muted-foreground">No deals</td></tr>
              ) : list.map(d => {
                const company = getCompany(d.company_id || '')?.company_name || '—';
                const dateRaw = variant === 'actuals' ? d.won_date : d.expected_close_date;
                const dateParsed = safeParseDate(dateRaw);
                return (
                  <tr
                    key={d.id}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => navigate(`/deals/${d.id}`)}
                  >
                    <td className="px-4 py-2 text-card-foreground font-medium">{d.deal_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{company}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.owner || '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.stage}</td>
                    <td className="px-4 py-2 text-muted-foreground">{dateParsed ? format(dateParsed, 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-2 text-right text-card-foreground">{formatGBP(d.splitValue)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{variant === 'actuals' ? '—' : formatGBP(d.splitWeightedValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Forecast</h1>
        <p className="text-sm text-muted-foreground">{selectedView === 'COEX' ? 'All users' : selectedView} · Actuals + Pipeline forecast</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Actuals (Closed Won)</p>
          <p className="text-xl font-bold text-health-green">{formatGBP(totals.actuals)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Commit (Open)</p>
          <p className="text-xl font-bold text-card-foreground">{formatGBP(totals.commit)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Best Case (Open)</p>
          <p className="text-xl font-bold text-card-foreground">{formatGBP(totals.bestCase)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Pipeline (Open)</p>
          <p className="text-xl font-bold text-card-foreground">{formatGBP(totals.pipeline)}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatGBPCompact(v)} />
            <Tooltip formatter={(v: number) => formatGBP(v)} />
            <Legend />
            <Bar dataKey="Actuals" fill="hsl(142,71%,45%)" stackId="a" />
            <Bar dataKey="Commit" fill="hsl(38,92%,50%)" stackId="a" />
            <Bar dataKey="Best Case" fill="hsl(220,70%,60%)" stackId="a" />
            <Bar dataKey="Pipeline" fill="hsl(220,14%,80%)" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Month</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actuals</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Commit</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Best Case</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pipeline</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map(row => {
              const total = row.Actuals + row.Commit + row['Best Case'] + row.Pipeline;
              if (total === 0) return null;
              return (
                <tr key={row.month} className={`border-b border-border last:border-0 ${row.isPast ? 'bg-secondary/20' : ''}`}>
                  <td className="px-4 py-2.5 text-card-foreground font-medium">
                    {row.month}
                    {row.isPast && <span className="ml-1.5 text-[10px] text-muted-foreground">(actual)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-health-green font-medium">{row.Actuals > 0 ? formatGBP(row.Actuals) : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{row.Commit > 0 ? formatGBP(row.Commit) : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{row['Best Case'] > 0 ? formatGBP(row['Best Case']) : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{row.Pipeline > 0 ? formatGBP(row.Pipeline) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-card-foreground">{formatGBP(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ForecastPage;

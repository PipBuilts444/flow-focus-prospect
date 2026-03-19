import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useUserView } from '@/context/UserViewContext';
import { useMemo } from 'react';
import { format, addMonths, startOfMonth, isSameMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ForecastPage = () => {
  const { deals, loading } = useFilteredCrm();
  const { selectedView } = useUserView();

  const months = useMemo(() => {
    const result: Date[] = [];
    const start = startOfMonth(new Date());
    for (let i = 0; i < 12; i++) result.push(addMonths(start, i));
    return result;
  }, []);

  const chartData = useMemo(() => {
    return months.map(month => {
      const label = format(month, 'MMM yy');
      let pipeline = 0, bestCase = 0, commit = 0, closedWon = 0;

      deals.forEach(deal => {
        if (!deal.expected_start_date || deal.delivery_duration_months <= 0) return;
        const startDate = new Date(deal.expected_start_date);
        const monthlyAmt = deal.value / deal.delivery_duration_months;

        for (let i = 0; i < deal.delivery_duration_months; i++) {
          const m = addMonths(startDate, i);
          if (isSameMonth(m, month)) {
            if (deal.forecast_category === 'Closed Won') closedWon += monthlyAmt;
            else if (deal.forecast_category === 'Commit') commit += monthlyAmt;
            else if (deal.forecast_category === 'Best Case') bestCase += monthlyAmt;
            else if (deal.forecast_category === 'Pipeline') pipeline += monthlyAmt;
          }
        }
      });

      return { month: label, Pipeline: Math.round(pipeline), 'Best Case': Math.round(bestCase), Commit: Math.round(commit), 'Closed Won': Math.round(closedWon) };
    });
  }, [deals, months]);

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading…</p></div>;

  const filteredDeals = ownerFilter === 'all' ? deals : deals.filter(d => d.owner === ownerFilter);
  const openDeals = filteredDeals.filter(d => d.status === 'open');
  const totals = {
    pipeline: openDeals.filter(d => d.forecast_category === 'Pipeline').reduce((s, d) => s + d.value, 0),
    bestCase: openDeals.filter(d => d.forecast_category === 'Best Case').reduce((s, d) => s + d.value, 0),
    commit: openDeals.filter(d => d.forecast_category === 'Commit').reduce((s, d) => s + d.value, 0),
    closedWon: filteredDeals.filter(d => d.status === 'closed_won').reduce((s, d) => s + d.value, 0),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forecast</h1>
          <p className="text-sm text-muted-foreground">Monthly revenue forecast by category</p>
        </div>
        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="text-sm rounded-md border border-input bg-card text-card-foreground px-3 py-2">
          <option value="all">All Owners</option>
          {owners.map(o => <option key={o} value={o!}>{o}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Pipeline</p>
          <p className="text-xl font-bold text-card-foreground">£{totals.pipeline.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Best Case</p>
          <p className="text-xl font-bold text-card-foreground">£{totals.bestCase.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Commit</p>
          <p className="text-xl font-bold text-card-foreground">£{totals.commit.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Closed Won</p>
          <p className="text-xl font-bold text-card-foreground">£{totals.closedWon.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `£${v.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="Pipeline" fill="hsl(220,14%,80%)" stackId="a" />
            <Bar dataKey="Best Case" fill="hsl(220,70%,60%)" stackId="a" />
            <Bar dataKey="Commit" fill="hsl(38,92%,50%)" stackId="a" />
            <Bar dataKey="Closed Won" fill="hsl(142,71%,45%)" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Month</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pipeline</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Best Case</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Commit</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Closed Won</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map(row => (
              <tr key={row.month} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-card-foreground font-medium">{row.month}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">£{row.Pipeline.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">£{row['Best Case'].toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">£{row.Commit.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">£{row['Closed Won'].toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-medium text-card-foreground">£{(row.Pipeline + row['Best Case'] + row.Commit + row['Closed Won']).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ForecastPage;

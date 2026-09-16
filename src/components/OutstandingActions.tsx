import { useMemo, useState } from 'react';
import { format, isBefore, isAfter, startOfWeek, endOfWeek, differenceInDays, subDays } from 'date-fns';
import { AlertTriangle, Clock, PhoneCall, ArrowRight, Check, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCrm } from '@/context/CrmContext';
import { toast } from 'sonner';
import { useFilteredCrm } from '@/hooks/useFilteredCrm';
import { useUserView } from '@/context/UserViewContext';
import { useAllActivities } from '@/hooks/useActivities';
import { Badge } from '@/components/ui/badge';
import type { Deal } from '@/types/crm';
import type { Activity } from '@/types/activity';

interface ActionItem {
  type: 'overdue' | 'due_this_week' | 'follow_up_required';
  deal: Deal;
  companyName: string;
  lastActivityDate: Date | null;
  daysOverdue?: number;
  daysSinceActivity?: number;
  nextAction?: string | null;
  nextActionDate?: string | null;
  triggerActivity?: Activity;
}

const OutstandingActions = () => {
  const { deals, getCompany } = useFilteredCrm();
  const { selectedView } = useUserView();
  const { activities } = useAllActivities();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const fourteenDaysAgo = subDays(now, 14);

  const filteredActivities = useMemo(() => {
    if (selectedView === 'COEX') return activities;
    return activities.filter(a => a.owner === selectedView);
  }, [activities, selectedView]);

  const openDeals = useMemo(() => deals.filter(d => d.status === 'open'), [deals]);

  // Build activity map: deal_id -> sorted activities
  const dealActivitiesMap = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filteredActivities.forEach(a => {
      if (a.deal_id) {
        const list = map.get(a.deal_id) || [];
        list.push(a);
        map.set(a.deal_id, list);
      }
    });
    // Sort each list by date desc
    map.forEach((list) => list.sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()));
    return map;
  }, [filteredActivities]);

  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    openDeals.forEach(deal => {
      const company = getCompany(deal.company_id || '');
      const companyName = company?.company_name || '—';
      const dealActivities = dealActivitiesMap.get(deal.id) || [];
      const lastActivity = dealActivities[0] || null;
      const lastActivityDate = lastActivity ? new Date(lastActivity.activity_date) : null;

      // 1. Overdue actions
      if (deal.next_action_date && isBefore(new Date(deal.next_action_date), now)) {
        const daysOverdue = differenceInDays(now, new Date(deal.next_action_date));
        items.push({
          type: 'overdue',
          deal,
          companyName,
          lastActivityDate,
          daysOverdue,
          nextAction: deal.next_action,
          nextActionDate: deal.next_action_date,
        });
      }
      // 2. Due this week (not overdue)
      else if (deal.next_action_date) {
        const actionDate = new Date(deal.next_action_date);
        if (isAfter(actionDate, weekStart) && isBefore(actionDate, weekEnd)) {
          items.push({
            type: 'due_this_week',
            deal,
            companyName,
            lastActivityDate,
            nextAction: deal.next_action,
            nextActionDate: deal.next_action_date,
          });
        }
      }

      // 3. Follow-up required: meetings/calls older than 14 days with no subsequent activity
      const meetingsAndCalls = dealActivities.filter(a =>
        (a.activity_type === 'Meeting' || a.activity_type === 'Call') &&
        a.status !== 'Cancelled'
      );

      meetingsAndCalls.forEach(mc => {
        const mcDate = new Date(mc.activity_date);
        if (!isBefore(mcDate, fourteenDaysAgo)) return; // Not old enough

        // Check if there's any activity AFTER this meeting/call
        const hasFollowUp = dealActivities.some(a =>
          a.id !== mc.id && new Date(a.activity_date) > mcDate
        );

        if (!hasFollowUp) {
          // Don't duplicate if already flagged as overdue
          if (!items.some(i => i.deal.id === deal.id && i.type === 'follow_up_required')) {
            items.push({
              type: 'follow_up_required',
              deal,
              companyName,
              lastActivityDate: mcDate,
              daysSinceActivity: differenceInDays(now, mcDate),
              triggerActivity: mc,
            });
          }
        }
      });
    });

    // Sort: overdue first (most overdue at top), then due this week, then follow-ups
    const priority = { overdue: 0, due_this_week: 1, follow_up_required: 2 };
    items.sort((a, b) => {
      if (priority[a.type] !== priority[b.type]) return priority[a.type] - priority[b.type];
      if (a.type === 'overdue') return (b.daysOverdue || 0) - (a.daysOverdue || 0);
      return (b.daysSinceActivity || 0) - (a.daysSinceActivity || 0);
    });

    return items;
  }, [openDeals, dealActivitiesMap, getCompany, now, weekStart, weekEnd, fourteenDaysAgo]);

  const overdueItems = actionItems.filter(i => i.type === 'overdue');
  const dueThisWeekItems = actionItems.filter(i => i.type === 'due_this_week');
  const followUpItems = actionItems.filter(i => i.type === 'follow_up_required');

  if (actionItems.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-primary" />
          Outstanding Actions
        </h2>
        <p className="text-sm text-muted-foreground">No outstanding actions — you're all caught up 🎉</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-5">
      <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
        <AlertTriangle size={16} className="text-primary" />
        Outstanding Actions
        <Badge variant="secondary" className="ml-auto">{actionItems.length}</Badge>
      </h2>

      {overdueItems.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-health-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Overdue ({overdueItems.length})
          </h3>
          <div className="space-y-1.5">
            {overdueItems.map(item => (
              <ActionRow key={`overdue-${item.deal.id}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {dueThisWeekItems.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-health-amber uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={12} /> Due This Week ({dueThisWeekItems.length})
          </h3>
          <div className="space-y-1.5">
            {dueThisWeekItems.map(item => (
              <ActionRow key={`due-${item.deal.id}`} item={item} />
            ))}
          </div>
        </div>
      )}

      {followUpItems.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-health-amber uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <PhoneCall size={12} /> Follow-up Required ({followUpItems.length})
          </h3>
          <div className="space-y-1.5">
            {followUpItems.map(item => (
              <ActionRow key={`followup-${item.deal.id}-${item.triggerActivity?.id}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

type RowForm = 'done' | 'snooze' | null;

const ActionRow = ({ item }: { item: ActionItem }) => {
  const { updateDeal } = useCrm();
  const [form, setForm] = useState<RowForm>(null);
  const [newAction, setNewAction] = useState('');
  const [newDate, setNewDate] = useState('');
  const [busy, setBusy] = useState(false);

  const closeForm = () => {
    setForm(null);
    setNewAction('');
    setNewDate('');
  };

  const handleJustClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      await updateDeal(item.deal.id, { next_action: null, next_action_date: null });
      toast.success('Action marked done');
      closeForm();
    } catch {
      // updateDeal already surfaced the error via toast
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAndClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newAction.trim()) {
      toast.error('Enter the next action, or use "Just clear"');
      return;
    }
    setBusy(true);
    try {
      await updateDeal(item.deal.id, {
        next_action: newAction.trim(),
        next_action_date: newDate || null,
      });
      toast.success('Action updated');
      closeForm();
    } catch {
      // updateDeal already surfaced the error via toast
    } finally {
      setBusy(false);
    }
  };

  const handleSnooze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newDate) {
      toast.error('Pick a new due date');
      return;
    }
    setBusy(true);
    try {
      await updateDeal(item.deal.id, { next_action_date: newDate });
      toast.success('Action snoozed');
      closeForm();
    } catch {
      // updateDeal already surfaced the error via toast
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewAction('');
    setNewDate('');
    setForm(form === 'done' ? null : 'done');
  };

  const toggleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewAction('');
    setNewDate(item.deal.next_action_date ? item.deal.next_action_date.slice(0, 10) : '');
    setForm(form === 'snooze' ? null : 'snooze');
  };

  return (
    <div className="group p-2.5 rounded-md hover:bg-accent transition-colors text-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/deals/${item.deal.id}`}
              className="font-medium text-card-foreground truncate hover:underline"
            >
              {item.deal.deal_name}
            </Link>
            <Link
              to={`/deals/${item.deal.id}`}
              className="text-muted-foreground text-xs hidden sm:inline hover:underline"
            >
              · {item.companyName}
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {item.deal.owner && (
              <span className="text-xs text-muted-foreground">{item.deal.owner}</span>
            )}
            {item.nextAction && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                → {item.nextAction}
              </span>
            )}
            {item.type === 'follow_up_required' && item.triggerActivity && (
              <span className="text-xs text-muted-foreground">
                {item.triggerActivity.activity_type}: "{item.triggerActivity.title}"
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {item.type === 'overdue' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {item.daysOverdue}d overdue
            </Badge>
          )}
          {item.type === 'due_this_week' && item.nextActionDate && (
            <span className="text-xs text-health-amber font-medium">
              {format(new Date(item.nextActionDate), 'EEE dd MMM')}
            </span>
          )}
          {item.type === 'follow_up_required' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-health-amber text-health-amber">
              {item.daysSinceActivity}d no follow-up
            </Badge>
          )}
          <button
            type="button"
            title="Mark done"
            disabled={busy}
            onClick={toggleDone}
            className="p-1.5 rounded-md hover:bg-health-green/10 text-health-green opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            title="Snooze"
            disabled={busy}
            onClick={toggleSnooze}
            className="p-1.5 rounded-md hover:bg-health-amber/10 text-health-amber opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
          >
            <CalendarClock size={14} />
          </button>
          <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {form === 'done' && (
        <div className="mt-2.5 pt-2.5 border-t border-border space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder="Next action (optional)"
              className="flex-1 min-w-0 text-xs rounded-md border border-input bg-background px-2.5 py-1.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="text-xs rounded-md border border-input bg-background px-2.5 py-1.5 text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleSaveAndClear}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Save &amp; clear
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleJustClear}
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-50"
            >
              Just clear
            </button>
          </div>
        </div>
      )}

      {form === 'snooze' && (
        <div className="mt-2.5 pt-2.5 border-t border-border flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-xs rounded-md border border-input bg-background px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleSnooze}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-health-amber text-white hover:opacity-90 transition-opacity disabled:opacity-50 self-start"
          >
            Snooze to this date
          </button>
        </div>
      )}
    </div>
  );
};

export default OutstandingActions;

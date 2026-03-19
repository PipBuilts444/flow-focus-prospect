import { useActivities } from '@/hooks/useActivities';
import { format } from 'date-fns';
import { Phone, Mail, StickyNote, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Activity } from '@/types/activity';

const typeIcon: Record<string, any> = {
  Meeting: Users,
  Call: Phone,
  Email: Mail,
  Note: StickyNote,
};

const statusStyle: Record<string, { icon: any; cls: string }> = {
  Scheduled: { icon: Clock, cls: 'text-primary' },
  Completed: { icon: CheckCircle2, cls: 'text-health-green' },
  Cancelled: { icon: XCircle, cls: 'text-muted-foreground' },
};

const ActivityItem = ({ activity }: { activity: Activity }) => {
  const Icon = typeIcon[activity.activity_type] || StickyNote;
  const st = statusStyle[activity.status] || statusStyle.Scheduled;
  const StatusIcon = st.icon;

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-card-foreground">{activity.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{activity.activity_type}</span>
              {activity.meeting_type && (
                <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">{activity.meeting_type}</span>
              )}
              <StatusIcon size={12} className={st.cls} />
              <span className={`text-xs ${st.cls}`}>{activity.status}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(activity.activity_date), 'dd MMM yyyy')}
          </span>
        </div>
        {activity.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
        )}
        {activity.outcome && (
          <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Outcome:</span> {activity.outcome}</p>
        )}
        {activity.next_step && (
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">Next:</span> {activity.next_step}
            {activity.next_step_date && ` (${activity.next_step_date})`}
          </p>
        )}
        {activity.owner && (
          <p className="text-xs text-muted-foreground mt-0.5">{activity.owner}</p>
        )}
      </div>
    </div>
  );
};

interface ActivityTimelineProps {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  onLogActivity?: () => void;
}

const ActivityTimeline = ({ contactId, companyId, dealId, onLogActivity }: ActivityTimelineProps) => {
  const { activities, loading } = useActivities({ contactId, companyId, dealId });

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-card-foreground">Activity Timeline</h2>
        {onLogActivity && (
          <button
            onClick={onLogActivity}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            + Log Activity
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activities yet</p>
      ) : (
        <div>{activities.map(a => <ActivityItem key={a.id} activity={a} />)}</div>
      )}
    </div>
  );
};

export default ActivityTimeline;

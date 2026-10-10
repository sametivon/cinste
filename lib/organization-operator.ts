export type OperatorOpportunity = {
  id: string;
  status: string;
  mode: string;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
};

export type OperatorParticipation = { id: string; opportunity_id: string; student_id: string; status: string; attendance_status?: string; joined_at: string | null };

export function participationAction(participation: OperatorParticipation, opportunity: OperatorOpportunity, now = new Date()) {
  if (participation.status === 'overdue' || participation.status === 'disputed') return 'admin_review' as const;
  if (participation.status !== 'joined') return 'history' as const;
  if (opportunity.mode === 'scheduled') return opportunity.ends_at && new Date(opportunity.ends_at) <= now ? 'resolve_scheduled' as const : 'waiting_for_scheduled_end' as const;
  return opportunity.due_at && new Date(opportunity.due_at) > now ? 'verify_flexible' as const : 'history' as const;
}

export function isOperatorAction(action: ReturnType<typeof participationAction>) {
  return action === 'resolve_scheduled' || action === 'verify_flexible';
}

export function groupOpportunities(opportunities: OperatorOpportunity[], now = new Date()) {
  return { drafts: opportunities.filter((item) => item.status === 'draft'), current: opportunities.filter((item) => item.status === 'published' && (!item.due_at || new Date(item.due_at) > now)), past: opportunities.filter((item) => item.status === 'published' && item.due_at && new Date(item.due_at) <= now), cancelled: opportunities.filter((item) => item.status === 'cancelled') };
}

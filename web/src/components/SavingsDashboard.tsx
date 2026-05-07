import { PoundSterling, Wrench, TrendingUp } from 'lucide-react';
import { DiagnosisSession, TradeType } from '../types';

const TRADE_LABEL: Record<TradeType, string> = {
  plumber: 'plumbing', electrician: 'electrical', joiner: 'joinery',
  builder: 'building', roofer: 'roofing', general: 'handyman',
};

interface Props {
  sessions: DiagnosisSession[];
}

export default function SavingsDashboard({ sessions }: Props) {
  const completed = sessions.filter(s => s.completionStatus === 'completed_diy');
  const attempted = sessions.filter(s => s.status === 'ready_for_repair' || s.status === 'planning_complete');
  const totalSavings = completed.reduce((acc, s) => acc + (s.estimatedSavings ?? 0), 0);
  const thisYear = new Date().getFullYear();
  const yearSavings = completed
    .filter(s => new Date(s.completedAt ?? s.updatedAt).getFullYear() === thisYear)
    .reduce((acc, s) => acc + (s.estimatedSavings ?? 0), 0);

  const tradeCounts: Partial<Record<TradeType, number>> = {};
  for (const s of completed) {
    if (s.tradeType) tradeCounts[s.tradeType] = (tradeCounts[s.tradeType] ?? 0) + 1;
  }
  const topTrade = (Object.entries(tradeCounts) as [TradeType, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const topJob = completed.reduce<DiagnosisSession | null>((best, s) =>
    (!best || (s.estimatedSavings ?? 0) > (best.estimatedSavings ?? 0)) ? s : best, null);

  if (attempted.length === 0) return null;

  return (
    <div className="card savings-dashboard">
      <div className="card-header">
        <PoundSterling size={20} color="#FF6B35" />
        <span className="card-title">Your DIY savings</span>
      </div>

      {yearSavings > 0 && (
        <p className="savings-headline">
          You've saved an estimated <strong>£{yearSavings}</strong> this year by fixing{' '}
          {completed.length} job{completed.length !== 1 ? 's' : ''} yourself.
        </p>
      )}

      <div className="savings-stats-row">
        <div className="savings-stat">
          <span className="savings-stat-value">{attempted.length}</span>
          <span className="savings-stat-label">Jobs attempted</span>
        </div>
        <div className="savings-stat">
          <span className="savings-stat-value">{completed.length}</span>
          <span className="savings-stat-label">Fixed yourself</span>
        </div>
        <div className="savings-stat highlight">
          <span className="savings-stat-value">£{totalSavings}</span>
          <span className="savings-stat-label">Total saved</span>
        </div>
      </div>

      {topTrade && (
        <div className="savings-detail">
          <Wrench size={13} color="#888" />
          <span>Most common: <strong>{TRADE_LABEL[topTrade]}</strong></span>
        </div>
      )}

      {topJob && (topJob.estimatedSavings ?? 0) > 0 && (
        <div className="savings-detail">
          <TrendingUp size={13} color="#888" />
          <span>Biggest saving: <strong>£{topJob.estimatedSavings}</strong> — {topJob.title}</span>
        </div>
      )}

      <p className="savings-caveat">
        Estimated savings are based on typical UK trade callout and labour costs and may vary.
      </p>
    </div>
  );
}

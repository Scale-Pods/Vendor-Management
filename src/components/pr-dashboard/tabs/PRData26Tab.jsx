import { useMemo } from 'react';
import { useTabData } from '../hooks/usePRData';
import InlineCell from '../components/InlineCell';
import StatusBadge from '../components/StatusBadge';
import { CardSkeleton } from '../components/Skeleton';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';

const PCT_COLORS = [
  'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]',
  'bg-[rgba(59,130,246,0.1)] text-[#3B82F6] border-[rgba(59,130,246,0.2)]',
  'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]',
  'bg-[rgba(139,92,246,0.1)] text-[#8B5CF6] border-[rgba(139,92,246,0.2)]',
];

const PRData26Tab = ({ pr, onSave }) => {
  const { data, isPending, isFetching, isError, refetch } = useTabData('prData26', pr);

  const rows = useMemo(() => {
    const raw = Array.isArray(data) ? data.flat(Infinity) : [];
    return raw.filter(Boolean);
  }, [data]);

  if (isPending || isFetching) return <CardSkeleton />;

  if (isError) return (
    <div className="text-center py-16">
      <p className="text-[#EF4444] font-bold text-sm">Failed to load PR Data 26</p>
      <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold">Retry</button>
    </div>
  );

  if (rows.length === 0) return <p className="text-[rgba(255,255,255,0.3)] text-sm py-8 text-center">No PR Data 26 available.</p>;

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] px-2 pb-2 border-b border-[rgba(255,255,255,0.06)]">PR Phase Tracking — {rows.length} entries</div>
      {rows.map((row, idx) => {
        const initialPct = parseFloat(row.initial_pr_percentage_amount || row.initial_pr_percentage || 0);
        const secondPct = parseFloat(row.second_time_pr_percentage_amount || row.second_time_pr_percentage || 0);
        const pctDiff = initialPct > 0 ? ((secondPct - initialPct) / initialPct) * 100 : 0;
        return (
          <div key={row.id || idx} className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-3 hover:border-[rgba(245,158,11,0.15)] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={row.status || row.Status || 'Pending'} />
                  <span className="text-[11px] font-bold text-white truncate">{row.remark || row.Remark || `Entry #${idx + 1}`}</span>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${pctDiff > 0 ? 'text-[#EF4444] border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)]' : pctDiff < 0 ? 'text-[#10B981] border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)]' : 'text-[rgba(255,255,255,0.3)] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]'}`}>
                {pctDiff > 0 ? <IconArrowUpRight size={14} /> : pctDiff < 0 ? <IconArrowDownRight size={14} /> : null}
                {Math.abs(pctDiff).toFixed(1)}%
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.1)] rounded-xl p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Initial PR</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PCT_COLORS[0]}`}>{initialPct.toFixed(2)}%</span>
                  <span className="text-[11px] text-[rgba(255,255,255,0.5)]">Amount: {row.initial_pr || row.initial_pr_amount || '0'}</span>
                </div>
                <InlineCell value={row.initial_pr || ''} row={row} column="initial_pr" onSave={onSave} />
              </div>
              <div className="bg-[rgba(59,130,246,0.04)] border border-[rgba(59,130,246,0.1)] rounded-xl p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Second PR</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PCT_COLORS[1]}`}>{secondPct.toFixed(2)}%</span>
                  <span className="text-[11px] text-[rgba(255,255,255,0.5)]">Amount: {row.second_time_pr || row.second_time_pr_amount || '0'}</span>
                </div>
                <InlineCell value={row.second_time_pr || ''} row={row} column="second_time_pr" onSave={onSave} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PRData26Tab;

import { useMemo } from 'react';
import { useTabData } from '../hooks/usePRData';
import InlineCell from '../components/InlineCell';
import { CardSkeleton } from '../components/Skeleton';
import { IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react';

const ChargeDiff = ({ prevCharge, currCharge }) => {
  const prev = parseFloat(String(prevCharge).replace(/,/g, '')) || 0;
  const cur = parseFloat(String(currCharge).replace(/,/g, '')) || 0;
  const diff = cur - prev;
  const pct = prev > 0 ? (diff / prev) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[rgba(255,255,255,0.5)] line-through text-[12px]">{prev.toFixed(2)}</span>
      <span className="text-white font-bold text-[14px]">{cur.toFixed(2)}</span>
      {diff !== 0 ? (
        <span className={`flex items-center gap-0.5 text-[11px] font-bold ${diff > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
          {diff > 0 ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
          {Math.abs(pct).toFixed(1)}%
        </span>
      ) : <IconMinus size={14} className="text-[rgba(255,255,255,0.3)]" />}
    </div>
  );
};

const PRData25Tab = ({ pr, onSave }) => {
  const { data, isPending, isFetching, isError, refetch } = useTabData('prData25', pr);

  const rows = useMemo(() => {
    const raw = Array.isArray(data) ? data.flat(Infinity) : [];
    return raw.filter(Boolean);
  }, [data]);

  if (isPending || isFetching) return <CardSkeleton />;

  if (isError) return (
    <div className="text-center py-16">
      <p className="text-[#EF4444] font-bold text-sm">Failed to load PR Data 25</p>
      <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold">Retry</button>
    </div>
  );

  if (rows.length === 0) return <p className="text-[rgba(255,255,255,0.3)] text-sm py-8 text-center">No PR Data 25 available.</p>;

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] px-2 pb-2 border-b border-[rgba(255,255,255,0.06)]">Charge Comparison — {rows.length} entries</div>
      {rows.map((row, idx) => (
        <div key={row.id || idx} className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-3 hover:border-[rgba(245,158,11,0.15)] transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-white block truncate">{row.Remark || row.remark || `Entry #${idx + 1}`}</span>
              <span className="text-[10px] text-[rgba(255,255,255,0.3)]">Sr.No: {row['Sr.No'] || row.sr_no || row.Sr_No || idx + 1}</span>
            </div>
            <ChargeDiff prevCharge={row['Previous Charges'] || row.previous_charges || 0} currCharge={row['Current Charges'] || row.current_charges || 0} />
          </div>
          <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <InlineCell value={row.Remark || row.remark || ''} row={row} column="Remark" onSave={onSave} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PRData25Tab;

import { useMemo, useState, useCallback } from 'react';
import { useTabData } from '../hooks/usePRData';
import InlineCell from '../components/InlineCell';
import { TableSkeleton } from '../components/Skeleton';
import { IconChevronDown, IconChevronRight, IconPackage } from '@tabler/icons-react';

const Material26Tab = ({ pr, onSave }) => {
  const { data, isPending, isFetching, isError, refetch } = useTabData('material26', pr);

  const rows = useMemo(() => {
    const raw = Array.isArray(data) ? data.flat(Infinity) : [];
    return raw.filter(Boolean);
  }, [data]);

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = useCallback((idx) => setExpandedRows((p) => ({ ...p, [idx]: !p[idx] })), []);

  const normalizeM26Changes = (row) => {
    const changes = [];
    for (let i = 1; i <= 2; i++) {
      const c = {
        change_no: i,
        qty: row[`change${i}_qty`] || row[`change${i}_Qty`] || '',
        date: row[`change${i}_date`] || row[`change${i}_Date`] || '',
      };
      if (c.qty || c.date) changes.push(c);
    }
    return changes;
  };

  if (isPending || isFetching) return <TableSkeleton rows={8} cols={5} />;

  if (isError) return (
    <div className="text-center py-16">
      <p className="text-[#EF4444] font-bold text-sm">Failed to load Material 26</p>
      <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold">Retry</button>
    </div>
  );

  if (rows.length === 0) return <p className="text-[rgba(255,255,255,0.3)] text-sm py-8 text-center">No Material 26 data.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] px-2 pb-2 border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[#06090F] z-10">
        <IconPackage size={14} /><span>Material Items (26) — {rows.length} entries</span>
      </div>
      {rows.map((row, idx) => {
        const isExpanded = expandedRows[idx];
        const changes = normalizeM26Changes(row);
        return (
          <div key={row.id || idx}>
            <div className={`flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)] ${isExpanded ? 'bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.1)]' : 'border border-transparent'}`} onClick={() => toggleRow(idx)}>
              <span className="w-8 shrink-0 text-[rgba(255,255,255,0.3)]">{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
              <span className="w-12 shrink-0 text-[11px] text-[rgba(255,255,255,0.5)]">{row.sr_no || row.Sr_No || row['sr_no'] || idx + 1}</span>
              <span className="flex-1 min-w-[100px] text-[12px] truncate text-[rgba(255,255,255,0.8)]">{row.Description || row.description || 'N/A'}</span>
              <span className="w-16 shrink-0 text-right text-[12px] font-semibold">{row.Qty || row.qty || '0'}</span>
              <span className="w-16 shrink-0 text-right text-[12px] text-[rgba(255,255,255,0.5)]">{row['Reamin Qty'] || row.reamin_qty || row['Remain Qty'] || '0'}</span>
              <span className="w-20 shrink-0 text-[11px] text-[#F59E0B] hidden sm:block truncate">{row['Next Doc'] || row.next_doc || '—'}</span>
              {changes.length > 0 && <span className="text-[9px] text-[#F59E0B] bg-[rgba(245,158,11,0.1)] px-1.5 py-0.5 rounded font-bold">{changes.length} changes</span>}
            </div>
            {isExpanded && (
              <div className="ml-10 mb-3 p-4 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-4">
                {changes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Changes</span>
                    {changes.map((c, ci) => (
                      <div key={ci} className={`p-3 rounded-xl border ${ci === changes.length - 1 ? 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.04)]' : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${ci === changes.length - 1 ? 'bg-[#F59E0B] text-black' : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)]'}`}>
                            {ci === 0 ? 'Original' : `Change ${ci}`}
                          </span>
                          <span className="text-[10px] text-[rgba(255,255,255,0.3)]">{c.date}</span>
                        </div>
                        {c.qty && <div className="text-[12px]"><span className="text-[rgba(255,255,255,0.3)]">Qty:</span> <span className="font-bold">{c.qty}</span></div>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <div><span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.25)]">Project</span><InlineCell value={row.Project || ''} row={row} column="Project" onSave={onSave} /></div>
                  <div><span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.25)]">PR</span><InlineCell value={row.PR || ''} row={row} column="PR" onSave={onSave} /></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Material26Tab;

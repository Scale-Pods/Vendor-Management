import { useMemo, useState, useCallback } from 'react';
import { useTabData } from '../hooks/usePRData';
import InlineCell from '../components/InlineCell';
import ChangeTimeline from '../components/ChangeTimeline';
import { TableSkeleton } from '../components/Skeleton';
import { IconChevronDown, IconChevronRight, IconTags } from '@tabler/icons-react';

const MATERIAL_COLORS = [
  'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]',
  'bg-[rgba(59,130,246,0.12)] text-[#3B82F6] border-[rgba(59,130,246,0.2)]',
  'bg-[rgba(16,185,129,0.12)] text-[#10B981] border-[rgba(16,185,129,0.2)]',
  'bg-[rgba(139,92,246,0.12)] text-[#8B5CF6] border-[rgba(139,92,246,0.2)]',
];

const MergedDataTab = ({ pr, onSave }) => {
  const { data, isPending, isFetching, isError, refetch } = useTabData('mergedData', pr);

  const rows = useMemo(() => {
    const raw = Array.isArray(data) ? data.flat(Infinity) : [];
    return raw.filter(Boolean);
  }, [data]);

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = useCallback((idx) => setExpandedRows((p) => ({ ...p, [idx]: !p[idx] })), []);

  const getMaterialTags = (row) => {
    const tags = [];
    for (const key of ['material', 'material_1', 'material_2']) {
      const val = row[key] || '';
      if (val && !tags.includes(val)) tags.push(val);
    }
    return tags;
  };

  if (isPending || isFetching) return <TableSkeleton rows={8} cols={5} />;

  if (isError) return (
    <div className="text-center py-16">
      <p className="text-[#EF4444] font-bold text-sm">Failed to load Merged Data</p>
      <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold">Retry</button>
    </div>
  );

  if (rows.length === 0) return <p className="text-[rgba(255,255,255,0.3)] text-sm py-8 text-center">No Merged Data available.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] px-2 pb-2 border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[#06090F] z-10">
        <IconTags size={14} /><span>Merged Items — {rows.length} entries</span>
      </div>
      {rows.map((row, idx) => {
        const isExpanded = expandedRows[idx];
        const tags = getMaterialTags(row);
        return (
          <div key={row.id || idx}>
            <div className={`flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)] ${isExpanded ? 'bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.1)]' : 'border border-transparent'}`} onClick={() => toggleRow(idx)}>
              <span className="w-8 shrink-0 text-[rgba(255,255,255,0.3)]">{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
              <span className="w-12 shrink-0 text-[11px] text-[rgba(255,255,255,0.5)]">{row.sr_no || row.Sr_No || row['sr_no'] || idx + 1}</span>
              <span className="flex-1 min-w-[100px] text-[12px] truncate text-[rgba(255,255,255,0.8)]">{row.description || row.Description || 'N/A'}</span>
              <span className="w-16 shrink-0 text-right text-[12px] font-semibold">{row.req_qty || row.Req_Qty || row.qty || '0'}</span>
              <span className="w-20 shrink-0 text-[11px] text-[#F59E0B] truncate hidden sm:block">{row.next_doc || row.Next_Doc || '—'}</span>
              {tags.map((tag, ti) => (
                <span key={ti} className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${MATERIAL_COLORS[ti % MATERIAL_COLORS.length]}`}>{tag}</span>
              ))}
            </div>
            {isExpanded && (
              <div className="ml-10 mb-3 p-4 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-4">
                <ChangeTimeline row={row} changeCount={5} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <div><span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.25)]">Project</span><InlineCell value={row.project || row.Project || ''} row={row} column="project" onSave={onSave} /></div>
                  <div><span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.25)]">Unit</span><InlineCell value={row.unit || row.UOM || row.uom || ''} row={row} column="unit" onSave={onSave} /></div>
                  <div><span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.25)]">Remain</span><InlineCell value={row.remain_qty || row.Remain_Qty || ''} row={row} column="remain_qty" onSave={onSave} /></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MergedDataTab;

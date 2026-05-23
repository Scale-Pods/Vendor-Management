import { useMemo, useState, useCallback } from 'react';
import { useTabData } from '../hooks/usePRData';
import InlineCell from '../components/InlineCell';
import ChangeTimeline from '../components/ChangeTimeline';
import { TableSkeleton } from '../components/Skeleton';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

const PurchaseOrdersTab = ({ pr, onSave }) => {
  const { data, isPending, isFetching, isError, refetch } = useTabData('purchaseOrders', pr);

  const rows = useMemo(() => {
    const raw = Array.isArray(data) ? data.flat(Infinity) : [];
    return raw.filter(Boolean);
  }, [data]);

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = useCallback((idx) => setExpandedRows((p) => ({ ...p, [idx]: !p[idx] })), []);

  if (isPending || isFetching) return <TableSkeleton rows={8} cols={5} />;

  if (isError) return (
    <div className="text-center py-16">
      <p className="text-[#EF4444] font-bold text-sm">Failed to load Purchase Orders</p>
      <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold">Retry</button>
    </div>
  );

  if (rows.length === 0) return <p className="text-[rgba(255,255,255,0.3)] text-sm py-8 text-center">No Purchase Orders for this PR.</p>;

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 bg-[#06090F] border-b border-[rgba(255,255,255,0.06)] pb-2 mb-2">
        <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] px-2">
          <span className="w-8 shrink-0" />
          <span className="w-16 shrink-0">Sr No</span>
          <span className="flex-1 min-w-[120px]">Description</span>
          <span className="w-16 shrink-0 text-right">Req Qty</span>
          <span className="w-16 shrink-0 text-right">Remain</span>
          <span className="w-24 shrink-0 hidden sm:block">Next Doc</span>
        </div>
      </div>
      {rows.map((row, idx) => {
        const isExpanded = expandedRows[idx];
        const srNo = row.Sr_No || row.sr_no || row['Sr.No'] || idx + 1;
        return (
          <div key={row.id || idx}>
            <div
              className={`flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)] ${isExpanded ? 'bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.1)]' : 'border border-transparent'}`}
              onClick={() => toggleRow(idx)}
            >
              <span className="w-8 shrink-0 text-[rgba(255,255,255,0.3)]">{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
              <span className="w-16 shrink-0 text-[12px] font-bold text-[rgba(255,255,255,0.6)]">{srNo}</span>
              <span className="flex-1 min-w-[120px] text-[12px] truncate text-[rgba(255,255,255,0.8)]">{row.Description || row.description || 'N/A'}</span>
              <span className="w-16 shrink-0 text-right text-[12px] font-semibold">{row.Req_Qty || row.req_qty || '0'}</span>
              <span className="w-16 shrink-0 text-right text-[12px] text-[rgba(255,255,255,0.5)]">{row.Remain_Qty || row.remain_qty || '0'}</span>
              <span className="w-24 shrink-0 hidden sm:block text-[11px] text-[#F59E0B] truncate">{row.Next_Doc || row.next_doc || '—'}</span>
            </div>
            {isExpanded && (
              <div className="ml-10 mb-3 p-4 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-4">
                <ChangeTimeline row={row} changeCount={5} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <div><span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.25)]">Project</span><InlineCell value={row.Project || ''} row={row} column="Project" onSave={onSave} /></div>
                  <div><span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.25)]">UOM</span><InlineCell value={row.UOM || ''} row={row} column="UOM" onSave={onSave} /></div>
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

export default PurchaseOrdersTab;

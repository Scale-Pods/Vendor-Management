import { useMemo } from 'react';
import { useTabData } from '../hooks/usePRData';
import FinancialCard from '../components/FinancialCard';
import StatusBadge from '../components/StatusBadge';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import { IconFileText, IconCalendar } from '@tabler/icons-react';

const OverviewTab = ({ pr }) => {
  const po = useTabData('poData', pr);
  const p25 = useTabData('prData25', pr);
  const p26 = useTabData('prData26', pr);

  if (po.isPending || po.isFetching) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl animate-pulse" />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (po.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[#EF4444] font-bold text-sm">Failed to load overview data</p>
        <button onClick={() => po.refetch()} className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold">Retry</button>
      </div>
    );
  }

  const poData = Array.isArray(po.data) ? po.data.flat(Infinity) : [];
  const prData25 = Array.isArray(p25.data) ? p25.data.flat(Infinity) : [];
  const prData26 = Array.isArray(p26.data) ? p26.data.flat(Infinity) : [];

  const stats = useMemo(() => {
    const totalNet = poData.reduce((s, r) => s + (parseFloat(r['Net Price']) || 0), 0);
    const totalVAT = poData.reduce((s, r) => s + (parseFloat(r.VAT) || 0), 0);
    const totalPrice = poData.reduce((s, r) => s + (parseFloat(r['Total Price']) || 0), 0);
    const uniqueSuppliers = new Set(poData.map((r) => r.Supplier).filter(Boolean));
    const latestDate = poData.map((r) => r.po_date || r.created_at || r.date || '').filter(Boolean).sort().reverse()[0];
    return { totalNet, totalVAT, totalPrice, uniqueSuppliers: uniqueSuppliers.size, latestDate, poCount: poData.length };
  }, [poData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FinancialCard label="Total Net Amount" value={stats.totalNet} color="gold" />
        <FinancialCard label="Total VAT" value={stats.totalVAT} color="green" />
        <FinancialCard label="Total Price" value={stats.totalPrice} color="gold" />
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] mb-1">PO Entries</p>
          <p className="text-xl font-black text-white">{stats.poCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] mb-1">Suppliers</p>
          <p className="text-xl font-black text-[#F59E0B]">{stats.uniqueSuppliers}</p>
        </div>
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] mb-1">Latest Activity</p>
          <p className="text-sm font-bold text-white truncate">{stats.latestDate || 'N/A'}</p>
        </div>
      </div>

      {prData25.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-3 flex items-center gap-2">
            <IconFileText size={14} /> PR Data 25
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prData25.slice(0, 6).map((item, i) => (
              <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3">
                <span className="text-[11px] font-bold text-white truncate block mb-1">{item.Remark || item.remark || `#${i + 1}`}</span>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-[#F59E0B] font-bold">{item['Previous Charges'] || item.previous_charges || '0'}</span>
                  <span className="text-[rgba(255,255,255,0.3)]">→</span>
                  <span className="text-[#10B981] font-bold">{item['Current Charges'] || item.current_charges || '0'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prData26.length > 0 && (
        <div>
          <h4 className="text-[11px] font-black uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-3 flex items-center gap-2">
            <IconCalendar size={14} /> PR Data 26
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prData26.slice(0, 6).map((item, i) => (
              <div key={i} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={item.status || item.Status || 'Pending'} />
                  <span className="text-[11px] font-bold text-white truncate">{item.remark || item.Remark || `#${i + 1}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;

import { useState, useMemo } from 'react';
import {
  IconSearch, IconDownload,
  IconReceipt2, IconPackage,
  IconChevronLeft, IconChevronRight, IconArrowUpRight,
  IconArrowDownRight, IconClipboardList, IconTrendingUp,
  IconCoins, IconCalendar
} from '@tabler/icons-react';

/* ─── Dummy Data ─── */
const DUMMY_QUOTES = [
  { id: 'QR-001', date: '2026-05-28', supplier: 'Al Jaber Trading LLC', project: 'Phase 1 - Tower A', material: 'Portland Cement (OPC) 42.5N', qty: 5000, unit: 'Bags', rate: 14.50, total: 72500, status: 'Approved', validity: '30 days', paymentTerms: 'Net 30' },
  { id: 'QR-002', date: '2026-05-25', supplier: 'Gulf Steel Industries', project: 'Phase 2 - Podium', material: 'Rebar 16mm Grade 500', qty: 120, unit: 'Tons', rate: 2850.00, total: 342000, status: 'Pending', validity: '15 days', paymentTerms: 'Net 45' },
  { id: 'QR-003', date: '2026-05-22', supplier: 'Emirates Building Materials', project: 'Phase 1 - Tower A', material: 'Concrete Block 200mm', qty: 25000, unit: 'Pcs', rate: 3.20, total: 80000, status: 'Approved', validity: '30 days', paymentTerms: 'Net 30' },
  { id: 'QR-004', date: '2026-05-20', supplier: 'National Paints Factory', project: 'Phase 3 - Villa Cluster', material: 'Exterior Emulsion Paint - White', qty: 800, unit: 'Gallons', rate: 42.00, total: 33600, status: 'Rejected', validity: '20 days', paymentTerms: 'Advance' },
  { id: 'QR-005', date: '2026-05-18', supplier: 'Dubai Timber Trading', project: 'Phase 1 - Tower A', material: 'Plywood 18mm Marine Grade', qty: 1500, unit: 'Sheets', rate: 85.00, total: 127500, status: 'Approved', validity: '15 days', paymentTerms: 'Net 30' },
  { id: 'QR-006', date: '2026-05-15', supplier: 'Al Futtaim Engineering', project: 'Phase 2 - Podium', material: 'HVAC Split Unit 2.5 Ton', qty: 45, unit: 'Units', rate: 4200.00, total: 189000, status: 'Pending', validity: '45 days', paymentTerms: 'Net 60' },
  { id: 'QR-007', date: '2026-05-12', supplier: 'RAK Ceramics', project: 'Phase 3 - Villa Cluster', material: 'Floor Tiles 60x60 Porcelain', qty: 8000, unit: 'Sqm', rate: 38.50, total: 308000, status: 'Approved', validity: '30 days', paymentTerms: 'Net 30' },
  { id: 'QR-008', date: '2026-05-10', supplier: 'Bin Dasmal Group', project: 'Phase 1 - Tower A', material: 'Readymix Concrete C40', qty: 3500, unit: 'M³', rate: 420.00, total: 1470000, status: 'Approved', validity: '7 days', paymentTerms: 'COD' },
  { id: 'QR-009', date: '2026-05-08', supplier: 'Modern Glass Industries', project: 'Phase 2 - Podium', material: 'Tempered Glass 12mm', qty: 600, unit: 'Sqm', rate: 275.00, total: 165000, status: 'Pending', validity: '30 days', paymentTerms: 'Net 45' },
  { id: 'QR-010', date: '2026-05-05', supplier: 'Al Jaber Trading LLC', project: 'Phase 3 - Villa Cluster', material: 'Sand (Washed) Fine', qty: 2000, unit: 'Tons', rate: 45.00, total: 90000, status: 'Approved', validity: '15 days', paymentTerms: 'Net 30' },
  { id: 'QR-011', date: '2026-05-03', supplier: 'Gulf Steel Industries', project: 'Phase 1 - Tower A', material: 'Structural Steel H-Beam 200x200', qty: 85, unit: 'Tons', rate: 3650.00, total: 310250, status: 'Approved', validity: '20 days', paymentTerms: 'Net 30' },
  { id: 'QR-012', date: '2026-05-01', supplier: 'Emirates Building Materials', project: 'Phase 2 - Podium', material: 'Plastering Sand', qty: 1200, unit: 'Tons', rate: 35.00, total: 42000, status: 'Rejected', validity: '10 days', paymentTerms: 'Advance' },
  { id: 'QR-013', date: '2026-04-28', supplier: 'Danube Buildmart', project: 'Phase 1 - Tower A', material: 'PVC Pipes 110mm SWR', qty: 3000, unit: 'Meters', rate: 18.50, total: 55500, status: 'Approved', validity: '30 days', paymentTerms: 'Net 30' },
  { id: 'QR-014', date: '2026-04-25', supplier: 'Bin Dasmal Group', project: 'Phase 3 - Villa Cluster', material: 'Readymix Concrete C30', qty: 1800, unit: 'M³', rate: 380.00, total: 684000, status: 'Pending', validity: '7 days', paymentTerms: 'COD' },
  { id: 'QR-015', date: '2026-04-22', supplier: 'Modern Glass Industries', project: 'Phase 2 - Podium', material: 'Double Glazed Unit 6+12+6', qty: 450, unit: 'Sqm', rate: 520.00, total: 234000, status: 'Approved', validity: '30 days', paymentTerms: 'Net 45' },
];

const MATERIALS_SUMMARY = [
  { category: 'Concrete & Cement', items: 4, totalValue: 2268500, trend: 12 },
  { category: 'Steel & Rebar', items: 3, totalValue: 652250, trend: -5 },
  { category: 'Finishes & Tiles', items: 2, totalValue: 341600, trend: 8 },
  { category: 'Glass & Glazing', items: 2, totalValue: 399000, trend: 15 },
  { category: 'MEP Materials', items: 2, totalValue: 244500, trend: -2 },
  { category: 'Wood & Timber', items: 1, totalValue: 127500, trend: 3 },
  { category: 'Paints & Coatings', items: 1, totalValue: 33600, trend: -8 },
];

const PAGE_SIZE = 10;

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
  const styles = {
    Approved: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.3)' },
    Pending: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
    Rejected: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'rgba(239,68,68,0.3)' },
  };
  const s = styles[status] || styles.Pending;
  return (
    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
};

/* ─── Sub Views ─── */
const QuoteDashboard = ({ quotes }) => {
  const stats = useMemo(() => {
    const totalValue = quotes.reduce((s, q) => s + q.total, 0);
    const approved = quotes.filter(q => q.status === 'Approved').length;
    const pending = quotes.filter(q => q.status === 'Pending').length;
    const rejected = quotes.filter(q => q.status === 'Rejected').length;
    const uniqueSuppliers = new Set(quotes.map(q => q.supplier)).size;
    return { totalValue, approved, pending, rejected, uniqueSuppliers, total: quotes.length };
  }, [quotes]);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Quotes', value: stats.total, icon: IconClipboardList, color: '#c8922a' },
          { label: 'Approved', value: stats.approved, icon: IconTrendingUp, color: '#10B981' },
          { label: 'Pending Review', value: stats.pending, icon: IconCalendar, color: '#F59E0B' },
          { label: 'Total Value (AED)', value: stats.totalValue.toLocaleString(), icon: IconCoins, color: '#3b82f6' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] hover:border-[rgba(255,255,255,0.15)] transition-all relative overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
              style={{ background: `radial-gradient(circle at 80% 20%, ${kpi.color}08, transparent 60%)` }} />
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]" style={{ color: kpi.color }}>
                  <kpi.icon size={20} stroke={2} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mt-4">{kpi.value}</h3>
              <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-widest">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Material Categories */}
      <div className="glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)]">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <IconPackage size={18} className="text-[#c8922a]" /> Material Categories Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MATERIALS_SUMMARY.map(mat => (
            <div key={mat.category} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 hover:border-[#c8922a]/30 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">{mat.category}</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 ${mat.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {mat.trend >= 0 ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />}
                  {Math.abs(mat.trend)}%
                </span>
              </div>
              <p className="text-lg font-black text-white">AED {mat.totalValue.toLocaleString()}</p>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mt-1">{mat.items} items</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Quotes */}
      <div className="glass-panel border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] overflow-hidden">
        <div className="p-5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <IconReceipt2 size={18} className="text-[#c8922a]" /> Recent Quote Activity
          </h3>
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.03)]">
          {quotes.slice(0, 5).map(q => (
            <div key={q.id} className="flex items-center justify-between px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-[#c8922a] font-black text-xs">{q.id}</span>
                <div>
                  <p className="text-[12px] text-white font-semibold">{q.material}</p>
                  <p className="text-[10px] text-white/30 font-bold">{q.supplier} · {q.project}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white font-bold text-xs tabular-nums">AED {q.total.toLocaleString()}</span>
                <StatusBadge status={q.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const QuoteData = ({ quotes }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = !search || 
        q.id.toLowerCase().includes(search.toLowerCase()) ||
        q.supplier.toLowerCase().includes(search.toLowerCase()) ||
        q.material.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotes, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotes..."
            className="w-full bg-[#1a1f2e] border border-[rgba(255,255,255,0.08)] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white/80 outline-none focus:border-[#c8922a] transition-all placeholder:text-white/20"
          />
        </div>
        <div className="flex items-center gap-2 px-1 py-1 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.05)] rounded-xl">
          {['All', 'Approved', 'Pending', 'Rejected'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{
                color: statusFilter === s ? '#000' : 'rgba(255,255,255,0.3)',
                background: statusFilter === s ? '#c8922a' : 'transparent',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.015)]">
                {['Quote ID', 'Date', 'Supplier', 'Project', 'Material', 'Qty', 'Unit', 'Rate', 'Total (AED)', 'Status'].map(h => (
                  <th key={h} className="px-5 py-4 text-[9px] font-black text-white/25 uppercase tracking-[0.15em] whitespace-nowrap border-b-2 border-[#c8922a]/20">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
              {paged.map(q => (
                <tr key={q.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                  <td className="px-5 py-4 text-[#c8922a] font-bold">{q.id}</td>
                  <td className="px-5 py-4 text-white/60 tabular-nums">{q.date}</td>
                  <td className="px-5 py-4 text-white/80 font-medium max-w-[180px] truncate">{q.supplier}</td>
                  <td className="px-5 py-4 text-white/60 text-[11px] max-w-[140px] truncate">{q.project}</td>
                  <td className="px-5 py-4 text-white/80 font-semibold max-w-[220px] truncate">{q.material}</td>
                  <td className="px-5 py-4 text-white font-bold tabular-nums text-right">{q.qty.toLocaleString()}</td>
                  <td className="px-5 py-4 text-white/40 text-[10px] font-bold uppercase">{q.unit}</td>
                  <td className="px-5 py-4 text-white/70 tabular-nums text-right">{q.rate.toFixed(2)}</td>
                  <td className="px-5 py-4 text-white font-black tabular-nums text-right">{q.total.toLocaleString()}</td>
                  <td className="px-5 py-4"><StatusBadge status={q.status} /></td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan="10" className="px-5 py-16 text-center text-white/20 font-black uppercase tracking-widest">No quotes found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
            <span className="text-[10px] text-white/30 font-bold">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all">
                <IconChevronLeft size={14} className="text-white/60" />
              </button>
              <span className="text-[11px] font-bold text-white/50 tabular-nums">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all">
                <IconChevronRight size={14} className="text-white/60" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QuoteMaterial = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <IconPackage size={18} className="text-[#c8922a]" /> Material Wise Quote Analysis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...new Set(DUMMY_QUOTES.map(q => q.material))].map(material => {
          const related = DUMMY_QUOTES.filter(q => q.material === material);
          const totalQty = related.reduce((s, q) => s + q.qty, 0);
          const avgRate = related.reduce((s, q) => s + q.rate, 0) / related.length;
          const totalValue = related.reduce((s, q) => s + q.total, 0);
          const suppliers = [...new Set(related.map(q => q.supplier))];

          return (
            <div key={material} className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-5 space-y-4 hover:border-[#c8922a]/40 transition-all duration-300 group">
              <div>
                <h4 className="text-[13px] font-bold text-white group-hover:text-[#c8922a] transition-colors">{material}</h4>
                <p className="text-[10px] text-white/30 font-bold mt-1">{related.length} quote{related.length > 1 ? 's' : ''} · {suppliers.length} supplier{suppliers.length > 1 ? 's' : ''}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[rgba(200,146,42,0.06)] border border-[rgba(200,146,42,0.15)] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] font-black text-[#c8922a]/60 uppercase">Total Qty</p>
                  <p className="text-[12px] font-black text-[#c8922a] mt-0.5">{totalQty.toLocaleString()}</p>
                </div>
                <div className="bg-[rgba(200,146,42,0.06)] border border-[rgba(200,146,42,0.15)] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] font-black text-[#c8922a]/60 uppercase">Avg Rate</p>
                  <p className="text-[12px] font-black text-[#c8922a] mt-0.5">{avgRate.toFixed(2)}</p>
                </div>
                <div className="bg-[rgba(200,146,42,0.08)] border border-[rgba(200,146,42,0.25)] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] font-black text-[#c8922a]/80 uppercase">Value</p>
                  <p className="text-[12px] font-black text-[#c8922a] mt-0.5">{(totalValue / 1000).toFixed(0)}k</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {suppliers.map(s => (
                  <span key={s} className="text-[9px] font-bold text-white/40 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-md">
                    {s.split(' ').slice(0, 2).join(' ')}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const QuoteUpload = () => (
  <div className="flex flex-col items-center justify-center py-20 glass-panel border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] rounded-xl">
    <div className="w-20 h-20 rounded-2xl bg-[rgba(200,146,42,0.08)] border-2 border-dashed border-[rgba(200,146,42,0.3)] flex items-center justify-center mb-6">
      <IconDownload size={32} className="text-[#c8922a]/60" />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">Upload Quote Data</h3>
    <p className="text-[13px] text-white/30 font-medium mb-8 text-center max-w-md">
      Drop your Excel or CSV file here to import quote data. Supported formats: .xlsx, .csv
    </p>
    <div className="flex items-center gap-3">
      <button className="px-6 py-3 rounded-xl bg-[#c8922a] text-black font-bold text-[12px] uppercase tracking-wider hover:bg-[#d9a33b] transition-all shadow-[0_0_20px_rgba(200,146,42,0.2)]">
        Browse Files
      </button>
      <button className="px-6 py-3 rounded-xl bg-white/5 text-white/40 font-bold text-[12px] uppercase tracking-wider border border-white/10 hover:bg-white/10 transition-all">
        Download Template
      </button>
    </div>
    <p className="text-[10px] text-white/15 font-bold uppercase tracking-widest mt-6">
      Coming Soon — Module Under Development
    </p>
  </div>
);

/* ─── Main QuoteRegister Component ─── */
const QuoteRegister = ({ subView = 'dashboard' }) => {
  const viewMap = {
    dashboard: <QuoteDashboard quotes={DUMMY_QUOTES} />,
    data: <QuoteData quotes={DUMMY_QUOTES} />,
    material: <QuoteMaterial quotes={DUMMY_QUOTES} />,
    upload: <QuoteUpload />,
  };

  return (
    <div className="w-full h-full text-white bg-[#06090F] min-h-screen px-4 md:px-8 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <IconReceipt2 className="text-[#c8922a]" size={28} />
          Purchase Quote Register
        </h2>
        <p className="text-[rgba(255,255,255,0.4)] text-sm font-medium mt-1">
          {subView === 'dashboard' && 'Overview of all procurement quotes and material sourcing.'}
          {subView === 'data' && 'Full quote register with filtering and search.'}
          {subView === 'material' && 'Material-wise breakdown and supplier comparison.'}
          {subView === 'upload' && 'Import and manage quote data files.'}
        </p>
      </div>

      {viewMap[subView] || viewMap.dashboard}
    </div>
  );
};

export default QuoteRegister;

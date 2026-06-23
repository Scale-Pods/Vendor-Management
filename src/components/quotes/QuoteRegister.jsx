import { useState, useEffect, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IconSearch, IconDownload,
  IconReceipt2, IconPackage,
  IconChevronLeft, IconChevronRight, IconArrowUpRight,
  IconArrowDownRight, IconClipboardList, IconTrendingUp,
  IconCoins, IconCalendar, IconAlertCircle
} from '@tabler/icons-react';
import { adminSupabase } from '../../lib/supabase';

const PAGE_SIZE = 10;

const StatusBadge = memo(({ status }) => {
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
});

const QuoteDashboard = ({ quotes, loading }) => {
  const { stats, materialCategories } = useMemo(() => {
    let totalValue = 0;
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    const suppliers = new Set();
    const categoriesMap = {};

    for (const q of quotes) {
      totalValue += q.total || 0;
      if (q.status === 'Approved') approved++;
      else if (q.status === 'Pending') pending++;
      else if (q.status === 'Rejected') rejected++;
      if (q.supplier) suppliers.add(q.supplier);

      const cat = q.material || 'Uncategorized';
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { category: cat, items: 0, totalValue: 0, quotesCount: 0 };
      }
      categoriesMap[cat].items += q.qty || 0;
      categoriesMap[cat].totalValue += q.total || 0;
      categoriesMap[cat].quotesCount++;
    }

    return {
      stats: { totalValue, approved, pending, rejected, uniqueSuppliers: suppliers.size, total: quotes.length },
      materialCategories: Object.values(categoriesMap).sort((a, b) => b.totalValue - a.totalValue)
    };
  }, [quotes]);

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] animate-pulse min-h-[120px]" />
          ))}
        </div>
      ) : (
        <>
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

          <div className="glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <IconPackage size={18} className="text-[#c8922a]" /> Material Categories Breakdown
            </h3>
            {materialCategories.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No material data available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {materialCategories.slice(0, 8).map(mat => (
                  <div key={mat.category} className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 hover:border-[#c8922a]/30 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">{mat.category}</span>
                      <span className="text-[9px] font-bold text-white/30">{mat.quotesCount} quote{mat.quotesCount > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-lg font-black text-white">AED {mat.totalValue.toLocaleString()}</p>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mt-1">{mat.items} units</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] overflow-hidden">
            <div className="p-5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <IconReceipt2 size={18} className="text-[#c8922a]" /> Recent Quote Activity
              </h3>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.03)]">
              {quotes.slice(0, 5).map((q, idx) => (
                <div key={q.id || idx} className="flex items-center justify-between px-5 py-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-[#c8922a] font-black text-xs">{q.id || '—'}</span>
                    <div>
                      <p className="text-[12px] text-white font-semibold">{q.material}</p>
                      <p className="text-[10px] text-white/30 font-bold">{q.supplier} · {q.project}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-bold text-xs tabular-nums">AED {(q.total || 0).toLocaleString()}</span>
                    <StatusBadge status={q.status} />
                  </div>
                </div>
              ))}
              {quotes.length === 0 && (
                <div className="px-5 py-12 text-center text-white/20 font-black uppercase tracking-widest">No quotes found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const QuoteData = ({ quotes, loading }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusFilter = (s) => {
    setStatusFilter(s);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    return quotes.filter(q => {
      const matchSearch = !debouncedSearch ||
        (q.id || '').toLowerCase().includes(searchLower) ||
        (q.supplier || '').toLowerCase().includes(searchLower) ||
        (q.material || '').toLowerCase().includes(searchLower);
      const matchStatus = statusFilter === 'All' || (q.status || '') === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotes, debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="glass-panel border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] overflow-hidden rounded-xl animate-pulse p-12">
        <div className="h-8 bg-white/5 rounded w-full mb-6" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded w-full mb-3" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            <button key={s} onClick={() => handleStatusFilter(s)}
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
              {paged.map((q, idx) => (
                <tr key={q.id || idx} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                  <td className="px-5 py-4 text-[#c8922a] font-bold">{q.id || '—'}</td>
                  <td className="px-5 py-4 text-white/60 tabular-nums">{q.date || '—'}</td>
                  <td className="px-5 py-4 text-white/80 font-medium max-w-[180px] truncate">{q.supplier || '—'}</td>
                  <td className="px-5 py-4 text-white/60 text-[11px] max-w-[140px] truncate">{q.project || '—'}</td>
                  <td className="px-5 py-4 text-white/80 font-semibold max-w-[220px] truncate">{q.material || '—'}</td>
                  <td className="px-5 py-4 text-white font-bold tabular-nums text-right">{(q.qty || 0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-white/40 text-[10px] font-bold uppercase">{q.unit || '—'}</td>
                  <td className="px-5 py-4 text-white/70 tabular-nums text-right">{(q.rate || 0).toFixed(2)}</td>
                  <td className="px-5 py-4 text-white font-black tabular-nums text-right">{(q.total || 0).toLocaleString()}</td>
                  <td className="px-5 py-4"><StatusBadge status={q.status || 'Pending'} /></td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan="10" className="px-5 py-16 text-center text-white/20 font-black uppercase tracking-widest">No quotes found</td></tr>
              )}
            </tbody>
          </table>
        </div>

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

const QuoteRegister = ({ subView = 'dashboard' }) => {
  const { data: quotes = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await adminSupabase
        .from('quote_register')
        .select('*')
        .order('id', { ascending: false })
        .limit(1000000);

      if (error) throw new Error(error.message);

      return (data || []).map(item => ({
        id: item.id || item.quote_no || `QR-${Math.random().toString(36).slice(2, 6)}`,
        date: item.entry_date_time || item.pr_date || '—',
        supplier: item.supplier || 'Unknown',
        project: item.project || 'Unknown',
        material: item.description || 'Unknown',
        qty: parseFloat(item.qty || 0),
        unit: item.unit || 'Pcs',
        rate: parseFloat(item.price || 0),
        total: parseFloat(item.total_price || item.net_amount || 0),
        status: item.quote_status || item.status || 'Pending',
        validity: '—',
        paymentTerms: item.payment_terms || '—',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError?.message || '';

  const viewMap = {
    dashboard: <QuoteDashboard quotes={quotes} loading={loading} />,
    data: <QuoteData quotes={quotes} loading={loading} />,
    upload: <QuoteUpload />,
  };

  return (
    <div className="w-full h-full text-white bg-[#06090F] min-h-screen px-4 md:px-8 py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <IconReceipt2 className="text-[#c8922a]" size={28} />
          Purchase Quote Register
        </h2>
        <p className="text-[rgba(255,255,255,0.4)] text-sm font-medium mt-1">
          {subView === 'dashboard' && 'Overview of all procurement quotes and material sourcing.'}
          {subView === 'data' && 'Full quote register with filtering and search.'}
          {subView === 'upload' && 'Import and manage quote data files.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <IconAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {viewMap[subView] || viewMap.dashboard}
    </div>
  );
};

export default QuoteRegister;

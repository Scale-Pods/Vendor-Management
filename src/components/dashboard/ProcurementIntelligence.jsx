import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import {
  IconRefresh, IconAlertTriangle,
  IconFileDescription,
  IconCoin, IconBuildingStore, IconChartBar,
  IconBriefcase, IconPackage, IconTrendingUp, IconUsers, IconActivity, IconArrowUpRight, IconArrowDownRight,
} from '@tabler/icons-react';
import { adminSupabase } from '../../lib/supabase';

const GOLD = '#c8922a';
const GREEN = '#00c896';
const AMBER = '#f59e0b';
const PURPLE = '#a855f7';
const BLUE = '#3b82f6';
const TEXT = 'rgba(255,255,255,0.4)';

const COLORS = [GOLD, BLUE, GREEN, PURPLE, AMBER, '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6'];



const AnimatedCounter = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) cancelAnimationFrame(ref.current);
    const start = performance.now();
    const from = 0;
    const to = value;
    const duration = 1200;
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <>{prefix}{formatted}{suffix}</>;
};

const KPIBox = ({ title, value, icon: Icon, color, trend, format, subtext, loading }) => (
  <div className="glass-panel px-3 py-3 md:px-5 md:py-5 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] relative flex flex-col justify-between min-h-[90px] md:min-h-[140px] hover:border-[rgba(255,255,255,0.15)] transition-all group">
    <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    <div className="flex justify-between items-start">
      <div className="p-1.5 md:p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]" style={{ color }}>
        <Icon size={14} stroke={2} />
      </div>
      {trend !== undefined && !loading && (
        <span className={`text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full flex items-center gap-1 ${trend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend >= 0 ? <IconArrowUpRight size={8} /> : <IconArrowDownRight size={8} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-1 md:mt-3">
      <h3 className="text-lg md:text-2xl font-black text-white tracking-tight">
        {loading ? (
          <span className="text-[rgba(255,255,255,0.1)]">—</span>
        ) : (
          format === 'currency' ? (
            <>AED <AnimatedCounter value={value} decimals={0} /></>
          ) : (
            <AnimatedCounter value={value} />
          )
        )}
      </h3>
      <p className="text-[8px] md:text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-widest mt-0.5 md:mt-1">{title}</p>
      {subtext && !loading && <p className="text-[7px] md:text-[9px] text-[rgba(255,255,255,0.15)] mt-0.5 md:mt-1">{subtext}</p>}
    </div>
  </div>
);

const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`glass-panel px-3 py-3 md:px-6 md:py-5 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] rounded-2xl ${className}`}>
    <div className="mb-3 md:mb-5">
      <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">{title}</h3>
      {subtitle && <p className="text-[9px] md:text-[11px] text-[rgba(255,255,255,0.25)] font-medium mt-0.5 md:mt-1">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const tooltipStyle = {
  backgroundColor: '#1a1f2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  fontSize: '11px',
  color: '#fff',
};

const emptyAnalytics = {
  totalSpend: 0, activePRs: 0, activeProjects: 0, activeSuppliers: 0,
  pendingItems: 0, avgPOValue: 0, topProjects: [], topSuppliers: [],
  recentActivity: [], projectList: [], supplierList: [],
};

const getVal = (r, ...keys) => {
  for (const k of keys) {
    if (r[k] != null) {
      const n = parseFloat(String(r[k]).replace(/,/g, ''));
      if (!isNaN(n)) return n;
    }
  }
  return 0;
};
const str = (r, ...keys) => {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
};
const col = (r, name) => r[name] ?? r[name.toLowerCase()] ?? r[name.toUpperCase()] ?? null;

const ProcurementIntelligence = () => {
  const [filters, setFilters] = useState({ project: '', supplier: '', search: '' });

  const { data: analytics = null, isLoading: loading, error } = useQuery({
    queryKey: ['po-analytics', filters.project, filters.supplier],
    queryFn: async ({ queryKey }) => {
      const [, project, supplier] = queryKey;

      const { data: rows, error } = await adminSupabase.from('po_data').select('*');
      if (error) throw error;
      if (!rows || !rows.length) return emptyAnalytics;

      const filtered = rows.filter(r => {
        if (project && String(col(r, 'Project') ?? '').trim() !== project) return false;
        if (supplier && String(col(r, 'Supplier') ?? '').trim() !== supplier) return false;
        return true;
      });

      const totalSpend = filtered.reduce((s, r) => s + getVal(r, 'Total Price', 'Net Price', 'Original Pirce', 'total_price', 'net_price'), 0);
      const prRefs = new Set(filtered.map(r => str(r, 'Req Ref', 'Ref', 'req_ref', 'ref') || 'N/A'));
      const projects = new Set(filtered.map(r => str(r, 'Project', 'project') || 'Unknown'));
      const suppliers = new Set(filtered.map(r => str(r, 'Supplier', 'supplier') || 'Unknown'));
      const pending = filtered.filter(r => {
        const s = str(r, 'Status', 'status', 'Approve / Reject', 'Approved / Reject', 'approve_reject');
        return s && (s.toLowerCase().includes('open') || s.toLowerCase().includes('pending'));
      }).length;

      const projectSpend = {};
      filtered.forEach(r => {
        const p = str(r, 'Project', 'project') || 'Unknown';
        projectSpend[p] = (projectSpend[p] || 0) + getVal(r, 'Total Price', 'Net Price', 'Original Pirce', 'total_price', 'net_price');
      });
      const totalSpendAll = Object.values(projectSpend).reduce((a, b) => a + b, 0);
      const topProjects = Object.entries(projectSpend)
        .map(([name, spend]) => ({ name, spend, share: totalSpendAll ? +((spend / totalSpendAll) * 100).toFixed(1) : 0 }))
        .sort((a, b) => b.spend - a.spend).slice(0, 10);

      const supplierSpend = {};
      const supplierOrders = {};
      const supplierProjects = {};
      filtered.forEach(r => {
        const s = str(r, 'Supplier', 'supplier') || 'Unknown';
        const p = str(r, 'Project', 'project') || 'Unknown';
        supplierSpend[s] = (supplierSpend[s] || 0) + getVal(r, 'Total Price', 'Net Price', 'Original Pirce', 'total_price', 'net_price');
        supplierOrders[s] = (supplierOrders[s] || 0) + 1;
        if (!supplierProjects[s]) supplierProjects[s] = new Set();
        supplierProjects[s].add(p);
      });
      const topSuppliers = Object.entries(supplierSpend)
        .map(([name, spend]) => ({
          name, spend, share: totalSpendAll ? +((spend / totalSpendAll) * 100).toFixed(1) : 0,
          orders: supplierOrders[name] || 0,
          projects: supplierProjects[name]?.size || 0,
        }))
        .sort((a, b) => b.spend - a.spend).slice(0, 10);

      const recentActivity = filtered
        .map(r => ({
          pr: str(r, 'Req Ref', 'Ref', 'req_ref', 'ref') || 'N/A',
          project: str(r, 'Project', 'project') || '—',
          supplier: str(r, 'Supplier', 'supplier') || '—',
          material: str(r, 'Description', 'description', 'Ref', 'ref') || '—',
          qty: getVal(r, 'Req Qty', 'Req_Qty', 'req_qty', 'Qty', 'qty'),
          value: getVal(r, 'Total Price', 'Net Price', 'Original Pirce', 'total_price', 'net_price'),
        }))
        .sort((a, b) => b.value - a.value).slice(0, 15);

      const projectList = [...new Set(rows.map(r => str(r, 'Project', 'project')).filter(Boolean))].sort();
      const supplierList = [...new Set(rows.map(r => str(r, 'Supplier', 'supplier')).filter(Boolean))].sort();

      return {
        totalSpend,
        activePRs: prRefs.size,
        activeProjects: projects.size,
        activeSuppliers: suppliers.size,
        pendingItems: pending,
        avgPOValue: prRefs.size ? totalSpend / prRefs.size : 0,
        topProjects,
        topSuppliers,
        recentActivity,
        projectList,
        supplierList,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const projectList = analytics?.projectList ?? [];
  const supplierList = analytics?.supplierList ?? [];

  const recentActivity = useMemo(() => {
    if (!analytics?.recentActivity) return [];
    const q = filters.search.toLowerCase();
    if (!q) return analytics.recentActivity;
    return analytics.recentActivity.filter(r =>
      (r.pr && String(r.pr).toLowerCase().includes(q)) ||
      (r.project && String(r.project).toLowerCase().includes(q)) ||
      (r.supplier && String(r.supplier).toLowerCase().includes(q)) ||
      (r.material && String(r.material).toLowerCase().includes(q))
    );
  }, [analytics?.recentActivity, filters.search]);

  if (error) {
    return (
      <div className="w-full h-full text-white bg-[#0d1117] min-h-screen px-4 md:px-8 py-6 flex items-center justify-center">
        <div className="glass-panel p-8 text-center max-w-md">
          <IconAlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-black text-white mb-2">Data Fetch Error</h3>
          <p className="text-sm text-[rgba(255,255,255,0.5)]">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full text-white bg-[#0d1117] min-h-screen px-3 sm:px-4 md:px-8 py-4 md:py-6 space-y-4 md:space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl xl:text-3xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3">
            <IconChartBar className="text-[#c8922a]" size={24} />
            Procurement Intelligence
          </h2>
          <p className="text-[rgba(255,255,255,0.4)] text-[11px] sm:text-sm font-medium mt-0.5 sm:mt-1">
            Real-time procurement, supplier and project performance analytics
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative group w-full sm:w-auto">
            <IconBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] group-focus-within:text-[#c8922a] transition-colors" size={14} />
            <select
              className="w-full sm:w-auto bg-[#1a1f2e] border border-[rgba(255,255,255,0.08)] text-[12px] sm:text-[13px] text-[rgba(255,255,255,0.8)] rounded-xl pl-9 pr-8 py-2 outline-none focus:border-[#c8922a] transition-all appearance-none cursor-pointer"
              value={filters.project}
              onChange={(e) => setFilters(f => ({ ...f, project: e.target.value }))}
            >
              <option value="">All Projects</option>
              {projectList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="relative group w-full sm:w-auto">
            <IconUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] group-focus-within:text-[#c8922a] transition-colors" size={14} />
            <select
              className="w-full sm:w-auto bg-[#1a1f2e] border border-[rgba(255,255,255,0.08)] text-[12px] sm:text-[13px] text-[rgba(255,255,255,0.8)] rounded-xl pl-9 pr-8 py-2 outline-none focus:border-[#c8922a] transition-all appearance-none cursor-pointer"
              value={filters.supplier}
              onChange={(e) => setFilters(f => ({ ...f, supplier: e.target.value }))}
            >
              <option value="">All Suppliers</option>
              {supplierList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => window.location.reload()} className="self-end sm:self-auto p-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] transition-all">
            <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!loading && !analytics && (
        <div className="glass-panel p-8 md:p-12 text-center border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] rounded-2xl">
          <IconPackage size={36} className="text-[rgba(255,255,255,0.1)] mx-auto mb-4" />
          <h3 className="text-base md:text-lg font-black text-white mb-2">No Procurement Data Available</h3>
          <p className="text-[11px] md:text-sm text-[rgba(255,255,255,0.4)] max-w-md mx-auto">
            Import purchase order data via the PR Upload tab to populate this dashboard.
          </p>
        </div>
      )}

      {/* ─── KPI Rows ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
        <KPIBox title="Total Procurement Value" value={analytics?.totalSpend || 0} icon={IconCoin} color={GOLD} format="currency" trend={8.2} loading={loading} subtext="All purchase orders" />
        <KPIBox title="Active Purchase Requests" value={analytics?.activePRs || 0} icon={IconFileDescription} color={BLUE} trend={3.5} loading={loading} subtext="Unique PRs" />
        <KPIBox title="Active Projects" value={analytics?.activeProjects || 0} icon={IconBriefcase} color={GREEN} trend={-1.2} loading={loading} subtext="Ongoing projects" />
        <KPIBox title="Active Suppliers" value={analytics?.activeSuppliers || 0} icon={IconBuildingStore} color={PURPLE} trend={5.7} loading={loading} subtext="Registered suppliers" />
        <KPIBox title="Pending Items" value={analytics?.pendingItems || 0} icon={IconAlertTriangle} color={AMBER} loading={loading} subtext="Open requests" />
        <KPIBox title="Average PO Value" value={analytics?.avgPOValue || 0} icon={IconTrendingUp} color={GREEN} format="currency" loading={loading} subtext="Total / PR count" />
      </div>

      {/* ─── Two-column charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <ChartCard title="Top 10 Projects by Spend" subtitle="Project Name &bull; Total Procurement Value &bull; % of Overall Spend">
          <div className="h-[200px] sm:h-[280px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.topProjects || []} layout="vertical" margin={{ left: 20, right: 60, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke={TEXT} fontSize={10} width={140} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.8)', fontWeight: 600 }} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => [`AED ${v.toLocaleString()}`, 'Total Value']} />
                <Bar dataKey="spend" radius={[0, 6, 6, 0]} barSize={22} label={{ position: 'right', fill: '#fff', fontSize: 10, fontWeight: 700, formatter: (v) => `AED ${v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(1) + 'K' : v}` }}>
                  {analytics?.topProjects?.map((_, idx) => (
                    <Cell key={idx} fill={GOLD} fillOpacity={1 - (idx * 0.07)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {analytics?.topProjects && (
            <div className="mt-4 space-y-1">
              {analytics.topProjects.slice(0, 5).map((p) => (
                <div key={p.name} className="flex items-center justify-between text-[11px] py-1 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                  <span className="text-white/60 font-medium truncate max-w-[200px]">{p.name}</span>
                  <span className="font-bold tabular-nums text-[#c8922a]">AED {p.spend >= 1000000 ? (p.spend/1000000).toFixed(1) + 'M' : p.spend >= 1000 ? (p.spend/1000).toFixed(1) + 'K' : p.spend.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Supplier Distribution" subtitle="Top suppliers &bull; Spend allocation &bull; Supplier contribution %">
          <div className="h-[180px] sm:h-[240px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.topSuppliers?.slice(0, 6) || []}
                  dataKey="spend"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {analytics?.topSuppliers?.slice(0, 6).map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v, name) => [`AED ${v.toLocaleString()}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {analytics?.topSuppliers && (
            <div className="mt-4 space-y-1">
              {analytics.topSuppliers.slice(0, 5).map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-[11px] py-1 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                  <div className="flex items-center gap-2 truncate max-w-[200px]">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-white/60 font-medium truncate">{s.name}</span>
                  </div>
                  <span className="text-white font-bold tabular-nums">{s.share.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>






      {/* ─── Section 6: Top Suppliers Leaderboard ─── */}
      <ChartCard title="Top Suppliers Leaderboard" subtitle="Supplier &bull; Total Spend &bull; Orders &bull; Projects &bull; Share %">
        <div className="overflow-x-auto -mx-3 md:-mx-0">
            <table className="w-full text-left text-[10px] md:text-xs">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">#</th>
                  <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Supplier</th>
                  <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Spend</th>
                  <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Orders</th>
                  <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Projects</th>
                  <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {(analytics?.topSuppliers || []).map((s, idx) => (
                  <tr key={s.name} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                    <td className="py-2 md:py-3 px-2 md:px-0 text-[10px] md:text-[11px] text-[rgba(255,255,255,0.25)] font-bold">{idx + 1}</td>
                    <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[13px] text-white font-bold truncate max-w-[100px] md:max-w-none">{s.name}</td>
                    <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[13px] text-right tabular-nums font-black text-[#c8922a]">AED {s.spend >= 1000000 ? (s.spend/1000000).toFixed(1) + 'M' : s.spend >= 1000 ? (s.spend/1000).toFixed(1) + 'K' : s.spend.toLocaleString()}</td>
                    <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[13px] text-right tabular-nums font-semibold text-white/60">{s.orders}</td>
                    <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[13px] text-right tabular-nums font-semibold text-white/60">{s.projects}</td>
                    <td className="py-2 md:py-3 px-2 md:px-0 text-right">
                      <div className="inline-flex items-center gap-1 md:gap-2">
                        <div className="w-10 md:w-16 h-1 md:h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden hidden md:block">
                          <div className="h-full rounded-full bg-[#c8922a]" style={{ width: `${s.share}%` }} />
                        </div>
                        <span className="text-[10px] md:text-[11px] font-bold text-white/80 tabular-nums">{s.share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

      {/* ─── Section 7: Recent Procurement Activity ─── */}
      <ChartCard title="Recent Procurement Activity" subtitle="Live activity feed &bull; Latest purchase records">
        <div className="overflow-x-auto -mx-3 md:-mx-0">
          <table className="w-full text-left text-[10px] md:text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">PR #</th>
                <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Project</th>
                <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Supplier</th>
                <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider hidden md:table-cell">Material</th>
                <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Qty</th>
                <th className="pb-2 md:pb-3 px-2 md:px-0 text-[8px] md:text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {(recentActivity || []).slice(0, 10).map((act, idx) => (
                <tr key={idx} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[12px] text-white font-bold">{act.pr}</td>
                  <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[12px] text-white/60 truncate max-w-[80px] md:max-w-none">{act.project}</td>
                  <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[12px] text-white/60 truncate max-w-[80px] md:max-w-none">{act.supplier}</td>
                  <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[12px] text-white/50 truncate max-w-[100px] md:max-w-[200px] hidden md:table-cell">{act.material}</td>
                  <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[12px] text-right tabular-nums text-white/60">{act.qty >= 1000 ? (act.qty/1000).toFixed(1) + 'K' : act.qty.toLocaleString()}</td>
                  <td className="py-2 md:py-3 px-2 md:px-0 text-[11px] md:text-[12px] text-right tabular-nums font-bold text-[#c8922a]">AED {act.value >= 1000000 ? (act.value/1000000).toFixed(1) + 'M' : act.value >= 1000 ? (act.value/1000).toFixed(1) + 'K' : act.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default ProcurementIntelligence;

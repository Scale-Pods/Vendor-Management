import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  IconClipboardList, IconListCheck, IconTrendingUp, IconTrendingDown, 
  IconUsers, IconLayoutDashboard, IconArrowUpRight, IconArrowDownRight,
  IconFilter, IconRefresh, IconAlertTriangle, IconVersions, IconArrowsDiff,
  IconCalendar
} from '@tabler/icons-react';
import { adminSupabase as supabase } from '../../lib/supabase';
import { SearchBar } from '../ui/search-bar';

/* ─── Styles & Theme Constants ─── */
const COLORS = {
  gold: '#c8922a',
  green: '#00c896',
  red: '#ff4d4d',
  amber: '#f59e0b',
  text: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(13, 17, 23, 0.6)'
};

/* ─── Shared UI Components ─── */
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-white/5 rounded-md ${className}`} />
);

const KPIStore = ({ title, value, icon: Icon, color, trend, loading }) => (
  <div className="glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] relative flex flex-col justify-between min-h-[160px] h-full hover:border-[rgba(255,255,255,0.15)] transition-all">
    <div className="flex justify-between items-start">
      <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]" style={{ color }}>
        <Icon size={20} stroke={2} />
      </div>
      {trend !== undefined && !loading && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${trend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend >= 0 ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="mt-4">
      {loading ? (
        <Skeleton className="h-8 w-24 mb-2" />
      ) : (
        <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
      )}
      <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-widest">{title}</p>
    </div>
  </div>
);

const CurrencyKPI = ({ title, value, icon: Icon, color, loading }) => (
  <div className="glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] relative group hover:border-[rgba(255,255,255,0.15)] transition-all h-full min-h-[120px] flex flex-col justify-center">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}10`, color }}>
        <Icon size={24} stroke={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest mb-1 whitespace-nowrap">{title}</p>
        {loading ? (
          <Skeleton className="h-7 w-3/4" />
        ) : (
          <h3 className="text-xl font-black text-white truncate leading-tight">AED {Number(value || 0).toLocaleString()}</h3>
        )}
      </div>
    </div>
  </div>
);

const ReviewDashboard = ({ searchQuery = '' }) => {
  const [filters, setFilters] = useState({ project: '', supplier: '', search: '' });

  /* ─── Data Fetching ─── */
  const { data: rawData = [], isLoading: loading, error } = useQuery({
    queryKey: ['review-dashboard-data'],
    queryFn: async () => {
      const [res25, res26] = await Promise.all([
        supabase.from('material_detail_25').select('*').limit(1000000),
        supabase.from('material_detail_26').select('*').limit(1000000)
      ]);

      const mapItem = (item) => ({
        PR: item.PR || item.pr || 'N/A',
        Description: item.Description || item.description || 'No Description',
        Project: item.Project || item.project || 'Unknown',
        Supplier: item.change1_supplier || 'Unknown',
        change1_total: item.change1_total ? parseFloat(String(item.change1_total).replace(/,/g, '')) : null,
        change2_total: item.change2_total ? parseFloat(String(item.change2_total).replace(/,/g, '')) : null,
        change3_total: item.change3_total ? parseFloat(String(item.change3_total).replace(/,/g, '')) : null,
        change4_total: item.change4_total ? parseFloat(String(item.change4_total).replace(/,/g, '')) : null,
        change5_total: item.change5_total ? parseFloat(String(item.change5_total).replace(/,/g, '')) : null,
      });

      const data25 = (res25.data || []).map(mapItem);
      const data26 = (res26.data || []).map(mapItem);
      return [...data25, ...data26];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const { data: prCount2025 = 0 } = useQuery({
    queryKey: ['review-pr-count-2025'],
    queryFn: async () => {
      const { data } = await supabase.from('pr_data_25').select('PR').limit(1000000);
      return new Set((data || []).map(item => item.PR).filter(Boolean)).size;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: prCount2026 = 0 } = useQuery({
    queryKey: ['review-pr-count-2026'],
    queryFn: async () => {
      const { data } = await supabase.from('material_detail_26').select('pr').limit(1000000);
      return new Set((data || []).map(item => item.pr).filter(Boolean)).size;
    },
    staleTime: 5 * 60 * 1000,
  });

  /* ─── Helper: Get Latest Total ─── */
  const getLatestTotal = (item) => {
    // Check internal mapped fields or standard changeN fields
    for (let i = 20; i >= 2; i--) {
      const val = item[`change${i}_total`] || item[`change_in_price_${i-1}`];
      if (val !== null && val !== undefined && val !== '') {
        return parseFloat(String(val).replace(/,/g, ''));
      }
    }
    return parseFloat(String(item.change1_total || item['Net Price'] || 0).replace(/,/g, ''));
  };

  const getOriginalTotal = (item) => {
    return parseFloat(String(item.change1_total || 0).replace(/,/g, ''));
  };

  /* ─── Filter Logic ─── */
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const matchProject = !filters.project || item.Project === filters.project;
      const matchSupplier = !filters.supplier || item.Supplier === filters.supplier;

      const localSearch = filters.search.toLowerCase();
      const globalSearch = searchQuery.toLowerCase();
      const matchesLocal = !filters.search ||
        (item.PR && String(item.PR).toLowerCase().includes(localSearch)) ||
        (item.Project && String(item.Project).toLowerCase().includes(localSearch)) ||
        (item.Supplier && String(item.Supplier).toLowerCase().includes(localSearch)) ||
        (item['PO No'] && String(item['PO No']).toLowerCase().includes(localSearch));
      const matchesGlobal = !globalSearch ||
        (item.PR && String(item.PR).toLowerCase().includes(globalSearch)) ||
        (item.Project && String(item.Project).toLowerCase().includes(globalSearch)) ||
        (item.Supplier && String(item.Supplier).toLowerCase().includes(globalSearch)) ||
        (item['PO No'] && String(item['PO No']).toLowerCase().includes(globalSearch));

      return matchProject && matchSupplier && matchesLocal && matchesGlobal;
    });
  }, [rawData, filters, searchQuery]);

  /* ─── Derived Stats ─── */
  const stats = useMemo(() => {
    if (loading) return null;

    const prs = new Set(filteredData.map(i => i.PR || i.PR_No)).size;
    const itemsWithChanges = filteredData.filter(i => i.change2_total !== null && i.change2_total !== '').length;
    const itemsWithMultiple = filteredData.filter(i => i.change3_total !== null && i.change3_total !== '').length;

    let totalOriginal = 0;
    let totalLatest = 0;
    let totalSavings = 0;
    let totalIncreases = 0;

    filteredData.forEach(i => {
      const orig = getOriginalTotal(i);
      const lat = getLatestTotal(i);
      
      totalOriginal += orig;
      totalLatest += lat;

      if (lat < orig) totalSavings += (orig - lat);
      if (lat > orig) totalIncreases += (lat - orig);
    });

    return {
      totalPRs: prs,
      totalItems: filteredData.length,
      itemsWithChanges,
      itemsWithMultiple,
      totalOriginal,
      totalLatest,
      totalSavings,
      totalIncreases
    };
  }, [filteredData, loading]);

  /* ─── Multi-Change Detail Stats ─── */
  const multiChangeDetail = useMemo(() => {
    if (loading) return null;

    const oneChange = filteredData.filter(i => i.change2_total && !i.change3_total).length;
    const twoChanges = filteredData.filter(i => i.change3_total && !i.change4_total).length;
    const threeChanges = filteredData.filter(i => i.change4_total && !i.change5_total).length;
    const fourPlusChanges = filteredData.filter(i => i.change5_total).length;
    const totalChanged = oneChange + twoChanges + threeChanges + fourPlusChanges;

    const avgChanges = totalChanged > 0
      ? ((oneChange * 1 + twoChanges * 2 + threeChanges * 3 + fourPlusChanges * 4) / totalChanged).toFixed(1)
      : '0.0';

    const topMultiChange = filteredData
      .map(i => {
        let count = 0;
        for (let n = 2; n <= 6; n++) {
          if (i[`change${n}_total`] !== null && i[`change${n}_total`] !== '') count++;
        }
        const orig = getOriginalTotal(i);
        const lat = getLatestTotal(i);
        return { ...i, changeCount: count, variance: Math.abs(lat - orig) };
      })
      .filter(i => i.changeCount >= 2)
      .sort((a, b) => b.changeCount - a.changeCount || b.variance - a.variance)
      .slice(0, 8);

    const supplierMultiMap = {};
    filteredData.filter(i => i.change2_total).forEach(i => {
      const s = i.Supplier || 'Unknown';
      supplierMultiMap[s] = (supplierMultiMap[s] || 0) + 1;
    });
    const topMultiSuppliers = Object.entries(supplierMultiMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { oneChange, twoChanges, threeChanges, fourPlusChanges, totalChanged, avgChanges, topMultiChange, topMultiSuppliers };
  }, [filteredData, loading]);

  /* ─── Chart Data Processing ─── */
  const chartData = useMemo(() => {
    if (loading) return { projectData: [], distributionData: [], supplierData: [] };

    // 1. Savings vs Increases by Project
    const projMap = {};
    filteredData.forEach(i => {
      const p = i.Project || 'Unknown';
      if (!projMap[p]) projMap[p] = { project: p, savings: 0, increases: 0 };
      
      const orig = getOriginalTotal(i);
      const lat = getLatestTotal(i);
      if (lat < orig) projMap[p].savings += (orig - lat);
      if (lat > orig) projMap[p].increases += (lat - orig);
    });
    const projectData = Object.values(projMap)
      .filter(p => p.savings > 0 || p.increases > 0)
      .sort((a,b) => (b.savings + b.increases) - (a.savings + a.increases));

    // 2. Price Change Distribution
    const noChange = filteredData.filter(i => !i.change2_total).length;
    const oneChange = filteredData.filter(i => i.change2_total && !i.change3_total).length;
    const twoChanges = filteredData.filter(i => i.change3_total && !i.change4_total).length;
    const threePlusChanges = filteredData.filter(i => i.change4_total).length;

    const distributionData = [
      { name: 'No Change', value: noChange },
      { name: '1 Change', value: oneChange },
      { name: '2 Changes', value: twoChanges },
      { name: '3+ Changes', value: threePlusChanges }
    ].filter(d => d.value > 0);

    // 3. Top 10 Suppliers by Total Value
    const suppMap = {};
    filteredData.forEach(i => {
      const s = i.Supplier || 'Unknown';
      suppMap[s] = (suppMap[s] || 0) + getLatestTotal(i);
    });
    const supplierData = Object.entries(suppMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { projectData, distributionData, supplierData };
  }, [filteredData, loading]);

  /* ─── Top Increases Table Data ─── */
  const topIncreases = useMemo(() => {
    return filteredData
      .filter(i => {
        const orig = getOriginalTotal(i);
        const lat = getLatestTotal(i);
        return orig > 0 && lat > orig;
      })
      .map(i => {
        const orig = getOriginalTotal(i);
        const lat = getLatestTotal(i);
        const diffPercent = ((lat - orig) / orig) * 100;
        return { ...i, orig, lat, diffPercent };
      })
      .sort((a, b) => b.diffPercent - a.diffPercent)
      .slice(0, 20);
  }, [filteredData]);

  /* ─── Options for Dropdowns ─── */
  const projectList = useMemo(() => [...new Set(rawData.map(i => i.Project))].filter(Boolean).sort(), [rawData]);
  const supplierList = useMemo(() => [...new Set(rawData.map(i => i.Supplier))].filter(Boolean).sort(), [rawData]);

  return (
    <div className="w-full h-full text-white bg-[#0d1117] min-h-screen px-4 md:px-8 py-6">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <IconLayoutDashboard className="text-[#c8922a]" size={32} />
            Purchase Orders Dashboard
          </h2>
          <p className="text-[rgba(255,255,255,0.4)] text-sm font-medium mt-1">
            Real-time financial discrepancy analysis and PR optimization tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* PR Search */}
          <div className="w-full sm:w-64">
            <SearchBar 
              placeholder="Search PR or Supplier..." 
              value={filters.search}
              onChange={(val) => setFilters(prev => ({ ...prev, search: val }))}
            />
          </div>

          <div className="relative group">
            <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] group-focus-within:text-[#c8922a] transition-colors" size={16} />
            <select 
              className="bg-[#1a1f2e] border border-[rgba(255,255,255,0.08)] text-[13px] text-[rgba(255,255,255,0.8)] rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-[#c8922a] transition-all min-w-[220px] appearance-none cursor-pointer"
              value={filters.project}
              onChange={(e) => setFilters(f => ({ ...f, project: e.target.value }))}
            >
              <option value="">All Projects</option>
              {projectList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <IconArrowDownRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] pointer-events-none" />
          </div>

          <div className="relative group">
            <IconUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] group-focus-within:text-[#c8922a] transition-colors" size={16} />
            <select 
              className="bg-[#1a1f2e] border border-[rgba(255,255,255,0.08)] text-[13px] text-[rgba(255,255,255,0.8)] rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-[#c8922a] transition-all min-w-[220px] appearance-none cursor-pointer"
              value={filters.supplier}
              onChange={(e) => setFilters(f => ({ ...f, supplier: e.target.value }))}
            >
              <option value="">All Suppliers</option>
              {supplierList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <IconArrowDownRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.2)] pointer-events-none" />
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] transition-all"
          >
            <IconRefresh size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Row 1 KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <KPIStore title="Total PRs" value={stats?.totalPRs || 0} icon={IconClipboardList} color={COLORS.gold} loading={loading} />
        <KPIStore title="Items with Price Changes" value={stats?.itemsWithChanges || 0} icon={IconTrendingUp} color={COLORS.amber} loading={loading} />
        <KPIStore title="Changes in PR 2025" value={prCount2025} icon={IconCalendar} color="#3b82f6" loading={loading} />
        <KPIStore title="Changes in PR 2026" value={prCount2026} icon={IconCalendar} color="#8b5cf6" loading={loading} />
      </div>

      {/* Row 2 Currency KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <CurrencyKPI title="Total Original Value" value={stats?.totalOriginal || 0} icon={IconListCheck} color="rgba(255,255,255,0.4)" loading={loading} />
        <CurrencyKPI title="Total Latest Value" value={stats?.totalLatest || 0} icon={IconTrendingUp} color={COLORS.gold} loading={loading} />
        <CurrencyKPI title="Total Savings" value={stats?.totalSavings || 0} icon={IconTrendingDown} color={COLORS.green} loading={loading} />
        <CurrencyKPI title="Total Increases" value={stats?.totalIncreases || 0} icon={IconTrendingUp} color={COLORS.red} loading={loading} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Savings vs Increases by Project */}
        <div className="lg:col-span-8 glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Savings vs Increases by Project</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.green }} />
                <span className="text-[10px] text-white/40 font-bold uppercase">Savings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.red }} />
                <span className="text-[10px] text-white/40 font-bold uppercase">Increases</span>
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.projectData} layout="vertical" margin={{ left: 60, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                  <XAxis type="number" stroke={COLORS.text} fontSize={10} axisLine={false} tickFormatter={v => `AED ${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`} />
                  <YAxis dataKey="project" type="category" stroke={COLORS.text} fontSize={10} axisLine={false} width={120} tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    labelStyle={{ color: 'white', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}
                    itemStyle={{ fontSize: '11px', padding: '4px 0' }}
                    formatter={(v) => [`AED ${v.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="savings" name="Savings" fill={COLORS.green} radius={[0, 4, 4, 0]} barSize={14} />
                  <Bar dataKey="increases" name="Increases" fill={COLORS.red} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Price Change Distribution */}
        <div className="lg:col-span-4 glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] flex flex-col">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider text-center">Price Change Distribution</h3>
          <div className="flex-1 min-h-[300px]">
            {loading ? (
              <Skeleton className="w-full h-full rounded-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData.distributionData} 
                    innerRadius="65%" 
                    outerRadius="85%" 
                    paddingAngle={5} 
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[ '#1e293b', COLORS.gold, COLORS.amber, COLORS.red ][index % 4]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: 'none', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] text-center">
            <p className="text-[10px] text-[rgba(255,255,255,0.3)] uppercase font-bold tracking-[0.2em]">Total Processed Items</p>
            <h4 className="text-3xl font-black text-white mt-1">{stats?.totalItems || 0}</h4>
          </div>
        </div>

        {/* Top 10 Suppliers */}
        <div className="lg:col-span-12 glass-panel p-6 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)]">
          <h3 className="text-sm font-bold text-white mb-8 uppercase tracking-wider">Top 10 Suppliers by Total Spend</h3>
          <div className="h-[400px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.supplierData} layout="vertical" margin={{ left: 40, right: 80 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke={COLORS.text} fontSize={11} width={180} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.8)', fontWeight: 600 }} />
                  <Bar dataKey="value" fill={COLORS.gold} radius={[0, 6, 6, 0]} barSize={24}>
                    {chartData.supplierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.07)} />
                    ))}
                  </Bar>
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#1a1f2e', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: 'white', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                    formatter={(v) => [`AED ${v.toLocaleString()}`, 'Total Value']}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─── Multi-Change Items Deep Dive ─── */}
      <div className="mb-8">
        <div className="glass-panel border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] overflow-hidden">
          <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20" style={{ color: '#a855f7' }}>
                <IconVersions size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Multi-Change Items
                </h3>
                <p className="text-[10px] text-[rgba(255,255,255,0.3)] font-black uppercase mt-0.5 tracking-widest">
                  Items with 2+ price revisions — average {multiChangeDetail?.avgChanges || '0.0'} changes per item
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-white/40 font-bold">
              <IconArrowsDiff size={14} />
              {multiChangeDetail?.totalChanged || 0} items affected
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="p-6">
              {/* Tiered Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: '1 Change', value: multiChangeDetail?.oneChange || 0, color: '#c8922a', bg: 'rgba(200,146,42,0.1)', border: 'rgba(200,146,42,0.2)' },
                  { label: '2 Changes', value: multiChangeDetail?.twoChanges || 0, color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
                  { label: '3 Changes', value: multiChangeDetail?.threeChanges || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
                  { label: '4+ Changes', value: multiChangeDetail?.fourPlusChanges || 0, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
                ].map(tier => {
                  const pct = multiChangeDetail?.totalChanged > 0 ? ((tier.value / multiChangeDetail.totalChanged) * 100).toFixed(0) : '0';
                  return (
                    <div key={tier.label} className="rounded-xl p-4" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: tier.color }}>{tier.label}</span>
                        <span className="text-xs font-bold text-white/40">{pct}%</span>
                      </div>
                      <p className="text-3xl font-black text-white">{tier.value}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: tier.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Two-column: Top Items + Supplier Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Items with Most Changes */}
                <div className="lg:col-span-2">
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Items with Most Revisions</h4>
                  {multiChangeDetail?.topMultiChange?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-3 pr-3 text-[9px] font-black text-white/20 uppercase tracking-[0.15em]">PR</th>
                            <th className="pb-3 pr-3 text-[9px] font-black text-white/20 uppercase tracking-[0.15em]">Supplier</th>
                            <th className="pb-3 pr-3 text-[9px] font-black text-white/20 uppercase tracking-[0.15em] text-center">Changes</th>
                            <th className="pb-3 text-[9px] font-black text-white/20 uppercase tracking-[0.15em] text-right">Variance (AED)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {multiChangeDetail.topMultiChange.map((item, idx) => (
                            <tr key={idx} className="border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 pr-3">
                                <span className="text-white font-bold text-[12px]">{item.PR || item.Ref}</span>
                              </td>
                              <td className="py-3 pr-3 text-white/50 text-[11px] truncate max-w-[160px]">{item.Supplier || '—'}</td>
                              <td className="py-3 pr-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black"
                                  style={{
                                    background: item.changeCount >= 4 ? 'rgba(239,68,68,0.15)' : item.changeCount >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(168,85,247,0.15)',
                                    color: item.changeCount >= 4 ? '#ef4444' : item.changeCount >= 3 ? '#f59e0b' : '#a855f7',
                                  }}>
                                  <IconArrowsDiff size={10} /> {item.changeCount}
                                </span>
                              </td>
                              <td className="py-3 text-right text-white/60 font-semibold tabular-nums text-[12px]">
                                {item.variance.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.2em]">No multi-change items found</p>
                    </div>
                  )}
                </div>

                {/* Supplier Multi-Change Breakdown */}
                <div>
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Top Suppliers by Changes</h4>
                  <div className="space-y-3">
                    {multiChangeDetail?.topMultiSuppliers?.length ? (
                      multiChangeDetail.topMultiSuppliers.map(([supplier, count], idx) => {
                        const maxCount = multiChangeDetail.topMultiSuppliers[0][1];
                        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={supplier}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] text-white/70 font-medium truncate max-w-[70%]">{supplier}</span>
                              <span className="text-[11px] text-white font-bold">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, background: '#a855f7' }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.2em]">No data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Increases Table */}
      <div className="pb-10">
        <div className="glass-panel border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] overflow-hidden">
          <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <IconAlertTriangle className="text-red-500" size={18} />
                High Price Variance Items
              </h3>
              <p className="text-[10px] text-[rgba(255,255,255,0.3)] font-black uppercase mt-1 tracking-widest">Top 20 items prioritize by percentage increase</p>
            </div>
            <div className="hidden sm:flex gap-3">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-red-500 uppercase px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Critical (&gt;20%)
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-500 uppercase px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Caution (5-20%)
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[rgba(255,255,255,0.015)]">
                    <th className="px-6 py-4 font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] w-32">PR / Sr</th>
                    <th className="px-6 py-4 font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em]">Item Description</th>
                    <th className="px-6 py-4 font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] w-48">Supplier</th>
                    <th className="px-6 py-4 font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] text-right w-36">Original</th>
                    <th className="px-6 py-4 font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] text-right w-36">Latest</th>
                    <th className="px-6 py-4 font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] text-center w-32">Change %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
                  {topIncreases.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={`transition-colors group ${
                        item.diffPercent > 20 ? 'bg-red-500/2 hover:bg-red-500/4' :
                        item.diffPercent > 5 ? 'bg-amber-500/2 hover:bg-amber-500/4' :
                        'hover:bg-white/2'
                      }`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white font-bold tracking-tight">{item.PR || item.PR_No}</span>
                          <span className="text-[10px] text-[rgba(255,255,255,0.25)] font-black uppercase tracking-tighter">Sr: {item.sr_no || item.Sr_No}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-[rgba(255,255,255,0.8)] font-semibold line-clamp-2 max-w-md">{item.Description || item.item_description}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[rgba(255,255,255,0.5)] font-medium">{item.Supplier || '—'}</span>
                      </td>
                      <td className="px-6 py-5 text-right tabular-nums text-[rgba(255,255,255,0.4)] font-medium">
                        {item.orig.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-right tabular-nums text-white font-black">
                        {item.lat.toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight ${
                          item.diffPercent > 20 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          item.diffPercent > 5 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          item.diffPercent < 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          'bg-white/10 text-white/40'
                        }`}>
                          {item.diffPercent > 0 ? <IconTrendingUp size={12} /> : item.diffPercent < 0 ? <IconTrendingDown size={12} /> : null}
                          {item.diffPercent > 0 ? '+' : ''}{item.diffPercent.toFixed(1)}%
                        </div>
                        <div className="mt-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${
                            item.diffPercent > 20 ? 'text-red-500' :
                            item.diffPercent > 5 ? 'text-amber-500' :
                            'text-green-500'
                          }`}>
                            {item.diffPercent > 20 ? 'High' : item.diffPercent > 5 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {topIncreases.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" className="px-6 py-20 text-center text-white/20 font-black uppercase tracking-[0.3em]">
                        No price variances detected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewDashboard;

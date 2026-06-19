import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  FileText, Search, 
  RefreshCw, Layers,
  ShieldCheck, 
  Wallet, Target, ShoppingBag, BarChart3,
  CheckCircle, Timer
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- PREMIUM COMPONENTS (Inspired by ReviewDashboard Aesthetics) ---

const AnalyticsCard = ({ title, value, icon: Icon, color, trend, subtext }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative group p-6 rounded-[24px] bg-[#0d1117] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300"
    style={{ borderColor: color ? `${color}30` : undefined }}
  >
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.02] to-transparent rounded-[24px] pointer-events-none" />
    <div className="relative flex items-start justify-between">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white/[0.03] text-white/40">
            <Icon size={16} />
          </div>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{title}</span>
        </div>
        <div>
          <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
          {subtext && <p className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-wider">{subtext}</p>}
        </div>
      </div>
      {trend && (
        <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${
          trend.startsWith('+') ? 'text-emerald-400 bg-emerald-400/5' : 'text-rose-400 bg-rose-400/5'
        }`}>
          {trend}
        </div>
      )}
    </div>
  </motion.div>
);

const ChartContainer = ({ title, children, icon: Icon }) => (
  <div className="bg-[#0d1117] border border-white/[0.05] rounded-[32px] p-8 flex flex-col h-full">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        {Icon && <div className="text-white/20"><Icon size={18} /></div>}
        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">{title}</h3>
      </div>
    </div>
    <div className="flex-1 w-full min-h-[250px]">
      {children}
    </div>
  </div>
);

const DetailRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/[0.03] last:border-0 group cursor-default">
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color || 'rgba(255,255,255,0.1)' }} />
      <span className="text-[11px] font-bold text-white/40 group-hover:text-white/60 transition-colors uppercase tracking-tight">{label}</span>
    </div>
    <span className="text-xs font-black text-white tabular-nums">{value}</span>
  </div>
);

const Overview = ({ 
  isModalMode = false,
  initialPR = null
}) => {
  const [poSearch, setPoSearch] = useState(initialPR || '');

  const { data: rawMasterData = [], isLoading: loading } = useQuery({
    queryKey: ['po-data'],
    queryFn: async () => {
      const baseUrl = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_MASTER_PO}`;
      const response = await fetch(`${baseUrl}?action=PO%20Data`);
      if (!response.ok) throw new Error('Failed to fetch PO data');
      const json = await response.json();
      
      let data = [];
      if (Array.isArray(json)) data = json[0]?.data || json;
      else if (json?.data) data = json.data;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const fetchPulseData = () => {
    // TanStack Query handles refetching automatically
  };

  // Filter by selected PR when in modal mode
  const poMasterData = useMemo(() => {
    if (!initialPR) return rawMasterData;
    const searchPr = String(initialPR).toLowerCase().trim();
    return rawMasterData.filter(item =>
      (item['Req Ref'] && String(item['Req Ref']).toLowerCase() === searchPr) ||
      (item.Ref && String(item.Ref).toLowerCase() === searchPr) ||
      (item.PR && String(item.PR).toLowerCase() === searchPr) ||
      (item.pr && String(item.pr).toLowerCase() === searchPr) ||
      (item.PR_No && String(item.PR_No).toLowerCase() === searchPr)
    );
  }, [rawMasterData, initialPR]);

  // --- ANALYTICS ENGINE (Current Values Only, No Comparison) ---

  const analytics = useMemo(() => {
    if (loading || !poMasterData.length) return null;

    const getLatestPrice = (item) => {
      // Check versions 5 down to 1
      for (let i = 5; i >= 1; i--) {
        const val = item[`change${i}_total`] || item[`change${i}_price`] || item[`change${i}_Total`];
        if (val) {
          const num = parseFloat(String(val).replace(/,/g, ''));
          if (!isNaN(num) && num !== 0) return num;
        }
      }
      // Common field fallbacks
      const fallback = item['Total Price'] || item['Net Price'] || item.Total || item.total || item.Price || item.price || 0;
      const num = parseFloat(String(fallback).replace(/,/g, ''));
      return isNaN(num) ? 0 : num;
    };

    // Financial Metrics
    const totalNetPrice = poMasterData.reduce((acc, i) => acc + (parseFloat(String(i['Net Price'] || 0).replace(/,/g, '')) || 0), 0);
    const totalVAT = poMasterData.reduce((acc, i) => acc + (parseFloat(String(i['VAT'] || 0).replace(/,/g, '')) || 0), 0);
    const totalDiscount = poMasterData.reduce((acc, i) => acc + (parseFloat(String(i['Discount'] || 0).replace(/,/g, '')) || 0), 0);
    const grossTotal = poMasterData.reduce((acc, i) => acc + getLatestPrice(i), 0);

    // Status Breakdown
    const statuses = { Approved: 0, Pending: 0, Rejected: 0, Draft: 0 };
    poMasterData.forEach(item => {
      const s = item.Status || 'Draft';
      if (s.includes('Approved')) statuses.Approved++;
      else if (s.includes('Pending')) statuses.Pending++;
      else if (s.includes('Reject')) statuses.Rejected++;
      else statuses.Draft++;
    });

    // Supplier Distribution
    const supplierMap = {};
    poMasterData.forEach(item => {
      const s = item.Supplier || 'Unknown';
      supplierMap[s] = (supplierMap[s] || 0) + getLatestPrice(item);
    });
    const topSuppliers = Object.entries(supplierMap)
      .map(([name, value]) => ({ name, value }))
      .filter(s => s.value > 0)
      .sort((a,b) => b.value - a.value)
      .slice(0, 5);

    // Monthly Velocity
    const monthMap = {};
    poMasterData.forEach(item => {
      const m = item.Month || 'Other';
      monthMap[m] = (monthMap[m] || 0) + getLatestPrice(item);
    });
    const velocityData = Object.entries(monthMap)
      .map(([name, value]) => ({ name, value }))
      .filter(v => v.value > 0);

    // Project Allocation
    const projectMap = {};
    poMasterData.forEach(item => {
      let p = (item.Project || 'Main').trim();
      if (p.startsWith('AMANA ')) p = 'S' + p;
      projectMap[p] = (projectMap[p] || 0) + getLatestPrice(item);
    });
    const projectData = Object.entries(projectMap)
      .map(([name, value]) => ({ name, value }))
      .filter(p => p.value > 0)
      .sort((a,b) => b.value - a.value)
      .slice(0, 6)
      .map((item, i) => ({
        ...item,
        color: ['#c8922a', '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'][i]
      }));

    return {
      financials: {
        gross: grossTotal,
        net: totalNetPrice,
        vat: totalVAT,
        discount: totalDiscount
      },
      status: statuses,
      topSuppliers,
      velocityData,
      projectData,
      totalCount: poMasterData.length
    };
  }, [poMasterData, loading]);

  const formatCurrency = (val) => {
    if (val >= 1000000) return `${(val/1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val/1000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/5 border-t-amber-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-amber-500/40">
            <ShieldCheck size={24} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Syncing Operational Data</p>
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Bridging po_data stream...</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck size={48} className="text-white/10" />
          <p className="text-sm font-bold text-white/30 uppercase tracking-[0.3em]">
            {initialPR ? `No records found for PR: ${initialPR}` : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${isModalMode ? "p-0" : "p-8 lg:p-12"}`}>
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/[0.03] blur-[120px]" />
        <div className="absolute top-[20%] right-[0%] w-[30%] h-[30%] rounded-full bg-indigo-500/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto space-y-12">
        {/* TOP COMMAND BAR */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 py-4">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
              <BarChart3 size={28} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Current PO Analytics</h1>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[9px] font-black tracking-widest">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> LIVE STREAM
                </span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Authenticated System Protocol active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Search Current Records..." 
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs text-white placeholder:text-white/20 w-[280px] outline-none focus:border-amber-500/30 transition-all group-hover:bg-white/[0.07]"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            </div>
            <button onClick={fetchPulseData} className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        {/* PRIMARY ANALYTICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard 
            title="Total Valuation" 
            value={`AED ${formatCurrency(analytics.financials.gross)}`} 
            icon={Target} 
            color="#F59E0B"
            subtext="Gross capital in system"
          />
          <AnalyticsCard 
            title="Active Records" 
            value={analytics.totalCount.toLocaleString()} 
            icon={FileText} 
            color="#6366F1"
            subtext="Current Master Count"
          />
          <AnalyticsCard 
            title="Financial Outflow" 
            value={`AED ${formatCurrency(analytics.financials.net)}`} 
            icon={Wallet} 
            color="#10B981"
            subtext="Net values after charges"
          />
          <AnalyticsCard 
            title="Tax Liability" 
            value={`AED ${formatCurrency(analytics.financials.vat)}`} 
            icon={ShoppingBag} 
            color="#EC4899"
            subtext="Computed VAT aggregate"
          />
        </div>

        {/* ANALYTICS WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: Financial Breakdown & Status */}
          <div className="lg:col-span-4 space-y-8">
            {/* STATUS PULSE */}
            <div className="bg-[#0d1117] border border-white/[0.05] rounded-[32px] p-8">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-8">Operational Status Pulse</h3>
              <div className="space-y-2">
                <DetailRow label="Approved Protocol" value={analytics.status.Approved} color="#10B981" />
                <DetailRow label="Awaiting Approval" value={analytics.status.Pending} color="#F59E0B" />
                <DetailRow label="Rejected/Void" value={analytics.status.Rejected} color="#EF4444" />
                <DetailRow label="Draft Records" value={analytics.status.Draft} color="rgba(255,255,255,0.2)" />
              </div>
              <div className="mt-8 pt-8 border-t border-white/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Approval Velocity</p>
                  <p className="text-xl font-black text-white">{((analytics.status.Approved / analytics.totalCount) * 100).toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center">
                  <CheckCircle className="text-emerald-500" size={16} />
                </div>
              </div>
            </div>

            {/* TOP SUPPLIERS TABLE */}
            <div className="bg-[#0d1117] border border-white/[0.05] rounded-[32px] overflow-hidden">
              <div className="p-8 pb-4">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Key Supplier Impact</h3>
              </div>
              <div className="px-8 pb-8 space-y-4">
                {analytics.topSuppliers.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.03] rounded-2xl hover:bg-white/[0.05] transition-colors group cursor-pointer">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[11px] font-black text-white/80 truncate uppercase tracking-tight">{s.name}</span>
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Tier {i+1} Partner</span>
                    </div>
                    <span className="text-[12px] font-black text-amber-500 tabular-nums">AED {formatCurrency(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Charts & Trends */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ASSET ALLOCATION */}
              <ChartContainer title="Asset Domain Allocation" icon={Layers}>
                <div className="h-full relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active Domains</span>
                    <span className="text-2xl font-black text-white tracking-tighter">{analytics.projectData.length}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={analytics.projectData} 
                        innerRadius={80} 
                        outerRadius={105} 
                        paddingAngle={5} 
                        dataKey="value" 
                        stroke="none"
                      >
                        {analytics.projectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={6} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              {/* MONTHLY VELOCITY */}
              <ChartContainer title="Capital Velocity Trend" icon={Timer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.velocityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 'bold'}} 
                    />
                    <YAxis 
                      hide 
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.02)'}}
                      contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24}>
                      {analytics.velocityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#4f46e5'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* FLOW ANALYSIS */}
            <div className="bg-[#0d1117] border border-white/[0.05] rounded-[32px] p-8">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-8">System Flow Analysis</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.velocityData}>
                    <defs>
                      <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c8922a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#c8922a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#c8922a" strokeWidth={3} fillOpacity={1} fill="url(#flowGradient)" />
                    <Tooltip contentStyle={{ background: '#0d1117', border: 'none', borderRadius: '12px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Overview;

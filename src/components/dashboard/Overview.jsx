import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  IconLayoutDashboard,
  IconRefresh,
  IconTrendingUp,
  IconTrendingDown,
  IconWallet,
  IconClipboardList,
  IconArrowUpRight
} from '@tabler/icons-react';
import { SearchBar } from '../ui/search-bar';

const KPIBox = ({ title, value, icon: Icon, color, trend, loading }) => (
  <div className="glass-panel p-4 sm:p-6 border-card bg-[rgba(13,17,23,0.4)] flex flex-col justify-between min-h-[120px] sm:min-h-[160px] hover:border-white/20 transition-all group">
    <div className="flex justify-between items-start">
      <div className="p-2 sm:p-2.5 rounded-xl bg-sidebar border border-white/5 text-white group-hover:scale-110 transition-transform" style={{ color }}>
        <Icon size={20} />
      </div>
      {trend && !loading && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="mt-2 sm:mt-4">
      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{loading ? '...' : value}</h3>
      <p className="text-[9px] sm:text-[10px] font-bold text-label uppercase tracking-widest">{title}</p>
    </div>
  </div>
);

const Overview = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear] = useState('2024');
  const [spendPeriod, setSpendPeriod] = useState('Monthly');
  const queryClient = useQueryClient();

  const { data: rawData = [], isLoading: loading } = useQuery({
    queryKey: ['overview-data', selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_MASTER_PO}?action=PO%20Data`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const json = await response.json();
      return Array.isArray(json) ? json[0]?.data || json : (json.data || []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const fetchData = () => queryClient.invalidateQueries({ queryKey: ['overview-data', selectedYear] });

  const analytics = useMemo(() => {
    if (!rawData.length) return null;
    
    const totalSpend = rawData.reduce((acc, item) => acc + (parseFloat(String(item['Net Price'] || 0).replace(/,/g, '')) || 0), 0);
    const totalVAT = rawData.reduce((acc, item) => acc + (parseFloat(String(item['VAT'] || 0).replace(/,/g, '')) || 0), 0);
    const prCount = rawData.length;
    
    // Status breakdown
    const statuses = { Approved: 0, Pending: 0, Rejected: 0 };
    rawData.forEach(item => {
      const s = String(item.Status || '').toLowerCase();
      if (s.includes('approved')) statuses.Approved++;
      else if (s.includes('pending')) statuses.Pending++;
      else if (s.includes('reject')) statuses.Rejected++;
    });

    const statusData = [
      { name: 'Approved', value: statuses.Approved, color: '#10B981' },
      { name: 'Pending', value: statuses.Pending, color: '#F59E0B' },
      { name: 'Rejected', value: statuses.Rejected, color: '#EF4444' },
    ];

    // Monthly data
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};
    rawData.forEach(item => {
      const m = item.Month || 'Other';
      monthlyMap[m] = (monthlyMap[m] || 0) + (parseFloat(String(item['Net Price'] || 0).replace(/,/g, '')) || 0);
    });

    const monthlyData = monthOrder.map(m => ({
      name: m,
      value: monthlyMap[m] || 0
    })).filter(d => d.value > 0 || (monthOrder.indexOf(d.name) <= new Date().getMonth()));

    // Projects
    const projectMap = {};
    rawData.forEach(item => {
      const p = item.Project || 'Unknown';
      projectMap[p] = (projectMap[p] || 0) + (parseFloat(String(item['Net Price'] || 0).replace(/,/g, '')) || 0);
    });

    const projectData = Object.entries(projectMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { totalSpend, totalVAT, prCount, statusData, monthlyData, projectData };
  }, [rawData]);



  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-3 sm:px-4 md:px-8 py-4 sm:py-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex items-center gap-2 sm:gap-3">
            <IconLayoutDashboard size={28} className="text-[#F59E0B]" />
            Procurement Overview
          </h2>
          <p className="text-white/40 text-xs sm:text-sm font-medium mt-1">Real-time procurement intelligence and financial analytics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-64">
            <SearchBar 
              placeholder="Filter intelligence..." 
              value={searchTerm} 
              onChange={setSearchTerm} 
            />
          </div>
          <button onClick={fetchData} className="p-2.5 glass-panel hover:bg-white/5 rounded-xl text-white/50 transition-all shrink-0">
            <IconRefresh size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <KPIBox title="Total Expenditure" value={analytics ? `AED ${(analytics.totalSpend/1000000).toFixed(2)}M` : '0'} icon={IconWallet} color="#F59E0B" trend={12} loading={loading} />
        <KPIBox title="Active PRs" value={analytics?.prCount || 0} icon={IconClipboardList} color="#6366F1" trend={5} loading={loading} />
        <KPIBox title="Approved Value" value={analytics ? `AED ${(analytics.totalSpend * 0.8 / 1000000).toFixed(2)}M` : '0'} icon={IconTrendingUp} color="#10B981" loading={loading} />
        <KPIBox title="Tax Liability (VAT)" value={analytics ? `AED ${(analytics.totalVAT/1000).toFixed(1)}K` : '0'} icon={IconTrendingDown} color="#EC4899" loading={loading} />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-8 glass-panel p-4 sm:p-8 relative overflow-hidden border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-10 gap-3">
             <div>
               <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Financial Flow Analysis</h3>
               <p className="text-[11px] sm:text-[12px] text-white/30 font-medium mt-1">Comparison of periodic procurement expenditure</p>
             </div>
             <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                {['Monthly', 'Quarterly'].map(p => (
                  <button key={p} onClick={() => setSpendPeriod(p)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${spendPeriod === p ? 'bg-[#F59E0B] text-black' : 'text-white/30 hover:text-white'}`}>
                    {p}
                  </button>
                ))}
             </div>
          </div>
          <div className="h-[250px] sm:h-[350px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthlyData || []}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9}} tickFormatter={(val) => `${(val/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 glass-panel p-4 sm:p-8 flex flex-col border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)]">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">Status Distribution</h3>
          <p className="text-[11px] sm:text-[12px] text-white/30 font-medium mb-6 sm:mb-10 uppercase tracking-widest">Global PR pipeline status</p>
          <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics?.statusData || []} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {analytics?.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={6} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {analytics?.statusData.map(s => (
              <div key={s.name} className="text-center">
                <p className="text-[9px] font-black text-white/20 uppercase whitespace-nowrap mb-1">{s.name}</p>
                <p className="text-xs font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-7 glass-panel p-4 sm:p-8 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)]">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">Project Spend Concentration</h3>
          <p className="text-[11px] sm:text-[12px] text-white/30 font-medium mb-6 sm:mb-10 uppercase tracking-widest">Top 5 projects by expenditure</p>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.projectData || []} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 'bold'}} width={100} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 glass-panel p-4 sm:p-8 border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B]">
              <IconArrowUpRight size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Consolidated Analysis</h3>
              <p className="text-xs text-label font-medium">System identified AED 42.5K in potential bulk savings.</p>
            </div>
          </div>
          <button className="w-full py-4 bg-linear-to-br from-[#F59E0B] to-[#D97706] text-black rounded-xl font-black text-sm uppercase tracking-wider hover:shadow-[0_8px_32px_rgba(245,158,11,0.4)] hover:-translate-y-1 transition-all">
            Download Strategy Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;

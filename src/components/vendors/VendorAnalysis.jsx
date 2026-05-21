import React, { useState, useEffect } from 'react';
import { IconRefresh } from '@tabler/icons-react';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  BarChart3,
  Search,
  ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { supplierComparisonData } from '../../data/mockData';
import { SearchBar } from '../ui/search-bar';
import { processPRItems } from '../../utils/prUtils';

const VendorCard = ({ name, totalSpend, avgPrice, reliability, items, index }) => (
  <div 
    className="glass-panel p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 stagger-item"
    style={{ animationDelay: `${index * 80}ms` }}
  >
    <div className="flex justify-between items-start mb-8">
      <div className="w-14 h-14 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl flex items-center justify-center text-white text-xl font-black group-hover:bg-[#F59E0B] group-hover:text-black transition-all duration-500">
        {name.charAt(0)}
      </div>
      <button className="text-[rgba(255,255,255,0.3)] hover:text-[#F59E0B] transition-colors p-2">
        <ExternalLink size={20} />
      </button>
    </div>
    
    <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{name}</h3>
    <p className="text-[13px] text-[rgba(255,255,255,0.4)] font-medium mb-8">{items} purchase orders tracked</p>

    <div className="grid grid-cols-2 gap-6 pt-8 border-t border-[rgba(255,255,255,0.08)]">
      <div>
        <p className="text-[10px] font-bold text-[rgba(255,255,255,0.25)] uppercase mb-2 tracking-widest">Total Spend</p>
        <p className="text-sm font-bold text-white" style={{ fontFamily: "'DM Mono', monospace" }}>AED {totalSpend.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-[rgba(255,255,255,0.25)] uppercase mb-2 tracking-widest">Avg. Price</p>
        <p className="text-sm font-bold text-white" style={{ fontFamily: "'DM Mono', monospace" }}>AED {avgPrice.toLocaleString()}</p>
      </div>
    </div>

    <div className="mt-8">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-bold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Reliability Score</span>
        <span className="text-[11px] font-black text-[#F59E0B]">{reliability}%</span>
      </div>
      <div className="w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
          style={{ width: `${reliability}%` }}
        ></div>
      </div>
    </div>
  </div>
);

const VendorAnalysis = () => {
  const [vendorData, setVendorData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/n8n/webhook/971719b0-cac4-4362-a99a-6b867f5f9d3e?action=25`);
        const json = await response.json();
        let rawItems = [];
        if (Array.isArray(json)) {
          rawItems = json[0]?.data || json;
        } else if (json?.data) {
          rawItems = json.data;
        }
        
        const processed = processPRItems(rawItems);
        
        // Aggregate by Supplier
        const supplierMap = {};
        processed.forEach(item => {
          const s = item.Supplier || 'Unknown';
          if (!supplierMap[s]) {
            supplierMap[s] = { name: s, totalSpend: 0, items: 0, totalRate: 0, rateCount: 0, changes: 0 };
          }
          supplierMap[s].totalSpend += parseFloat(item.Total) || 0;
          supplierMap[s].items++;
          if (item.Rate) {
            supplierMap[s].totalRate += parseFloat(item.Rate);
            supplierMap[s].rateCount++;
          }
          if (item._hasChanges) supplierMap[s].changes++;
        });

        const vendors = Object.values(supplierMap).map(v => ({
          ...v,
          value: v.totalSpend, // for chart
          avgPrice: v.rateCount > 0 ? Math.round(v.totalRate / v.rateCount) : 0,
          reliability: Math.max(70, 100 - Math.round((v.changes / v.items) * 100)) // Heuristic reliability
        })).sort((a, b) => b.totalSpend - a.totalSpend);

        setVendorData(vendors);
      } catch (err) {
        console.error('Vendor fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const topVendors = vendorData.slice(0, 3);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 stagger-item">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Vendor Intelligence</h1>
          <p className="text-[rgba(255,255,255,0.4)] font-medium">Benchmarking supplier performance and financial efficiency metrics.</p>
        </div>
        <div className="flex items-center gap-4">
          {loading && <IconRefresh className="w-5 h-5 text-[#F59E0B] animate-spin" />}
          <div className="w-72">
            <SearchBar placeholder="Search suppliers..." />
          </div>
        </div>
      </div>

      {/* Top Performing Vendors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topVendors.length > 0 ? topVendors.map((v, i) => (
          <VendorCard key={i} index={i+1} name={v.name} totalSpend={v.totalSpend} avgPrice={v.avgPrice} reliability={v.reliability} items={v.items} />
        )) : loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="glass-panel h-64 animate-pulse" />)
        ) : null}
      </div>

      {/* Spend Comparison Chart */}
      <div className="glass-panel p-8 stagger-item" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-xl flex items-center justify-center text-[#F59E0B]">
               <BarChart3 size={22} />
             </div>
             <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Supplier Spend Distribution</h3>
                <p className="text-[12px] text-[rgba(255,255,255,0.4)] font-medium">Comparison of total procurement volume per vendor</p>
             </div>
           </div>
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={vendorData.slice(0, 8)} margin={{ left: 40, right: 60 }}>
              <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600}} 
              />
              <Tooltip 
                 cursor={{fill: 'rgba(255,255,255,0.03)'}}
                 contentStyle={{ 
                  backgroundColor: 'rgba(6, 9, 15, 0.9)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)'
                }}
                 itemStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                 formatter={(value) => [`AED ${value.toLocaleString()}`, 'Total Spend']}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={35}>
                {vendorData.slice(0, 8).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="url(#vendorBarGradient)" 
                    style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.3))' }}
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="vendorBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(245,158,11,0.4)" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};


export default VendorAnalysis;

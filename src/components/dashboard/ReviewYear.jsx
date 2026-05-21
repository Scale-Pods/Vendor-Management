import React, { useState, useEffect, useCallback } from 'react';
import { IconSearch, IconRefresh, IconArrowRight, IconCalendar, IconX } from '@tabler/icons-react';
import Overview from './Overview';
import BoxLoader from '../ui/BoxLoader';
import { SearchBar } from '../ui/search-bar';

const ReviewYear = ({ year, action }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditPR, setSelectedAuditPR] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/n8n/webhook/971719b0-cac4-4362-a99a-6b867f5f9d3e?action=${action}`);
      const result = await response.json();
      const records = Array.isArray(result) ? result : result.data || [];
      setData(records);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <IconCalendar size={28} className="text-[#F59E0B]" />
            Procurement Review {year}
          </h2>
          <p className="text-[rgba(255,255,255,0.4)] font-medium mt-1">Found {data.length} records requiring audit for this period.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 z-50">
            <SearchBar 
              placeholder="Search records..." 
              value={searchTerm} 
              onChange={setSearchTerm} 
            />
          </div>
          <button onClick={fetchData} className="p-2.5 glass-panel hover:bg-[rgba(255,255,255,0.05)] rounded-xl text-[rgba(255,255,255,0.5)] transition-all">
            <IconRefresh size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border-[rgba(255,255,255,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">PR Number</th>
                <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <BoxLoader />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[rgba(255,255,255,0.3)] font-medium">No records found for the current filter.</td>
                </tr>
              ) : (
                filteredData.map((record, idx) => (
                  <tr key={idx} onClick={() => setSelectedAuditPR(record.PR || record.PR_No)} className="group cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-all">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white uppercase">{record.PR || record.PR_No || 'N/A'}</span>
                        <span className="text-[10px] text-[rgba(255,255,255,0.3)] uppercase font-black tracking-widest mt-0.5">PURCHASE REQUEST</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[13px] text-[rgba(255,255,255,0.65)] font-medium">{record.Project || 'N/A'}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="p-2 inline-flex bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] group-hover:bg-[#F59E0B] group-hover:text-black rounded-lg transition-all">
                        <IconArrowRight size={18} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Overlay Modal */}
      {selectedAuditPR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedAuditPR(null)}></div>
          <div className="relative w-full h-full max-w-[1400px] glass-panel shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[rgba(255,255,255,0.1)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.2)]">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <IconCalendar className="text-[#F59E0B]" />
                  Audit Review — {selectedAuditPR}
                </h3>
                <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-black uppercase tracking-widest mt-1">AI-Powered Verification Engine</p>
              </div>
              <button 
                onClick={() => setSelectedAuditPR(null)} 
                className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.5)] transition-all hover:rotate-90"
              >
                <IconX size={28} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar px-12 py-10">
              <Overview darkMode={true} initialPR={selectedAuditPR} isModalMode={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewYear;

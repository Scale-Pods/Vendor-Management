import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  IconRefresh,
  IconCalendar,
  IconArrowRight
} from '@tabler/icons-react';
import BoxLoader from '../ui/BoxLoader';
import { SearchBar } from '../ui/search-bar';

const ReviewYear = ({ year, action, onAuditSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['review-year', action],
    queryFn: async () => {
      const response = await fetch(`/api/n8n/webhook/971719b0-cac4-4362-a99a-6b867f5f9d3e?action=${action}`);
      if (!response.ok) throw new Error('Failed to fetch review data');
      const result = await response.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const fetchData = () => queryClient.invalidateQueries({ queryKey: ['review-year', action] });

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative px-4 md:px-8">
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
                    <tr key={idx} onClick={() => onAuditSelect(record.PR || record.PR_No)} className="group cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-all">
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
      </div>
    </>
  );
};

export default ReviewYear;

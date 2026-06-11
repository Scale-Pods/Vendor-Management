import { useState, useMemo, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  IconRefresh,
  IconCalendar,
  IconArrowRight,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons-react';
import BoxLoader from '../ui/BoxLoader';
import { SearchBar } from '../ui/search-bar';

const ReviewYear = ({ year, action, onAuditSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPrs, setExpandedPrs] = useState(new Set());
  const queryClient = useQueryClient();

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ['review-year', action],
    queryFn: async () => {
      const response = await fetch(`/api/n8n/webhook/971719b0-cac4-4362-a99a-6b867f5f9d3e?action=${action}`);
      if (!response.ok) throw new Error('Failed to fetch review data');
      const result = await response.json();
      const data = Array.isArray(result) ? result : (result.data || []);
      return data.map(item => ({
        ...item,
        PR: item.PR || item.pr || item.PR_No || 'N/A',
        Project: item.Project || item.project || 'N/A',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const fetchData = () => queryClient.invalidateQueries({ queryKey: ['review-year', action] });

  const groupedData = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      const pr = item.PR || 'N/A';
      if (!map.has(pr)) {
        map.set(pr, {
          PR: pr,
          Project: item.Project || 'N/A',
          items: [],
          previousCharges: null,
          currentCharges: null,
        });
      }
      const g = map.get(pr);
      g.items.push(item);
      const prev = item['Previous Charges'] ?? item.Previous_Charges ?? item.previous_charges ?? null;
      const curr = item['Current Charges'] ?? item.Current_Charges ?? item.current_charges ?? null;
      if (prev != null) g.previousCharges = prev;
      if (curr != null) g.currentCharges = curr;
    });
    return Array.from(map.values());
  }, [data]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedData;
    const q = searchTerm.toLowerCase();
    return groupedData.filter(group =>
      String(group.PR).toLowerCase().includes(q) ||
      String(group.Project).toLowerCase().includes(q) ||
      group.items.some(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(q)
        )
      )
    );
  }, [groupedData, searchTerm]);

  const toggleExpand = (pr) => {
    setExpandedPrs(prev => {
      const next = new Set(prev);
      if (next.has(pr)) next.delete(pr);
      else next.add(pr);
      return next;
    });
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative px-4 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <IconCalendar size={28} className="text-[#F59E0B]" />
              Procurement Review {year}
            </h2>
            <p className="text-[rgba(255,255,255,0.4)] font-medium mt-1">{data.length} records across {groupedData.length} PRs requiring audit for this period.</p>
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
                  <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider w-10"></th>
                  <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">PR Number</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <BoxLoader />
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[rgba(255,255,255,0.3)] font-medium">No records found for the current filter.</td>
                  </tr>
                ) : (
                  filteredGroups.map((group) => {
                    const materialItems = group.items.filter(item =>
                      item.Description || item.description || item['Material'] || item.material
                    );
                    return (
                    <Fragment key={group.PR}>
                      <tr 
                        onClick={() => toggleExpand(group.PR)} 
                        className="group cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-all border-b border-[rgba(255,255,255,0.04)]"
                      >
                        <td className="px-6 py-5 w-10">
                          {expandedPrs.has(group.PR) ? (
                            <IconChevronDown size={18} className="text-[rgba(255,255,255,0.3)]" />
                          ) : (
                            <IconChevronRight size={18} className="text-[rgba(255,255,255,0.3)]" />
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white uppercase">{group.PR}</span>
                            <span className="text-[10px] text-[rgba(255,255,255,0.3)] uppercase font-black tracking-widest mt-0.5">PURCHASE REQUEST</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[13px] text-[rgba(255,255,255,0.65)] font-medium">{group.Project}</td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-[#F59E0B]">{materialItems.length} material{materialItems.length !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onAuditSelect(group.PR); }}
                            className="p-2 inline-flex bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] hover:bg-[#F59E0B] hover:text-black rounded-lg transition-all"
                          >
                            <IconArrowRight size={18} />
                          </button>
                        </td>
                      </tr>
                      {expandedPrs.has(group.PR) && (
                        <tr className="bg-[rgba(255,255,255,0.01)]">
                          <td colSpan={5} className="px-0 py-0">
                            {(group.previousCharges != null || group.currentCharges != null) && (
                              <div className="flex items-center gap-8 px-6 py-3 bg-[rgba(245,158,11,0.04)] border-b border-[rgba(255,255,255,0.04)]">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Previous:</span>
                                  <span className="text-xs font-bold text-white">{group.previousCharges}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Current:</span>
                                  <span className="text-xs font-bold text-[#F59E0B]">{group.currentCharges}</span>
                                </div>
                              </div>
                            )}
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-t border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)]">
                                  <th className="px-6 py-2 text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-wider w-10"></th>
                                  <th className="px-6 py-2 text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-wider">#</th>
                                  <th className="px-6 py-2 text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-wider">Description</th>
                                  <th className="px-6 py-2 text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-wider">Previous Charges</th>
                                  <th className="px-6 py-2 text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-wider">Current Charges</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                                {materialItems.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                                    <td className="px-6 py-2.5"></td>
                                    <td className="px-6 py-2.5 text-xs text-[rgba(255,255,255,0.4)] font-mono">
                                      {item['Sr.No'] || item.Sr_No || item.sr_no || item['SR NO'] || idx + 1}
                                    </td>
                                    <td className="px-6 py-2.5 text-xs text-[rgba(255,255,255,0.7)]">
                                      {item.Description || item.description || item['Material'] || item.material || '-'}
                                    </td>
                                    <td className="px-6 py-2.5 text-xs text-[rgba(255,255,255,0.5)]">
                                      {item['Previous Charges'] ?? item.Previous_Charges ?? item.previous_charges ?? group.previousCharges ?? '-'}
                                    </td>
                                    <td className="px-6 py-2.5 text-xs text-[rgba(255,255,255,0.7)]">
                                      {item['Current Charges'] ?? item.Current_Charges ?? item.current_charges ?? group.currentCharges ?? '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                    );
                  })
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

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight, 
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  MessageSquare,
  Tag,
  Clock,
  History
} from 'lucide-react';
import { mockPRData } from '../../data/mockData';
import { processPRItems } from '../../utils/prUtils';

const StatusBadge = ({ status }) => {
  const styles = {
    'Changed': 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]',
    'Same': 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]',
    'New': 'bg-[rgba(99,102,241,0.1)] text-[#6366F1] border-[rgba(99,102,241,0.2)]',
  };
  
  const displayStatus = status || 'Changed';
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-tight ${styles[displayStatus] || styles['Changed']}`}>
      {displayStatus}
    </span>
  );
};


const ChangeItem = ({ label, oldVal, newVal, status }) => {
  const colors = {
    increase: { text: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    decrease: { text: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
    modified: { text: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' },
    same: { text: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
  }[status || 'modified'];

  const Icon = {
    increase: ArrowUpRight,
    decrease: ArrowDownRight,
    modified: ChevronRight,
    same: Minus
  }[status || 'modified'];

  return (
    <div className="py-5 border-b border-[rgba(255,255,255,0.05)] last:border-0">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">{label}</span>
        <span 
          className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-tighter"
          style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
        >
          <Icon size={12} strokeWidth={3} />
          {status || 'MODIFIED'}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <p className="text-[9px] text-[rgba(255,255,255,0.2)] mb-1 uppercase font-bold">PREVIOUS</p>
          <p className="text-sm font-medium text-[rgba(255,255,255,0.4)] line-through decoration-[rgba(255,255,255,0.1)]">
            {oldVal || 'N/A'}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-[9px] text-[rgba(255,255,255,0.2)] mb-1 uppercase font-bold">CURRENT</p>
          <p className="text-sm font-bold text-white">
            {newVal || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

const HistoryCard = ({ state }) => {
  return (
    <div className="p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest">{state.version}</span>
        <div className="flex items-center gap-1 text-[9px] text-[rgba(255,255,255,0.3)] font-bold uppercase">
          <Clock size={10} />
          Audit Logged
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] text-[rgba(255,255,255,0.5)] leading-relaxed">
          <span className="text-[rgba(255,255,255,0.2)] uppercase font-bold mr-2">DESC:</span>
          {state.description || 'No description provided'}
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <p className="text-[rgba(255,255,255,0.4)]">
            <span className="text-[rgba(255,255,255,0.2)] uppercase font-bold mr-2">QTY:</span>
            {state.qty}
          </p>
          {state.total && (
            <p className="text-white font-bold">
              <span className="text-[rgba(255,255,255,0.2)] uppercase font-bold mr-2">VAL:</span>
              AED {state.total}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


const PRTable = ({ showChangesOnly = false }) => {
  const [selectedPR, setSelectedPR] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [comments, setComments] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_BASE}/971719b0-cac4-4362-a99a-6b867f5f9d3e?action=25`);
        const json = await response.json();
        let rawItems = [];
        if (Array.isArray(json)) {
          rawItems = json[0]?.data || json;
        } else if (json?.data) {
          rawItems = json.data;
        }
        
        const processed = processPRItems(rawItems);
        setData(processed);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data
    .filter(pr => showChangesOnly ? pr._hasChanges : true)
    .filter(pr => 
      (pr.PR || pr.PR_No || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pr.Supplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pr.Project || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pr.Description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="relative space-y-6 stagger-item">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white">
          {showChangesOnly ? 'Change Detection Alerts' : 'PR/PO Records'}
        </h2>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {loading && <IconRefresh className="w-5 h-5 text-[#F59E0B] animate-spin" />}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
            <input 
              type="text" 
              placeholder="Filter records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-sm text-white focus:border-[rgba(245,158,11,0.5)] focus:ring-[3px] focus:ring-[rgba(245,158,11,0.08)] transition-all outline-none"
            />
          </div>
          <button className="p-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[10px] text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.07)]">
                <th className="px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">PR Number</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Latest Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-[rgba(255,255,255,0.05)] rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredData.map((pr, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => setSelectedPR(pr)}
                  className={`group hover:bg-[rgba(245,158,11,0.05)] cursor-pointer transition-colors ${selectedPR?.id === pr.id ? 'bg-[rgba(245,158,11,0.05)]' : ''}`}
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-white uppercase">{pr.PR || pr.PR_No}</span>
                    <p className="text-[11px] text-[rgba(255,255,255,0.4)]">SN: {pr.Sr_No}</p>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-[rgba(255,255,255,0.5)] font-medium max-w-[200px] truncate">{pr.Project || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <p className="text-[13px] font-bold text-[rgba(255,255,255,0.8)] max-w-[300px] truncate">
                      {pr.Description}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-white">{pr.Req_Qty} {pr.UOM}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={pr._hasChanges ? 'Changed' : 'Same'} />
                      {pr._hasChanges && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded text-[9px] font-black border border-[rgba(245,158,11,0.2)]">
                          V{pr._history.length + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-all text-[rgba(255,255,255,0.5)]">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredData.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[rgba(255,255,255,0.3)] font-medium">No records found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Side Panel (Drawer) */}
      {selectedPR && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setSelectedPR(null)}></div>
          <div className="relative w-full max-w-md glass-panel !rounded-none !border-y-0 !border-r-0 border-l border-[rgba(255,255,255,0.1)] h-full flex flex-col animate-slide-in-right shadow-2xl">
            <div className="p-8 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{selectedPR.PR || selectedPR.PR_No}</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.4)] font-medium">Version History & Comparison</p>
              </div>
              <button onClick={() => setSelectedPR(null)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.5)] transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <section>
                <h4 className="text-[10px] font-bold text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] mb-4">Current Revision (Latest)</h4>
                <div className="p-5 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)] rounded-[16px] space-y-4">
                  <div>
                    <p className="text-[9px] text-[rgba(255,255,255,0.3)] mb-1 uppercase font-bold tracking-wider">PROJECT</p>
                    <p className="text-[13px] font-bold text-white">{selectedPR.Project || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-[rgba(255,255,255,0.3)] mb-1 uppercase font-bold tracking-wider">QUANTITY</p>
                      <p className="text-[13px] font-bold text-white">{selectedPR.Req_Qty} {selectedPR.UOM}</p>
                    </div>
                    {selectedPR.Total && (
                      <div>
                        <p className="text-[9px] text-[rgba(255,255,255,0.3)] mb-1 uppercase font-bold tracking-wider">TOTAL PRICE</p>
                        <p className="text-[13px] font-bold text-[#F59E0B]">AED {selectedPR.Total}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] text-[rgba(255,255,255,0.3)] mb-1 uppercase font-bold tracking-wider">DESCRIPTION</p>
                    <p className="text-[13px] text-[rgba(255,255,255,0.7)] leading-relaxed">{selectedPR.Description}</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-[10px] font-bold text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] flex items-center gap-2">
                    <History size={14} /> Revision History
                  </h4>
                  <span className="text-[9px] px-2.5 py-0.5 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.1)] rounded-full font-black tracking-tighter">
                    {selectedPR._history.length + 1} TOTAL VERSIONS
                  </span>
                </div>
                
                <div className="space-y-4">
                  {selectedPR._history.map((hist, idx) => (
                    <HistoryCard key={idx} state={hist} />
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                  <MessageSquare size={16} /> Audit Notes
                </h4>
                <textarea 
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter audit notes for this revision..."
                  className="w-full p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-[12px] text-sm min-h-[100px] focus:border-[rgba(245,158,11,0.5)] focus:ring-[3px] focus:ring-[rgba(245,158,11,0.08)] transition-all mb-5 text-white placeholder:text-[rgba(255,255,255,0.2)] outline-none"
                />
                <button className="w-full py-4 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-black rounded-[12px] text-[14px] font-black shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:-translate-y-1 transition-all active:scale-95">
                  Verify Revision
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PRTable;

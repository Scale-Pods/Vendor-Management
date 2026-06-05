import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, FileText, 
  DollarSign, Activity, Users
} from 'lucide-react';
import { 
  IconClipboardCheck,
  IconClipboardList,
  IconAlertCircle,
  IconHistory,
  IconClock,
  IconArrowsDiff,
  IconForms,
  IconFileText,
  IconUsers,
  IconActivity,
  IconTrendingUp,
  IconTrendingDown,
  IconFilter,
  IconRefresh,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { spendTrendData, changeTypeData } from '../../data/mockData';
import { processPRItems, parseClipboardData, verifyPRWithExternal } from '../../utils/prUtils';
import { SearchBar } from '../ui/search-bar';

const StatCard = ({ title, value, subValue, icon: Icon, trend, trendValue, glowColor, index }) => (
  <div 
    className="relative glass-panel p-6 overflow-hidden group hover:-translate-y-1 transition-all duration-300 stagger-item"
    style={{ animationDelay: `${index * 80}ms` }}
  >
    <div 
      className="absolute -inset-4 opacity-15 blur-[40px] pointer-events-none group-hover:opacity-25 transition-opacity duration-300"
      style={{ background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)`, zIndex: -1 }}
    />
    <div className="flex justify-between items-start mb-6">
      <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-white" style={{ color: glowColor }}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border ${trend === 'up' ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border-[rgba(16,185,129,0.2)]' : 'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border-[rgba(239,68,68,0.2)]'}`}>
          {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trendValue}
        </span>
      )}
    </div>
    <h3 className="text-[rgba(255,255,255,0.4)] text-[11px] font-bold uppercase tracking-wider mb-1">{title}</h3>
    <div className="flex flex-col">
      <span className="text-[26px] font-bold text-white mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>{value}</span>
      <span className="text-[11px] text-[rgba(255,255,255,0.3)]">{subValue}</span>
    </div>
  </div>
);

const Overview = ({ initialPR, isModalMode }) => {
  const [poNumber, setPoNumber] = useState(initialPR || '');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('materials');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [showGlobalHistory, setShowGlobalHistory] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isVerificationMode, setIsVerificationMode] = useState(false);
  const [isAIVerifying, setIsAIVerifying] = useState(false);

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [fullData, setFullData] = useState([]);
  const [filters, setFilters] = useState({
    year: '26', // Default to 2026
    department: 'All',
    supplier: 'All',
    status: 'All'
  });

  const uniqueDepartments = React.useMemo(() => {
    const depts = new Set(fullData.map(i => i.Department).filter(Boolean));
    return ['All', ...Array.from(depts)];
  }, [fullData]);

  const uniqueSuppliers = React.useMemo(() => {
    const suppliers = new Set(fullData.map(i => i.Supplier).filter(Boolean));
    return ['All', ...Array.from(suppliers)];
  }, [fullData]);

  // Re-calculate stats when fullData or filters change
  const dashboardStats = React.useMemo(() => {
    if (fullData.length === 0) {
      return {
        totalPRs: '0',
        totalSpend: 'AED 0',
        activeSuppliers: '0',
        monthlySpend: 'AED 0',
        trendData: [],
        distributionData: changeTypeData
      };
    }

    let filtered = fullData;
    if (filters.department !== 'All') {
      filtered = filtered.filter(i => i.Department === filters.department);
    }
    if (filters.supplier !== 'All') {
      filtered = filtered.filter(i => i.Supplier === filters.supplier);
    }
    if (filters.status !== 'All') {
      filtered = filtered.filter(i => i.Status === filters.status);
    }

    // Stats Calculation
    const uniquePRs = new Set(filtered.map(i => i.PR || i.PR_No)).size;
    const totalSpendValue = filtered.reduce((acc, i) => acc + (parseFloat(i.Total) || 0), 0);
    const uniqueSuppliersCount = new Set(filtered.map(i => i.Supplier).filter(s => s)).size;
    
    // Monthly Trend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = {};
    filtered.forEach(item => {
      const dateStr = item.created_at || item.Date;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const month = months[date.getMonth()];
          trendMap[month] = (trendMap[month] || 0) + (parseFloat(item.Total) || 0);
        }
      }
    });
    
    let trendData = months.filter(m => trendMap[m]).map(m => ({ month: m, value: trendMap[m] }));
    if (trendData.length === 0) trendData = spendTrendData;

    const lastMonthWithData = months.slice().reverse().find(m => trendMap[m]);
    const latestMonthlySpend = lastMonthWithData ? trendMap[lastMonthWithData] : (totalSpendValue / 12);

    // Change Distribution
    const distribution = [
      { name: 'Price Increase', value: 0, color: '#EF4444' },
      { name: 'Price Decrease', value: 0, color: '#10B981' },
      { name: 'Quantity Change', value: 0, color: '#F59E0B' },
      { name: 'Supplier Change', value: 0, color: '#3B82F6' },
    ];

    filtered.forEach(item => {
      if (item._hasChanges) {
        if (item._fieldChanges.rate) {
           const latest = parseFloat(item._latest.rate || 0);
           const original = parseFloat(item._original.rate || 0);
           if (latest > original) distribution[0].value++;
           else if (latest < original) distribution[1].value++;
        }
        if (item._fieldChanges.qty) distribution[2].value++;
        if (item._fieldChanges.supplier) distribution[3].value++;
      }
    });

    return {
      totalPRs: uniquePRs.toLocaleString(),
      totalSpend: totalSpendValue > 1000000 ? `AED ${(totalSpendValue / 1000000).toFixed(1)}M` : `AED ${(totalSpendValue / 1000).toFixed(0)}K`,
      activeSuppliers: uniqueSuppliersCount.toString(),
      monthlySpend: latestMonthlySpend > 1000 ? `AED ${(latestMonthlySpend / 1000).toFixed(0)}K` : `AED ${latestMonthlySpend.toFixed(0)}`,
      trendData,
      distributionData: distribution.some(d => d.value > 0) ? distribution : changeTypeData
    };
  }, [fullData, filters]);

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isMaterialRecord = (item) => {
    if (!item) return false;
    return !!(item['Description'] || item['change1_description']);
  };

  const cleanRecord = (item) => {
    const cleaned = {};
    Object.entries(item).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      if (key === 'id' || key === 'created_at') return;
      if (/^[a-z_]+$/.test(key) && key.includes('_') && !key.startsWith('change')) return;
      cleaned[key] = value;
    });
    return cleaned;
  };

  const handlePOCheck = React.useCallback(async (targetPo) => {
    const activePo = targetPo || poNumber;
    if (!activePo) return;
    
    setIsChecking(true);
    setError(null);
    setCheckResult(null);
    setIsVerificationMode(false);
    
    try {
      const response = await fetch(`/api/n8n/webhook/813fa9e5-144b-4f95-8f31-2a5c6f064d4a?action=Check&poNumber=${activePo}`);
      if (response.ok) {
        let rawData = await response.json();
        let parsedData = rawData;
        if (typeof rawData === 'string') {
          try { parsedData = JSON.parse(rawData); } catch (e) { parsedData = rawData; }
        }

        let allItems = [];
        if (Array.isArray(parsedData)) {
          parsedData.forEach(entry => {
            if (entry && entry.data && Array.isArray(entry.data)) {
              allItems.push(...entry.data);
            } else if (entry && typeof entry === 'object') {
              allItems.push(entry);
            }
          });
        } else if (parsedData && parsedData.data && Array.isArray(parsedData.data)) {
          allItems = parsedData.data;
        }

        const globalHistory = allItems.filter(i => 
          (i.remark !== undefined || i.Remark !== undefined) && 
          (i.previous_charges !== undefined || i['Previous Charges'] !== undefined || i.current_charges !== undefined || i['Current Charges'] !== undefined)
        );
        const suppliers = allItems.filter(i => !isMaterialRecord(i) && !globalHistory.includes(i)).map(cleanRecord);
        const rawMaterials = allItems.filter(i => isMaterialRecord(i) && !globalHistory.includes(i)).map(cleanRecord);
        const materials = processPRItems(rawMaterials);

        if (suppliers.length > 0 || materials.length > 0 || globalHistory.length > 0) {
          setCheckResult({
            po: poNumber,
            suppliers,
            materials,
            globalHistory,
            timestamp: new Date().toLocaleTimeString()
          });
          setActiveTab('materials');
          setPoNumber(activePo);
        } else {
          setError('No data found for this PR number.');
        }
      } else {
        setError('Could not retrieve data for this PR.');
      }
    } catch (err) {
      console.error('Error checking PO:', err);
      setError('Connection failed. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, [poNumber]);

  const fetchGlobalStats = React.useCallback(async () => {
    if (isModalMode) return;
    setIsLoadingStats(true);
    try {
      const response = await fetch(`/api/n8n/webhook/971719b0-cac4-4362-a99a-6b867f5f9d3e?action=${filters.year}`);
      const json = await response.json();
      let rawItems = [];
      if (Array.isArray(json)) {
        rawItems = json[0]?.data || json;
      } else if (json?.data) {
        rawItems = json.data;
      }
      
      const processed = processPRItems(rawItems);
      setFullData(processed);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isModalMode, filters.year]);

  React.useEffect(() => {
    if (!isModalMode) {
      fetchGlobalStats();
    }
  }, [isModalMode, fetchGlobalStats]);

  const hasLoadedInitial = React.useRef(false);
  React.useEffect(() => {
    if (initialPR && !hasLoadedInitial.current) {
      setPoNumber(initialPR);
      handlePOCheck(initialPR);
      hasLoadedInitial.current = true;
    }
  }, [initialPR, handlePOCheck]);

  const executeVerification = async () => {
    if (!pasteContent || !checkResult) return;
    
    setIsAIVerifying(true);
    try {
      // Send both system data and the messy pasted data to the AI Backend
      const response = await fetch(`/api/n8n/webhook/d1e09ad3-413a-43f1-a431-b4a98549bcec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_verify_pr',
          pr_no: checkResult.po,
          systemData: checkResult.materials,
          pastedData: pasteContent
        })
      });

      if (!response.ok) throw new Error('AI Verification failed');
      
      let rawResponse = await response.json();
      
      // 1. Extract the actual array of results from the mess
      let aiResults = [];
      try {
        if (Array.isArray(rawResponse)) {
          // Case: [{ output: [...] }] or [{ ... }]
          const first = rawResponse[0];
          if (first && first.output) {
            aiResults = typeof first.output === 'string' ? JSON.parse(first.output) : first.output;
          } else {
            aiResults = rawResponse;
          }
        } else if (rawResponse && rawResponse.output) {
          // Case: { output: [...] }
          aiResults = typeof rawResponse.output === 'string' ? JSON.parse(rawResponse.output) : rawResponse.output;
        } else {
          aiResults = rawResponse;
        }
      } catch (e) {
        console.error("JSON Parse error for AI output:", e);
      }

      if (!Array.isArray(aiResults)) {
        // Last ditch effort: find any array in the response
        const possibleArray = Object.values(rawResponse || {}).find(v => Array.isArray(v));
        aiResults = possibleArray || [];
      }
      
      // 2. Aggressive Mapping
      const updatedMaterials = checkResult.materials.map(item => {
        const itemId = String(item.Sr_No || item.srNo || '').trim();
        const itemDesc = String(item.Description || '').toLowerCase().trim();

        const aiMatch = aiResults.find(a => {
          if (!a) return false;
          // Match by ANY ID-like field
          const aId = String(a.Sr_No || a.srNo || a.id || a.ID || a.SrNo || a['Sr No'] || '').trim();
          if (aId && itemId && aId === itemId) return true;
          
          // Match by Description fuzzy
          const aDesc = String(a.Description || a.description || a.item || a.Item || a.material || '').toLowerCase().trim();
          if (aDesc && itemDesc && (aDesc.includes(itemDesc) || itemDesc.includes(aDesc))) return true;
          
          return false;
        });
        
        // Ensure we extract the verification object even if it's nested or at the top level of the match
        const verification = aiMatch?._verification || aiMatch?.verification || (aiMatch?.status ? aiMatch : null);

        if (verification) {
          return {
            ...item,
            _verification: {
              status: verification.status || 'match',
              diffs: verification.diffs || { supplier: false, qty: false, rate: false },
              external: verification.external || { 
                supplier: aiMatch.supplier || aiMatch.vendor || '', 
                qty: aiMatch.qty || aiMatch.quantity || '', 
                rate: aiMatch.rate || aiMatch.price || '' 
              }
            }
          };
        }
        return item;
      });

      setCheckResult(prev => ({ ...prev, materials: updatedMaterials }));
      setIsVerificationMode(true);
      setShowPasteModal(false);
      setPasteContent('');
    } catch (err) {
      console.error('AI Verification Error:', err);
      // Fallback to local heuristic
      const localVerified = verifyPRWithExternal(checkResult.materials, parseClipboardData(pasteContent));
      setCheckResult(prev => ({ ...prev, materials: localVerified }));
      setIsVerificationMode(true);
      setShowPasteModal(false);
    } finally {
      setIsAIVerifying(false);
    }
  };

  const [isAppending, setIsAppending] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [remarkText, setRemarkText] = useState('');

  const initiateAppendChanges = () => {
    if (!checkResult || !checkResult.materials) return;
    
    const updates = checkResult.materials
      .filter(item => item._verification && item._verification.status !== 'missing')
      .map(item => ({
        srNo: item.Sr_No,
        supplier: item._verification.external?.supplier,
        qty: item._verification.external?.qty,
        rate: item._verification.external?.rate,
        amount: item._verification.external?.amount,
        vat: item._verification.external?.vat,
        total: item._verification.external?.total
      }));

    if (updates.length === 0) {
      alert('No verified changes to append.');
      return;
    }

    setRemarkText('');
    setShowRemarkModal(true);
  };

  const executeAppendChanges = async () => {
    setIsAppending(true);
    try {
      const changedRows = checkResult.materials
        .filter(item => item._verification && item._verification.status !== 'missing')
        .map(item => ({
          srNo: item.Sr_No,
          supplier: item._verification.external?.supplier,
          qty: item._verification.external?.qty,
          rate: item._verification.external?.rate,
          amount: item._verification.external?.amount,
          vat: item._verification.external?.vat,
          total: item._verification.external?.total
        }));

      const totalSys = verificationImpact?.totalSysAmount || 0;
      const totalNew = verificationImpact?.totalNewAmount || 0;
      const percentageChange = totalSys > 0 ? (((totalNew - totalSys) / totalSys) * 100).toFixed(2) + '%' : '0%';

      const payload = {
        action: 'AppendChanges',
        Project: checkResult.materials[0]?.Project || 'N/A',
        PR: checkResult.po,
        'Previous Charges': totalSys.toFixed(2),
        'Current Charges': totalNew.toFixed(2),
        Remark: remarkText,
        Status: totalNew > totalSys ? 'Price Hiked' : (totalNew < totalSys ? 'Savings' : 'Unchanged'),
        'Initial PR': '',
        'Percentage/Amount': percentageChange,
        'Second Time PR': new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }),
        changedRows: changedRows,
        wholePR: checkResult.materials
      };

      const response = await fetch(`/api/n8n/webhook/bb14054d-e9aa-428b-8d27-3a04cf9d78fd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(`Successfully appended changes for ${changedRows.length} items.`);
        setIsVerificationMode(false);
        setShowRemarkModal(false);
        // Refresh data
        handlePOCheck(); 
      } else {
        throw new Error('Failed to append changes');
      }
    } catch (err) {
      console.error(err);
      alert('Error appending changes. Check connection.');
    } finally {
      setIsAppending(false);
    }
  };

  const displayData = React.useMemo(() => {
    if (!checkResult) return [];
    return activeTab === 'suppliers' ? checkResult.suppliers : checkResult.materials;
  }, [checkResult, activeTab]);

  const pickedColumns = React.useMemo(() => {
    return activeTab === 'materials' 
      ? ['Sr_No', 'Description', 'Req_Qty', 'UOM', 'Supplier', 'Total']
      : ['Sr_No', 'Supplier', 'Amount', 'Date', 'Status', 'Project'];
  }, [activeTab]);

  const verificationImpact = React.useMemo(() => {
    if (!isVerificationMode || !checkResult?.materials) return null;
    
    let savings = 0;
    let savingsAmt = 0;
    let increase = 0;
    let increaseAmt = 0;
    let qtyChanged = 0;
    let missing = 0;
    
    let totalSysAmount = 0;
    let totalNewAmount = 0;
    
    checkResult.materials.forEach(m => {
      const v = m._verification;
      const sysAmount = parseFloat(String(m.Price || (m.Req_Qty * m.Rate) || 0).replace(/,/g, ''));
      totalSysAmount += sysAmount;
      
      if (!v || v.status === 'missing') {
        missing++;
        totalNewAmount += sysAmount;
        return;
      }
      
      const sysQty = parseFloat(String(m.Req_Qty || 0).replace(/,/g, ''));
      const newQtyStr = v.external?.qty != null ? String(v.external.qty).trim() : null;
      if (newQtyStr !== null && newQtyStr !== '') {
         const newQty = parseFloat(newQtyStr.replace(/,/g, ''));
         if (!isNaN(newQty) && Math.abs(sysQty - newQty) >= 0.01) {
            qtyChanged++;
         }
      }
      
      const newAmountStr = v.external?.amount != null ? String(v.external.amount).trim() : null;
      
      if (newAmountStr === null || newAmountStr === '') {
        totalNewAmount += sysAmount;
        return;
      }
      
      const newAmount = parseFloat(newAmountStr.replace(/,/g, ''));
      if (isNaN(newAmount)) {
        totalNewAmount += sysAmount;
        return;
      }

      totalNewAmount += newAmount;
      
      if (newAmount < sysAmount - 0.01) {
         savings++;
         savingsAmt += (sysAmount - newAmount);
      } else if (newAmount > sysAmount + 0.01) {
         increase++;
         increaseAmt += (newAmount - sysAmount);
      }
    });
    
    return {
      stats: [
        { name: 'Savings Found', value: savings, amount: savingsAmt, totalContext: totalSysAmount, color: '#3B82F6' },
        { name: 'Price Hiked', value: increase, amount: increaseAmt, totalContext: totalSysAmount, color: '#EF4444' },
        { name: 'Qty Updated', value: qtyChanged, amount: null, color: '#10B981' },
        { name: 'Missing Data', value: missing, amount: null, color: '#6B7280' }
      ],
      netImpact: totalNewAmount - totalSysAmount,
      totalSysAmount,
      totalNewAmount
    };
  }, [isVerificationMode, checkResult]);

  return (
    <div className={isModalMode ? "space-y-8 pb-10" : "space-y-20 pb-20 px-4 md:px-8"}>
      {/* PR Verification Engine */}
      {!isModalMode && (
        <div className="w-full flex flex-col items-center stagger-item">
          <div className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-[0.2em] mb-4">PR Verification Engine</div>
          <div className="w-full max-w-[720px] flex flex-col items-center justify-center relative">
            <SearchBar 
              placeholder="Search PR records (e.g. PR-04532)" 
              value={poNumber} 
              onChange={setPoNumber} 
              onSearch={handlePOCheck} 
            />
            {isChecking && (
              <div className="absolute -bottom-8 flex items-center gap-2 text-[#F59E0B] text-[11px] font-bold tracking-widest animate-pulse">
                <IconRefresh className="w-4 h-4 animate-spin" /> VERIFYING...
              </div>
            )}
          </div>
        </div>
      )}

        <div className="flex justify-center mb-10">
          {isChecking && isModalMode && (
            <div className="flex items-center gap-3 px-6 py-3 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)] rounded-2xl text-[13px] font-black tracking-widest backdrop-blur-xl animate-pulse shadow-xl">
              <IconRefresh className="w-5 h-5 animate-spin" /> INITIALIZING AUDIT ENGINE...
            </div>
          )}
          {checkResult && !isChecking && (
            <div className="flex items-center gap-3 px-6 py-2.5 bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[rgba(16,185,129,0.2)] rounded-full text-[13px] font-bold backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-in fade-in zoom-in-95 duration-500">
              <div className="relative flex">
                <div className="w-2.5 h-2.5 rounded-full bg-semantic-increase" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-semantic-increase animate-ping" />
              </div>
              <span className="tracking-wide">PR Verified: <span className="text-white font-black ml-1">{checkResult.po}</span></span>
              <span className="w-1 h-1 rounded-full bg-[rgba(16,185,129,0.3)] mx-1" />
              <span className="text-[rgba(255,255,255,0.7)]">{checkResult.materials.length} line items found</span>
            </div>
          )}
          {error && !isChecking && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.2)] rounded-full text-[12px] font-bold backdrop-blur-md shadow-lg">
              <IconX size={16} /> {error}
            </div>
          )}
        </div>

        {/* PR Financial Insights - MOVED HIGHER FOR MODAL */}
        {checkResult && !isChecking && (
          <div className="flex flex-wrap -mx-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-500 relative z-20">
            <div className="w-full sm:w-1/2 lg:w-1/4 px-3 mb-6 lg:mb-0">
              <StatCard 
                index={1} 
                title="Total Items" 
                value={checkResult.materials.length} 
                subValue="Line items in this PR" 
                glowColor="#c8922a" 
                icon={IconClipboardList} 
              />
            </div>
            <div className="w-full sm:w-1/2 lg:w-1/4 px-3 mb-6 lg:mb-0">
              <StatCard 
                index={2} 
                title="PR Value" 
                value={`AED ${formatCurrency(checkResult.materials.reduce((acc, m) => acc + (parseFloat(String(m.Total || 0).replace(/,/g, '')) || 0), 0))}`} 
                subValue="Gross total including VAT" 
                glowColor="#10B981" 
                icon={IconTrendingUp} 
              />
            </div>
            <div className="w-full sm:w-1/2 lg:w-1/4 px-3 mb-6 sm:mb-0">
              <StatCard 
                index={3} 
                title="Suppliers" 
                value={new Set(checkResult.materials.map(m => m.Supplier)).size} 
                subValue="Vendors associated" 
                glowColor="#3b82f6" 
                icon={IconUsers} 
              />
            </div>
            <div className="w-full sm:w-1/2 lg:w-1/4 px-3">
              {checkResult.globalHistory && checkResult.globalHistory.length > 0 ? (
                <div className="relative glass-panel p-6 overflow-hidden group hover:-translate-y-1 transition-all duration-300 stagger-item flex flex-col justify-between min-h-[160px] border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] h-full" style={{ animationDelay: '320ms' }}>
                  <div 
                    className="absolute -inset-4 opacity-15 blur-2xl pointer-events-none group-hover:opacity-25 transition-opacity duration-300"
                    style={{ background: `radial-gradient(circle at center, #F59E0B, transparent 70%)`, zIndex: -1 }}
                  />
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.1)] flex items-center justify-center text-[#F59E0B]">
                      <IconAlertCircle size={20} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[rgba(255,255,255,0.4)] text-[11px] font-bold uppercase tracking-wider mb-2">Latest Remark</h3>
                    <p className="text-[12px] text-white font-medium italic line-clamp-2 leading-relaxed">
                      "{checkResult.globalHistory[0].remark || checkResult.globalHistory[0].Remark || 'No remark'}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative glass-panel p-6 overflow-hidden flex flex-col justify-center items-center opacity-40 min-h-[160px] border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.4)] h-full">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 text-center">No Audit History</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Summary Dashboard */}
        {isVerificationMode && verificationImpact && (
          <div className="w-full animate-in fade-in slide-in-from-top-4 duration-500 mb-8">
            <div className="flex items-end justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Financial Impact Analysis</h3>
                <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-black uppercase tracking-widest">Real-time discrepancy & savings</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {verificationImpact.stats.map((stat, i) => (
                <div key={i} className="glass-panel p-5 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.05] rounded-full -mr-8 -mt-8 blur-2xl transition-all duration-500 group-hover:opacity-[0.15]" style={{ backgroundColor: stat.color }}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70" style={{ color: stat.color }}>{stat.name}</span>
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-black text-white">{stat.value}</span>
                    {stat.amount != null && stat.value > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-[14px] font-bold" style={{ color: stat.color }}>{formatCurrency(stat.amount)}</span>
                        <span className="text-[10px] text-[rgba(255,255,255,0.4)] font-medium">({stat.totalContext > 0 ? ((stat.amount / stat.totalContext) * 100).toFixed(1) : 0}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className={`glass-panel p-5 flex flex-col justify-center relative overflow-hidden h-[120px] ${verificationImpact.netImpact > 0 ? 'border-t-4 border-t-[#EF4444]' : verificationImpact.netImpact < 0 ? 'border-t-4 border-t-[#10B981]' : 'border-t-4 border-t-[rgba(255,255,255,0.1)]'}`}>
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.05] rounded-full -mr-10 -mt-10 blur-2xl transition-all duration-500`} style={{ backgroundColor: verificationImpact.netImpact > 0 ? '#EF4444' : verificationImpact.netImpact < 0 ? '#10B981' : '#ffffff' }}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest mb-2 opacity-70 ${verificationImpact.netImpact > 0 ? 'text-[#EF4444]' : verificationImpact.netImpact < 0 ? 'text-[#10B981]' : 'text-white'}`}>
                  {verificationImpact.netImpact > 0 ? 'Price Hiked' : verificationImpact.netImpact < 0 ? 'Total Saved' : 'No Financial Change'}
                </span>
                <span className="text-2xl font-black text-white truncate" title={formatCurrency(Math.abs(verificationImpact.netImpact))}>
                  {verificationImpact.netImpact === 0 ? '—' : formatCurrency(Math.abs(verificationImpact.netImpact))}
                </span>
              </div>
            </div>
          </div>
        )}

        {checkResult && !isChecking && (
          <div className="w-full animate-in fade-in duration-500 mb-10">
              <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] shadow-2xl" style={{ background: 'rgba(6,9,15,0.85)', backdropFilter: 'blur(32px)' }}>
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                  <div className="flex items-center gap-2 p-1 bg-[rgba(0,0,0,0.3)] rounded-xl border border-[rgba(255,255,255,0.06)]">
                    <button onClick={() => setActiveTab('materials')} className={`text-[10px] font-black uppercase tracking-[0.12em] px-5 py-2 rounded-lg transition-all ${activeTab === 'materials' ? 'bg-[#F59E0B] text-black' : 'text-[rgba(255,255,255,0.3)] hover:text-white'}`}>
                      Line Items ({checkResult.materials.length})
                    </button>
                    <button onClick={() => setActiveTab('suppliers')} className={`text-[10px] font-black uppercase tracking-[0.12em] px-5 py-2 rounded-lg transition-all ${activeTab === 'suppliers' ? 'bg-[#F59E0B] text-black' : 'text-[rgba(255,255,255,0.3)] hover:text-white'}`}>
                      Suppliers ({checkResult.suppliers.length})
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {checkResult.globalHistory && checkResult.globalHistory.length > 0 && (
                      <button 
                        onClick={() => setShowGlobalHistory(true)}
                        className="px-4 py-2 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#10B981] text-[9px] font-black uppercase tracking-[0.15em] rounded-lg hover:bg-[#10B981] hover:text-black transition-all flex items-center gap-2"
                      >
                        <IconHistory size={14} /> PR HISTORY
                      </button>
                    )}
                    {isVerificationMode ? (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={initiateAppendChanges}
                          disabled={isAppending}
                          className="px-6 py-2 bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-[12px] font-black rounded-lg shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_30px_rgba(16,185,129,0.45)] transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isAppending ? (
                            <IconRefresh className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <IconClipboardCheck size={16} />
                          )}
                          APPEND CHANGES
                        </button>
                        <button 
                          onClick={() => setIsVerificationMode(false)}
                          className="px-4 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] text-[10px] font-black rounded-lg hover:bg-[rgba(239,68,68,0.2)] transition-all flex items-center gap-2"
                        >
                          <IconX size={14} /> EXIT COMPARISON
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowPasteModal(true)} className="px-4 py-2 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#F59E0B] text-[9px] font-black uppercase tracking-[0.15em] rounded-lg hover:bg-[#F59E0B] hover:text-black transition-all flex items-center gap-2">
                        <IconForms size={14} /> PASTE & COMPARE
                      </button>
                    )}
                    <span className="text-[10px] text-[rgba(255,255,255,0.25)] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">{checkResult.po}</span>
                  </div>
                </div>

              {/* Dynamic Table Rendering */}
              <div className="overflow-x-auto">
                {isVerificationMode ? (
                  /* DIFFERENCE FORMAT TABLE */
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                        <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider w-[60px]">SR</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider w-[300px]">ITEM DESCRIPTION</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">FIELD</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">SYSTEM (EXISTING)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">PASTED (NEW)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkResult.materials.map((item, idx) => {
                        const v = item._verification || { status: 'missing' };
                        
                        const fields = [
                          { name: 'Supplier', sys: item.Supplier, new: v.external?.supplier },
                          { name: 'Quantity', sys: item.Req_Qty, new: v.external?.qty },
                          { name: 'Rate', sys: item.Rate, new: v.external?.rate },
                          { name: 'Amount', sys: item.Price || (item.Req_Qty * item.Rate), new: v.external?.amount },
                          { name: 'VAT', sys: item.VAT, new: v.external?.vat },
                          { name: 'Total', sys: item.Total, new: v.external?.total }
                        ].map(f => {
                          const isFin = ['Rate', 'Total', 'Amount', 'VAT'].includes(f.name);
                          const isNum = isFin || f.name === 'Quantity';
                          
                          const sNum = parseFloat(String(f.sys || 0).replace(/,/g, ''));
                          const nNum = parseFloat(String(f.new || 0).replace(/,/g, ''));
                          
                          const sysStr = isFin ? formatCurrency(f.sys) : String(f.sys || '').trim();
                          const newStr = isFin ? formatCurrency(f.new) : String(f.new || '').trim();

                          if (isNum && f.new != null && f.new !== '') {
                            // Numeric comparison with tolerance
                            f.diff = Math.abs(sNum - nNum) >= 0.01;
                            if (f.diff) {
                              f.trend = nNum > sNum ? 'up' : 'down';
                            }
                          } else {
                            // String comparison
                            f.diff = (f.new != null && f.new !== '') && sysStr.toLowerCase() !== newStr.toLowerCase();
                            if (f.diff) f.trend = 'diff';
                          }
                          return f;
                        });

                        const isMissing = v.status === 'missing';
                        const hasMismatches = v.status === 'mismatch';

                        return (
                          <React.Fragment key={idx}>
                            <tr className={`border-b border-[rgba(255,255,255,0.04)] ${isMissing ? 'bg-[rgba(255,255,255,0.02)] opacity-50' : hasMismatches ? 'bg-[rgba(59,130,246,0.05)]' : 'bg-[rgba(16,185,129,0.02)]'}`}>
                              <td rowSpan={fields.length} className="px-6 py-4 text-[11px] font-bold text-[rgba(255,255,255,0.2)] border-r border-[rgba(255,255,255,0.04)] align-top">{item.Sr_No}</td>
                              <td rowSpan={fields.length} className="px-6 py-4 text-[12px] font-bold text-white border-r border-[rgba(255,255,255,0.04)] align-top">
                                {item.Description}
                                {isMissing && <p className="text-[10px] text-[#EF4444] font-black uppercase mt-2">No Match in Paste</p>}
                              </td>
                              <td className="px-6 py-3 text-[11px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">{fields[0].name}</td>
                              <td className="px-6 py-3 text-[13px] text-[rgba(255,255,255,0.65)]">{(fields[0].name === 'Rate' || fields[0].name === 'Total' || fields[0].name === 'Amount' || fields[0].name === 'VAT') ? formatCurrency(fields[0].sys) : (fields[0].sys || '—')}</td>
                              <td className={`px-6 py-3 text-[13px] font-bold ${isMissing ? 'text-[rgba(255,255,255,0.2)]' : fields[0].diff ? (fields[0].trend === 'up' ? 'text-[#EF4444]' : fields[0].trend === 'down' ? 'text-[#3B82F6]' : 'text-[#10B981]') : 'text-[#10B981]'}`}>
                                {isMissing ? '—' : (
                                  <span className={fields[0].diff ? `px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${fields[0].trend === 'up' ? 'bg-[#EF4444]/20 border border-[#EF4444]/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]' : fields[0].trend === 'down' ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]' : 'bg-[#10B981]/20 border border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'}` : ''}>
                                    {(fields[0].name === 'Rate' || fields[0].name === 'Total' || fields[0].name === 'Amount' || fields[0].name === 'VAT') ? formatCurrency(fields[0].new) : (fields[0].new || <span className="text-[#EF4444] opacity-50 italic bg-transparent shadow-none border-none px-0 py-0">Value Missing</span>)}
                                    {fields[0].trend === 'up' && <IconTrendingUp size={14} className="animate-trend-up" />}
                                    {fields[0].trend === 'down' && <IconTrendingDown size={14} className="animate-trend-down" />}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {isMissing ? <IconX size={14} className="opacity-20" /> : fields[0].diff ? (fields[0].trend === 'up' ? <IconTrendingUp size={16} className="text-[#EF4444] animate-trend-up" /> : fields[0].trend === 'down' ? <IconTrendingDown size={16} className="text-[#3B82F6] animate-trend-down" /> : <IconArrowsDiff size={14} className="text-[#10B981]" />) : <IconCheck size={14} className="text-[#10B981]" />}
                              </td>
                            </tr>
                            {fields.slice(1).map((field, fIdx) => (
                              <tr key={fIdx} className={`border-b border-[rgba(255,255,255,0.04)] ${isMissing ? 'bg-[rgba(255,255,255,0.02)] opacity-50' : hasMismatches ? 'bg-[rgba(59,130,246,0.05)]' : 'bg-[rgba(16,185,129,0.02)]'}`}>
                                <td className="px-6 py-3 text-[11px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">{field.name}</td>
                                <td className="px-6 py-3 text-[13px] text-[rgba(255,255,255,0.65)]">{(field.name === 'Rate' || field.name === 'Total' || field.name === 'Amount' || field.name === 'VAT') ? formatCurrency(field.sys) : (field.sys || '—')}</td>
                                <td className={`px-6 py-3 text-[13px] font-bold ${isMissing ? 'text-[rgba(255,255,255,0.2)]' : field.diff ? (field.trend === 'up' ? 'text-[#EF4444]' : field.trend === 'down' ? 'text-[#3B82F6]' : 'text-[#10B981]') : 'text-[#10B981]'}`}>
                                  {isMissing ? '—' : (
                                    <span className={field.diff ? `px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 ${field.trend === 'up' ? 'bg-[#EF4444]/20 border border-[#EF4444]/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]' : field.trend === 'down' ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]' : 'bg-[#10B981]/20 border border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'}` : ''}>
                                      {(field.name === 'Rate' || field.name === 'Total' || field.name === 'Amount' || field.name === 'VAT') ? formatCurrency(field.new) : (field.new || <span className="text-[#EF4444] opacity-50 italic bg-transparent shadow-none border-none px-0 py-0">Value Missing</span>)}
                                      {field.trend === 'up' && <IconTrendingUp size={14} className="animate-trend-up" />}
                                      {field.trend === 'down' && <IconTrendingDown size={14} className="animate-trend-down" />}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3">
                                  {isMissing ? <IconX size={14} className="opacity-20" /> : field.diff ? (field.trend === 'up' ? <IconTrendingUp size={16} className="text-[#EF4444] animate-trend-up" /> : field.trend === 'down' ? <IconTrendingDown size={16} className="text-[#3B82F6] animate-trend-down" /> : <IconArrowsDiff size={14} className="text-[#10B981]" />) : <IconCheck size={14} className="text-[#10B981]" />}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  /* STANDARD TABLE */
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                        {pickedColumns.map((col, i) => {
                          const colWidth = col === 'Sr_No' ? 'w-[70px]' : col === 'Description' ? 'w-auto min-w-[200px]' : col === 'Supplier' ? 'w-[180px] min-w-[140px]' : col === 'Req_Qty' ? 'w-[100px]' : col === 'UOM' ? 'w-[80px]' : col === 'Total' || col === 'Amount' ? 'w-[150px]' : '';
                          return (
                            <th key={col} className={`px-6 py-4 text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider truncate ${colWidth} ${i < pickedColumns.length - 1 ? 'border-r border-[rgba(255,255,255,0.04)]' : ''}`}>{col.replace(/_/g, ' ')}</th>
                          );
                        })}
                        <th className="w-[80px]" />
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((item, idx) => (
                        <React.Fragment key={idx}>
                          <tr onClick={() => setExpandedRow(expandedRow === idx ? null : idx)} className={`border-b border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)] ${expandedRow === idx ? 'bg-[rgba(245,158,11,0.06)]' : ''}`}>
                            {pickedColumns.map((col, cIdx) => {
                              const isFinancial = col === 'Total' || col === 'Rate' || col === 'Amount' || col === 'Price';
                              const display = item[col] == null ? '—' : (isFinancial ? formatCurrency(item[col]) : String(item[col]));
                              const isInternalChange = item._fieldChanges?.[col.toLowerCase()] || (col === 'Req_Qty' && item._fieldChanges?.qty);
                              const isNumeric = col === 'Sr_No' || col === 'Req_Qty' || isFinancial;
                              const isDesc = col === 'Description';
                              return (
                                <td key={col} className={`px-6 py-4 text-[13px] ${isNumeric ? 'whitespace-nowrap' : isDesc ? 'truncate' : 'whitespace-nowrap'} ${isDesc ? 'font-bold text-white' : 'text-[rgba(255,255,255,0.65)]'} ${cIdx < pickedColumns.length - 1 ? 'border-r border-[rgba(255,255,255,0.04)]' : ''}`}>
                                  <span className={isInternalChange ? 'text-[#F59E0B] font-bold underline underline-offset-4 decoration-[rgba(245,158,11,0.3)]' : ''}>{display}</span>
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 text-right">
                              {item._hasChanges && (
                                <button onClick={(e) => { e.stopPropagation(); setShowHistoryModal(item); }} className="p-1.5 bg-[rgba(245,158,11,0.15)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.3)] hover:bg-[#F59E0B] hover:text-black transition-all">
                                  <IconHistory size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedRow === idx && (
                            <tr>
                              <td colSpan={pickedColumns.length + 1} className="p-0">
                                <div className="px-8 py-10 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.04)] animate-in slide-in-from-top-2 duration-300">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    
                                    {/* Column 1: Document Info */}
                                    <div className="space-y-6">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-4 bg-[#F59E0B] rounded-full"></div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Document Details</span>
                                      </div>
                                      <div className="grid grid-cols-1 gap-4">
                                        {[
                                          { label: 'Purchase Request', value: item.PR || item.PR_No || 'N/A', icon: IconFileText },
                                          { label: 'Project Name', value: item.Project || 'N/A', icon: IconUsers },
                                          { label: 'Next Document', value: item.Next_Doc || 'None', icon: IconActivity }
                                        ].map((info, i) => (
                                          <div key={i} className="flex items-start gap-3 p-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                                            <info.icon size={16} className="text-[rgba(255,255,255,0.2)] mt-0.5" />
                                            <div>
                                              <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-tighter mb-0.5">{info.label}</p>
                                              <p className="text-[12px] text-white font-medium">{info.value}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Column 2: Inventory & Specs */}
                                    <div className="space-y-6">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-4 bg-[#6366F1] rounded-full"></div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Inventory & Specs</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        {[
                                          { label: 'Unit (UOM)', value: item.UOM || 'Unit' },
                                          { label: 'Serial No', value: item.Sr_No || item.srNo },
                                          { label: 'Req Qty', value: item.Req_Qty, highlight: item._fieldChanges?.qty },
                                          { label: 'Remain Qty', value: item.Remain_Qty || '0' }
                                        ].map((info, i) => (
                                          <div key={i} className="p-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                                            <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-tighter mb-0.5">{info.label}</p>
                                            <p className={`text-[12px] font-bold ${info.highlight ? 'text-[#F59E0B]' : 'text-white'}`}>{info.value}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Column 3: Financial Summary */}
                                    <div className="space-y-6">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-4 bg-[#10B981] rounded-full"></div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Financial Summary</span>
                                      </div>
                                      <div className="p-5 bg-[rgba(16,185,129,0.03)] border border-[rgba(16,185,129,0.1)] rounded-2xl space-y-4">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[11px] text-[rgba(255,255,255,0.4)] font-medium">Unit Rate</span>
                                          <span className={`text-[13px] font-black ${item._fieldChanges?.rate ? 'text-[#F59E0B]' : 'text-white'}`}>AED {formatCurrency(item.Rate || '0')}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-[11px] text-[rgba(255,255,255,0.4)] font-medium">Net Amount</span>
                                          <span className="text-[13px] text-white font-medium">AED {formatCurrency(item.Price || (item.Req_Qty * item.Rate) || '0')}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 border-b border-[rgba(255,255,255,0.06)]">
                                          <span className="text-[11px] text-[rgba(255,255,255,0.4)] font-medium">VAT (Tax)</span>
                                          <span className="text-[13px] text-white font-medium">AED {formatCurrency(item.VAT || '0')}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                          <span className="text-[11px] text-[#10B981] font-black uppercase tracking-tighter">Grand Total</span>
                                          <span className="text-lg font-black text-[#10B981]">AED {formatCurrency(item.Total || '0')}</span>
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Paste & Compare Modal (The "Notepad") */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowPasteModal(false)}></div>
          <div className="relative w-full max-w-3xl glass-panel p-8 shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white">Compare External Data</h3>
                <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-black uppercase tracking-widest mt-1">Paste your table below from Excel or other sites</p>
              </div>
              <button onClick={() => setShowPasteModal(false)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.5)]"><IconX size={24} /></button>
            </div>

            <div className="relative">
              <textarea 
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Sr No	Description	Supplier	Qty	Rate..."
                className="w-full h-80 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl p-6 text-[13px] text-white font-mono placeholder:text-[rgba(255,255,255,0.15)] focus:border-[#F59E0B] focus:ring-0 outline-none resize-none transition-all"
              />
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-[rgba(245,158,11,0.1)] rounded-lg border border-[rgba(245,158,11,0.2)] text-[#F59E0B] text-[10px] font-black uppercase tracking-widest pointer-events-none">
                <IconForms size={12} /> PASTE NOTEPAD
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button onClick={() => setShowPasteModal(false)} className="px-6 py-3 text-[12px] font-bold text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">CANCEL</button>
              <button 
                onClick={executeVerification}
                disabled={!pasteContent || isAIVerifying}
                className="px-8 py-3 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-black text-[14px] font-black rounded-xl shadow-[0_8px_32px_rgba(245,158,11,0.4)] hover:shadow-[0_12px_48px_rgba(245,158,11,0.55)] transition-all disabled:opacity-30 flex items-center gap-2"
              >
                {isAIVerifying ? (
                  <>
                    <IconRefresh className="w-4 h-4 animate-spin" />
                    AI ANALYZING MESSY DATA...
                  </>
                ) : (
                  <>
                    <IconArrowsDiff size={18} /> 
                    AI POWERED VERIFY
                  </>
                )}
              </button>
              </div>
            </div>
          </div>
        )}

      {/* Remark Modal for Appending Changes */}
      {showRemarkModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isAppending && setShowRemarkModal(false)}></div>
          <div className="relative w-full max-w-lg glass-panel p-8 shadow-[0_0_80px_rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.3)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <IconClipboardCheck className="text-[#10B981]" /> Add Remark
                </h3>
                <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-black uppercase tracking-widest mt-1">Provide context for these verified changes</p>
              </div>
              <button onClick={() => !isAppending && setShowRemarkModal(false)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.5)]"><IconX size={20} /></button>
            </div>
            
            <textarea 
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="e.g. 'Supplier confirmed updated pricing over phone' or 'Volume discount applied'"
              className="w-full h-32 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-[13px] text-white font-medium placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#10B981] focus:ring-0 outline-none resize-none transition-all mb-6"
            />
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRemarkModal(false)} disabled={isAppending} className="px-5 py-2.5 text-[12px] font-bold text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">CANCEL</button>
              <button 
                onClick={executeAppendChanges}
                disabled={isAppending || !remarkText.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-[13px] font-black rounded-lg shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_30px_rgba(16,185,129,0.45)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isAppending ? <IconRefresh className="w-4 h-4 animate-spin" /> : <IconCheck size={16} />}
                CONFIRM & SEND
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowHistoryModal(null)}></div>
          <div className="relative w-full max-w-md glass-panel !rounded-none border-l border-[rgba(255,255,255,0.1)] h-full flex flex-col animate-slide-in-right shadow-2xl">
            <div className="p-8 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <div><h3 className="text-2xl font-bold text-white tracking-tight">Revision History</h3><p className="text-[11px] text-[#F59E0B] font-black uppercase tracking-widest mt-1">{showHistoryModal.PR}</p></div>
              <button onClick={() => setShowHistoryModal(null)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.5)]"><IconX size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* History Summary Chart */}
              {showHistoryModal._history.length > 0 && (() => {
                const baseTotal = parseFloat(showHistoryModal._history[0]?.total || 0);
                const currentTotal = parseFloat(showHistoryModal.Total || 0);
                const isSaving = currentTotal < baseTotal;
                const isIncrease = currentTotal > baseTotal;
                const trendColor = isSaving ? '#10B981' : isIncrease ? '#EF4444' : '#F59E0B';
                
                return (
                  <div className="glass-panel p-5 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest mb-1">Total Variance</h4>
                      <div className="flex items-center gap-2">
                        <div className="text-3xl font-black text-white">
                          {Math.round((Math.abs(currentTotal - baseTotal) / (baseTotal || 1)) * 100)}%
                        </div>
                        <div 
                          className="px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 animate-pulse"
                          style={{ backgroundColor: `${trendColor}20`, color: trendColor, border: `1px solid ${trendColor}40` }}
                        >
                          {isSaving ? <TrendingDown size={14} /> : isIncrease ? <TrendingUp size={14} /> : null}
                          {isSaving ? 'SAVING' : isIncrease ? 'INCREASE' : 'NO CHANGE'}
                        </div>
                      </div>
                      <p className="text-[9px] text-[rgba(255,255,255,0.3)] mt-2 font-medium uppercase">Comparison with original record</p>
                    </div>
                    <div className="w-24 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Change', value: Math.abs(currentTotal - baseTotal), color: trendColor },
                              { name: 'Original', value: baseTotal || 1, color: 'rgba(255,255,255,0.05)' }
                            ]}
                            innerRadius={25}
                            outerRadius={38}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={trendColor} cornerRadius={4} />
                            <Cell fill="rgba(255,255,255,0.05)" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div className="flex items-center gap-2"><span className="px-2 py-0.5 bg-[#F59E0B] text-black text-[10px] font-black rounded uppercase">LATEST VERSION</span><div className="flex-1 h-[1px] bg-[rgba(245,158,11,0.2)]"></div></div>
                
                {checkResult?.globalHistory?.[0] && (
                  <div className="p-4 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] border-l-4 border-l-[#F59E0B] rounded-r-2xl animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center gap-2 mb-2">
                      <IconAlertCircle size={14} className="text-[#F59E0B]" />
                      <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest">Audit Context / Remark</span>
                    </div>
                    <p className="text-[13px] text-white italic font-medium leading-relaxed">
                      "{checkResult.globalHistory[0].remark || checkResult.globalHistory[0].Remark || 'No specific remark recorded for this version.'}"
                    </p>
                  </div>
                )}

                <div className="p-5 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)] rounded-2xl">
                  <p className="text-[14px] font-bold text-white leading-relaxed mb-4">{showHistoryModal._latest.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase mb-1">SUPPLIER</p><p className="text-[11px] text-white font-medium uppercase">{showHistoryModal._latest.supplier || 'N/A'}</p></div>
                    <div><p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase mb-1">QTY</p><p className="text-[11px] text-white font-medium">{showHistoryModal._latest.qty || '0'}</p></div>
                    <div><p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase mb-1">RATE</p><p className="text-[11px] text-[#F59E0B] font-black">AED {formatCurrency(showHistoryModal._latest.rate || '0')}</p></div>
                    <div><p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase mb-1">VAT</p><p className="text-[11px] text-white font-medium">AED {formatCurrency(showHistoryModal._latest.vat || '0')}</p></div>
                    <div><p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase mb-1">TOTAL</p><p className="text-[11px] text-[#10B981] font-black">AED {formatCurrency(showHistoryModal._latest.total || '0')}</p></div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2"><span className="text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.2em]">AUDIT TRAIL</span><div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.08)]"></div></div>
                <div className="space-y-8">
                  {showHistoryModal._history.map((hist, idx) => (
                    <div key={idx} className="relative pl-8 border-l border-[rgba(255,255,255,0.1)] py-1">
                      <div className="absolute left-[-5px] top-4 w-2 h-2 rounded-full bg-[rgba(245,158,11,0.4)]"></div>
                      <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest">{hist.version}</span><div className="flex items-center gap-1.5 text-[10px] text-[rgba(255,255,255,0.2)] font-bold uppercase tracking-tighter"><IconClock size={12} /> RECORDED</div></div>
                      <p className="text-[13px] text-[rgba(255,255,255,0.7)] leading-relaxed mb-4">{hist.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                        <div><p className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase mb-0.5">SUPPLIER</p><p className="text-[10px] text-[rgba(255,255,255,0.5)] uppercase">{hist.supplier || 'N/A'}</p></div>
                        <div><p className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase mb-0.5">QTY</p><p className="text-[10px] text-[rgba(255,255,255,0.5)]">{hist.qty || '0'}</p></div>
                        <div><p className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase mb-0.5">RATE</p><p className="text-[10px] text-[rgba(255,255,255,0.5)]">AED {formatCurrency(hist.rate || '0')}</p></div>
                        <div><p className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase mb-0.5">VAT</p><p className="text-[10px] text-[rgba(255,255,255,0.5)]">AED {formatCurrency(hist.vat || '0')}</p></div>
                        <div><p className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase mb-0.5">TOTAL</p><p className="text-[10px] text-[rgba(255,255,255,0.5)]">AED {formatCurrency(hist.total || '0')}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global PR History Modal */}
      {showGlobalHistory && checkResult?.globalHistory && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowGlobalHistory(false)}></div>
          <div className="relative w-full max-w-lg glass-panel !rounded-none border-l border-[rgba(255,255,255,0.1)] h-full flex flex-col animate-slide-in-right shadow-2xl">
            <div className="p-8 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Audit Trail</h3>
                <p className="text-[11px] text-[#F59E0B] font-black uppercase tracking-widest mt-1">{checkResult.po}</p>
              </div>
              <button onClick={() => setShowGlobalHistory(false)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.5)]"><IconX size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {checkResult.globalHistory.map((log, idx) => {
                const currentCharges = parseFloat(log.current_charges || log['Current Charges'] || 0);
                const prevCharges = parseFloat(log.previous_charges || log['Previous Charges'] || 0);
                const isSaving = currentCharges < prevCharges;
                const isIncrease = currentCharges > prevCharges;
                const trendColor = isSaving ? '#10B981' : isIncrease ? '#EF4444' : '#F59E0B';
                const remarkVal = log.remark || log.Remark || 'No remark provided.';
                const statusVal = log.status || log.Status || 'UPDATE';
                const projectVal = log.project || log.Project || 'N/A';
                const timeVal = log.second_time_pr || log['Second Time PR'];
                
                return (
                  <div key={idx} className="p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: trendColor }}></div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: trendColor }}>{statusVal}</span>
                        <h4 className="text-[15px] font-bold text-white mt-1">AED {formatCurrency(currentCharges)}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase">PREVIOUS</span>
                        <p className="text-[13px] font-medium text-[rgba(255,255,255,0.5)] line-through decoration-[rgba(255,255,255,0.2)]">AED {formatCurrency(prevCharges)}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconClipboardCheck size={14} className="text-[rgba(255,255,255,0.4)]" />
                        <span className="text-[10px] font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest">Remark / Context</span>
                      </div>
                      <p className="text-[13px] text-white font-medium leading-relaxed italic">"{remarkVal}"</p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-[rgba(255,255,255,0.3)]">
                      <span>PROJECT: {projectVal}</span>
                      {timeVal && <span>{timeVal}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Static Sections - Hidden in Modal Mode */}
      {!isModalMode ? (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 stagger-item" style={{ animationDelay: '100ms' }}>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Procurement Dashboard</h1>
              <p className="text-[rgba(255,255,255,0.4)] font-medium">Real-time purchase request monitoring & spend analysis</p>
            </div>
            
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-2 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 px-3 border-r border-[rgba(255,255,255,0.08)]">
                <IconFilter size={14} className="text-[#F59E0B]" />
                <span className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Filters</span>
              </div>
              
              <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-[rgba(255,255,255,0.05)]">
                {['25', '26'].map(y => (
                  <button 
                    key={y}
                    onClick={() => setFilters({ ...filters, year: y })}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${filters.year === y ? 'bg-[#F59E0B] text-black shadow-lg shadow-[#F59E0B]/20' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
                  >
                    CY 20{y}
                  </button>
                ))}
              </div>

              <select 
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="bg-black/20 border border-[rgba(255,255,255,0.05)] text-[11px] text-white font-bold py-1.5 px-3 rounded-xl outline-none focus:border-[#F59E0B] transition-all cursor-pointer min-w-[120px]"
              >
                {uniqueDepartments.map(d => (
                  <option key={d} value={d} className="bg-[#06090F]">{d === 'All' ? 'All Departments' : d}</option>
                ))}
              </select>

              <select 
                value={filters.supplier}
                onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
                className="bg-black/20 border border-[rgba(255,255,255,0.05)] text-[11px] text-white font-bold py-1.5 px-3 rounded-xl outline-none focus:border-[#F59E0B] transition-all cursor-pointer max-w-[180px]"
              >
                {uniqueSuppliers.map(s => (
                  <option key={s} value={s} className="bg-[#06090F]">{s === 'All' ? 'All Suppliers' : s}</option>
                ))}
              </select>

              <button 
                onClick={fetchGlobalStats}
                className="p-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-xl border border-[rgba(245,158,11,0.2)] hover:bg-[#F59E0B] hover:text-black transition-all"
                title="Refresh Data"
              >
                <IconRefresh size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {isLoadingStats && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-2xl">
                <IconRefresh className="w-6 h-6 text-[#F59E0B] animate-spin" />
              </div>
            )}
            <StatCard index={1} title="Total PRs" value={dashboardStats.totalPRs} subValue="+12% from last month" trend="up" trendValue="12.5%" glowColor="#F59E0B" icon={FileText} />
            <StatCard index={2} title="Total Spend" value={dashboardStats.totalSpend} subValue="AED 3.8M last month" trend="up" trendValue="8.2%" glowColor="#6366F1" icon={Activity} />
            <StatCard index={3} title="Active Suppliers" value={dashboardStats.activeSuppliers} subValue="3 new this week" trend="up" trendValue="4.1%" glowColor="#14B8A6" icon={Users} />
            <StatCard index={4} title="Monthly Spend" value={dashboardStats.monthlySpend} subValue="Budget: AED 650K" glowColor="#F59E0B" icon={DollarSign} />
          </div>
        </>
      ) : null}
      {!isModalMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 glass-panel p-8">
            <h3 className="text-lg font-bold text-white mb-8">Monthly Spend Trend</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardStats.trendData}>
                  <defs><linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(6,9,15,0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                    formatter={(val) => [`AED ${val.toLocaleString()}`, 'Spend']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2.5} fill="url(#colorSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-2 glass-panel p-8">
            <h3 className="text-lg font-bold text-white mb-8">Change Distribution</h3>
            <div className="h-[350px] w-full flex items-center justify-center">
              <PieChart width={350} height={300}>
                <Pie 
                  data={dashboardStats.distributionData} 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={8} 
                  dataKey="value" 
                  nameKey="name"
                  stroke="none"
                >
                  {dashboardStats.distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={6} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(6,9,15,0.95)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-[rgba(255,255,255,0.4)] ml-2">{value}</span>}
                />
              </PieChart>
            </div>
          </div>
        </div>
      ) : checkResult && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 glass-panel p-8">
            <h3 className="text-lg font-bold text-white mb-8">Item Value Analysis</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkResult.materials.slice(0, 8).map(m => ({ name: m.Description.substring(0, 15) + '...', value: parseFloat((parseFloat(m.Total) || 0).toFixed(2)) }))}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 9}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.02)'}} 
                    formatter={(value) => [`AED ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'Total Value']}
                    contentStyle={{ backgroundColor: 'rgba(6,9,15,0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                  />
                  <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-2 glass-panel p-8">
            <h3 className="text-lg font-bold text-white mb-8">Supplier Distribution</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={Array.from(checkResult.materials.reduce((acc, m) => {
                      const s = m.Supplier || 'Unknown';
                      acc.set(s, (acc.get(s) || 0) + (parseFloat(m.Total) || 0));
                      return acc;
                    }, new Map())).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))} 
                    cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none"
                  >
                    {['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} cornerRadius={6} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`AED ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'Total Spend']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconClipboardData,
  IconTrash,
  IconCheck,
  IconX,
  IconLoader2,
  IconSearch,
  IconTableImport,
  IconRowInsertBottom,
  IconBuildingStore,
  IconCoins,
  IconUser,
  IconClock,
  IconCalendar,
  IconFileText,
  IconBuilding,
  IconBriefcase,
  IconEye,
  IconFileCertificate,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,

  IconReceipt2,
  IconPackage,
  IconWallet,
  IconArrowUpRight,
  IconArrowsDiff
} from '@tabler/icons-react';
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import BoxLoader from '../ui/BoxLoader';
import { adminSupabase } from '../../lib/supabase';


const PO_COLUMNS = [
  'Sr.No',
  'Ref',
  'PO Date',
  'Approve / Reject',
  'Status',
  'Project',
  'Company',
  'Pending Approval',
  'Supplier',
  'PO Class',
  'Entered By',
  'Entered Time',
  'Req Ref',
  'QC Ref.',
  'Doc. Remarks',
  'Terms & Conditions',
  'PO Revision',
  'Attachments',
  'Approval History',
  'Approval Config',
  'Discount',
  'Charges',
  'Net Price',
  'VAT',
  'Total Price',
  'Status_1',
  'Original Pirce',
  'Change in Price',
  'Month',
];

const MATERIAL_COLUMNS = [
  'Sr.No',
  'Item Code',
  'Description',
  'Class',
  'BOQ Section',
  'BOQ Activity',
  'UOM',
  'Purpose',
  'Vat Exempt',
  'Qty',
  'Remain Qty',
  'Rate',
  'Total',
  'PR',
];

const DETAIL_COLUMNS = [
  'Seq #',
  'Item Code',
  'Description',
  'Class',
  'BOQ Section',
  'BOQ Activity',
  'UOM',
  'Purpose',
  'Vat Exempt',
  'Req. Qty',
  'Remain Qty',
  'Rate',
  'Total',
  'Next Doc'
];

// Indices to strip from the raw paste (0-based)
// Bypassing 18: PDF Rpt, 19: PDF Rpt No Appr.
const STRIP_INDICES = new Set([18, 19]);

const IMPORT_WEBHOOK = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_PO_IMPORT}`;
const COMPARE_WEBHOOK = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_PO_COMPARE}`;

const PAGE_SIZE = 9;

/* â”€â”€â”€ Toast Component â”€â”€â”€ */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#10B981', icon: <IconCheck size={16} /> },
    error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#EF4444', icon: <IconX size={16} /> },
  };
  const c = colors[type] || colors.success;

  return (
    <div
      className="fixed top-6 right-6 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-slide-in-right"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, backdropFilter: 'blur(16px)' }}
    >
      {c.icon}
      <span className="text-[13px] font-bold">{message}</span>
    </div>
  );
};

/* â”€â”€â”€ Webhook PR Insight Sub-components â”€â”€â”€ */
const POLogCard = ({ row }) => {
  const ref = (row.Ref || 'N/A').replace(' (View Doc)', '');
  const status = row.Status || 'Open';
  const project = row.Project || 'N/A';
  const company = row.Company || 'N/A';
  const supplier = row.Supplier || 'N/A';
  const reqRef = row['Req Ref'] || row.Req_Ref || 'N/A';
  const qcRef = row['QC Ref.'] || row.QC_Ref || 'N/A';
  const month = row.Month || 'N/A';
  
  const hasOriginalPrice = row['Original Pirce'] || row['Original Price'];

  return (
    <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 space-y-4 hover:border-[#F59E0B] hover:shadow-[0_0_15px_rgba(245,158,11,0.08)] transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h5 className="text-base font-black text-[#F59E0B] tracking-tight uppercase">
          {ref}
        </h5>
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
          status === 'Approved' 
            ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]' 
            : status === 'Open' 
            ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]' 
            : status === 'Sent for approval' || status.toLowerCase().includes('sent for approval')
            ? 'bg-[rgba(139,92,246,0.15)] text-[#8B5CF6] border border-[rgba(139,92,246,0.3)]'
            : 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
        }`}>
          {status}
        </span>
      </div>

      {/* Row 1: Project & Supplier */}
      <div className="mb-2">
        <div className="flex items-center justify-between gap-3 text-white font-bold text-sm">
          <div className="flex items-center gap-1.5 truncate" title={project}>
            <IconBriefcase size={14} className="text-[rgba(255,255,255,0.4)] shrink-0" />
            <span className="truncate">{project}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#F59E0B] font-semibold text-[11px] shrink-0 max-w-[140px]" title={supplier}>
            <IconBuildingStore size={12} className="shrink-0" />
            <span className="truncate">{supplier}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[rgba(255,255,255,0.4)] text-[11px] font-medium truncate mt-1">
          <IconBuilding size={12} className="shrink-0" />
          <span className="truncate">{company}</span>
        </div>
      </div>

      {/* Row 3: Req Ref Â· QC Ref Â· Month in chips */}
      <div className="flex flex-wrap gap-2 text-[10px] font-bold text-[rgba(255,255,255,0.5)]">
        <span className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 rounded-lg">
          Req Ref: {reqRef}
        </span>
        <span className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 rounded-lg">
          QC Ref: {qcRef}
        </span>
        <span className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 rounded-lg">
          Month: {month}
        </span>
      </div>

      {/* Footer: Net Price Â· VAT Â· Total Price */}
      <div className="grid grid-cols-3 gap-2.5 pt-2">
        <div className="bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.1)] rounded-xl p-2 text-center text-[#F59E0B]">
          <p className="text-[8px] font-extrabold uppercase opacity-60">Net</p>
          <p className="text-[11px] font-black mt-0.5">{row['Net Price'] || '0.00'}</p>
        </div>
        <div className="bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.1)] rounded-xl p-2 text-center text-[#F59E0B]">
          <p className="text-[8px] font-extrabold uppercase opacity-60">VAT</p>
          <p className="text-[11px] font-black mt-0.5">{row.VAT || '0.00'}</p>
        </div>
        <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl p-2 text-center text-[#F59E0B] shadow-inner">
          <p className="text-[8px] font-extrabold uppercase opacity-80">Total</p>
          <p className="text-[11px] font-black mt-0.5">{row['Total Price'] || '0.00'}</p>
        </div>
      </div>

      {/* Price comparison extra row */}
      {hasOriginalPrice && row['Net Price'] && (
        <div className="text-[10px] text-[rgba(255,255,255,0.4)] flex items-center gap-1.5 bg-[#090e17] px-3 py-1.5 rounded-xl border border-[rgba(255,255,255,0.03)] w-fit mt-1">
          <span className="font-extrabold text-[#F59E0B] uppercase text-[8px]">Comparison:</span>
          <span className="line-through">AED {hasOriginalPrice}</span>
          <span className="text-[#F59E0B]">&rarr;</span>
          <span className="text-white font-bold">AED {row['Net Price']}</span>
        </div>
      )}
    </div>
  );
};

const PurchaseOrderCard = ({ row, renderCell, extractVersions }) => {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const versions = extractVersions(row);
  const pr = row.PR || row.PR_No || 'N/A';
  const srNo = row['Sr.No'] || row.Sr_No || '1';
  const project = row.Project || 'N/A';
  const desc = row.Description || row.description || 'No description';
  const supplier = versions.length > 0 ? versions[versions.length - 1].supplier : 'N/A';

  return (
    <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 space-y-4 hover:border-[#F59E0B] transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h5 className="text-base font-black text-[#F59E0B] tracking-tight uppercase">
          {pr}
        </h5>
        <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)] uppercase tracking-wider shrink-0">
          Item SN: {srNo}
        </span>
      </div>

      {/* Row 1: Project & Supplier */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase">Project</p>
          <div className="flex items-center gap-1.5 text-white font-bold text-sm mt-0.5 truncate" title={project}>
            <IconBriefcase size={14} className="text-[rgba(255,255,255,0.4)] shrink-0" />
            <span className="truncate">{project}</span>
          </div>
        </div>
        <div className="flex-1 text-right min-w-0">
          <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase">Supplier</p>
          <div className="flex items-center justify-end gap-1.5 text-[#F59E0B] font-semibold text-[11px] mt-0.5 truncate" title={supplier}>
            <IconBuildingStore size={12} className="shrink-0" />
            <span className="truncate max-w-[140px]">{supplier}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Description */}
      <div>
        <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase mb-1">Description</p>
        <p 
          onClick={() => setIsDescExpanded(!isDescExpanded)} 
          className={`text-xs text-[rgba(255,255,255,0.7)] font-medium leading-relaxed cursor-pointer select-none ${
            isDescExpanded ? '' : 'line-clamp-2'
          }`}
          title="Click to expand description"
        >
          {desc}
        </p>
      </div>

      {/* Versions Table */}
      {versions.length > 0 && (
        <div className="overflow-x-auto border border-[rgba(255,255,255,0.05)] rounded-xl bg-[#090e17]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
                <th className="px-4 py-2.5">Version</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">Rate</th>
                <th className="px-4 py-2.5">Price</th>
                <th className="px-4 py-2.5">VAT</th>
                <th className="px-4 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.85)]">
              {versions.slice(-2).map((v, idx, arr) => {
                const label = idx === arr.length - 1 ? 'Current' : 'Previous';
                return (
                <tr key={idx} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                  <td className="px-4 py-3 font-extrabold text-[#F59E0B] uppercase">{label}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('qty', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('rate', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('price', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('vat', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-bold text-white">{renderCell('total', versions.indexOf(v), versions)}</td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* â”€â”€â”€ Main Component â”€â”€â”€ */
const POLog = ({ mode = 'dashboard', isViewer = false, searchQuery = '' }) => {
  // Paste zone
  const [pasteText, setPasteText] = useState('');
  const [rateDetailsMap, setRateDetailsMap] = useState({}); // { [prRef]: text }
  const [currentRatePrIndex, setCurrentRatePrIndex] = useState(0);
  const [materialDetailMap, setMaterialDetailMap] = useState({}); // { [prRef]: text }
  const [currentPrIndex, setCurrentPrIndex] = useState(0);
  const [parsedRows, setParsedRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [materialDetailRows, setMaterialDetailRows] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonModal, setComparisonModal] = useState({ show: false, prRef: null, data: [], isLive: true });
  const [comparisonCache, setComparisonCache] = useState({}); // { [prRef]: { data, isLive: boolean } }
  const comparisonLoadingRef = useRef(new Set()); // Tracks PRs currently being fetched to avoid duplicates
  const [reconRemarks, setReconRemarks] = useState({}); // { [prRef]: { [rowKey]: string } }
  const reconRemarksRef = useRef(reconRemarks);
  useEffect(() => { reconRemarksRef.current = reconRemarks; }, [reconRemarks]);
  const [remarksInput, setRemarksInput] = useState({}); // { [rowKey]: string } — temp state inside comparison modal
  const [rateSummaryMap, setRateSummaryMap] = useState({}); // { [prRef]: { subtotal, discount, charges, net, manualTotal } }
  const [isImporting, setIsImporting] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [toast, setToast] = useState(null);
  const textareaRef = useRef(null);

  // Refs for material rows to ensure handleCompareWithExisting always uses fresh data
  const materialRowsRef = useRef(materialRows);
  const materialDetailRowsRef = useRef(materialDetailRows);
  useEffect(() => { materialRowsRef.current = materialRows; }, [materialRows]);
  useEffect(() => { materialDetailRowsRef.current = materialDetailRows; }, [materialDetailRows]);

  // Dialog and Countdown
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [dialogCountdown, setDialogCountdown] = useState(2);
  const timerRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: logData = [], isLoading: logLoading } = useQuery({
    queryKey: ['po-log-data'],
    queryFn: async () => {
      const all = [];
      const size = 3000;
      let start = 0;
      while (true) {
        const { data, error } = await adminSupabase
          .from('po_data')
          .select('*')
          .order('id')
          .range(start, start + size - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < size) break;
        start += size;
      }
      return all.map(row => {
        const n = { ...row };
        if (n.po_date && !n['PO Date']) n['PO Date'] = n.po_date;
        if (n.qc_ref && !n['QC Ref.']) n['QC Ref.'] = n.qc_ref;
        if (n['QC Ref'] && !n['QC Ref.']) n['QC Ref.'] = n['QC Ref'];
        if (n['Approved / Reject'] && !n['Approve / Reject']) n['Approve / Reject'] = n['Approved / Reject'];
        if (n.month && !n.Month) n.Month = String(n.month).trim();
        if (n.Month) n.Month = String(n.Month).replace(/[\s\u00A0]+/g, ' ').trim();
        return n;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: poMasterData = [], isLoading: poMasterLoading } = useQuery({
    queryKey: ['po-master-data'],
    queryFn: async () => {
      const response = await fetch(`/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_MASTER_PO}?action=merged`);
      if (!response.ok) throw new Error('Failed to fetch master data');
      const json = await response.json();
      let data = [];
      if (Array.isArray(json)) {
        data = json[0]?.data && Array.isArray(json[0].data) ? json[0].data : json;
      } else if (json?.data && Array.isArray(json.data)) {
        data = json.data;
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const fetchLogData = () => queryClient.invalidateQueries({ queryKey: ['po-log-data'] });
  const [logSearch, setLogSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [enteredByFilter, setEnteredByFilter] = useState('All');
  const [spendPeriod, setSpendPeriod] = useState('Monthly');
  const [drillMonth, setDrillMonth] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedCardRef, setExpandedCardRef] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  // Webhook integration states for PR details
  const [prDetails, setPrDetails] = useState({});
  const [prLoading, setPrLoading] = useState({});
  const [prError, setPrError] = useState({});

  // Sync rateSummaryMap back to parsedRows for preview reflection
  useEffect(() => {
    if (Object.keys(rateSummaryMap).length === 0 || parsedRows.length === 0) return;

    setParsedRows(prevRows => {
      let changed = false;
      const nextRows = prevRows.map(row => {
        const pr = (row['Req Ref'] || '').trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '');
        const summaryKey = Object.keys(rateSummaryMap).find(k => k.trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '') === pr);
        
        if (summaryKey && rateSummaryMap[summaryKey]) {
          const summary = rateSummaryMap[summaryKey];
          const update = {};
          
          if (row['Discount'] !== summary.discount.toFixed(2)) update['Discount'] = summary.discount.toFixed(2);
          if (row['Charges'] !== summary.charges.toFixed(2)) update['Charges'] = summary.charges.toFixed(2);
          if (row['Net Price'] !== summary.net.toFixed(2)) update['Net Price'] = summary.net.toFixed(2);
          if (row['VAT'] !== summary.vat.toFixed(2)) update['VAT'] = summary.vat.toFixed(2);
          if (row['Total Price'] !== summary.total.toFixed(2)) update['Total Price'] = summary.total.toFixed(2);
          
          if (Object.keys(update).length > 0) {
            changed = true;
            return { ...row, ...update };
          }
        }
        return row;
      });
      return changed ? nextRows : prevRows;
    });
  }, [rateSummaryMap, parsedRows.length]);

  const netPriceStr = selectedCard ? (selectedCard['Net Price'] || '0.00') : '0.00';
  const originalPriceStr = selectedCard ? (selectedCard['Original Pirce'] || selectedCard['Original Price'] || '0.00') : '0.00';
  
  const netVal = parseFloat(String(netPriceStr).replace(/,/g, '')) || 0;
  const origVal = parseFloat(String(originalPriceStr).replace(/,/g, '')) || 0;
  
  const rawChangeStr = selectedCard ? (selectedCard['Change in Price'] || '0.00') : '0.00';
  const computedChangeVal = Math.abs(netVal - origVal);
  const changePriceStr = computedChangeVal > 0 
    ? computedChangeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    : rawChangeStr;

  const percentChange = origVal > 0 ? ((netVal - origVal) / origVal) * 100 : 0;

  const handleFetchPrData = useCallback(async (row, force = false) => {
    const ref = row.Ref;
    const prRef = row['Req Ref'] || '';
    if (!prRef || prRef === 'N/A') return;
    
    // If already loaded or loading, skip
    if (!force && (prDetails[ref] || prLoading[ref])) return;

    setPrLoading(prev => ({ ...prev, [ref]: true }));
    setPrError(prev => ({ ...prev, [ref]: null }));

    try {
      const [mat25, mat26, pd25, pd26, poTbl] = await Promise.all([
        adminSupabase.from('material_detail_25').select('*').eq('PR', prRef),
        adminSupabase.from('material_detail_26').select('*').eq('pr', prRef),
        adminSupabase.from('pr_data_25').select('*').eq('PR', prRef),
        adminSupabase.from('pr_data_26').select('*').eq('pr', prRef),
        adminSupabase.from('purchase_orders').select('*').eq('PR', prRef),
      ]);
      const err = mat25.error || mat26.error || pd25.error || pd26.error || poTbl.error;
      if (err) throw new Error(err.message);

      const allRows = [
        ...(mat25.data || []),
        ...(mat26.data || []),
        ...(pd25.data || []),
        ...(pd26.data || []),
        ...(poTbl.data || []),
      ];

      setPrDetails(prev => ({ ...prev, [ref]: allRows.length ? allRows : { message: 'No detail data found for this PR.' } }));
    } catch (err) {
      console.error(`Failed to fetch PR details for ${prRef}:`, err);
      setPrError(prev => ({ ...prev, [ref]: err.message }));
    } finally {
      setPrLoading(prev => ({ ...prev, [ref]: false }));
    }
  }, [prDetails, prLoading]);

  const toggleExpandCard = (row) => {
    setExpandedCardRef(prev => {
      const next = prev === row.Ref ? null : row.Ref;
      if (next && !prDetails[row.Ref]) {
        handleFetchPrData(row);
      }
      return next;
    });
  };

  const openDetailedModal = (row) => {
    setSelectedCard(row);
    if (!prDetails[row.Ref]) {
      handleFetchPrData(row);
    }
  };

  const extractVersions = (row) => {
    const versions = [];
    const desc = row.Description || row.description || '';
    let hasChange1 = false;

    // Collect all Change 1-20
    for (let i = 1; i <= 20; i++) {
      const hasAnyChange = Object.keys(row).some(key => key.startsWith(`change${i}_`) && row[key] != null && row[key] !== '');
      if (hasAnyChange) {
        if (i === 1) hasChange1 = true;
        versions.push({
          version: i === 1 ? 'Baseline' : `Version ${i - 1}`,
          qty: row[`change${i}_qty`] || row[`change${i}_Qty`] || '0.00',
          rate: row[`change${i}_rate`] || row[`change${i}_Rate`] || '0.00',
          price: row[`change${i}_price`] || row[`change${i}_Price`] || '0.00',
          vat: row[`change${i}_vat`] || row[`change${i}_Vat`] || '0.00',
          total: row[`change${i}_total`] || row[`change${i}_Total`] || '0.00',
          supplier: row[`change${i}_supplier`] || row[`change${i}_Supplier`] || 'N/A',
          desc: row[`change${i}_description`] || row[`change${i}_Description`] || desc
        });
      }
    }

    // Fallback if no change1_ exists (for backwards compatibility with generic fields)
    if (!hasChange1) {
      const qty = row.Req_Qty || row.ReqQty || row.Qty || row.qty;
      const rate = row.Rate || row.rate;
      const price = row.Price || row.price;
      const vat = row.VAT || row.vat;
      const total = row.Total || row.total;
      const supplier = row.Supplier || row.supplier;

      if (qty != null || rate != null || price != null) {
        versions.unshift({
          version: 'Baseline',
          qty: qty || '0.00',
          rate: rate || '0.00',
          price: price || '0.00',
          vat: vat || '0.00',
          total: total || '0.00',
          supplier: supplier || 'N/A',
          desc
        });
      }
    }

    return versions;
  };

  const isDiff = (field, idx, versions) => {
    if (idx === 0) return false;
    const currentVal = String(versions[idx][field] || '').trim().toLowerCase();
    const prevVal = String(versions[idx - 1][field] || '').trim().toLowerCase();
    return currentVal !== prevVal;
  };

  const renderCell = (field, idx, versions) => {
    const val = versions[idx][field] || '0.00';
    const hasDiff = isDiff(field, idx, versions);
    return (
      <span className={hasDiff ? "text-[#F59E0B] font-extrabold bg-[rgba(245,158,11,0.12)] px-1.5 py-0.5 rounded border border-[rgba(245,158,11,0.25)] animate-pulse" : "text-white"}>
        {val}
      </span>
    );
  };

  const normalizeData = (data) => {
    if (!data) return [];
    
    // Deeply unwrap array layers to get to the core object
    let current = data;
    while (Array.isArray(current) && current.length === 1) {
      current = current[0];
    }

    // Recursively find the PR container containing a PR reference and an items array
    const findPrContainer = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findPrContainer(item);
          if (found) return found;
        }
        return null;
      }
      
      // Look for PR value
      const prVal = obj.pr || obj.PR || obj.PR_No || obj.PR_Number || obj['PR No'] || obj.prNo || obj.pr_no || obj.pr_number || obj['Req Ref'] || obj.Req_Ref;
      
      // Look for an items array under common names
      const itemsArr = obj.items || obj.Items || obj.material_items || obj.materialItems || obj.pr_items || obj.prItems || obj.list;
      
      if (prVal && itemsArr && Array.isArray(itemsArr)) {
        return {
          pr: prVal,
          project: obj.project || obj.Project || obj.project_name || obj.projectName || 'N/A',
          items: itemsArr
        };
      }
      
      for (const key of Object.keys(obj)) {
        const found = findPrContainer(obj[key]);
        if (found) return found;
      }
      return null;
    };

    const prContainer = findPrContainer(current);

    if (prContainer && Array.isArray(prContainer.items)) {
      return prContainer.items.map(item => {
        const mapped = {
          PR: prContainer.pr,
          Project: prContainer.project,
          'Sr.No': item.sr_no || item.Sr_No || item.srNo || item.serial || '1',
          Description: item.description || item.Description || item.desc || 'No description',
          Req_Qty: item.req_qty || item.Req_Qty || item.qty || item.quantity || '0.00',
        };
        
        const versionsList = item.versions || item.Versions || item.history || item.History || [];
        if (Array.isArray(versionsList)) {
          versionsList.forEach(v => {
             const i = v.version || v.Version || v.v || 1;
             mapped[`change${i}_qty`] = v.qty || v.Qty || v.quantity || '0.00';
             mapped[`change${i}_rate`] = v.rate || v.Rate || v.price || '0.00';
             mapped[`change${i}_price`] = v.price || v.Price || v.amount || '0.00';
             mapped[`change${i}_vat`] = v.vat || v.Vat || '0.00';
             mapped[`change${i}_total`] = v.total || v.Total || v.total_amount || '0.00';
             mapped[`change${i}_supplier`] = v.supplier || v.Supplier || 'N/A';
             mapped[`change${i}_description`] = v.description || v.Description || item.description || 'No description';
          });
        }
        return mapped;
      });
    }

    // Legacy fallback
    if (typeof current === 'object' && !Array.isArray(current)) {
      if (Array.isArray(current.data)) current = current.data;
      else if (Array.isArray(current.items)) current = current.items;
      else if (Array.isArray(current.result)) current = current.result;
      else {
        const keys = Object.keys(current);
        if (keys.length === 1 && Array.isArray(current[keys[0]])) {
          current = current[keys[0]];
        }
      }
    }

    let items = Array.isArray(current) ? current : [current];
    while (items.length === 1 && Array.isArray(items[0])) {
      items = items[0];
    }
    return items;
  };

  const renderWebhookDataInline = (data) => {
    if (!data) return null;
    const rawItems = normalizeData(data);
    if (rawItems.length === 0) return <span>No data logs found</span>;
    
    let logsCount = 0;
    let ordersCount = 0;
    rawItems.forEach(item => {
      if (item.Ref) logsCount++;
      else ordersCount++;
    });

    return (
      <div className="space-y-1">
        <p className="text-[10px] text-white font-bold">
          Detected: <span className="text-[#F59E0B]">{logsCount} PO Log</span> &middot; <span className="text-[#F59E0B]">{ordersCount} Material Items</span>
        </p>
        <p className="text-[9px] text-[rgba(255,255,255,0.3)] font-bold italic pt-1">
          Click 'VIEW FULL REPORT' to open deep comparison view
        </p>
      </div>
    );
  };

  const renderWebhookDataFull = (data) => {
    if (!data) return <p className="text-xs text-[rgba(255,255,255,0.3)]">No details returned.</p>;

    const rawItems = normalizeData(data);
    if (rawItems.length === 0) return <p className="text-xs text-[rgba(255,255,255,0.3)]">Empty dataset.</p>;

    const poLogs = [];
    const purchaseOrders = [];

    rawItems.forEach(item => {
      // Prioritize items with remark/status as metadata or PO logs
      if (item.Ref || item.ref || item.Reference || item.reference) {
        poLogs.push(item);
      } else if (item.PR || item.pr || item.PR_No || item.pr_no || item.PR_Number || item.pr_number || item['PR No'] || item.Req_Ref || item.req_ref || item['Req Ref']) {
        purchaseOrders.push(item);
      } else if (item.remark || item.Remark || item.remarks || item.Remarks) {
        // If it has a remark but no clear PR ref, it might be a general log
        poLogs.push(item);
      } else {
        if (Object.keys(item).some(k => k.toLowerCase().includes('ref'))) {
          poLogs.push(item);
        } else {
          purchaseOrders.push(item);
        }
      }
    });

    // Group PO logs by PR
    const poLogsGrouped = poLogs.reduce((acc, row) => {
      const pr = row['Req Ref'] || row.Req_Ref || 'N/A';
      if (!acc[pr]) acc[pr] = [];
      acc[pr].push(row);
      return acc;
    }, {});

    // Group Purchase Orders by PR
    const purchaseOrdersGrouped = purchaseOrders.reduce((acc, row) => {
      const pr = row.PR || row.PR_No || row.PR_Number || row['PR No'] || 'N/A';
      if (!acc[pr]) acc[pr] = [];
      acc[pr].push(row);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        {/* Header Summary */}
        <div className="flex items-center gap-3 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)] rounded-2xl px-5 py-3 w-fit text-[#F59E0B] font-black text-xs uppercase tracking-widest animate-zoom-in">
          <span>{poLogs.length} PO Log</span>
          <span className="opacity-40">&middot;</span>
          <span>{purchaseOrders.length} Material Items</span>
        </div>

        {/* Section 1: PO Log Entries */}
        {poLogs.length > 0 && (
          <div className="space-y-6 animate-slide-down">
            <h5 className="text-[11px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-[0.2em] border-b border-[rgba(255,255,255,0.05)] pb-2 flex items-center gap-2">
              <IconFileCertificate size={14} className="text-[#F59E0B]" /> PO Log Entries ({poLogs.length})
            </h5>
            <div className="space-y-6">
              {Object.entries(poLogsGrouped).map(([prNumber, groupItems]) => (
                <div key={prNumber} className="border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-2.5">
                    <span className="text-xs font-black text-[#F59E0B] uppercase tracking-wider">Group: {prNumber}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] rounded font-bold uppercase tracking-tighter">
                      {groupItems.length} {groupItems.length === 1 ? 'Entry' : 'Entries'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupItems.map((item, idx) => (
                      <POLogCard key={idx} row={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Material Items */}
        {purchaseOrders.length > 0 && (
          <div className="space-y-6 animate-slide-down">
            <h5 className="text-[11px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-[0.2em] border-b border-[rgba(255,255,255,0.05)] pb-2 flex items-center gap-2">
              <IconBriefcase size={14} className="text-[#F59E0B]" /> PR List ({purchaseOrders.length})
            </h5>
            <div className="space-y-6">
              {Object.entries(purchaseOrdersGrouped).map(([prNumber, groupItems]) => (
                <div key={prNumber} className="border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-2.5">
                    <span className="text-xs font-black text-[#F59E0B] uppercase tracking-wider">Group: {prNumber}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] rounded font-bold uppercase tracking-tighter">
                      {groupItems.length} {groupItems.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {groupItems.map((item, idx) => (
                      <PurchaseOrderCard 
                        key={idx} 
                        row={item} 
                        renderCell={renderCell}
                        extractVersions={extractVersions}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const theme = {
    bg: '#06090F',
    cardBg: 'rgba(255,255,255,0.03)',
    headerBg: '#0F1520',
    headerText: 'rgba(255,255,255,0.4)',
    cellText: 'rgba(255,255,255,0.85)',
    cellBorder: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)',
    gold: '#F59E0B',
    goldBg: 'rgba(245,158,11,0.08)',
    goldBorder: 'rgba(245,158,11,0.25)',
    strip: 'rgba(255,255,255,0.015)',
  };

  /* â”€â”€â”€ Paste parsing â”€â”€â”€ */
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pasted = clipboardData.getData('text');
    setPasteText(pasted);
    parseTabData(pasted);
    e.preventDefault();
  };

  const parseTabData = (text) => {
    if (!text || !text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
    const rows = [];

    for (const line of lines) {
      const rawCells = line.split('\t');

      // Strip columns at indices 17, 18, 19, 20 (Attachments, PDF, PDF Rpt, PDF Rpt No Appr)
      const filtered = rawCells.filter((_, idx) => !STRIP_INDICES.has(idx));

      const rowObj = {};
      PO_COLUMNS.forEach((col, i) => {
        let val = (filtered[i] || '').trim();
        if (col === 'Sr.No' && val && !isNaN(val.replace(/,/g, ''))) {
          const num = parseInt(val.replace(/,/g, ''));
          if (!isNaN(num)) val = num;
        }
        rowObj[col] = val;
      });

      // Skip fully empty rows
      const hasContent = PO_COLUMNS.some((col) => rowObj[col] !== '');
      if (hasContent) rows.push(rowObj);
    }

    setParsedRows(rows);
  };

  const handleTextChange = (e) => {
    setPasteText(e.target.value);
    parseTabData(e.target.value);
  };

  const handleRateDetailsPaste = (e, prRef) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pasted = clipboardData.getData('text');
    const newMap = { ...rateDetailsMap, [prRef]: pasted };
    setRateDetailsMap(newMap);
    parseRateDetails(newMap);
    e.preventDefault();
  };

  const handleRateDetailsChange = (text, prRef) => {
    const newMap = { ...rateDetailsMap, [prRef]: text };
    setRateDetailsMap(newMap);
    parseRateDetails(newMap);
  };

  const parseRateDetails = (map) => {
    const clearRateData = () => {
      setMaterialRows([]);
      setParsedRows(prevRows => prevRows.map(row => {
        if (row._rateUpdated) {
          return {
            ...row,
            'Net Price': '',
            'VAT': '',
            'Total Price': '',
            _rateUpdated: false,
          };
        }
        return row;
      }));
    };

    if (!map || Object.keys(map).length === 0) {
      clearRateData();
      return;
    }

    // Accumulate totals per normalized PR key: { 'PR-04776': number }
    const prTotals = {};
    const prDiscounts = {};
    const prCharges = {};
    const extractedMaterials = [];

    // Normalize a PR ref string to "PR-XXXXX" uppercase
    const normalizePr = (s) => {
      const cleaned = s.toUpperCase().replace(/\s+/g, '');
      return cleaned.startsWith('PR-') ? cleaned : cleaned.replace(/^PR/, 'PR-');
    };

    // Lines to skip
    const skipPattern = /^(seq#|item\s*code|charges|discount|sub\s*total|grand\s*total|vat|net\s*total)/i;

    Object.keys(map).forEach(mapPrRef => {
      const text = map[mapPrRef];
      if (!text || !text.trim()) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
      if (lines.length === 0) return;

      // Detect delimiter: pipe vs tab
      const pipeCount = lines.filter(l => l.includes('|')).length;
      const tabCount = lines.filter(l => l.includes('\t')).length;
      const delimiter = pipeCount >= tabCount ? '|' : '\t';

      // PR reference pattern â€” e.g. PR-04776 or PR04776
      const prPattern = /\bPR[-\s]?\d{3,7}\b/i;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const cells = trimmed.split(delimiter).map(c => c.trim());
        if (cells.length < 2) continue;

        const firstCell = cells[0].toLowerCase();
        
        // Specifically capture header-level values
        if (firstCell.includes('discount')) {
          const val = parseFloat(cells[1].replace(/,/g, ''));
          if (!isNaN(val)) prDiscounts[mapPrRef] = val;
          continue;
        }
        if (firstCell.includes('charges')) {
          const val = parseFloat(cells[1].replace(/,/g, ''));
          if (!isNaN(val)) prCharges[mapPrRef] = val;
          continue;
        }

        // Skip other summary lines from materials
        if (skipPattern.test(firstCell) || firstCell.includes('total') || firstCell.includes('vat')) continue;

        // Use the mapPrRef as a fallback if no PR is found in line
        let prRef = mapPrRef; 
        for (const cell of cells) {
          const m = cell.match(prPattern);
          if (m) { prRef = normalizePr(m[0]); break; }
        }

        // Collect all numeric values from this line
        const nums = [];
        for (let i = 0; i < cells.length; i++) {
          const cleaned = cells[i].replace(/,/g, '');
          const n = parseFloat(cleaned);
          if (!isNaN(n) && isFinite(n) && /^-?\d+(\.\d+)?$/.test(cleaned)) {
            nums.push({ val: n, idx: i });
          }
        }
        if (nums.length === 0) continue;

        // Last numeric = line total
        const lineTotal = nums[nums.length - 1].val;
        prTotals[prRef] = (prTotals[prRef] || 0) + lineTotal;

        // Identify indices based on the ERP layout

        extractedMaterials.push({
          srNo: cells[0] || '',
          itemCode: cells[1] || '',
          description: cells[2] || '',
          className: cells[3] || '',
          boqSection: cells[4] || '',
          boqActivity: cells[5] || '',
          uom: cells[6] || '',
          purpose: cells[7] || '',
          vatExempt: cells[8] || '',
          qty: cells[9] || '0',
          remainQty: cells[10] || '0',
          rate: cells[11] || '0',
          total: cells[12] || '0',
          prRef: cells[13] || prRef, // Fallback to detected PR if not in last cell
        });
      }
    });

    if (Object.keys(prTotals).length === 0) {
      clearRateData();
      return;
    }

    // Map the extracted materials to the final materialRows format
    const newMaterialRows = extractedMaterials.map(mat => {
      let finalSrNo = mat.srNo;
      if (finalSrNo && !isNaN(String(finalSrNo).replace(/,/g, ''))) {
        const num = parseInt(String(finalSrNo).replace(/,/g, ''));
        if (!isNaN(num)) finalSrNo = num;
      }

      const rowObj = {
        'Sr.No': finalSrNo,
        'Item Code': mat.itemCode,
        'Description': mat.description,
        'Class': mat.className,
        'BOQ Section': mat.boqSection,
        'BOQ Activity': mat.boqActivity,
        'UOM': mat.uom,
        'Purpose': mat.purpose,
        'Vat Exempt': mat.vatExempt,
        'Qty': mat.qty,
        'Remain Qty': mat.remainQty,
        'Rate': mat.rate,
        'Total': mat.total,
        'PR': mat.prRef,
      };
      return rowObj;
    });

    const summary = {};
    Object.keys(prTotals).forEach(rowPr => {
      const netPrice = (prTotals[rowPr] || 0) + (prCharges[rowPr] || 0) - (prDiscounts[rowPr] || 0);
      const vatNum = netPrice * 0.05;
      const totalPrice = netPrice + vatNum;

      summary[rowPr] = {
        subtotal: prTotals[rowPr] || 0,
        discount: prDiscounts[rowPr] || 0,
        charges: prCharges[rowPr] || 0,
        net: netPrice,
        vat: vatNum,
        total: totalPrice
      };
    });

    // NOTE: Auto-sync fully disabled. Only update material rows.
    // The right-side summary will only populate when the user pastes totals manually.
    setMaterialRows(newMaterialRows);
  };

  const uniquePrs = useMemo(() => {
    const prs = new Set();
    parsedRows.forEach(row => {
      const pr = (row['Req Ref'] || row.Req_Ref || '').trim();
      if (pr) prs.add(pr);
    });
    return Array.from(prs);
  }, [parsedRows]);

  const handleMaterialDetailPaste = (e, prRef) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pasted = clipboardData.getData('text');
    const newMap = { ...materialDetailMap, [prRef]: pasted };
    setMaterialDetailMap(newMap);
    parseAllMaterialDetails(newMap);
    e.preventDefault();
  };

  const handleMaterialDetailChange = (text, prRef) => {
    const newMap = { ...materialDetailMap, [prRef]: text };
    setMaterialDetailMap(newMap);
    parseAllMaterialDetails(newMap);
  };

  const parseAllMaterialDetails = (map) => {
    let allMergedRows = [];
    const skipPattern = /^(seq #|item code|description|class|boq section|boq activity|uom|purpose|req\. qty|remain qty|next doc)/i;
    const knownUoms = ['trip', 'roll', 'drum', 'number', 'nos', 'kg', 'mtr', 'sqft', 'sqm', 'cum', 'ltr', 'box', 'pkt', 'set', 'unit', 'hrs', 'days'];

    Object.keys(map).forEach((prRef) => {
      const text = map[prRef];
      if (!text || !text.trim()) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
      if (lines.length === 0) return;

      const pipeCount = lines.filter(l => l.includes('|')).length;
      const tabCount = lines.filter(l => l.includes('\t')).length;
      const delimiter = pipeCount >= tabCount && pipeCount > 0 ? '|' : '\t';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || skipPattern.test(trimmed)) continue;

        const cells = trimmed.split(delimiter).map(c => c.trim());
        if (cells.length < 5) continue;

        const rowObj = { _prRef: prRef, _delimiter: delimiter === '|' ? 'PIPE' : 'TAB' };
        
        // Initial mapping based on standard indices
        DETAIL_COLUMNS.forEach((col, i) => {
          let val = cells[i] || '';
          if (col === 'Seq #' && val && !isNaN(val.replace(/,/g, ''))) {
            const num = parseInt(val.replace(/,/g, ''));
            if (!isNaN(num)) val = num;
          }
          rowObj[col] = val;
        });

        // Smart Shifting: If BOQ is missing, UOM and Qty will be at earlier indices
        // We look for the first cell after index 3 that looks like a UOM or is followed by numbers
        let uomIndex = -1;
        for (let i = 4; i <= 7; i++) {
          if (!cells[i]) continue;
          const valLower = cells[i].toLowerCase();
          // If this cell is a known UOM or the next cell is a number (quantity)
          if (knownUoms.some(u => valLower.includes(u)) || (!isNaN(parseFloat(cells[i+1])) && cells[i+1] !== '')) {
            uomIndex = i;
            break;
          }
        }

        if (uomIndex !== -1 && uomIndex !== 6) {
          // We found UOM at a different index (e.g. 4 or 5 instead of 6)
          // Shift the quantity and purpose fields accordingly
          rowObj['UOM'] = cells[uomIndex] || '';
          rowObj['Purpose'] = cells[uomIndex + 1] || '';
          rowObj['Req. Qty'] = cells[uomIndex + 2] || '';
          rowObj['Remain Qty'] = cells[uomIndex + 3] || '';
          rowObj['Next Doc'] = cells[uomIndex + 4] || '';
          
          // Clear the BOQ fields that were mispopulated
          if (uomIndex <= 5) rowObj['BOQ Activity'] = '';
          if (uomIndex <= 4) rowObj['BOQ Section'] = '';
        }

        // --- Post-parse correction for "Next Doc" ---
        // If "PO-" appears in any cell, it belongs to Next Doc. 
        // Often it gets shifted into 'Remain Qty' due to missing BOQ/Purpose columns.
        for (let i = 0; i < cells.length; i++) {
          const cellVal = (cells[i] || '').trim();
          if (cellVal.toUpperCase().startsWith('PO-')) {
             rowObj['Next Doc'] = cellVal;
             
             // Heuristic: If we found a PO reference, and Req. Qty is empty/zero but Vat Exempt has a number,
             // it's almost certain that the columns were shifted and Vat Exempt is actually the quantity.
             const vatVal = parseFloat(String(rowObj['Vat Exempt'] || '0').replace(/,/g, ''));
             const reqVal = parseFloat(String(rowObj['Req. Qty'] || '0').replace(/,/g, ''));
             
             if (vatVal > 0 && reqVal === 0) {
               rowObj['Req. Qty'] = rowObj['Vat Exempt'];
               rowObj['Vat Exempt'] = 'No'; // Default for items with quantity
             }

             // If this same value was assigned to other fields during initial mapping, clear them
             if (rowObj['Remain Qty'] === cellVal) rowObj['Remain Qty'] = '';
             if (rowObj['Req. Qty'] === cellVal) rowObj['Req. Qty'] = '';
             if (rowObj['Vat Exempt'] === cellVal) rowObj['Vat Exempt'] = '';
             break;
          }
        }

        if (rowObj['Description'] || rowObj['Item Code'] || rowObj['Seq #']) {
          allMergedRows.push(rowObj);
        }
      }
    });

    setMaterialDetailRows(allMergedRows);
  };


  const handleManualSummaryUpdate = (prRef, field, value) => {
    const num = parseFloat(String(value).replace(/,/g, '')) || 0;
    setRateSummaryMap(prev => {
      const current = prev[prRef] || { subtotal: 0, discount: 0, charges: 0, net: 0, vat: 0, total: 0 };
      const next = { ...current, [field]: num };
      
      // Re-calculate net and total if it's one of the components
      if (['subtotal', 'discount', 'charges'].includes(field)) {
        next.net = next.subtotal + next.charges - next.discount;
        next.vat = next.net * 0.05;
        next.total = next.net + next.vat;
      }

      return { ...prev, [prRef]: next };
    });
  };

  const handleSummaryPaste = (e, prRef) => {
    const pasted = e.clipboardData.getData('text');
    e.preventDefault();
    if (!pasted) return;

    const lines = pasted.split(/\r?\n/);
    let discount = 0, charges = 0, subtotal = 0, vat = 0, netTotal = 0;

    lines.forEach(line => {
      const parts = line.split(/[|:\t]/).map(p => p.trim());
      if (parts.length < 2) return;
      const label = parts[0].toLowerCase();
      const val = parseFloat(parts[1].replace(/,/g, '')) || 0;
      
      if (label.includes('discount')) discount = val;
      else if (label.includes('charges')) charges = val;
      else if (label.includes('before vat')) subtotal = val;
      else if (label.includes('vat')) vat = val;
      else if (label.includes('net total')) netTotal = val;
    });

    handleManualSummaryUpdate(prRef, 'discount', discount);
    handleManualSummaryUpdate(prRef, 'charges', charges);
    if (subtotal > 0) handleManualSummaryUpdate(prRef, 'subtotal', subtotal);
    if (vat > 0) handleManualSummaryUpdate(prRef, 'vat', vat);
    if (netTotal > 0) handleManualSummaryUpdate(prRef, 'total', netTotal);

    // Clear the input after a short delay to signify capture
    if (e.target) {
      setTimeout(() => {
        e.target.value = '';
      }, 100);
    }
  };

  const handleClear = () => {
    setPasteText('');
    setRateDetailsMap({});
    setRateSummaryMap({});
    setCurrentRatePrIndex(0);
    setMaterialDetailMap({});
    setCurrentPrIndex(0);
    setParsedRows([]);
    setMaterialRows([]);
    setMaterialDetailRows([]);
  };

  /* â”€â”€â”€ Inline editing â”€â”€â”€ */
  const handleCellEdit = (rowIdx, colName, value) => {
    setParsedRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [colName]: value };
      return next;
    });
  };

  const handleMaterialCellEdit = (rowIdx, colName, value) => {
    setMaterialRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [colName]: value };
      return next;
    });
  };


  const handleMaterialDetailCellEdit = (rowIdx, colName, value) => {
    setMaterialDetailRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [colName]: value };
      return next;
    });
  };

  const triggerVerifyDialog = () => {
    if (parsedRows.length === 0) return;
    setShowVerifyDialog(true);
    setDialogCountdown(2);
  };

  useEffect(() => {
    if (showVerifyDialog) {
      setDialogCountdown(2);
      timerRef.current = setInterval(() => {
        setDialogCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showVerifyDialog]);

  /* â”€â”€â”€ Import to webhook â”€â”€â”€ */
  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setShowVerifyDialog(false);
    setIsImporting(true);
    try {
      // Create a map of PR Ref to Project Name from Step 1 for lookup
      const prToProjectMap = {};
      parsedRows.forEach(row => {
        const pr = (row['Req Ref'] || '').trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '');
        if (pr) prToProjectMap[pr] = row['Project'] || '';
      });

      // Group by PR and add sequence markers (1, 2, 3...)
      const prCounters = {};
      const enrichedDetails = materialDetailRows.map(row => {
        const pr = row._prRef || 'Ungrouped';
        const prNorm = pr.trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '');
        const project = prToProjectMap[prNorm] || '';

        if (!prCounters[pr]) prCounters[pr] = 0;
        prCounters[pr]++;
        return {
          ...row,
          Project: project,
          Marker: prCounters[pr] // 1, 2, 3... per PR
        };
      });

      // Fields to send in the payload (clean, no junk)
      const ALLOWED_STEP1_FIELDS = [
        'Sr.No', 'Ref', 'PO Date', 'Approve / Reject', 'Status',
        'Project', 'Company', 'Pending Approval', 'Supplier', 'PO Class',
        'Entered By', 'Entered Time', 'Req Ref', 'QC Ref.',
        'Doc. Remarks', 'Terms & Conditions', 'PO Revision', 'Attachments',
        'Approval History', 'Approval Config',
        'Discount', 'Charges', 'Net Price', 'VAT', 'Total Price',
      ];

      // Inject rate summary totals into step 1 data & strip junk fields
      const enrichedStep1 = parsedRows.map(row => {
        const pr = (row['Req Ref'] || '').trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '');
        const summaryKey = Object.keys(rateSummaryMap).find(k => k.trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '') === pr);
        
        // Start with a clean object containing only allowed fields
        const clean = {};
        ALLOWED_STEP1_FIELDS.forEach(key => {
          if (row[key] !== undefined) clean[key] = row[key];
        });

        // Override with independently-pasted summary if available
        if (summaryKey && rateSummaryMap[summaryKey]) {
          const summary = rateSummaryMap[summaryKey];
          clean['Discount'] = summary.discount.toFixed(2);
          clean['Charges'] = summary.charges.toFixed(2);
          clean['Net Price'] = summary.net.toFixed(2);
          clean['VAT'] = summary.vat.toFixed(2);
          clean['Total Price'] = summary.total.toFixed(2);
        }

        return clean;
      });

      const response = await fetch(IMPORT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_po_log',
          po_step_1: enrichedStep1,
          materials_step_2: materialRows.map(row => {
            const prRaw = row['PR'] || row.pr || '';
            const prNorm = prRaw.toString().trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '');
            const project = prToProjectMap[prNorm] || '';
            // Use same key derivation as comparison modal: raw Sr.No string
            const srKey = (row['Sr.No'] || '').toString().trim();
            // Also compute normalized version for fallback matching
            const srNorm = (parseInt(srKey.replace(/\D/g, '')) || srKey).toString();
            
            const remarks = reconRemarksRef.current;
            const matchedPrKey = Object.keys(remarks).find(
              k => k.toString().trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '') === prNorm
            );
            
            let remark = '';
            if (matchedPrKey && remarks[matchedPrKey]) {
                const subMap = remarks[matchedPrKey];
                // Try exact match first, then normalized fallback
                remark = subMap[srKey] || subMap[srNorm] || Object.entries(subMap).find(([k]) => (parseInt(k.replace(/\D/g, '')) || k).toString() === srNorm)?.[1] || '';
            }
            
            return { ...row, Remark: remark, Project: project };
          }),
          material_details_step_3: enrichedDetails.map(row => {
             const prRaw = row._prRef || '';
             const prNorm = prRaw.toString().trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '');
             const project = prToProjectMap[prNorm] || '';
             // Use same key derivation as comparison modal: raw Seq #/Sr.No string
             const srKey = (row['Seq #'] || row['Sr.No'] || '').toString().trim();
             const srNorm = (parseInt(srKey.replace(/\D/g, '')) || srKey).toString();
             
             const remarks = reconRemarksRef.current;
             const matchedPrKey = Object.keys(remarks).find(
               k => k.toString().trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '') === prNorm
             );
             
             let remark = '';
             if (matchedPrKey && remarks[matchedPrKey]) {
                 const subMap = remarks[matchedPrKey];
                 // Try exact match first, then normalized fallback
                 remark = subMap[srKey] || subMap[srNorm] || Object.entries(subMap).find(([k]) => (parseInt(k.replace(/\D/g, '')) || k).toString() === srNorm)?.[1] || '';
             }
             
             return { ...row, Remark: remark, Project: project };
          }),
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      setToast({ message: `${parsedRows.length} rows saved successfully`, type: 'success' });
      handleClear();
      fetchLogData(); // Invalidate cache to show new data
    } catch (err) {
      console.error('Import error:', err);
      setToast({ message: `Save failed: ${err.message}`, type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  // Webhook-driven fetches are handled by TanStack Query

  const getLatestTotal = useCallback((item) => {
    // Check in reverse order of versions for the latest price
    for (let i = 5; i >= 1; i--) {
      const keys = [`change${i}_total`, `change${i}_price`, `change${i}_Total`, `change${i}_Price` ];
      for (const k of keys) {
        const val = item[k];
        if (val !== null && val !== undefined && val !== '') {
          const num = parseFloat(String(val).replace(/,/g, ''));
          if (!isNaN(num) && num !== 0) return num;
        }
      }
    }

    const fallbackKeys = ['Total Price', 'Net Price', 'Total', 'total', 'Price', 'price', 'Amount', 'amount'];
    for (const k of fallbackKeys) {
      const val = item[k];
      if (val !== null && val !== undefined && val !== '') {
        const num = parseFloat(String(val).replace(/,/g, ''));
        if (!isNaN(num) && num !== 0) return num;
      }
    }
    return 0;
  }, []);

  const uniqueMonths = useMemo(() => {
    const months = new Set();
    logData.forEach(row => {
      const m = row.Month ? String(row.Month).trim() : '';
      if (!m) return;
      months.add(m);
    });
    
    const monthMap = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };

    return Array.from(months).sort((a, b) => {
      const aParts = a.split('-');
      const bParts = b.split('-');
      
      const aMonth = aParts[0];
      const aYear = aParts[1];
      const bMonth = bParts[0];
      const bYear = bParts[1];
      
      const yearA = aYear ? parseInt(aYear, 10) || 0 : 0;
      const yearB = bYear ? parseInt(bYear, 10) || 0 : 0;
      
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      
      const mA = monthMap[aMonth] ?? 0;
      const mB = monthMap[bMonth] ?? 0;
      
      return mA - mB;
    });
  }, [logData]);

  const uniqueEnteredBy = useMemo(() => {
    const names = new Set();
    logData.forEach(row => {
      if (row['Entered By']) names.add(row['Entered By']);
    });
    return Array.from(names).sort();
  }, [logData]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    logData.forEach(row => {
      if (row.Status) statuses.add(row.Status);
    });
    return Array.from(statuses).sort();
  }, [logData]);

  const filteredLog = useMemo(() => {
    let result = logData;

    // Merge rows by PR
    const prMap = {};
    result.forEach(row => {
      const pr = row['Req Ref'] || row.Req_Ref || 'Ungrouped';
      if (!prMap[pr]) {
        prMap[pr] = { ...row }; // copy first row
        prMap[pr]._pos = [row.Ref]; // store original POs
        prMap[pr]._netSum = parseFloat(String(row['Net Price'] || '0').replace(/,/g, '')) || 0;
        prMap[pr]._vatSum = parseFloat(String(row.VAT || '0').replace(/,/g, '')) || 0;
        prMap[pr]._totalSum = parseFloat(String(row['Total Price'] || '0').replace(/,/g, '')) || 0;
      } else {
        if (row.Ref && !prMap[pr]._pos.includes(row.Ref)) prMap[pr]._pos.push(row.Ref);
        prMap[pr]._netSum += parseFloat(String(row['Net Price'] || '0').replace(/,/g, '')) || 0;
        prMap[pr]._vatSum += parseFloat(String(row.VAT || '0').replace(/,/g, '')) || 0;
        prMap[pr]._totalSum += parseFloat(String(row['Total Price'] || '0').replace(/,/g, '')) || 0;
      }
    });

    result = Object.values(prMap).map(merged => {
       const formatVal = (v) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
       merged._Ref = merged.Ref; // preserve original PO Ref before overwrite
       merged.Ref = merged['Req Ref'] || merged.Req_Ref || 'Ungrouped'; // Card Title is the PR
       merged['Net Price'] = formatVal(merged._netSum);
       merged.VAT = formatVal(merged._vatSum);
       merged['Total Price'] = formatVal(merged._totalSum);
       merged._isMergedPR = true;
       return merged;
    });

    if (monthFilter !== 'All') {
      const mf = monthFilter.trim();
      result = result.filter(row => (row.Month || '').trim() === mf);
    }

    if (enteredByFilter !== 'All') {
      result = result.filter(row => row['Entered By'] === enteredByFilter);
    }

    if (statusFilter !== 'All') {
      result = result.filter(row => row.Status === statusFilter);
    }

    if (logSearch.trim()) {
      const q = logSearch.trim().toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v || '').toLowerCase().includes(q))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v || '').toLowerCase().includes(q))
      );
    }

    return result;
  }, [logData, logSearch, monthFilter, enteredByFilter, statusFilter, searchQuery]);

  const dashboardStats = useMemo(() => {
    if (!poMasterData.length) return null;

    let totalSpend = 0;
    const uniquePRs = new Set();
    const uniqueSuppliers = new Set();

    poMasterData.forEach(item => {
      const total = getLatestTotal(item);
      totalSpend += total;
      const pr = item.pr || item.PR;
      if (pr) uniquePRs.add(pr);
      const supplier = item.change1_supplier || item.Supplier;
      if (supplier) uniqueSuppliers.add(supplier);
    });

    return {
      totalSpend,
      uniquePRs: uniquePRs.size,
      uniqueSuppliers: uniqueSuppliers.size,
      totalItems: poMasterData.length,
    };
  }, [poMasterData, getLatestTotal]);

  const parsePODate = useCallback((value) => {
    if (!value) return null;
    const d = new Date(value);
    if (!isNaN(d)) return d;
    const parts = value.trim().split(/[\s/\-.]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
        return new Date(year, month - 1, day);
      }
    }
    return null;
  }, []);

  const spendBreakdownData = useMemo(() => {
    if (!logData.length) return [];
    const periodMap = {};

    const isDailyView = drillMonth !== null;

    logData.forEach(row => {
      const net = parseFloat(String(row['Net Price'] || '0').replace(/,/g, '')) || 0;
      if (!net) return;
      const poDate = row.po_date || row['PO Date'] || '';
      const d = parsePODate(poDate);
      if (!d) return;

      if (isDailyView) {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthKey !== drillMonth) return;
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        periodMap[dayKey] = (periodMap[dayKey] || 0) + net;
      } else if (spendPeriod === 'Yearly') {
        const key = String(d.getFullYear());
        periodMap[key] = (periodMap[key] || 0) + net;
      } else {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        periodMap[key] = (periodMap[key] || 0) + net;
      }
    });

    return Object.entries(periodMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => ({ period, value }));
  }, [logData, spendPeriod, drillMonth, parsePODate]);

  const projectData = useMemo(() => {
    if (!poMasterData.length) return [];
    const projMap = {};
    poMasterData.forEach(item => {
      let projectRaw = (item.project || item.Project || 'Unknown').trim();
      const project = projectRaw.startsWith('AMANA ') ? 'S' + projectRaw : projectRaw;
      
      const total = getLatestTotal(item);
      if (!projMap[project]) projMap[project] = { project, totalInvested: 0, prCount: new Set(), itemCount: 0 };
      projMap[project].totalInvested += total;
      const pr = item.pr || item.PR;
      if (pr) projMap[project].prCount.add(pr);
      projMap[project].itemCount++;
    });
    return Object.values(projMap)
      .map(p => ({ ...p, prCount: p.prCount.size }))
      .filter(p => p.totalInvested > 0) // Remove items with value 0
      .sort((a, b) => b.totalInvested - a.totalInvested);
  }, [poMasterData, getLatestTotal]);

  const topMaterials = useMemo(() => {
    if (!poMasterData.length) return [];
    const freqMap = {};
    poMasterData.forEach(item => {
      const rawDesc = String(
        item.Description || item.description || item.desc ||
        item.item_description || item.change1_description ||
        item.Material || item.material || ''
      ).trim();
      const desc = rawDesc ? rawDesc.split(' - ')[0].trim() : '';
      const key = desc || 'Unknown';
      if (!freqMap[key]) {
        freqMap[key] = { description: desc || 'Unknown', count: 0, totalQty: 0, totalSpend: 0, suppliers: new Set() };
      }
      freqMap[key].count++;
      const qty = parseFloat(String(item.Qty || item.Req_Qty || '0').replace(/,/g, '')) || 0;
      freqMap[key].totalQty += qty;
      freqMap[key].totalSpend += getLatestTotal(item);
      const sup = item.change1_supplier || item.Supplier;
      if (sup) freqMap[key].suppliers.add(sup);
    });
    return Object.values(freqMap)
      .map(m => ({ ...m, suppliers: m.suppliers.size }))
      .filter(m => m.totalSpend > 0) // Remove items with value 0
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [poMasterData, getLatestTotal]);

  const formatLargeCurrency = (value) => {
    if (value >= 1000000) return `AED ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `AED ${(value / 1000).toFixed(0)}K`;
    return `AED ${value.toFixed(0)}`;
  };
  
  const calculatePercentChange = (oldVal, newVal) => {
    const o = parseFloat(String(oldVal || '0').replace(/,/g, '')) || 0;
    const n = parseFloat(String(newVal || '0').replace(/,/g, '')) || 0;
    if (o === 0) return n > 0 ? '+100%' : '0%';
    const diff = ((n - o) / o) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const handleCompareWithExisting = useCallback(async (prRef, silent = false) => {
    if (!prRef) return;
    
    if (comparisonLoadingRef.current.has(prRef)) return;
    
    if (!silent) setIsComparing(true);
    comparisonLoadingRef.current.add(prRef);

    try {
      // Extract SR numbers directly from the raw rate details text for this PR
      const skipPattern = /^(seq#|item\s*code|charges|discount|sub\s*total|grand\s*total|vat|net\s*total)/i;
      const rawText = rateDetailsMap[prRef] || '';
      const srNos = [];
      
      if (rawText.trim()) {
        const lines = rawText.split(/\r?\n/).filter(l => l.trim());
        for (const line of lines) {
          const trimmed = line.trim();
          const pipeCount = trimmed.split('|').length;
          const tabCount = trimmed.split('\t').length;
          const delimiter = pipeCount >= tabCount ? '|' : '\t';
          const cells = trimmed.split(delimiter).map(c => c.trim());
          if (cells.length < 2) continue;
          const firstCell = cells[0].toLowerCase();
          if (skipPattern.test(firstCell) || firstCell.includes('total') || firstCell.includes('vat')) continue;
          const srCandidate = cells[0].trim();
          if (/^\d+$/.test(srCandidate)) {
            srNos.push(srCandidate);
          }
        }
      }
      
      const uniqueSrNos = [...new Set(srNos)];
      if (uniqueSrNos.length === 0) uniqueSrNos.push('');

      let allExistingData = [];
      let anySuccess = false;

      for (const sr of uniqueSrNos) {
        const url = `${COMPARE_WEBHOOK}?prNumber=${prRef}${sr ? `&srNumber=${sr}` : ''}`;
        const response = await fetch(url);
        if (response.ok) {
          anySuccess = true;
          const data = await response.json();
          const n8nData = Array.isArray(data) ? data : (data.data || data.items || []);
          const existingData = n8nData.map(item => {
            const projRaw = (item.Project || 'Unknown').trim();
            return {
              ...item,
              PR: item['Req Ref'] || item.Ref || 'N/A',
              Description: item.Description || item.Ref || 'No Description',
              Project: projRaw.startsWith('AMANA ') ? 'S' + projRaw : projRaw,
              Supplier: item.Supplier || 'Unknown',
              change1_total: parseFloat(String(item['Original Pirce'] || item['Net Price'] || item['Total Price'] || 0).replace(/,/g, ''))
            };
          });
          allExistingData = [...allExistingData, ...existingData];
        }
      }

      if (anySuccess) {
        const lookup = {};
        allExistingData.forEach(item => {
          const normalized = { ...item };
          let latestVersion = 0;
          for (let n = 5; n >= 1; n--) {
            const hasRate = item[`change${n}_rate`] !== null && item[`change${n}_rate`] !== undefined && item[`change${n}_rate`] !== '';
            const hasQty = item[`change${n}_qty`] !== null && item[`change${n}_qty`] !== undefined && item[`change${n}_qty`] !== '';
            const hasSupplier = item[`change${n}_supplier`] !== null && item[`change${n}_supplier`] !== undefined && item[`change${n}_supplier`] !== '';
            const hasDate = item[`change${n}_date`] !== null && item[`change${n}_date`] !== undefined && item[`change${n}_date`] !== '';
            if (hasRate || hasQty || hasSupplier || hasDate) {
              latestVersion = n;
              break;
            }
          }
          
          if (latestVersion > 0) {
            normalized.Qty = item[`change${latestVersion}_qty`] || item.Qty || item.Req_Qty || '0.00';
            normalized.Rate = item[`change${latestVersion}_rate`] || item.Rate || '0.00';
            normalized.Total = item[`change${latestVersion}_price`] || item[`change${latestVersion}_total`] || item.Total || '0.00';
            normalized.Supplier = item[`change${latestVersion}_supplier`] || item.Supplier || '';
            normalized.Description = item[`change${latestVersion}_description`] || item.Description || '';
            normalized.Sr_No = (item.Sr_No || item.SrNo || item['Sr.No'] || '').toString();
            normalized._versionUsed = latestVersion;
          } else {
            normalized.Qty = item.Qty || item.Req_Qty || '0.00';
            normalized.Rate = item.Rate || '0.00';
            normalized.Total = item.Total || '0.00';
            normalized.Supplier = item.Supplier || '';
            normalized.Description = item.Description || '';
            normalized.Sr_No = (item.Sr_No || item.SrNo || item['Sr.No'] || '').toString();
            normalized._versionUsed = 0;
          }

          // Match purely by Sr_No as requested
          const key = normalized.Sr_No;
          if (key) lookup[key] = normalized;
        });

        const targetPr = prRef.toString().trim().toUpperCase();
        
        // Always use refs to get the absolute latest state during long-running async comparison
        const step2Items = materialRowsRef.current.filter(r => (r.PR || r.pr || r._prRef || '').toString().trim().toUpperCase() === targetPr);
        const step3Items = materialDetailRowsRef.current.filter(r => (r.PR || r.pr || r._prRef || '').toString().trim().toUpperCase() === targetPr);
        
        // MERGE LOGIC: Combine Step 2 and Step 3 by Sr.No
        // Step 2 provides financial accuracy (Rate Sum), Step 3 provides detailed line accuracy.
        const combinedMap = {};
        
        // 1. Load Step 3 items as the base (more rows/details)
        step3Items.forEach(item => {
          const sr = (item['Sr.No'] || item.Sr_No || item.SrNo || item['Seq #'] || '').toString();
          combinedMap[sr] = { ...item, Sr_No: sr };
        });
        
        // 2. Overlay Step 2 items (overwrite financial fields if found)
        step2Items.forEach(item => {
          const sr = (item['Sr.No'] || item.Sr_No || item.SrNo || item['Seq #'] || '').toString();
          if (combinedMap[sr]) {
            // Priority: Step 2 Rate/Total are usually more accurate in ERP exports
            combinedMap[sr].Qty = item.Qty || item.qty || combinedMap[sr].Qty || '0.00';
            combinedMap[sr].Rate = item.Rate || item.rate || combinedMap[sr].Rate || '0.00';
            combinedMap[sr].Total = item.Total || item.total || combinedMap[sr].Total || '0.00';
          } else {
            combinedMap[sr] = { ...item, Sr_No: sr };
          }
        });

        const currentItems = Object.values(combinedMap).map(item => ({
          ...item,
          'Qty': item['Qty'] || item['QTY'] || item['Req. Qty'] || item['Req Qty'] || item['Req_Qty'] || '0.00',
          'Rate': item['Rate'] || item['RATE'] || '0.00',
          'Total': item['Total'] || item['TOTAL'] || '0.00',
          'Supplier': item['Supplier'] || item['SUPPLIER'] || '',
        }));

        const comparisonRows = [];
        const matchedExistingKeys = new Set();

        currentItems.forEach(newItem => {
           const key = newItem.Sr_No;
           const existing = lookup[key];
           if (existing) matchedExistingKeys.add(key);
           
           comparisonRows.push({
             key,
             new: newItem,
             existing: existing || null,
             status: !existing ? 'NEW' : 'MATCHED'
           });
        });

        Object.keys(lookup).forEach(key => {
          if (!matchedExistingKeys.has(key)) {
            comparisonRows.push({
              key,
              new: null,
              existing: lookup[key],
              status: 'MISSING'
            });
          }
        });

        // Store in cache
        setComparisonCache(prev => ({ ...prev, [prRef]: { data: comparisonRows, isLive: true } }));
        
        if (!silent) {
          setComparisonModal({ show: true, prRef, data: comparisonRows, isLive: true });
        }
      } else {
        if (!silent) setToast({ message: 'Failed to fetch existing records', type: 'error' });
      }
    } catch (err) {
      console.error('Comparison error:', err);
      if (!silent) setToast({ message: 'Network error during comparison', type: 'error' });
    } finally {
      if (!silent) setIsComparing(false);
      comparisonLoadingRef.current.delete(prRef);
    }
  }, [rateDetailsMap]); // handleCompareWithExisting dependencies

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredLog.length / PAGE_SIZE)), [filteredLog.length]);

  const visibleLog = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredLog.slice(start, start + PAGE_SIZE);
  }, [filteredLog, currentPage]);


  /* â”€â”€â”€ Scroll ref kept for container, no pagination needed â”€â”€â”€ */

  /* â”€â”€â”€ Keyboard shortcut: Ctrl+F â”€â”€â”€ */
  const searchInputRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-fetch comparison data when new PRs are detected
  useEffect(() => {
    uniquePrs.forEach(prRef => {
      if (!comparisonCache[prRef] && !comparisonLoadingRef.current.has(prRef)) {
        console.log('[AutoFetch] Triggering reconciliation for:', prRef);
        handleCompareWithExisting(prRef, true); // true = silent fetch, don't open modal
      }
    });
  }, [uniquePrs, materialRows, comparisonCache, handleCompareWithExisting]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: theme.bg }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex-1 overflow-y-auto p-6 space-y-10">
        {mode !== 'prlist' && (<>

        {!isViewer && (
        <div className="stagger-item" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-[#F59E0B]" />
            <h2 className="text-lg font-bold text-white tracking-tight">Import PO Data</h2>
          </div>

          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: `1px solid ${pasteText ? theme.goldBorder : theme.border}`,
              transition: 'border-color 0.3s',
            }}
          >
            {/* Subtle glow when data is present */}
            {pasteText && (
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  background: 'radial-gradient(ellipse at top center, rgba(245,158,11,0.1) 0%, transparent 60%)',
                }}
              />
            )}

            <div className="relative p-1">
              <textarea
                ref={textareaRef}
                value={pasteText}
                onChange={handleTextChange}
                onPaste={handlePaste}
                placeholder="Copy rows from Excel or web and paste here (Ctrl+V)"
                className="w-full bg-transparent text-[13px] text-[rgba(255,255,255,0.7)] placeholder:text-[rgba(255,255,255,0.15)] resize-none outline-none p-5 font-mono"
                style={{
                  minHeight: '140px',
                  maxHeight: '220px',
                  lineHeight: '1.7',
                }}
                spellCheck={false}
              />
            </div>

            {/* Bottom bar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.015)' }}
            >
              <div className="flex items-center gap-4">
                {parsedRows.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[12px] font-bold text-[#10B981]">
                      {parsedRows.length} row{parsedRows.length > 1 ? 's' : ''} detected
                    </span>
                    <span className="text-[10px] text-[rgba(255,255,255,0.2)] ml-1">
                      &middot; {PO_COLUMNS.length} columns mapped
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IconClipboardData size={14} className="text-[rgba(255,255,255,0.15)]" />
                    <span className="text-[11px] text-[rgba(255,255,255,0.2)] font-medium">
                      Waiting for dataâ€¦
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClear}
                  disabled={!pasteText}
                  className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <IconTrash size={14} />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â• STEP 2 & PREVIEW TABLE â•â•â•â•â•â•â•â•â•â•â• */}
        {parsedRows.length > 0 && (
          <div className="stagger-item" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-3">
              <IconTableImport size={18} className="text-[#F59E0B]" />
              <h3 className="text-[13px] font-black text-white uppercase tracking-wider">Preview ({parsedRows.length} Rows)</h3>
              <span className="text-[10px] text-[rgba(255,255,255,0.25)] font-bold ml-1">
                â€” Edit cells below before importing
              </span>
            </div>
            <div
              className="rounded-xl overflow-hidden mb-8"
              style={{
                border: `1px solid ${theme.goldBorder}`,
                background: 'rgba(6,9,15,0.9)',
              }}
            >
              <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
                <table className="w-full" style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th
                        className="text-center"
                        style={{
                          background: theme.headerBg,
                          color: theme.gold,
                          fontSize: '9px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          padding: '10px 8px',
                          borderRight: `1px solid ${theme.border}`,
                          borderBottom: `1px solid ${theme.goldBorder}`,
                          minWidth: '36px',
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                        }}
                      >
                        ROW
                      </th>
                      {PO_COLUMNS.map((col, i) => (
                        <th
                          key={i}
                          style={{
                            background: theme.headerBg,
                            color: theme.gold,
                            fontSize: '9px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '10px 12px',
                            borderRight: `1px solid ${theme.border}`,
                            borderBottom: `1px solid ${theme.goldBorder}`,
                            whiteSpace: 'nowrap',
                            minWidth: col === 'Doc. Remarks' || col === 'Terms & Conditions' ? '180px' : '110px',
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        style={{
                          background: rowIdx % 2 === 1 ? theme.strip : 'transparent',
                        }}
                        className="hover:bg-[rgba(245,158,11,0.04)] transition-colors"
                      >
                        <td
                          className="text-center"
                          style={{
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.2)',
                            fontWeight: 700,
                            padding: '6px 8px',
                            borderRight: `1px solid ${theme.cellBorder}`,
                            borderBottom: `1px solid ${theme.cellBorder}`,
                            background: theme.headerBg,
                            position: 'sticky',
                            left: 0,
                            zIndex: 5,
                          }}
                        >
                          {rowIdx + 1}
                        </td>
                        {PO_COLUMNS.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            style={{
                              borderRight: `1px solid ${theme.cellBorder}`,
                              borderBottom: `1px solid ${theme.cellBorder}`,
                              padding: 0,
                            }}
                          >
                            <input
                              type="text"
                              value={row[col] || ''}
                              onChange={(e) => handleCellEdit(rowIdx, col, e.target.value)}
                              className="w-full text-[12px] font-medium outline-none px-3 py-2 focus:bg-[rgba(245,158,11,0.06)] focus:text-[#F59E0B] transition-colors text-[rgba(255,255,255,0.8)]"
                              style={{
                                background: (row._rateUpdated && ['Rate', 'Net Price', 'VAT', 'Total Price'].includes(col)) 
                                  ? 'rgba(245, 158, 11, 0.15)' 
                                  : 'transparent',
                                color: (row._rateUpdated && ['Rate', 'Net Price', 'VAT', 'Total Price'].includes(col)) 
                                  ? '#FCD34D' 
                                  : 'rgba(255,255,255,0.8)',
                                minWidth: col === 'Doc. Remarks' || col === 'Terms & Conditions' ? '180px' : '100px',
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 2: Rate Details Paste */}
            {uniquePrs.length > 0 && (
              <div className="mb-8 mt-2 border-t border-[rgba(255,255,255,0.05)] pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px]">2</span>
                    Step 2: Paste Rate Details
                  </h3>
                  
                  {/* Card Navigation */}
                  <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.03)] px-3 py-1.5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                    <button 
                      onClick={() => setCurrentRatePrIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentRatePrIndex === 0}
                      className="p-1 hover:text-[#F59E0B] disabled:opacity-20 transition-all font-bold"
                    >
                      <IconChevronLeft size={18} />
                    </button>
                    <div className="flex flex-col items-center min-w-[100px]">
                      <span className="text-[10px] font-black text-[#F59E0B] tracking-tighter">
                        {uniquePrs[currentRatePrIndex]}
                      </span>
                      <span className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase">
                        {currentRatePrIndex + 1} of {uniquePrs.length} PRs
                      </span>
                    </div>
                    <button 
                      onClick={() => setCurrentRatePrIndex(prev => Math.min(uniquePrs.length - 1, prev + 1))}
                      disabled={currentRatePrIndex === uniquePrs.length - 1}
                      className="p-1 hover:text-[#F59E0B] disabled:opacity-20 transition-all font-bold"
                    >
                      <IconChevronRight size={18} />
                    </button>
                  </div>
                </div>
                
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] mb-4 pl-7">
                  (From ERP detail view: Item Code, Rate, Total for {uniquePrs[currentRatePrIndex]}...)
                </p>
                
                <div className="relative h-[180px] w-full overflow-hidden ml-7" style={{ maxWidth: 'calc(100% - 28px)' }}>
                  {uniquePrs.map((prRef, idx) => {
                    const isActive = idx === currentRatePrIndex;
                    const offsetIndex = idx - currentRatePrIndex;
                    const val = rateDetailsMap[prRef] || '';

                    return (
                      <div
                        key={prRef}
                        className="absolute inset-0 transition-all duration-500 ease-out"
                        style={{
                          transform: `translateX(${offsetIndex * 105}%)`,
                          opacity: isActive ? 1 : 0,
                          pointerEvents: isActive ? 'auto' : 'none',
                        }}
                      >
                        <div
                          className="h-full rounded-2xl overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                            border: `1px solid ${val ? theme.goldBorder : theme.border}`,
                            transition: 'border-color 0.3s',
                          }}
                        >
                          {val && (
                            <div
                              className="absolute inset-0 pointer-events-none opacity-20"
                              style={{
                                background: 'radial-gradient(ellipse at top center, rgba(245,158,11,0.1) 0%, transparent 60%)',
                              }}
                            />
                          )}
                          <div className="relative p-0.5 h-full flex flex-row">
                            {/* Left Side: 80% Textarea */}
                            <div className="w-[80%] h-full flex flex-col border-r border-[rgba(255,255,255,0.05)]">
                              <textarea
                                value={val}
                                onChange={(e) => handleRateDetailsChange(e.target.value, prRef)}
                                onPaste={(e) => handleRateDetailsPaste(e, prRef)}
                                placeholder={`Paste Rate Details for ${prRef} here...`}
                                className="w-full flex-1 bg-transparent text-[13px] text-[rgba(255,255,255,0.7)] placeholder:text-[rgba(255,255,255,0.1)] resize-none outline-none p-5 font-mono"
                                style={{ lineHeight: '1.7' }}
                                spellCheck={false}
                              />
                              {val && (
                                <div className="px-5 py-2 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(16,185,129,0.05)]">
                                  <div className="flex items-center gap-2">
                                    <IconCheck size={12} className="text-[#10B981]" />
                                    <span className="text-[10px] font-bold text-[#10B981]">
                                      Data detected for {prRef}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="w-[20%] h-full bg-[rgba(255,255,255,0.01)] p-4 flex flex-col gap-5 overflow-y-auto border-l border-[rgba(255,255,255,0.03)] backdrop-blur-sm">
                              <div className="h-full">
                                  {/* Minimalist Empty State: Plain Text Box */}
                                  {!rateSummaryMap[prRef]?.net ? (
                                    <div className="pt-2">
                                      <textarea 
                                        onPaste={(e) => handleSummaryPaste(e, prRef)}
                                        placeholder="Total Price of the particular PR"
                                        className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-lg p-3 text-[10px] text-white font-medium outline-none h-[120px] resize-none placeholder:text-[rgba(255,255,255,0.2)] focus:border-[rgba(245,158,11,0.3)] transition-all leading-relaxed"
                                      />
                                      <p className="mt-2 text-[8px] font-black text-[rgba(255,255,255,0.15)] uppercase tracking-widest text-center">
                                        Paste or Type Summary block
                                      </p>
                                    </div>
                                  ) : (
                                    /* Populated State: Minimized List View */
                                    <div className="space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                      <div className="flex flex-col gap-0.5 pt-1">
                                        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                                          <span className="text-[7px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-tight">Items Total</span>
                                          <input 
                                            type="text" 
                                            value={rateSummaryMap[prRef]?.subtotal || '0.00'}
                                            onChange={(e) => handleManualSummaryUpdate(prRef, 'subtotal', e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black text-white p-0 outline-none w-[60px] text-right focus:text-[#F59E0B]"
                                          />
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                                          <span className="text-[7px] font-black text-[rgba(239,68,68,0.4)] uppercase tracking-tight">Discount</span>
                                          <input 
                                            type="text" 
                                            value={rateSummaryMap[prRef]?.discount || '0.00'}
                                            onChange={(e) => handleManualSummaryUpdate(prRef, 'discount', e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black text-[#EF4444] p-0 outline-none w-[60px] text-right focus:text-white"
                                          />
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                                          <span className="text-[7px] font-black text-[rgba(16,185,129,0.4)] uppercase tracking-tight">Charges</span>
                                          <input 
                                            type="text" 
                                            value={rateSummaryMap[prRef]?.charges || '0.00'}
                                            onChange={(e) => handleManualSummaryUpdate(prRef, 'charges', e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black text-[#10B981] p-0 outline-none w-[60px] text-right focus:text-white"
                                          />
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                                          <span className="text-[7px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-tight">Before VAT</span>
                                          <input 
                                            type="text" 
                                            value={rateSummaryMap[prRef]?.net || '0.00'}
                                            onChange={(e) => handleManualSummaryUpdate(prRef, 'net', e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black text-white p-0 outline-none w-[60px] text-right focus:text-[#F59E0B]"
                                          />
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.03)]">
                                          <span className="text-[7px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-tight">VAT (5%)</span>
                                          <input 
                                            type="text" 
                                            value={rateSummaryMap[prRef]?.vat || '0.00'}
                                            onChange={(e) => handleManualSummaryUpdate(prRef, 'vat', e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black text-white p-0 outline-none w-[60px] text-right focus:text-[#F59E0B]"
                                          />
                                        </div>
                                      </div>

                                      <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.1)] flex items-center justify-between group">
                                        <span className="text-[8px] font-black text-[#F59E0B] uppercase tracking-widest">Net Total</span>
                                        <div className="text-[14px] font-black text-[#F59E0B] leading-none tracking-tight">
                                          {rateSummaryMap[prRef]?.total?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                        </div>
                                      </div>
                                      
                                    </div>
                                  )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                </div>

                {/* Dots Indicator */}
                <div className="flex justify-center gap-1.5 mt-4 ml-7">
                  {uniquePrs.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentRatePrIndex ? 'w-4 bg-[#F59E0B]' : 'w-1 bg-[rgba(255,255,255,0.1)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Material Preview Table */}
            {materialRows.length > 0 && (
              <div className="mt-8 animate-fade-in-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
                      <IconCheck size={14} className="text-[#10B981]" />
                    </span>
                    <h3 className="text-[13px] font-black text-white uppercase tracking-wider">
                      Material Preview ({materialRows.length} Rows)
                    </h3>
                    <span className="text-[10px] text-[#10B981] font-bold ml-1">
                      â€” {materialRows.length} material records detected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {uniquePrs.map((prRef, idx) => {
                      if (idx !== currentRatePrIndex) return null;
                      
                      return (
                        <button
                          key={prRef}
                          onClick={() => handleCompareWithExisting(prRef)}
                          disabled={isComparing}
                          className="px-3 py-1.5 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] text-[#F59E0B] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#F59E0B] hover:text-black transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isComparing ? <IconRefresh size={12} className="animate-spin" /> : <IconArrowsDiff size={12} />}
                          Compare {prRef}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: `1px solid rgba(16,185,129,0.3)`,
                    background: 'rgba(6,9,15,0.9)',
                  }}
                >
                  <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
                    <table className="w-full" style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th
                            className="text-center"
                            style={{
                              background: theme.headerBg,
                              color: '#10B981',
                              fontSize: '9px',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              padding: '10px 8px',
                              borderRight: `1px solid ${theme.border}`,
                              borderBottom: `1px solid rgba(16,185,129,0.3)`,
                              minWidth: '36px',
                              position: 'sticky',
                              left: 0,
                              zIndex: 20,
                            }}
                          >
                            ROW
                          </th>
                          {MATERIAL_COLUMNS.map((col, i) => (
                            <th
                              key={i}
                              style={{
                                background: theme.headerBg,
                                color: '#10B981',
                                fontSize: '9px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                padding: '10px 12px',
                                borderRight: `1px solid ${theme.border}`,
                                borderBottom: `1px solid rgba(16,185,129,0.3)`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {materialRows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            style={{
                              background: rowIdx % 2 === 1 ? theme.strip : 'transparent',
                            }}
                            className="hover:bg-[rgba(16,185,129,0.04)] transition-colors"
                          >
                            <td
                              className="text-center"
                              style={{
                                fontSize: '10px',
                                color: 'rgba(255,255,255,0.2)',
                                fontWeight: 700,
                                padding: '6px 8px',
                                borderRight: `1px solid ${theme.cellBorder}`,
                                borderBottom: `1px solid ${theme.cellBorder}`,
                                background: theme.headerBg,
                                position: 'sticky',
                                left: 0,
                                zIndex: 5,
                              }}
                            >
                              {rowIdx + 1}
                            </td>
                            {MATERIAL_COLUMNS.map((col, colIdx) => (
                              <td
                                key={colIdx}
                                style={{
                                  borderRight: `1px solid ${theme.cellBorder}`,
                                  borderBottom: `1px solid ${theme.cellBorder}`,
                                  padding: 0,
                                }}
                              >
                                <input
                                  type="text"
                                  value={row[col] || ''}
                                  onChange={(e) => handleMaterialCellEdit(rowIdx, col, e.target.value)}
                                  className="w-full bg-transparent text-[12px] font-medium outline-none px-3 py-2 focus:bg-[rgba(16,185,129,0.06)] focus:text-[#10B981] transition-colors text-[rgba(255,255,255,0.8)]"
                                  style={{
                                    minWidth: col === 'Description' ? '200px' : '100px',
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Material Details Paste (Swipable Cards) */}
            {uniquePrs.length > 0 && (
              <div className="mb-8 mt-6 border-t border-[rgba(255,255,255,0.05)] pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px]">3</span>
                    Step 3: Paste Material Details 
                    <span className="text-[10px] text-[rgba(255,158,11,0.6)] ml-2">
                      (Differentiated by Req Ref)
                    </span>
                  </h3>
                  
                  {/* Card Navigation */}
                  <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.03)] px-3 py-1.5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                    <button 
                      onClick={() => setCurrentPrIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentPrIndex === 0}
                      className="p-1 hover:text-[#F59E0B] disabled:opacity-20 transition-all"
                    >
                      <IconChevronLeft size={18} />
                    </button>
                    <div className="flex flex-col items-center min-w-[100px]">
                      <span className="text-[10px] font-black text-[#F59E0B] tracking-tighter">
                        {uniquePrs[currentPrIndex]}
                      </span>
                      <span className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase">
                        {currentPrIndex + 1} of {uniquePrs.length} PRs
                      </span>
                    </div>
                    <button 
                      onClick={() => setCurrentPrIndex(prev => Math.min(uniquePrs.length - 1, prev + 1))}
                      disabled={currentPrIndex === uniquePrs.length - 1}
                      className="p-1 hover:text-[#F59E0B] disabled:opacity-20 transition-all"
                    >
                      <IconChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="relative h-[220px] w-full overflow-hidden">
                  {uniquePrs.map((prRef, idx) => {
                    const isActive = idx === currentPrIndex;
                    const offsetIndex = idx - currentPrIndex;
                    const val = materialDetailMap[prRef] || '';
                    const parsedCount = materialDetailRows.filter(r => r._prRef === prRef).length;

                    return (
                      <div
                        key={prRef}
                        className="absolute inset-0 transition-all duration-500 ease-out"
                        style={{
                          transform: `translateX(${offsetIndex * 105}%)`,
                          opacity: isActive ? 1 : 0,
                          pointerEvents: isActive ? 'auto' : 'none',
                        }}
                      >
                        <div
                          className="h-full rounded-2xl overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                            border: `1px solid ${val ? theme.goldBorder : theme.border}`,
                            transition: 'border-color 0.3s',
                          }}
                        >
                          {val && (
                            <div
                              className="absolute inset-0 pointer-events-none opacity-20"
                              style={{
                                background: 'radial-gradient(ellipse at top center, rgba(245,158,11,0.1) 0%, transparent 60%)',
                              }}
                            />
                          )}
                          <div className="relative p-1 h-full flex flex-col">
                            <textarea
                              value={val}
                              onChange={(e) => handleMaterialDetailChange(e.target.value, prRef)}
                              onPaste={(e) => handleMaterialDetailPaste(e, prRef)}
                              placeholder={`Paste Material Details for ${prRef} here...`}
                              className="w-full flex-1 bg-transparent text-[13px] text-[rgba(255,255,255,0.7)] placeholder:text-[rgba(255,255,255,0.1)] resize-none outline-none p-5 font-mono"
                              style={{ lineHeight: '1.7' }}
                              spellCheck={false}
                            />
                            {parsedCount > 0 && (
                              <div className="px-5 py-2 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(16,185,129,0.05)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <IconCheck size={12} className="text-[#10B981]" />
                                  <span className="text-[10px] font-bold text-[#10B981]">
                                    {parsedCount} items detected &middot; Scroll down for preview
                                  </span>
                                </div>
                                <span className="text-[9px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest">
                                  {materialDetailRows.find(r => r._prRef === prRef)?._delimiter || 'Auto'} Delimited
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Dots Indicator */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {uniquePrs.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentPrIndex ? 'w-4 bg-[#F59E0B]' : 'w-1 bg-[rgba(255,255,255,0.1)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Material Detail Preview Table */}
            <div style={{ display: materialDetailRows.length > 0 ? 'block' : 'none' }} className="mt-8 animate-fade-in-up pb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[rgba(245,158,11,0.1)] flex items-center justify-center border border-[rgba(245,158,11,0.2)]">
                    <IconClipboardData size={18} className="text-[#F59E0B]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-white uppercase tracking-wider">
                      Material Detail Preview
                    </h3>
                    <p className="text-[10px] text-[rgba(255,255,255,0.4)] font-bold uppercase tracking-widest mt-0.5">
                      {materialDetailRows.length} Detailed line items detected
                    </p>
                  </div>
                </div>
                
                <div
                  className="rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    background: 'rgba(15,21,32,0.8)',
                    border: `1px solid ${theme.goldBorder}`,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="sticky top-0 z-20">
                          <th
                            style={{
                              background: theme.headerBg,
                              color: 'rgba(255,255,255,0.3)',
                              fontSize: '9px',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              padding: '12px 14px',
                              borderRight: `1px solid ${theme.border}`,
                              borderBottom: `2px solid ${theme.goldBorder}`,
                              width: '50px',
                              textAlign: 'center',
                              position: 'sticky',
                              left: 0,
                            }}
                          >
                            #
                          </th>
                          {DETAIL_COLUMNS.map((col, i) => (
                            <th
                              key={i}
                              style={{
                                background: theme.headerBg,
                                color: theme.gold,
                                fontSize: '10px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                padding: '12px 16px',
                                borderRight: `1px solid ${theme.border}`,
                                borderBottom: `2px solid ${theme.goldBorder}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
                        {materialDetailRows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            style={{
                              background: rowIdx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                            }}
                            className="hover:bg-[rgba(245,158,11,0.05)] transition-all duration-200 group"
                          >
                            <td
                              className="text-center"
                              style={{
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.2)',
                                fontWeight: 800,
                                padding: '10px 14px',
                                borderRight: `1px solid ${theme.border}`,
                                background: theme.headerBg,
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                              }}
                            >
                              {rowIdx + 1}
                            </td>
                            {DETAIL_COLUMNS.map((col, colIdx) => {
                              const cellValue = row[col] || '';
                              const prRef = row._prRef;
                              const comparisonLookup = comparisonCache[prRef]?.data;
                              let isDifferent = false;
                              let originalValue = null;

                              if (comparisonLookup) {
                                const sr = (row['Sr.No'] || row.Sr_No || row.SrNo || row['Seq #'] || '').toString();
                                const compRow = comparisonLookup.find(c => c.key === sr);
                                if (compRow && compRow.existing) {
                                  let dbKey = col;
                                  if (col === 'Req. Qty') dbKey = 'Qty';
                                  const dbVal = compRow.existing[dbKey];
                                  if (dbVal && cellValue.toString().trim() !== String(dbVal).trim()) {
                                    if (['Qty', 'Rate', 'Total', 'Supplier'].includes(dbKey)) {
                                      isDifferent = true;
                                      originalValue = dbVal;
                                    }
                                  }
                                }
                              }

                              return (
                                <td
                                  key={colIdx}
                                  style={{
                                    borderRight: `1px solid ${theme.border}`,
                                    padding: 0,
                                  }}
                                >
                                  <div className="relative group/cell">
                                    <input
                                      type="text"
                                      value={cellValue}
                                      onChange={(e) => handleMaterialDetailCellEdit(rowIdx, col, e.target.value)}
                                      className={`w-full bg-transparent text-[13px] font-semibold outline-none px-4 py-3 focus:bg-[rgba(245,158,11,0.08)] focus:text-[#F59E0B] transition-colors ${
                                        isDifferent ? 'text-[#EF4444] font-black' : 'text-[rgba(255,255,255,0.85)]'
                                      }`}
                                      style={{
                                        minWidth: col === 'Description' ? '280px' : '120px',
                                        fontVariantNumeric: 'tabular-nums'
                                      }}
                                    />
                                    {isDifferent && (
                                      <div className="absolute bottom-full left-4 mb-2 invisible group-hover/cell:visible bg-[#EF4444] text-white text-[9px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap z-[100] animate-in fade-in zoom-in-95 duration-150">
                                        EXISTING: {originalValue}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            {/* Action buttons under preview */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={triggerVerifyDialog}
                disabled={isImporting || !pasteText || Object.keys(rateDetailsMap).length === 0}
                className="px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#000',
                  border: '1px solid #F59E0B',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                }}
              >
                {isImporting ? (
                  <IconLoader2 size={15} className="animate-spin" />
                ) : (
                  <IconCheck size={15} />
                )}
                Save Changes
              </button>
            </div>
          </div>
        )}
        {/* â•â•â•â•â•â•â•â•â•â•â• DASHBOARD OVERVIEW â•â•â•â•â•â•â•â•â•â•â• */}
        {dashboardStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-item" style={{ animationDelay: '0ms' }}>
          <div className="bg-[#121824] border border-[rgba(255,255,255,0.06)] p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <IconWallet size={64} className="text-[#F59E0B]" />
            </div>
            <p className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-2">Total Managed Spend</p>
            <h4 className="text-3xl font-black text-white">{formatLargeCurrency(dashboardStats.totalSpend)}</h4>
            <div className="flex items-center gap-1.5 mt-4 text-[#10B981]">
              <IconArrowUpRight size={14} stroke={3} />
              <span className="text-[11px] font-black uppercase tracking-tight">+12% from last cycle</span>
            </div>
          </div>

          <div className="bg-[#121824] border border-[rgba(255,255,255,0.06)] p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <IconReceipt2 size={64} className="text-[#F59E0B]" />
            </div>
            <p className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-2">Purchase Requests</p>
            <h4 className="text-3xl font-black text-white">{dashboardStats.uniquePRs}</h4>
            <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-medium mt-4">Total PRs currently tracked</p>
          </div>

          <div className="bg-[#121824] border border-[rgba(255,255,255,0.06)] p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <IconPackage size={64} className="text-[#F59E0B]" />
            </div>
            <p className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-2">Active Suppliers</p>
            <h4 className="text-3xl font-black text-white">{dashboardStats.uniqueSuppliers}</h4>
            <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-medium mt-4">Trusted vendor network size</p>
          </div>

          <div className="bg-[#121824] border border-[rgba(255,255,255,0.06)] p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <IconClipboardData size={64} className="text-[#F59E0B]" />
            </div>
            <p className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-2">Total Line Items</p>
            <h4 className="text-3xl font-black text-white">{dashboardStats.totalItems?.toLocaleString()}</h4>
            <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-medium mt-4">Items across all projects</p>
          </div>
        </div>
        )}

        {/* Spend Breakdown by Period */}
        {spendBreakdownData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 stagger-item" style={{ animationDelay: '50ms' }}>
          <div className="bg-[#121824] border border-[rgba(255,255,255,0.06)] p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {drillMonth ? (
                  <button
                    onClick={() => setDrillMonth(null)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-[#F59E0B] hover:bg-[rgba(245,158,11,0.1)] transition-all"
                  >
                    <IconChevronLeft size={14} /> Back
                  </button>
                ) : null}
                <p className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
                  {drillMonth
                    ? new Date(drillMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })
                    : 'Spend Breakdown'}
                </p>
                {!drillMonth && spendPeriod === 'Monthly' && (
                  <span className="text-[8px] text-[rgba(255,255,255,0.2)] font-medium ml-1">click month bar to drill</span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.04)] rounded-lg p-0.5">
                {['Monthly', 'Yearly'].map(p => (
                  <button
                    key={p}
                    onClick={() => { setSpendPeriod(p); setDrillMonth(null); }}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                      spendPeriod === p && !drillMonth
                        ? 'bg-[#F59E0B] text-black shadow-lg'
                        : 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[200px]">
              {spendBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendBreakdownData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                    <XAxis
                      dataKey="period"
                      stroke="rgba(255,255,255,0.2)"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.4)' }}
                      tickFormatter={(val) => {
                        if (drillMonth) return val;
                        const [y, m] = val.split('-');
                        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        return `${months[parseInt(m, 10) - 1]}-${y.slice(2)}`;
                      }}
                      angle={drillMonth ? -45 : 0}
                      textAnchor={drillMonth ? 'end' : 'middle'}
                      height={drillMonth ? 60 : 30}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.2)"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.4)' }}
                      tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ background: '#121824', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                      labelStyle={{ color: 'white', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#F59E0B', fontWeight: 'bold' }}
                      formatter={(v) => [`AED ${v.toLocaleString()}`, 'Spend']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={drillMonth ? 20 : 32}>
                      {spendBreakdownData.map((entry) => (
                        <Cell
                          key={entry.period}
                          fill="#F59E0B"
                          style={{ cursor: spendPeriod === 'Monthly' && !drillMonth ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (spendPeriod === 'Monthly' && !drillMonth) setDrillMonth(entry.period);
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[rgba(255,255,255,0.2)] text-[11px] font-bold uppercase tracking-wider">
                  No period data available
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Project Wise Money Invested */}
        {projectData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 stagger-item" style={{ animationDelay: '75ms' }}>
          <div className="bg-[#121824] border border-[rgba(255,255,255,0.06)] p-6 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-[#10B981]" />
                <p className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Project Wise Money Invested</p>
              </div>
              <span className="text-[10px] font-bold text-[rgba(255,255,255,0.25)] uppercase tracking-widest">
                {poMasterData.length} line items
              </span>
            </div>
            {poMasterLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">#</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Project</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Total Invested (AED)</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">PRs</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Line Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {(showAllProjects ? projectData : projectData.slice(0, 7)).map((p, idx) => (
                    <tr key={p.project} className="hover:bg-[rgba(16,185,129,0.03)] transition-colors">
                      <td className="py-3 text-[11px] text-[rgba(255,255,255,0.25)] font-bold">{idx + 1}</td>
                      <td className="py-3 text-[13px] text-white font-bold">{p.project}</td>
                      <td className="py-3 text-[13px] text-[#10B981] font-black text-right tabular-nums">
                        {p.totalInvested >= 1000000
                          ? `AED ${(p.totalInvested / 1000000).toFixed(2)}M`
                          : `AED ${p.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      </td>
                      <td className="py-3 text-[13px] text-[rgba(255,255,255,0.6)] font-semibold text-right">{p.prCount}</td>
                      <td className="py-3 text-[13px] text-[rgba(255,255,255,0.6)] font-semibold text-right">{p.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {projectData.length > 7 && (
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="mt-3 w-full text-[11px] font-black uppercase tracking-wider py-2 rounded-lg transition-all"
                  style={{
                    background: 'rgba(16,185,129,0.06)',
                    color: '#10B981',
                    border: '1px solid rgba(16,185,129,0.15)',
                  }}
                >
                  {showAllProjects ? 'Show Less' : `Show All (${projectData.length} Projects)`}
                </button>
              )}
            </div>
            )}
          </div>
        </div>
        )}

        {/* Materials Maximum Time Purchased */}
        {topMaterials.length > 0 && (
        <div className="grid grid-cols-1 gap-6 stagger-item" style={{ animationDelay: '100ms' }}>
          <div className="bg-[#121824] border border-[rgba(255,255,255,0.06)] p-6 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-[#F59E0B]" />
                <p className="text-[10px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Materials Maximum Time Purchased</p>
              </div>
              <span className="text-[10px] font-bold text-[rgba(255,255,255,0.25)] uppercase tracking-widest">
                Top {Math.min(topMaterials.length, 10)} of {poMasterData.length} items
              </span>
            </div>
            {poMasterLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">#</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider">Material Description</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Times Ordered</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Total Qty</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Total Spend (AED)</th>
                    <th className="pb-3 text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-wider text-right">Suppliers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {topMaterials.map((m, idx) => (
                    <tr key={m.description} className="hover:bg-[rgba(245,158,11,0.03)] transition-colors">
                      <td className="py-3 text-[11px] text-[rgba(255,255,255,0.25)] font-bold">{idx + 1}</td>
                      <td className="py-3 text-[13px] text-white font-bold max-w-[300px] truncate" title={m.description}>{m.description}</td>
                      <td className="py-3 text-[13px] text-white font-black text-right">{m.count}x</td>
                      <td className="py-3 text-[13px] text-[rgba(255,255,255,0.6)] font-semibold text-right tabular-nums">{m.totalQty.toLocaleString()}</td>
                      <td className="py-3 text-[13px] text-[#10B981] font-black text-right tabular-nums">
                        {m.totalSpend >= 1000000
                          ? `AED ${(m.totalSpend / 1000000).toFixed(2)}M`
                          : m.totalSpend >= 1000
                            ? `AED ${(m.totalSpend / 1000).toFixed(0)}K`
                            : `AED ${m.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      </td>
                      <td className="py-3 text-[13px] text-[rgba(255,255,255,0.6)] font-semibold text-right">{m.suppliers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
        )}
        </>)}
        {mode === 'prlist' && (
        <div className="stagger-item" style={{ animationDelay: '200ms' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-[rgba(255,255,255,0.15)]" />
              <h2 className="text-lg font-bold text-white tracking-tight">PR List</h2>
              {logData.length > 0 && (
                <span className="text-[10px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest ml-1">
                  {filteredLog.length} ENTRIES
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div
                className="relative flex items-center px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <select
                  value={monthFilter}
                  onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(0); }}
                  className="bg-transparent text-[12px] font-bold text-[#F59E0B] outline-none cursor-pointer appearance-none pr-4"
                  style={{ minWidth: '80px' }}
                >
                  <option value="All" className="bg-[#0f1520] text-white">All Months</option>
                  {uniqueMonths.map(m => (
                    <option key={m} value={m} className="bg-[#0f1520] text-white">{m}</option>
                  ))}
                </select>
                <div className="absolute right-3 pointer-events-none text-[rgba(255,255,255,0.4)]">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {uniqueEnteredBy.length > 0 && (
              <div
                className="relative flex items-center px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <select
                  value={enteredByFilter}
                  onChange={(e) => { setEnteredByFilter(e.target.value); setCurrentPage(0); }}
                  className="bg-transparent text-[12px] font-bold text-[#F59E0B] outline-none cursor-pointer appearance-none pr-4"
                  style={{ minWidth: '100px' }}
                >
                  <option value="All" className="bg-[#0f1520] text-white">All Entered By</option>
                  {uniqueEnteredBy.map(name => (
                    <option key={name} value={name} className="bg-[#0f1520] text-white">{name}</option>
                  ))}
                </select>
                <div className="absolute right-3 pointer-events-none text-[rgba(255,255,255,0.4)]">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              )}

              {uniqueStatuses.length > 0 && (
              <div
                className="relative flex items-center px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
                  className="bg-transparent text-[12px] font-bold text-[#F59E0B] outline-none cursor-pointer appearance-none pr-4"
                  style={{ minWidth: '120px' }}
                >
                  <option value="All" className="bg-[#0f1520] text-white">All Statuses</option>
                  {uniqueStatuses.map(st => (
                    <option key={st} value={st} className="bg-[#0f1520] text-white">{st}</option>
                  ))}
                </select>
                <div className="absolute right-3 pointer-events-none text-[rgba(255,255,255,0.4)]">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              )}

              <div
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg w-full sm:w-auto sm:min-w-[200px] lg:w-[280px]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <IconSearch size={14} className="text-[rgba(255,255,255,0.2)] shrink-0" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => { setLogSearch(e.target.value); setCurrentPage(0); }}
                  placeholder="Search PR Number... (Ctrl+F)"
                  className="w-full bg-transparent text-[12px] text-[rgba(255,255,255,0.7)] placeholder:text-[rgba(255,255,255,0.15)] outline-none"
                />
                {logSearch && (
                  <button onClick={() => setLogSearch('')} className="text-[rgba(255,255,255,0.2)] hover:text-white transition-colors">
                    <IconX size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {logLoading ? (
            <BoxLoader />
          ) : logData.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
              <div className="p-8 rounded-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] shadow-2xl">
                <IconRowInsertBottom size={80} className="text-[rgba(255,255,255,0.1)] animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Your PR List is Empty</h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.3)] max-w-sm mx-auto leading-relaxed">
                  Start by importing your purchase requisition data using the import tools above.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleLog.map((row, idx) => {
                  const isExpanded = expandedCardRef === row.Ref;
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleExpandCard(row)}
                      onDoubleClick={() => openDetailedModal(row)}
                      className={`relative rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-300 border ${
                        isExpanded
                          ? 'border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-[#1e2538]'
                          : 'border-[rgba(255,255,255,0.06)] bg-[#1a1f2e] hover:border-[#F59E0B] hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      }`}
                      style={{
                        height: isExpanded ? 'auto' : '230px',
                        minHeight: isExpanded ? '440px' : '230px',
                      }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 max-w-full overflow-hidden">
                          <h3 className="text-base font-black text-[#F59E0B] tracking-tight uppercase truncate mr-2" title={row.Ref}>
                            {row.Ref || 'N/A'}
                          </h3>
                          {row._pos && row._pos.length > 1 && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.08)]">
                              {row._pos.length} POs
                            </span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          row.Status === 'Approved'
                            ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]'
                            : row.Status === 'Open'
                            ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]'
                            : 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
                        }`}>
                          {row.Status || 'Open'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-3 text-white font-bold text-sm">
                          <div className="flex items-center gap-1.5 truncate" title={row.Project}>
                            <IconBriefcase size={14} className="text-[rgba(255,255,255,0.4)] shrink-0" />
                            <span className="truncate">{row.Project || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#F59E0B] font-semibold text-[11px] shrink-0 max-w-[140px]" title={row.Supplier}>
                            <IconBuildingStore size={12} className="shrink-0" />
                            <span className="truncate">{row.Supplier || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[rgba(255,255,255,0.4)] text-[11px] font-medium truncate mt-1" title={row.Company}>
                          <IconBuilding size={12} className="shrink-0" />
                          <span className="truncate">{row.Company || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <div className="flex items-center gap-1 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-lg px-2.5 py-1 text-[#F59E0B]">
                          <span className="text-[9px] font-extrabold uppercase opacity-60">Net:</span>
                          <span className="text-[11px] font-black">{row['Net Price'] || '0.00'}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-lg px-2.5 py-1 text-[#F59E0B]">
                          <span className="text-[9px] font-extrabold uppercase opacity-60">VAT:</span>
                          <span className="text-[11px] font-black">{row['VAT'] || '0.00'}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] rounded-lg px-2.5 py-1 text-[#F59E0B] shadow-inner">
                          <span className="text-[9px] font-extrabold uppercase opacity-60">Total:</span>
                          <span className="text-[11px] font-black">{row['Total Price'] || '0.00'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-3 animate-slide-down">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase">PO Class</p>
                              <p className="text-[11px] text-white font-medium">{row['PO Class'] || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase">QC Ref</p>
                              <p className="text-[11px] text-white font-medium">{row['QC Ref.'] || 'N/A'}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase">Doc. Remarks</p>
                            <p className="text-[11px] text-[rgba(255,255,255,0.7)] font-medium italic truncate">
                              {row['Doc. Remarks'] || 'No remarks'}
                              {row._pos && row._pos.length > 1 && ` (Merged: ${row._pos.join(', ')})`}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-wider">PR List Insights</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFetchPrData(row, true);
                                }}
                                disabled={prLoading[row.Ref]}
                                className="p-1 hover:bg-white/5 text-[rgba(255,255,255,0.4)] hover:text-[#F59E0B] rounded-md transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none"
                                title="Force refetch latest insights"
                              >
                                <IconRefresh size={10} className={prLoading[row.Ref] ? 'animate-spin' : ''} />
                                <span>Sync</span>
                              </button>
                            </div>
                            {prLoading[row.Ref] ? (
                              <div className="flex items-center gap-2 py-1">
                                <IconLoader2 size={12} className="text-[#F59E0B] animate-spin" />
                                <span className="text-[10px] text-[rgba(255,255,255,0.3)]">Fetching additional webhook logs...</span>
                              </div>
                            ) : prError[row.Ref] ? (
                              <p className="text-[10px] text-red-400">Failed to fetch logs: {prError[row.Ref]}</p>
                            ) : prDetails[row.Ref] ? (
                              <div className="bg-[rgba(255,255,255,0.02)] p-2.5 rounded-lg border border-[rgba(255,255,255,0.04)] text-[11px] text-[rgba(255,255,255,0.7)] space-y-1 max-h-[100px] overflow-y-auto scrollbar-thin">
                                {renderWebhookDataInline(prDetails[row.Ref])}
                              </div>
                            ) : (
                              <p className="text-[10px] text-[rgba(255,255,255,0.25)]">No additional webhook logs available.</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailedModal(row);
                              }}
                              className="px-4 py-2 bg-[#F59E0B] text-black hover:bg-[#D97706] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                            >
                              <IconEye size={12} />
                              View Full Report
                            </button>
                          </div>
                        </div>
                      )}

                      {!isExpanded && (
                        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] pt-3 text-[10px] text-[rgba(255,255,255,0.35)] font-bold truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <IconUser size={10} className="shrink-0 text-[rgba(255,255,255,0.2)]" />
                            <span className="truncate">{row['Entered By'] || 'N/A'}</span>
                          </div>
                          <span className="mx-1.5 opacity-20">&#8226;</span>
                          <div className="flex items-center gap-1.5 truncate">
                            <IconClock size={10} className="shrink-0 text-[rgba(255,255,255,0.2)]" />
                            <span className="truncate">{row['Entered Time'] || 'N/A'}</span>
                          </div>
                          <span className="mx-1.5 opacity-20">&#8226;</span>
                          <div className="flex items-center gap-1.5 truncate">
                            <IconCalendar size={10} className="shrink-0 text-[rgba(255,255,255,0.2)]" />
                            <span className="truncate">{row['PO Date'] || 'N/A'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col items-center justify-center pt-8 pb-12 gap-3">
                  <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-semibold tracking-wider uppercase">
                    Page {currentPage + 1} of {totalPages} &middot; {filteredLog.length} records
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Prev
                    </button>

                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
                      const end = Math.min(totalPages, start + maxVisible);
                      if (end - start < maxVisible) start = Math.max(0, end - maxVisible);

                      if (start > 0) pages.push(<span key="start" className="text-[rgba(255,255,255,0.2)] text-[11px] font-bold px-1">...</span>);

                      for (let i = start; i < end; i++) {
                        const isActive = i === currentPage;
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-9 h-9 rounded-xl text-[11px] font-bold transition-all ${
                              isActive
                                ? 'bg-[#F59E0B] text-black shadow-md'
                                : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                            }`}
                            style={isActive ? {} : { border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            {i + 1}
                          </button>
                        );
                      }

                      if (end < totalPages) pages.push(<span key="end" className="text-[rgba(255,255,255,0.2)] text-[11px] font-bold px-1">...</span>);

                      return pages;
                    })()}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
      {/* Verification Modal Dialog */}
      {showVerifyDialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setShowVerifyDialog(false)}
          />
          {/* Modal box */}
          <div
            className="relative w-full max-w-md p-6 rounded-2xl shadow-2xl border flex flex-col text-center stagger-item"
            style={{
              background: 'linear-gradient(135deg, rgba(30,37,53,0.95) 0%, rgba(15,21,32,0.95) 100%)',
              borderColor: 'rgba(245,158,11,0.3)',
            }}
          >
            {/* Header / Icon */}
            <div className="mx-auto w-12 h-12 rounded-full bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center text-[#F59E0B] mb-4">
              <IconTableImport size={24} />
            </div>

            <h3 className="text-base font-bold text-white mb-2">Verify Mapped Data</h3>
            <p className="text-[13px] text-[rgba(255,255,255,0.6)] leading-relaxed mb-6">
              Please verify the data and edit if anything is misplaced. Ensure columns and rows align with Excel before completing the save.
            </p>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowVerifyDialog(false)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all border"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.6)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={dialogCountdown > 0}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: dialogCountdown > 0 ? 'rgba(245,158,11,0.1)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: dialogCountdown > 0 ? 'rgba(245,158,11,0.5)' : '#000',
                  border: `1px solid ${dialogCountdown > 0 ? 'rgba(245,158,11,0.2)' : '#F59E0B'}`,
                  boxShadow: dialogCountdown > 0 ? 'none' : '0 4px 15px rgba(245, 158, 11, 0.25)',
                }}
              >
                {dialogCountdown > 0 ? `OK (${dialogCountdown}s)` : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed PO Report Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setSelectedCard(null)}
          />
          {/* Modal Box */}
          <div 
            className="relative w-full max-w-4xl bg-[#090e17] border border-[rgba(255,255,255,0.08)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in animate-duration-200"
            style={{
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.05)'
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#0e1420]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-[#F59E0B] uppercase tracking-[0.2em]">Purchase Order Details</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedCard.Status === 'Approved' 
                      ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.3)]' 
                      : selectedCard.Status === 'Open' 
                      ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]' 
                      : 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.3)]'
                  }`}>
                    {selectedCard.Status || 'Open'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#F59E0B] tracking-tight mt-1">
                  {selectedCard.Ref || 'N/A'}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedCard(null)}
                className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
              >
                <IconX size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
              {/* Row 1: General Info & Supplier details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Block */}
                <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
                  <h4 className="text-xs font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2 flex items-center gap-2">
                    <IconBriefcase size={14} className="text-[#F59E0B]" /> General Information
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Project</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard.Project || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Company</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard.Company || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Supplier</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard.Supplier || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">PO Class</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard['PO Class'] || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">PO Date</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard['PO Date'] || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Month</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard.Month || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Workflow & Approvals Block */}
                <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
                  <h4 className="text-xs font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2 flex items-center gap-2">
                    <IconFileCertificate size={14} className="text-[#F59E0B]" /> Workflow & Approvals
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Pending Approval</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard['Pending Approval'] || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Approval Config</p>
                      <p className="text-[#F59E0B] font-extrabold text-sm mt-0.5">{selectedCard['Approval Config'] || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Status 1</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard.Status_1 || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Approve / Reject</p>
                      <p className="text-white font-semibold text-sm mt-0.5">{selectedCard['Approve / Reject'] || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Approval History</p>
                      <p className="text-[rgba(255,255,255,0.7)] font-medium text-xs mt-1 bg-[#090e17] p-3 rounded-lg border border-[rgba(255,255,255,0.03)]">
                        {selectedCard['Approval History'] || 'No workflow logs logged.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Financial Details */}
              <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
                <h4 className="text-xs font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2 flex items-center gap-2">
                  <IconCoins size={14} className="text-[#F59E0B]" /> Financial Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                  <div className="bg-[#090e17] p-4 rounded-xl border border-[rgba(255,255,255,0.02)]">
                    <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Net Price</p>
                    <p className="text-white font-black text-sm mt-1">AED {netPriceStr}</p>
                  </div>
                  <div className="bg-[#090e17] p-4 rounded-xl border border-[rgba(255,255,255,0.02)]">
                    <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">VAT</p>
                    <p className="text-white font-black text-sm mt-1">AED {selectedCard.VAT || '0.00'}</p>
                  </div>
                  <div className="bg-[rgba(245,158,11,0.03)] p-4 rounded-xl border border-[rgba(245,158,11,0.15)] shadow-inner">
                    <p className="font-extrabold text-[#F59E0B] uppercase text-[9px] tracking-widest">Total Price</p>
                    <p className="text-[#F59E0B] font-black text-base mt-1">AED {selectedCard['Total Price'] || '0.00'}</p>
                  </div>
                  <div className="bg-[#090e17] p-4 rounded-xl border border-[rgba(255,255,255,0.02)]">
                    <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Discount</p>
                    <p className="text-white font-semibold text-sm mt-1">{selectedCard.Discount || 'No Discount'}</p>
                  </div>
                </div>

                {origVal > 0 && (
                  <div className="mt-6 p-5 rounded-2xl border bg-black/40 flex flex-col md:flex-row items-center justify-between gap-5 border-[rgba(255,255,255,0.05)] shadow-md">
                    <div className="flex items-start md:items-center gap-6 w-full md:w-auto justify-center md:justify-start">
                      <div className="text-center md:text-left">
                        <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Initial Price (Baseline)</p>
                        <p className="text-sm font-semibold text-[rgba(255,255,255,0.45)] line-through mt-0.5">AED {originalPriceStr}</p>
                      </div>
                      <div className="text-sm text-[rgba(255,255,255,0.2)] font-black mt-3 md:mt-0">&rarr;</div>
                      <div className="text-center md:text-left">
                        <p className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-widest">Current Price (Net)</p>
                        <p className="text-sm font-black text-white mt-0.5">AED {netPriceStr}</p>
                        {(() => {
                          const modalPrDetails = prDetails[selectedCard.Ref];
                          // Robust remark extraction from nested payload
                          const extractRemarks = (data) => {
                            if (!data) return [];
                            if (Array.isArray(data)) {
                              return data.flatMap(item => {
                                if (item.remark || item.Remark) return [item.remark || item.Remark];
                                if (item.data && Array.isArray(item.data)) return extractRemarks(item.data);
                                return [];
                              });
                            }
                            if (data.data && Array.isArray(data.data)) return extractRemarks(data.data);
                            return data.remark || data.Remark ? [data.remark || data.Remark] : [];
                          };
                          
                          const allRemarks = extractRemarks(modalPrDetails);
                          const prRemarks = allRemarks.length > 0 ? allRemarks.filter(Boolean).join(' | ') : null;
                          if (prRemarks) {
                            return (
                              <p className="text-[10px] text-[rgba(255,255,255,0.5)] italic mt-1.5 max-w-[250px] leading-tight border-l-2 border-[rgba(245,158,11,0.5)] pl-2 py-0.5">
                                {prRemarks}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    <div className={`px-5 py-3 rounded-xl border flex flex-col items-center md:items-end w-full md:w-auto self-start md:self-auto ${
                      netVal > origVal 
                        ? 'bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.15)]' 
                        : netVal < origVal 
                        ? 'bg-[rgba(16,185,129,0.05)] border-[rgba(16,185,129,0.15)]'
                        : 'bg-white/5 border-white/10'
                    }`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Price Variance</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-sm font-black ${
                          netVal > origVal ? 'text-[#EF4444]' : netVal < origVal ? 'text-[#10B981]' : 'text-white'
                        }`}>
                          {netVal > origVal ? '+' : netVal < origVal ? '-' : ''} AED {changePriceStr}
                        </span>
                        {percentChange !== 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                            netVal > origVal ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {netVal > origVal ? '\u25B2' : '\u25BC'} {Math.abs(percentChange).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Context and Meta details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
                  <h4 className="text-xs font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2 flex items-center gap-2">
                    <IconFileText size={14} className="text-[#F59E0B]" /> Audit Log & Context
                  </h4>
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Entered By</p>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-white">
                          <IconUser size={12} className="text-[rgba(255,255,255,0.4)]" />
                          <span>{selectedCard['Entered By'] || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Entered Time</p>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-white">
                          <IconClock size={12} className="text-[rgba(255,255,255,0.4)]" />
                          <span>{selectedCard['Entered Time'] || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Req Ref</p>
                        <p className="text-white font-semibold text-sm mt-1">{selectedCard['Req Ref'] || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">QC Ref</p>
                        <p className="text-white font-semibold text-sm mt-1">{selectedCard['QC Ref.'] || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
                  <h4 className="text-xs font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2 flex items-center gap-2">
                    <IconFileCertificate size={14} className="text-[#F59E0B]" /> Remarks & Conditions
                  </h4>
                  <div className="space-y-4 text-xs">
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Doc. Remarks</p>
                      <p className="text-white font-medium text-xs mt-1 bg-[#090e17] p-2.5 rounded-lg border border-[rgba(255,255,255,0.03)] italic">
                        {(() => {
                          const val = selectedCard['Doc. Remarks'] || selectedCard.Doc_Remarks || selectedCard.Remarks || selectedCard.remarks;
                          if (!val || val === 'N/A' || val.toLowerCase() === 'no remarks') return 'No remarks recorded.';
                          return String(val).replace(/&amp;/g, '&');
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Terms & Conditions</p>
                      <p className="text-white font-semibold text-xs mt-1 bg-[#090e17]/50 p-2 rounded-lg border border-[rgba(255,255,255,0.02)]" title={selectedCard['Terms & Conditions']}>
                        {(() => {
                          const val = selectedCard['Terms & Conditions'] || selectedCard.Terms_Conditions || selectedCard.terms;
                          if (!val || val === 'N/A') return 'No terms specified.';
                          return String(val).replace(/&amp;/g, '&');
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Attachments</p>
                      <p className="text-[rgba(255,255,255,0.6)] font-semibold text-xs mt-1">
                        {selectedCard.Attachments || selectedCard.attachments || 'No attachments identified.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook Deep Insights Block */}
              <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
                <h4 className="text-xs font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconFileText size={14} className="text-[#F59E0B]" /> PR List Insights
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFetchPrData(selectedCard, true);
                    }}
                    disabled={prLoading[selectedCard.Ref]}
                    className="px-2.5 py-1 hover:bg-white/5 text-[rgba(255,255,255,0.4)] hover:text-[#F59E0B] rounded-md transition-all flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none"
                    title="Force refetch latest insights"
                  >
                    <IconRefresh size={11} className={prLoading[selectedCard.Ref] ? 'animate-spin' : ''} />
                    <span>Sync Latest</span>
                  </button>
                </h4>
                {prLoading[selectedCard.Ref] ? (
                  <BoxLoader />
                ) : prError[selectedCard.Ref] ? (
                  <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-400">
                    <span>Failed to retrieve logs: {prError[selectedCard.Ref]}</span>
                  </div>
                ) : prDetails[selectedCard.Ref] ? (
                  <div className="space-y-4">
                    {renderWebhookDataFull(prDetails[selectedCard.Ref])}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl text-xs text-[rgba(255,255,255,0.4)]">
                    <span>No Req Ref reference available to query webhook.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[rgba(255,255,255,0.08)] bg-[#0e1420] flex justify-end">
              <button 
                onClick={() => setSelectedCard(null)}
                className="px-6 py-2.5 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white border border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â• COMPARISON MODAL (REDESIGNED) â•â•â•â•â•â•â•â•â•â•â• */}
      {comparisonModal.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-12">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-fade-in" onClick={() => setComparisonModal({ ...comparisonModal, show: false })} />
          
          <div className="relative w-full max-w-7xl max-h-[92vh] bg-[#080c14] rounded-[40px] border border-[rgba(245,158,11,0.15)] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="p-10 border-b border-[rgba(245,158,11,0.05)] flex items-center justify-between bg-gradient-to-b from-[#0e1420] to-[#080c14]">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <IconArrowsDiff size={28} className="text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">PR Data Reconciliation</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)] font-black uppercase tracking-[0.2em]">Comparing database vs pasted for</span>
                    <span className="px-3 py-1 bg-[#F59E0B]/10 text-[#F59E0B] text-[11px] font-black rounded-lg border border-[#F59E0B]/20">{comparisonModal.prRef}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_currentColor]" />
                   Live Database Sync
                </div>
                <button 
                  onClick={() => { setRemarksInput({}); setComparisonModal({ ...comparisonModal, show: false }); }}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-all text-[rgba(255,255,255,0.3)] hover:text-white group"
                >
                  <IconX size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>

            {/* Comparison Content */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
              {comparisonModal.data.map((row, idx) => {
                 const diffFields = ['Qty', 'Rate', 'Total'].filter(f => {
                   if (!row.existing || !row.new) return false;
                   const valE = parseFloat(String(row.existing[f] || '0').replace(/,/g, ''));
                   const valN = parseFloat(String(row.new[f] || '0').replace(/,/g, ''));
                   return Math.abs(valE - valN) > 0.01;
                 });
                 const isModified = diffFields.length > 0;
                 const needsRemark = isModified || row.status === 'NEW';
                 const remarkKey = row.key || String(idx);
                 
                 return (
                   <div key={idx} 
                      className="animate-slide-in-row opacity-0"
                      style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'forwards' }}
                   >
                     <div className={`relative bg-[#0d121d] rounded-3xl border transition-all duration-500 hover:scale-[1.005] group/row ${
                        row.status === 'NEW' ? 'border-emerald-500/20 hover:border-emerald-500/40' :
                        row.status === 'MISSING' ? 'border-rose-500/20 opacity-60 grayscale' :
                        isModified ? 'border-[#F59E0B]/30 hover:border-[#F59E0B]/50 shadow-[0_10px_40px_rgba(245,158,11,0.05)]' :
                        'border-white/5 hover:border-white/10'
                     }`}>
                        {/* Status Ribbon */}
                        <div className="absolute top-6 -left-3 z-10">
                          {row.status === 'NEW' ? (
                            <div className="px-3 py-1 bg-emerald-500 text-black text-[9px] font-black rounded-lg shadow-lg rotate-[-4deg] uppercase tracking-tighter">New Entry</div>
                          ) : row.status === 'MISSING' ? (
                            <div className="px-3 py-1 bg-rose-500 text-white text-[9px] font-black rounded-lg shadow-lg rotate-[-4deg] uppercase tracking-tighter">Not Pasted</div>
                          ) : isModified ? (
                            <div className="px-3 py-1 bg-[#F59E0B] text-black text-[9px] font-black rounded-lg shadow-lg rotate-[-4deg] uppercase tracking-tighter">Updates Detected</div>
                          ) : (
                            <div className="px-3 py-1 bg-white/10 text-white/40 text-[9px] font-black rounded-lg shadow-lg rotate-[-4deg] uppercase tracking-tighter border border-white/5 backdrop-blur-md">Unified</div>
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="p-8">
                           {/* Row Header */}
                           <div className="flex items-start justify-between mb-8">
                              <div className="flex items-start gap-4">
                                <span className="mt-1 text-2xl font-black text-white/5 font-mono tracking-tighter leading-none">{row.key?.padStart(2, '0') || '??'}</span>
                                <div>
                                  <h4 className="text-sm font-black text-white/90 leading-tight group-hover/row:text-[#F59E0B] transition-colors">
                                    {(row.existing?.Description || row.new?.Description || 'N/A').toUpperCase()}
                                  </h4>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-[10px] text-white/20 font-bold font-mono tracking-widest">{row.existing?.['Item Code'] || row.new?.['Item Code'] || 'NO SYSTEM CODE'}</span>
                                    {row.existing?._versionUsed > 0 && (
                                      <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md font-black uppercase tracking-tighter">v{row.existing._versionUsed} Active</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!isModified && row.status === 'MATCHED' && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                  <IconCheck size={14} /> Perfect Match
                                </div>
                              )}
                           </div>

                           {/* Two Column Layout */}
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2" />
                              
                              {/* LEFT: Current DB Version */}
                              <div className="space-y-4">
                                <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" /> Current Version
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                  {['Qty', 'Rate', 'Total'].map(f => (
                                    <div key={f}>
                                      <p className="text-[8px] font-black text-white/10 uppercase tracking-widest mb-1">{f}</p>
                                      <p className="text-sm font-black text-white/60 font-mono transition-colors group-hover/row:text-white/80">{row.existing ? (row.existing[f] || '0.00') : '—'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* RIGHT: New Pasted */}
                              <div className="pl-8 space-y-4">
                                <div className="text-[9px] font-black text-[#F59E0B]/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]/50" /> New Pasted
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                  {['Qty', 'Rate', 'Total'].map(f => {
                                    const valE = row.existing ? parseFloat(String(row.existing[f] || '0').replace(/,/g, '')) : 0;
                                    const valN = row.new ? parseFloat(String(row.new[f] || '0').replace(/,/g, '')) : 0;
                                    const diff = valN - valE;
                                    const changed = Math.abs(diff) > 0.01;
                                    
                                    let textColor = 'text-white/80';
                                    if (changed) {
                                      if (f === 'Rate' || f === 'Total') textColor = diff > 0 ? 'text-rose-400' : 'text-emerald-400';
                                      else textColor = 'text-blue-400';
                                    }

                                    return (
                                      <div key={f}>
                                        <p className="text-[8px] font-black text-white/10 uppercase tracking-widest mb-1">{f}</p>
                                        <p className={`text-sm font-black font-mono ${textColor}`}>{row.new ? (row.new[f] || '0.00') : '—'}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                           </div>

                           {/* DIFF Section (only if modified or removal) */}
                           {isModified && (
                              <div className="mt-8 pt-6 border-t border-white/5 flex items-center flex-wrap gap-x-8 gap-y-4 bg-white/[0.01] -mx-8 px-8 pb-6 rounded-b-none">
                                {['Qty', 'Rate', 'Total'].map(f => {
                                  if (!diffFields.includes(f) && f !== 'Total') return null;
                                  const valE = row.existing ? parseFloat(String(row.existing[f] || '0').replace(/,/g, '')) : 0;
                                  const valN = row.new ? parseFloat(String(row.new[f] || '0').replace(/,/g, '')) : 0;
                                  const diff = valN - valE;
                                  const pct = calculatePercentChange(valE, valN);
                                  const isIncrease = diff > 0;
                                  const isDecreasing = diff < 0;

                                  return (
                                    <div key={f} className="flex items-center gap-3">
                                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">{f} Δ</div>
                                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black font-mono ${
                                        f === 'Qty' ? 'bg-blue-500/10 text-blue-400' :
                                        isIncrease ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                                      }`}>
                                        {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        <span className="opacity-60 text-[9px]">({pct})</span>
                                        {isIncrease ? <IconArrowUpRight size={12} className="rotate-0" /> : isDecreasing ? <IconArrowUpRight size={12} className="rotate-90" /> : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                           )}

                           {/* ── REMARK SECTION (shown only where there is a change) ── */}
                           {needsRemark && (
                             <div className={`${isModified ? '-mx-8 -mb-8 px-8 pb-8' : 'mt-6'} pt-5 border-t border-[rgba(245,158,11,0.08)] bg-[rgba(245,158,11,0.02)] ${isModified ? '' : 'rounded-b-3xl -mx-8 -mb-8 px-8 pb-8'}`}>
                               <div className="flex items-center gap-2 mb-3">
                                 <div className="w-1 h-4 rounded-full bg-[#F59E0B]/60" />
                                 <label className="text-[9px] font-black text-[#F59E0B]/60 uppercase tracking-[0.2em]">
                                   Reconciliation Remark
                                   {remarksInput[remarkKey] && (
                                     <span className="ml-2 text-[#F59E0B] text-[8px] normal-case tracking-normal">(saved on Apply)</span>
                                   )}
                                 </label>
                               </div>
                               <textarea
                                 value={remarksInput[remarkKey] || ''}
                                 onChange={(e) => setRemarksInput(prev => ({ ...prev, [remarkKey]: e.target.value }))}
                                 placeholder={isModified
                                   ? `Explain the change in ${diffFields.join(', ')} for Sr.No ${remarkKey}…`
                                   : `Add a remark for this new item (Sr.No ${remarkKey})…`
                                 }
                                 rows={2}
                                 className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(245,158,11,0.15)] focus:border-[rgba(245,158,11,0.4)] rounded-2xl px-5 py-3.5 text-[12px] text-white/80 placeholder:text-white/20 outline-none resize-none transition-all font-medium leading-relaxed"
                               />
                             </div>
                           )}
                        </div>
                     </div>
                   </div>
                 );
              })}
            </div>

            {/* Footer Actions */}
            <div className="p-10 border-t border-[rgba(255,255,255,0.03)] bg-[#0a0f18] flex items-center justify-between">
               <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{comparisonModal.data.filter(r => r.existing && r.new && ['Qty', 'Rate', 'Total'].some(f => Math.abs(parseFloat(String(r.existing[f] || '0').replace(/,/g, '')) - parseFloat(String(r.new[f] || '0').replace(/,/g, ''))) > 0.01)).length} Updated</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{comparisonModal.data.filter(r => r.status === 'NEW').length} New</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{comparisonModal.data.filter(r => r.status === 'MISSING').length} Removed</span>
                  </div>
                  {/* Live remark count badge */}
                  {Object.values(remarksInput).filter(Boolean).length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-xl">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                      <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest">
                        {Object.values(remarksInput).filter(Boolean).length} Remark{Object.values(remarksInput).filter(Boolean).length > 1 ? 's' : ''} Added
                      </span>
                    </div>
                  )}
               </div>
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setRemarksInput({});
                      setComparisonModal({ ...comparisonModal, show: false });
                    }}
                    className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-3xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Discard Changes
                  </button>
                  <button 
                    onClick={() => {
                      // Persist all filled remarks into reconRemarks under this PR
                      const filledRemarks = Object.entries(remarksInput).reduce((acc, [k, v]) => {
                        if (v && v.trim()) acc[k] = v.trim();
                        return acc;
                      }, {});
                      if (Object.keys(filledRemarks).length > 0) {
                        const prRef = comparisonModal.prRef || '';
                        const normalizedPr = prRef.toString().trim().toUpperCase().replace(/^PR/, 'PR-').replace(/\s+/g, '');
                        setReconRemarks(prev => ({
                          ...prev,
                          [normalizedPr]: { ...(prev[normalizedPr] || {}), ...filledRemarks }
                        }));
                      }
                      setRemarksInput({});
                      setComparisonModal({ ...comparisonModal, show: false });
                      const remarkCount = Object.keys(filledRemarks).length;
                      setToast({
                        message: remarkCount > 0
                          ? `Reconciliation applied · ${remarkCount} remark${remarkCount > 1 ? 's' : ''} saved`
                          : 'Comparison verified. Changes accepted.',
                        type: 'success'
                      });
                    }}
                    className="px-10 py-4 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black shadow-[0_20px_40px_rgba(245,158,11,0.2)] rounded-3xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Apply Reconciliation
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}


      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRow {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-row {
          animation: slideInRow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
};

export default POLog;

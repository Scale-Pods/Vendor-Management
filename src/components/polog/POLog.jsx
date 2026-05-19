import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  IconClipboardData,
  IconUpload,
  IconTrash,
  IconCheck,
  IconX,
  IconLoader2,
  IconSearch,
  IconChevronDown,
  IconArrowDown,
  IconTableImport,
  IconRowInsertBottom,
  IconBuildingStore,
  IconCoins,
  IconUser,
  IconClock,
  IconHash,
  IconCalendar,
  IconFileText,
  IconBuilding,
  IconBriefcase,
  IconEye,
  IconFileCertificate,
  IconRefresh,
} from '@tabler/icons-react';
import BoxLoader from '../ui/BoxLoader';


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
  'Attachments',
  'Approval History',
  'Approval Config',
  'Discount',
  'Net Price',
  'VAT',
  'Total Price',
  'Status_1',
  'Original Pirce',
  'Change in Price',
  'Month',
];

const MATERIAL_COLUMNS = [
  'Project',
  'PR',
  'Description',
  'Qty',
  'Req Qty',
  'Remain Qty',
  'Next Doc',
  'Rate',
  'Price',
  'VAT',
  'Total',
  'Supplier',
];

// Indices to strip from the raw paste (0-based)
const STRIP_INDICES = new Set();

const WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE;
const IMPORT_WEBHOOK = `${import.meta.env.VITE_N8N_WEBHOOK_BASE}/552d22ef-17fd-4dfd-b4d5-dfce6624c5f6`;
const FETCH_WEBHOOK = `${import.meta.env.VITE_N8N_WEBHOOK_BASE}/e7af6af6-25f1-4c46-96f7-61a57f9e0978?action=PO%20Data`;

const PAGE_SIZE = 50;

/* ─── Toast Component ─── */
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

/* ─── Webhook PR Insight Sub-components ─── */
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
  const hasChangePrice = row['Change in Price'];

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

      {/* Row 3: Req Ref · QC Ref · Month in chips */}
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

      {/* Footer: Net Price · VAT · Total Price */}
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
          <span className="text-[#F59E0B]">→</span>
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
              {versions.map((v, idx) => (
                <tr key={idx} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                  <td className="px-4 py-3 font-extrabold text-[#F59E0B] uppercase">{v.version}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('qty', idx, versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('rate', idx, versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('price', idx, versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('vat', idx, versions)}</td>
                  <td className="px-4 py-3 font-bold text-white">{renderCell('total', idx, versions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ─── */
const POLog = () => {
  // Paste zone
  const [pasteText, setPasteText] = useState('');
  const [rateDetailsText, setRateDetailsText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [rateRowsUpdated, setRateRowsUpdated] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState(null);
  const textareaRef = useRef(null);

  // Dialog and Countdown
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [dialogCountdown, setDialogCountdown] = useState(2);
  const timerRef = useRef(null);

  // Existing log
  const [logData, setLogData] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const logScrollRef = useRef(null);
  const [expandedCardRef, setExpandedCardRef] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  // Webhook integration states for PR details
  const [prDetails, setPrDetails] = useState({});
  const [prLoading, setPrLoading] = useState({});
  const [prError, setPrError] = useState({});

  const netPriceStr = selectedCard ? (selectedCard['Net Price'] || '0.00') : '0.00';
  const originalPriceStr = selectedCard ? (selectedCard['Original Pirce'] || selectedCard['Original Price'] || '0.00') : '0.00';
  
  const netVal = parseFloat(String(netPriceStr).replace(/,/g, '')) || 0;
  const origVal = parseFloat(String(originalPriceStr).replace(/,/g, '')) || 0;
  
  const rawChangeStr = selectedCard ? (selectedCard['Change in Price'] || '0.00') : '0.00';
  const computedChangeVal = Math.abs(netVal - origVal);
  const changePriceStr = computedChangeVal > 0 
    ? computedChangeVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    : rawChangeStr;

  const changeVal = computedChangeVal > 0 ? computedChangeVal : (parseFloat(String(rawChangeStr).replace(/,/g, '')) || 0);
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
      const url = `${import.meta.env.VITE_N8N_WEBHOOK_BASE}/b47de351-0c89-466a-9098-29f0eaa590ae?pr=${encodeURIComponent(prRef)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const text = await response.text();
      let parsedJson;
      try {
        parsedJson = text ? JSON.parse(text) : { status: "Success", message: "Webhook executed successfully. No additional data payload returned." };
      } catch (e) {
        parsedJson = { message: text || "Webhook executed successfully." };
      }

      setPrDetails(prev => ({ ...prev, [ref]: parsedJson }));
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
          Detected: <span className="text-[#F59E0B]">{logsCount} PO Log</span> · <span className="text-[#F59E0B]">{ordersCount} Material Items</span>
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
      if (item.Ref) {
        poLogs.push(item);
      } else if (item.PR || item.PR_No || item.PR_Number || item['PR No'] || item.Req_Ref || item['Req Ref']) {
        purchaseOrders.push(item);
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
          <span className="opacity-40">·</span>
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
              <IconBriefcase size={14} className="text-[#F59E0B]" /> Material List ({purchaseOrders.length})
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

  /* ─── Paste parsing ─── */
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

      // Map to PO_COLUMNS positionally
      const rowObj = {};
      PO_COLUMNS.forEach((col, i) => {
        rowObj[col] = (filtered[i] || '').trim();
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

  const handleRateDetailsPaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    const pasted = clipboardData.getData('text');
    setRateDetailsText(pasted);
    parseRateDetails(pasted);
    e.preventDefault();
  };

  const handleRateDetailsChange = (e) => {
    setRateDetailsText(e.target.value);
    parseRateDetails(e.target.value);
  };

  const parseRateDetails = (text) => {
    const clearRateData = () => {
      setRateRowsUpdated(0);
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

    if (!text || !text.trim()) {
      clearRateData();
      return;
    }

    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length === 0) {
      clearRateData();
      return;
    }

    // Detect delimiter: pipe vs tab
    const pipeCount = lines.filter(l => l.includes('|')).length;
    const tabCount = lines.filter(l => l.includes('\t')).length;
    const delimiter = pipeCount >= tabCount ? '|' : '\t';

    // PR reference pattern — e.g. PR-04776 or PR04776
    const prPattern = /\bPR[-\s]?\d{3,7}\b/i;

    // Normalize a PR ref string to "PR-XXXXX" uppercase
    const normalizePr = (s) => {
      const cleaned = s.toUpperCase().replace(/\s+/g, '');
      return cleaned.startsWith('PR-') ? cleaned : cleaned.replace(/^PR/, 'PR-');
    };

    // Lines to skip
    const skipPattern = /^(seq#|item\s*code|charges|discount|sub\s*total|grand\s*total|vat|net\s*total)/i;

    // Accumulate totals per normalized PR key: { 'PR-04776': number }
    const prTotals = {};
    const extractedMaterials = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cells = trimmed.split(delimiter).map(c => c.trim());
      if (cells.length < 2) continue;
      if (skipPattern.test(cells[0])) continue;

      // Find PR ref anywhere in the line
      let prRef = null;
      for (const cell of cells) {
        const m = cell.match(prPattern);
        if (m) { prRef = normalizePr(m[0]); break; }
      }
      if (!prRef) continue;

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
      // Seq# (0) | Item Code (1) | Description (2) ...
      // Qty is usually around index 9, Remain Qty 10, Rate 11, Total 12
      // We will look for them safely:
      const rateIndex = nums.length >= 2 ? nums[nums.length - 2].idx : -1;
      const qtyIndex = nums.length >= 4 ? nums[nums.length - 4].idx : -1;
      const remainQtyIndex = nums.length >= 3 ? nums[nums.length - 3].idx : -1;
      
      const description = cells.length > 2 ? cells[2] : cells[1];
      const rate = rateIndex !== -1 ? cells[rateIndex] : '0';
      const qty = qtyIndex !== -1 ? cells[qtyIndex] : '0';
      const remainQty = remainQtyIndex !== -1 ? cells[remainQtyIndex] : '0';
      
      const nextDocCell = cells.find(c => /\b(QC|AZ|ENG)[-\s]?\w+/i.test(c)) || '';

      extractedMaterials.push({
        prRef,
        description,
        rate,
        qty,
        remainQty,
        total: lineTotal.toString(),
        nextDoc: nextDocCell,
      });
    }

    if (Object.keys(prTotals).length === 0) {
      clearRateData();
      return;
    }

    // All matching inside updater to avoid stale-closure problem
    let matched = 0;
    setParsedRows((prevRows) => {
      const nextRows = prevRows.map(row => {
        const rowPr = normalizePr((row['Req Ref'] || '').trim());
        if (!rowPr || rowPr === 'PR-' || rowPr === 'PR-N/A') return row;
        const found = prTotals[rowPr];
        if (found !== undefined) {
          matched++;
          const netPrice = found;
          const vatNum = netPrice * 0.05;
          const totalPrice = netPrice + vatNum;
          return {
            ...row,
            'Net Price': netPrice.toFixed(2),
            'VAT': vatNum.toFixed(2),
            'Total Price': totalPrice.toFixed(2),
            _rateUpdated: true,
          };
        }
        return row;
      });

      // Map the extracted materials to the final materialRows format
      const newMaterialRows = extractedMaterials.map(mat => {
        const matchingRow = prevRows.find(r => normalizePr((r['Req Ref'] || '').trim()) === mat.prRef);
        const priceNum = parseFloat(mat.total);
        const vatNum = priceNum * 0.05;
        const totalNum = priceNum + vatNum;

        return {
          'Project': matchingRow ? matchingRow['Project'] : '',
          'PR': mat.prRef,
          'Description': mat.description,
          'Qty': mat.qty,
          'Req Qty': mat.qty, // user wanted same
          'Remain Qty': mat.remainQty,
          'Next Doc': mat.nextDoc,
          'Rate': mat.rate,
          'Price': priceNum.toFixed(2),
          'VAT': vatNum.toFixed(2),
          'Total': totalNum.toFixed(2),
          'Supplier': matchingRow ? matchingRow['Supplier'] : '',
        };
      });

      // Can't set state from updater — set after via timeout
      setTimeout(() => {
        setRateRowsUpdated(matched);
        setMaterialRows(newMaterialRows);
      }, 0);
      return nextRows;
    });
  };

  const handleClear = () => {
    setPasteText('');
    setRateDetailsText('');
    setParsedRows([]);
    setMaterialRows([]);
    setRateRowsUpdated(0);
  };

  /* ─── Inline editing ─── */
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

  /* ─── Import to webhook ─── */
  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setShowVerifyDialog(false);
    setIsImporting(true);
    try {
      const response = await fetch(IMPORT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_po_log',
          rows: parsedRows,
          materialRows: materialRows,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      setToast({ message: `${parsedRows.length} rows saved successfully`, type: 'success' });
      handleClear();
      fetchLogData(); // Refresh existing log
    } catch (err) {
      console.error('Import error:', err);
      setToast({ message: `Save failed: ${err.message}`, type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  /* ─── Fetch existing log ─── */
  const fetchLogData = useCallback(async () => {
    setLogLoading(true);
    try {
      const response = await fetch(FETCH_WEBHOOK);
      const json = await response.json();

      let data = [];
      if (Array.isArray(json)) {
        data = json[0]?.data && Array.isArray(json[0].data) ? json[0].data : json;
      } else if (json?.data && Array.isArray(json.data)) {
        data = json.data;
      }

      // Preserve original order returned by the API

      setLogData(data);
    } catch (err) {
      console.error('Failed to fetch PO log:', err);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogData();
  }, [fetchLogData]);

  const uniqueMonths = useMemo(() => {
    const months = new Set();
    logData.forEach(row => {
      if (row.Month) months.add(row.Month);
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
       merged.Ref = merged['Req Ref'] || merged.Req_Ref || 'Ungrouped'; // Card Title is the PR
       merged['Net Price'] = formatVal(merged._netSum);
       merged.VAT = formatVal(merged._vatSum);
       merged['Total Price'] = formatVal(merged._totalSum);
       merged._isMergedPR = true;
       return merged;
    });

    if (monthFilter !== 'All') {
      result = result.filter(row => row.Month === monthFilter);
    }

    if (logSearch.trim()) {
      const q = logSearch.trim().toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v || '').toLowerCase().includes(q))
      );
    }

    return result;
  }, [logData, logSearch, monthFilter]);

  // Dynamic visible log slicing for fast pagination rendering
  const visibleLog = useMemo(() => {
    return filteredLog.slice(0, displayCount);
  }, [filteredLog, displayCount]);

  const logColumns = useMemo(() => {
    return PO_COLUMNS;
  }, []);

  /* ─── Scroll ref kept for container, no pagination needed ─── */

  /* ─── Keyboard shortcut: Ctrl+F ─── */
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

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: theme.bg }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ═══════════ PASTE ZONE ═══════════ */}
        <div className="stagger-item" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-[#F59E0B]" />
            <h2 className="text-lg font-bold text-white tracking-tight">Import PO Data</h2>
            <span className="text-[10px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.15em] ml-2">
              TWO-STEP PASTE FROM EXCEL
            </span>
          </div>

          <div className="mb-2">
            <h3 className="text-[13px] font-black text-white uppercase tracking-wider">Step 1: Paste PO Log</h3>
            {parsedRows.length > 0 && !rateDetailsText && (
              <p className="text-[11px] font-bold text-[#10B981] mt-1 animate-pulse">
                Step 1 complete — now paste the rate details below
              </p>
            )}
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
                      · {PO_COLUMNS.length} columns mapped
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <IconClipboardData size={14} className="text-[rgba(255,255,255,0.15)]" />
                    <span className="text-[11px] text-[rgba(255,255,255,0.2)] font-medium">
                      Waiting for data…
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

        {/* ═══════════ STEP 2 & PREVIEW TABLE ═══════════ */}
        {parsedRows.length > 0 && (
          <div className="stagger-item" style={{ animationDelay: '100ms' }}>
            {/* Step 2: Rate Details Paste */}
            <div className="mb-8 mt-2 border-t border-[rgba(255,255,255,0.05)] pt-6">
              <h3 className="text-[13px] font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px]">2</span>
                Step 2: Paste Rate Details
              </h3>
              <p className="text-[10px] text-[rgba(255,255,255,0.4)] mb-4 pl-7">
                (From ERP detail view: Seq#, Item Code, Description, Rate, Total...)
              </p>
              
              <div
                className="relative rounded-2xl overflow-hidden ml-7"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                  border: `1px solid ${rateDetailsText ? theme.goldBorder : theme.border}`,
                  transition: 'border-color 0.3s',
                }}
              >
                {rateDetailsText && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      background: 'radial-gradient(ellipse at top center, rgba(245,158,11,0.1) 0%, transparent 60%)',
                    }}
                  />
                )}
                <div className="relative p-1">
                  <textarea
                    value={rateDetailsText}
                    onChange={handleRateDetailsChange}
                    onPaste={handleRateDetailsPaste}
                    placeholder="Paste Rate Details here..."
                    className="w-full bg-transparent text-[13px] text-[rgba(255,255,255,0.7)] placeholder:text-[rgba(255,255,255,0.15)] resize-none outline-none p-5 font-mono"
                    style={{
                      minHeight: '100px',
                      maxHeight: '160px',
                      lineHeight: '1.7',
                    }}
                    spellCheck={false}
                  />
                </div>
                {/* Rate details success bar */}
                {rateDetailsText && (
                  <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(16,185,129,0.05)]">
                    <div className="flex items-center gap-2">
                      <IconCheck size={14} className="text-[#10B981]" />
                      <span className="text-[11px] font-bold text-[#10B981]">
                        {rateRowsUpdated} row{rateRowsUpdated !== 1 ? 's' : ''} matched and updated!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <IconTableImport size={18} className="text-[#F59E0B]" />
              <h3 className="text-[13px] font-black text-white uppercase tracking-wider">Preview</h3>
              <span className="text-[10px] text-[rgba(255,255,255,0.25)] font-bold ml-1">
                — Edit cells below before importing
              </span>
            </div>
            <div
              className="rounded-xl overflow-hidden"
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
                              className="w-full text-[12px] font-medium outline-none px-3 py-2 focus:bg-[rgba(245,158,11,0.06)] focus:text-[#F59E0B] transition-colors"
                              style={{
                                background: (row._rateUpdated && ['Rate', 'Net Price', 'VAT', 'Total Price'].includes(col)) 
                                  ? 'rgba(245, 158, 11, 0.15)' 
                                  : 'transparent',
                                color: (row._rateUpdated && ['Rate', 'Net Price', 'VAT', 'Total Price'].includes(col)) 
                                  ? '#FCD34D' 
                                  : theme.cellText,
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

            {/* Material Preview Table */}
            {materialRows.length > 0 && (
              <div className="mt-8 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-5 h-5 rounded bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
                    <IconCheck size={14} className="text-[#10B981]" />
                  </span>
                  <h3 className="text-[13px] font-black text-white uppercase tracking-wider">
                    Material Preview
                  </h3>
                  <span className="text-[10px] text-[#10B981] font-bold ml-1">
                    — {materialRows.length} material records detected
                  </span>
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

            {/* Action buttons under preview */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={triggerVerifyDialog}
                disabled={isImporting || !pasteText || !rateDetailsText}
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

        {/* ═══════════ EXISTING PO LOG ═══════════ */}
        <div className="stagger-item" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-[rgba(255,255,255,0.15)]" />
              <h2 className="text-lg font-bold text-white tracking-tight">Material List</h2>
              {logData.length > 0 && (
                <span className="text-[10px] font-black text-[rgba(255,255,255,0.2)] uppercase tracking-widest ml-1">
                  {filteredLog.length} ENTRIES
                </span>
              )}
            </div>

            {/* Search bar & Filters */}
            <div className="flex items-center gap-4">
              {/* Month Dropdown */}
              <div 
                className="relative flex items-center px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <select
                  value={monthFilter}
                  onChange={(e) => { setMonthFilter(e.target.value); setDisplayCount(PAGE_SIZE); }}
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

              {/* Search bar */}
              <div
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  width: '280px',
                }}
              >
                <IconSearch size={14} className="text-[rgba(255,255,255,0.2)] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={logSearch}
                  onChange={(e) => { setLogSearch(e.target.value); setDisplayCount(PAGE_SIZE); }}
                  placeholder="Search PR Number… (Ctrl+F)"
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
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <IconRowInsertBottom size={32} className="text-[rgba(255,255,255,0.1)]" />
              <span className="text-[12px] text-[rgba(255,255,255,0.2)] font-medium">
                No Material List entries yet. Import data above to get started.
              </span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card Grid Layout */}
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
                      {/* Top Header Row */}
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

                      {/* Second Line: Project & Supplier */}
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

                      {/* Bottom Row Chips: Key Metrics */}
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

                      {/* Inline Expansion Area */}
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

                          {/* Webhook insights inside the expanded card */}
                          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-wider">Material List PR Insights</p>
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

                      {/* Bottom Footer Muted text */}
                      {!isExpanded && (
                        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between border-t border-[rgba(255,255,255,0.04)] pt-3 text-[10px] text-[rgba(255,255,255,0.35)] font-bold truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <IconUser size={10} className="shrink-0 text-[rgba(255,255,255,0.2)]" />
                            <span className="truncate">{row['Entered By'] || 'N/A'}</span>
                          </div>
                          <span className="mx-1.5 opacity-20">•</span>
                          <div className="flex items-center gap-1.5 truncate">
                            <IconClock size={10} className="shrink-0 text-[rgba(255,255,255,0.2)]" />
                            <span className="truncate">{row['Entered Time'] || 'N/A'}</span>
                          </div>
                          <span className="mx-1.5 opacity-20">•</span>
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

              {/* Dynamic Load More Action Bar */}
              {displayCount < filteredLog.length && (
                <div className="flex flex-col items-center justify-center pt-8 pb-12">
                  <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-semibold mb-3 tracking-wider uppercase">
                    Showing {Math.min(displayCount, filteredLog.length)} of {filteredLog.length} PO Records
                  </p>
                  <button 
                    onClick={() => setDisplayCount(prev => prev + 60)}
                    className="px-8 py-3 bg-[rgba(245,158,11,0.08)] hover:bg-[#F59E0B] text-[#F59E0B] hover:text-black border border-[rgba(245,158,11,0.2)] hover:border-[#F59E0B] rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2"
                  >
                    Load More Records
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
                    <div className="flex items-center gap-6 w-full md:w-auto justify-center md:justify-start">
                      <div className="text-center md:text-left">
                        <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-widest">Initial Price (Baseline)</p>
                        <p className="text-sm font-semibold text-[rgba(255,255,255,0.45)] line-through mt-0.5">AED {originalPriceStr}</p>
                      </div>
                      <div className="text-sm text-[rgba(255,255,255,0.2)] font-black">➔</div>
                      <div className="text-center md:text-left">
                        <p className="text-[9px] font-bold text-[#F59E0B] uppercase tracking-widest">Current Price (Net)</p>
                        <p className="text-sm font-black text-white mt-0.5">AED {netPriceStr}</p>
                      </div>
                    </div>

                    <div className={`px-5 py-3 rounded-xl border flex flex-col items-center md:items-end w-full md:w-auto ${
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
                            {netVal > origVal ? '▲' : '▼'} {Math.abs(percentChange).toFixed(1)}%
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
                        {selectedCard['Doc. Remarks'] || 'No remarks recorded.'}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Terms & Conditions</p>
                      <p className="text-white font-semibold text-xs mt-1 truncate" title={selectedCard['Terms & Conditions']}>
                        {selectedCard['Terms & Conditions'] || 'No terms specified.'}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[rgba(255,255,255,0.3)] uppercase text-[9px]">Attachments</p>
                      <p className="text-white font-semibold text-xs mt-1">
                        {selectedCard.Attachments || 'No attachments.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook Deep Insights Block */}
              <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6">
                <h4 className="text-xs font-black text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconFileText size={14} className="text-[#F59E0B]" /> Material List PR Insights
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-down {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-zoom-in {
          animation: zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}} />
    </div>
  );
};

export default POLog;

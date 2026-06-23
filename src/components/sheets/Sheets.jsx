import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  IconX, IconClock, IconLayoutColumns, IconTableExport, IconHash, IconDownload, IconSearch
} from '@tabler/icons-react';
import BoxLoader from '../ui/BoxLoader';
import MorphLoader from '../ui/MorphLoader';
import SheetRow from './SheetRow';
import { downloadXLSX } from '../../utils/exportXLSX';
import { useSheetData } from '../../hooks/useSheetData';

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 44;
const ROW_NUM_WIDTH = 56;
const DEFAULT_COL_WIDTH = 180;
const UPDATE_WEBHOOK = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_SHEETS_UPDATE}`;

const TABLE_SCHEMAS = {
  'PO Data': ['sr_no', 'Ref', 'po_date', 'Approve / Reject', 'Status', 'Project', 'Company', 'Pending Approval', 'Supplier', 'PO Class', 'Entered By', 'Entered Time', 'Req Ref', 'qc_ref', 'Doc. Remarks', 'Terms & Conditions', 'Attachments', 'Approval History', 'Approval Config', 'Discount', 'Net Price', 'VAT', 'Total Price', 'Status_1', 'Original Pirce', 'Charges', 'Month', 'change_in_price_1', 'change_in_price_1_date', 'change_in_price_2', 'change_in_price_2_date', 'change_in_price_3', 'change_in_price_3_date', 'change_in_price_4', 'change_in_price_4_date', 'change_in_price_5', 'change_in_price_5_date', 'created_at'],
  'material_detail_25': ['Project', 'PR', 'Description', 'Qty', 'Req Qty', 'Reamin Qty', 'Next Doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'change2_description', 'change2_qty', 'change2_rate', 'change2_price', 'change2_vat', 'change2_total', 'change2_supplier', 'change3_description', 'change3_qty', 'change3_rate', 'change3_price', 'change3_vat', 'change3_total', 'change3_supplier', 'change4_description', 'change4_qty', 'change4_rate', 'change4_price', 'change4_vat', 'change4_total', 'change4_supplier', 'change5_description', 'change5_qty', 'change5_rate', 'change5_price', 'change5_vat', 'change5_total', 'change5_supplier'],
  'material_detail_26': ['project', 'pr', 'description', 'qty', 'req_qty', 'remain_qty', 'next_doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'change2_description', 'change2_qty', 'change2_rate', 'change2_price', 'change2_vat', 'change2_total', 'change2_supplier', 'change3_description', 'change3_qty', 'change3_rate', 'change3_price', 'change3_vat', 'change3_total', 'change3_supplier', 'change4_description', 'change4_qty', 'change4_rate', 'change4_price', 'change4_vat', 'change4_total', 'change4_supplier', 'change5_description', 'change5_qty', 'change5_rate', 'change5_price', 'change5_vat', 'change5_total', 'change5_supplier'],
  'pr_data_25': ['Sr.No', 'Project', 'PR', 'Previous Charges', 'Current Charges', 'Remark'],
  'pr_data_26': ['sr_no', 'project', 'pr', 'previous_charges', 'current_charges', 'remark', 'status', 'initial_pr', 'initial_pr_percentage_amount', 'second_time_pr', 'second_time_pr_percentage_amount'],
  'purchase_orders': ['PR', 'Sr_No', 'Project', 'Description', 'UOM', 'Req_Qty', 'Remain_Qty', 'Next_Doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'change2_description', 'change2_qty', 'change2_rate', 'change2_price', 'change2_vat', 'change2_total', 'change2_supplier', 'change3_description', 'change3_qty', 'change3_rate', 'change3_price', 'change3_vat', 'change3_total', 'change3_supplier', 'change4_description', 'change4_qty', 'change4_rate', 'change4_price', 'change4_vat', 'change4_total', 'change4_supplier', 'change5_description', 'change5_qty', 'change5_rate', 'change5_price', 'change5_vat', 'change5_total', 'change5_supplier', 'change1_date', 'change2_date', 'change3_date', 'change4_date', 'change5_date'],
  'merged': ['sr_no', 'project', 'pr', 'description', 'unit', 'req_qty', 'remain_qty', 'next_doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'material', 'material_1', 'material_2']
};

const TABS = ['PO Data', 'material_detail_25', 'material_detail_26', 'pr_data_25', 'pr_data_26', 'purchase_orders', 'merged'];

const Sheets = ({ initialTab, onTabChange }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'pr_data_26');
  const [colWidths, setColWidths] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [popover, setPopover] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [localOverrides, setLocalOverrides] = useState({});
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  const scrollRef = useRef(null);
  const editInputRef = useRef(null);
  const hasNextPageRef = useRef(null);
  const isFetchingNextPageRef = useRef(null);
  const fetchNextPageRef = useRef(null);

  const { data: rawData = [], isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useSheetData(activeTab, { sortOrder });

  hasNextPageRef.current = hasNextPage;
  isFetchingNextPageRef.current = isFetchingNextPage;
  fetchNextPageRef.current = fetchNextPage;

  const loadingAllData = !!(searchTerm && hasNextPage);

  useEffect(() => {
    if (searchTerm && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [searchTerm, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasNextPageRef.current || isFetchingNextPageRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 1500) {
      fetchNextPageRef.current?.();
    }
  }, []);

  const activeCols = useMemo(() => {
    const schema = TABLE_SCHEMAS[activeTab];
    if (schema) return schema;
    if (rawData.length > 0) {
      const keys = new Set();
      const sample = Math.min(rawData.length, 20);
      for (let i = 0; i < sample; i++) {
        Object.keys(rawData[i]).forEach(k => {
          if (typeof rawData[i][k] !== 'object' && !k.startsWith('_')) keys.add(k);
        });
      }
      return Array.from(keys);
    }
    return [];
  }, [activeTab, rawData]);

  const supplierCol = useMemo(() => {
    if (rawData.length) {
      const k = Object.keys(rawData[0]).find(c => c.toLowerCase().includes('supplier'));
      if (k) return k;
    }
    return activeCols.find(c => c.toLowerCase().includes('supplier'));
  }, [rawData, activeCols]);

  const projectCol = useMemo(() => {
    if (rawData.length) {
      const k = Object.keys(rawData[0]).find(c => c.toLowerCase().includes('project'));
      if (k) return k;
    }
    return activeCols.find(c => c.toLowerCase().includes('project'));
  }, [rawData, activeCols]);

  const sortedData = useMemo(() => {
    if (!rawData.length) return [];
    const data = [...rawData];
    return data.sort((a, b) => {
      const getVal = (obj) => {
        const dateStr = obj['Request Date'] || obj.Date || obj.created_at || obj['PO Date'];
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) return d.getTime();
        }
        const val = obj.id || obj.SR_No || obj.Sr_No || obj['Sr.No'] || obj.PR_No || obj.PR || 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[^0-9.]/g, ''));
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };
      const valA = getVal(a);
      const valB = getVal(b);
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [rawData, sortOrder]);

  const displayData = useMemo(() => {
    if (loadingAllData || !sortedData.length) return sortedData;
    if (!searchTerm && !Object.keys(columnFilters).length) return sortedData;
    const lower = searchTerm.toLowerCase();
    return sortedData.filter(row => {
      const matchesSearch = !searchTerm ||
        Object.keys(row).some(col => {
          const v = row[col];
          return v != null && String(v).toLowerCase().includes(lower);
        });
      if (!matchesSearch) return false;
      for (const [col, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal) continue;
        const v = row[col];
        if (v == null || !String(v).toLowerCase().includes(filterVal.toLowerCase())) return false;
      }
      return true;
    });
  }, [sortedData, searchTerm, columnFilters, loadingAllData]);

  const rowVirtualizer = useVirtualizer({
    count: displayData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0
    ? totalHeight - (virtualRows[virtualRows.length - 1]?.end || 0)
    : 0;

  const startResize = useCallback((colName, e) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colName] || DEFAULT_COL_WIDTH;

    const onMove = (moveE) => {
      const newWidth = Math.max(120, startWidth + (moveE.pageX - startX));
      setColWidths(prev => ({ ...prev, [colName]: newWidth }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
  }, [colWidths]);

  const handleCellClick = useCallback((val, colName, rIdx, e) => {
    if (editingCell) return;
    setSelectedCell({ rIdx, colName });
    const str = String(val ?? '');
    if (str.length < 25) {
      setPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      val: str,
      colName,
      x: Math.min(rect.left, window.innerWidth - 370),
      y: Math.min(rect.bottom + 4, window.innerHeight - 220),
    });
  }, [editingCell]);

  const handleCellDoubleClick = useCallback((val, colName, rIdx, e) => {
    if (editingCell) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setEditingCell({ rIdx, colName, x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    setEditValue(String(val ?? ''));
    setPopover(null);
  }, [editingCell]);

  const handleEditSave = useCallback(() => {
    if (!editingCell) return;
    const { rIdx, colName } = editingCell;
    const row = displayData[rIdx];
    if (!row) {
      setEditingCell(null);
      setEditValue('');
      return;
    }

    const overrideKey = `${rIdx}:${colName}`;
    const currentVal = localOverrides[overrideKey] ?? String(row[colName] ?? '');
    if (editValue === currentVal) {
      setEditingCell(null);
      setEditValue('');
      return;
    }

    setLocalOverrides(prev => ({ ...prev, [overrideKey]: editValue }));

    const supabaseId = row.id ?? row.ID ?? null;

    fetch(UPDATE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: activeTab,
        row_id: supabaseId,
        data: { [colName]: editValue },
      }),
    }).catch(err => console.error('Failed to save cell update:', err));

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, displayData, localOverrides, activeTab]);

  const handleEditCancel = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  useEffect(() => {
    const handler = (e) => {
      if (popover && !e.target.closest('.cell-popover')) {
        setPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popover]);

  const getEffectiveValue = useCallback((row, rIdx, col) => {
    const overrideKey = `${rIdx}:${col}`;
    return overrideKey in localOverrides ? localOverrides[overrideKey] : row[col];
  }, [localOverrides]);

  const handleStatusChange = useCallback((rIdx, newValue) => {
    const overrideKey = `${rIdx}:Status`;
    const row = displayData[rIdx];
    if (!row) return;
    const currentVal = localOverrides[overrideKey] ?? row.Status;
    if (newValue === currentVal) return;
    setLocalOverrides(prev => ({ ...prev, [overrideKey]: newValue }));
    const supabaseId = row.id ?? row.ID ?? null;
    fetch(UPDATE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: activeTab,
        row_id: supabaseId,
        data: { Status: newValue },
      }),
    }).catch(err => console.error('Failed to save status update:', err));
  }, [displayData, localOverrides, activeTab]);

  const handleTabSwitch = useCallback((tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
    setSearchTerm('');
    setColumnFilters({});
    setShowAdvanced(false);
    setSelectedCell(null);
    setPopover(null);
    setEditingCell(null);
    setEditValue('');
    setLocalOverrides({});
  }, [onTabChange]);

  const renderSkeleton = () => (
    <div className="h-full w-full" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: HEADER_HEIGHT, background: '#0F1520', borderBottom: '2px solid rgba(200,146,42,0.3)' }}>
        <div style={{ width: 56, flexShrink: 0 }} />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ width: DEFAULT_COL_WIDTH, flexShrink: 0, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ height: 10, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>
      {Array.from({ length: 12 }).map((_, r) => (
        <div key={r} style={{ display: 'flex', height: ROW_HEIGHT, background: r % 2 === 0 ? '#0d1117' : '#111827', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ width: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ height: 8, width: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
          </div>
          {Array.from({ length: 8 }).map((_, c) => (
            <div key={c} style={{ width: DEFAULT_COL_WIDTH, flexShrink: 0, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
              <div style={{ height: 10, width: `${40 + Math.random() * 40}%`, background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#06090F' }}>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b shrink-0 gap-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(13,17,23,0.85)' }}>
        
        {/* Left Section: Info & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(200,146,42,0.12)' }}>
              <IconTableExport size={18} style={{ color: '#c8922a' }} />
            </div>
            <div>
              <h2 className="text-white font-black text-sm sm:text-base tracking-tight leading-none">Table Inspector</h2>
              <div className="flex items-center gap-2 mt-1" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                <span className="flex items-center gap-1 font-bold">
                  <IconLayoutColumns size={10} /> {activeCols.length} columns
                </span>
                {displayData.length < rawData.length && (
                  <>
                    <span className="opacity-30">·</span>
                    <span className="flex items-center gap-1 font-bold text-semantic-increase">
                      <IconSearch size={10} /> {displayData.length.toLocaleString()} matches
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-white/10 shrink-0" />

          {/* Optimized Tab Bar: Fixed/Wrapping logic */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl"
            style={{ 
              background: 'rgba(0,0,0,0.4)', 
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className="px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  fontSize: '9px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.4)',
                  background: activeTab === tab ? '#c8922a' : 'transparent',
                  boxShadow: activeTab === tab ? '0 4px 12px rgba(200,146,42,0.25)' : 'none',
                }}
              >
                {tab.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Controls */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 sm:flex-initial"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              minWidth: '200px'
            }}>
            <IconSearch size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search database..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                width: '100%',
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-0.5 text-white/30 hover:text-white transition-colors">
                <IconX size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: showAdvanced ? 'rgba(200,146,42,0.1)' : 'rgba(255,255,255,0.03)',
              color: showAdvanced ? '#c8922a' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${showAdvanced ? 'rgba(200,146,42,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            FILTERS
          </button>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => {
                if (loadingAllData) return;
                if (searchTerm && displayData.length < rawData.length) {
                  setShowDownloadDialog(true);
                } else {
                  downloadXLSX(rawData, `${activeTab.replace(/_/g, '_')}.xlsx`);
                }
              }}
              className="p-1.5 rounded-lg text-semantic-increase hover:bg-semantic-increase/10 transition-colors"
              title={loadingAllData ? 'Loading...' : 'Download Excel'}
            >
              <IconDownload size={18} />
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className={`p-1.5 rounded-lg transition-colors ${sortOrder === 'desc' ? 'text-[#F59E0B] bg-[#F59E0B]/10' : 'text-white/40 hover:text-white'}`}
              title={sortOrder === 'asc' ? 'Oldest First' : 'Latest First'}
            >
              <IconClock size={18} />
            </button>
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/5 bg-black/20">
          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] w-full sm:w-auto">
            Advanced Filters:
          </span>

          <div className="flex gap-3 flex-1 overflow-x-auto scrollbar-none">
            {supplierCol && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 min-w-[160px]">
                <span className="text-[9px] font-bold text-white/40 uppercase whitespace-nowrap">Supplier:</span>
                <input
                  type="text"
                  value={columnFilters[supplierCol] || ''}
                  onChange={(e) => setColumnFilters(prev => ({ ...prev, [supplierCol]: e.target.value }))}
                  placeholder="Filter..."
                  className="bg-transparent border-none outline-none text-white text-[11px] font-medium w-full"
                />
              </div>
            )}

            {projectCol && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 min-w-[160px]">
                <span className="text-[9px] font-bold text-white/40 uppercase whitespace-nowrap">Project:</span>
                <input
                  type="text"
                  value={columnFilters[projectCol] || ''}
                  onChange={(e) => setColumnFilters(prev => ({ ...prev, [projectCol]: e.target.value }))}
                  placeholder="Filter..."
                  className="bg-transparent border-none outline-none text-white text-[11px] font-medium w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <BoxLoader />
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Loading {activeTab.replace(/_/g, ' ')}…
            </div>
          </div>
        ) : displayData.length === 0 && !isFetching ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700 }}>
              {searchTerm ? 'No records match your search.' : 'No records found for this table.'}
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Horizontal Scroll Shadow Indicator */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 50,
              background: 'linear-gradient(to left, rgba(6,9,15,1), transparent)',
              zIndex: 100,
              pointerEvents: 'none',
              opacity: 0.8
            }} />
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full w-full overflow-auto"
              style={{
                scrollBehavior: 'auto',
                opacity: loadingAllData ? 0.2 : 1,
                transition: 'opacity 0.5s ease',
              }}
            >
              {isFetching ? renderSkeleton() : (
                <div style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px` }}>
                  <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 60,
                    display: 'flex',
                    height: HEADER_HEIGHT,
                    width: 'max-content',
                  }}>
                    <div style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 70,
                      width: ROW_NUM_WIDTH,
                      minWidth: ROW_NUM_WIDTH,
                      height: HEADER_HEIGHT,
                      background: '#0F1520',
                      borderRight: '1px solid rgba(255,255,255,0.1)',
                      borderBottom: '2px solid rgba(200,146,42,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconHash size={13} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
                    </div>

                    {activeCols.map((col, idx) => (
                      <div
                        key={col}
                        style={{
                          position: idx === 0 ? 'sticky' : 'relative',
                          left: idx === 0 ? ROW_NUM_WIDTH : undefined,
                          zIndex: idx === 0 ? 70 : 50,
                          width: colWidths[col] || DEFAULT_COL_WIDTH,
                          minWidth: 120,
                          height: HEADER_HEIGHT,
                          background: '#0F1520',
                          borderRight: '1px solid rgba(255,255,255,0.1)',
                          borderBottom: '2px solid rgba(200,146,42,0.3)',
                          padding: '0 16px',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                          boxSizing: 'border-box',
                        }}
                      >
                        <span style={{
                          color: '#c8922a',
                          fontSize: '10px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {col.replace(/_/g, ' ')}
                        </span>
                        <div
                          onMouseDown={(e) => startResize(col, e)}
                          style={{
                            position: 'absolute', right: 0, top: 0,
                            width: 5, height: '100%',
                            cursor: 'col-resize',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#c8922a'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        />
                      </div>
                    ))}
                  </div>

                  {virtualRows.map((virtualRow) => {
                    const row = displayData[virtualRow.index];
                    const rowWithOverrides = {};
                    for (const col of activeCols) {
                      rowWithOverrides[col] = getEffectiveValue(row, virtualRow.index, col);
                    }
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                      >
                        <SheetRow
                          row={rowWithOverrides}
                          rowIndex={virtualRow.index}
                          columns={activeCols}
                          colWidths={colWidths}
                          selectedCell={selectedCell}
                          onCellClick={handleCellClick}
                          onCellDoubleClick={handleCellDoubleClick}
                          activeTab={activeTab}
                          onStatusChange={handleStatusChange}
                        />
                      </div>
                    );
                  })}

                </div>
              )}
            </div>

            <MorphLoader visible={loadingAllData} searchTerm={searchTerm} />

            {editingCell && (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEditSave();
                  }
                  if (e.key === 'Escape') handleEditCancel();
                }}
                style={{
                  position: 'fixed',
                  left: editingCell.x,
                  top: editingCell.y,
                  width: editingCell.width,
                  height: editingCell.height,
                  zIndex: 150,
                  background: '#0d1117',
                  border: '2px solid #c8922a',
                  borderRadius: 2,
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '0 16px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            )}

            {popover && (
              <div
                className="cell-popover"
                style={{
                  position: 'fixed',
                  left: popover.x,
                  top: popover.y,
                  zIndex: 200,
                  background: '#1a1f2e',
                  border: '1px solid rgba(200,146,42,0.4)',
                  borderRadius: 12,
                  padding: 16,
                  maxWidth: 360,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#c8922a', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    {popover.colName?.replace(/_/g, ' ')}
                  </span>
                  <button onClick={() => setPopover(null)} style={{ padding: 4, color: 'rgba(255,255,255,0.4)' }}>
                    <IconX size={12} />
                  </button>
                </div>
                <div style={{
                  color: 'white',
                  fontSize: 12,
                  lineHeight: 1.6,
                  fontWeight: 500,
                  maxHeight: 160,
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                }}>
                  {popover.val}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sheet-row:hover {
          background: #1a2035 !important;
          border-left: 3px solid #c8922a !important;
        }
        .sheet-row:hover > div {
          background: inherit !important;
        }
        div::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        div::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(200,146,42,0.3);
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes morph-0 {
          0%, 100% { transform: translate(0,0) scale(1); }
          25% { transform: translate(16px,-16px) scale(1.3); }
          50% { transform: translate(32px,0) scale(0.7); }
          75% { transform: translate(16px,16px) scale(1.15); }
        }
        @keyframes morph-1 {
          0%, 100% { transform: translate(0,0) scale(1) rotate(0deg); }
          25% { transform: translate(-16px,-16px) scale(1.4) rotate(90deg); }
          50% { transform: translate(-32px,0) scale(0.6) rotate(180deg); }
          75% { transform: translate(-16px,16px) scale(1.25) rotate(270deg); }
        }
        @keyframes morph-2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          25% { transform: translate(-16px,16px) scale(0.85); }
          50% { transform: translate(0,32px) scale(1.5); }
          75% { transform: translate(16px,16px) scale(0.75); }
        }
        @keyframes morph-3 {
          0%, 100% { transform: translate(0,0) scale(1) rotate(0deg); }
          25% { transform: translate(16px,16px) scale(1.15) rotate(-90deg); }
          50% { transform: translate(0,-32px) scale(1.4) rotate(-180deg); }
          75% { transform: translate(-16px,-16px) scale(0.85) rotate(-270deg); }
        }
      `}} />

      {showDownloadDialog && (
        <div
          onClick={() => setShowDownloadDialog(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: 28, maxWidth: 380, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)', position: 'relative',
            }}
          >
            <button
              onClick={() => setShowDownloadDialog(false)}
              style={{ position: 'absolute', top: 12, right: 12, padding: 4, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              <IconX size={14} />
            </button>

            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, paddingRight: 24 }}>
              You have active filters applied.
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.5, marginBottom: 20, fontWeight: 500 }}>
              Export the {displayData.length} visible rows or the entire table?
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  downloadXLSX(displayData, `${activeTab.replace(/_/g, '_')}_filtered.xlsx`);
                  setShowDownloadDialog(false);
                }}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: 10, border: 'none',
                  background: '#00c864', color: '#000', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2 }}>VISIBLE ROWS</span>
                <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>{displayData.length} Rows</span>
              </button>
              <button
                onClick={() => {
                  downloadXLSX(rawData, `${activeTab.replace(/_/g, '_')}.xlsx`);
                  setShowDownloadDialog(false);
                }}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2 }}>ENTIRE TABLE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sheets;

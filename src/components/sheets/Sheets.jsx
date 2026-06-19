import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  IconX, IconClock, IconLayoutColumns, IconList, IconTableExport, IconHash, IconDownload, IconSearch
} from '@tabler/icons-react';
import BoxLoader from '../ui/BoxLoader';
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

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const Sheets = () => {
  const [activeTab, setActiveTab] = useState('pr_data_26');
  const [colWidths, setColWidths] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [popover, setPopover] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [localOverrides, setLocalOverrides] = useState({});

  const scrollRef = useRef(null);
  const editInputRef = useRef(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: rawData = [], isLoading, isFetching } = useSheetData(activeTab);

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
    if (!debouncedSearch || !sortedData.length) return sortedData;
    const lower = debouncedSearch.toLowerCase();
    return sortedData.filter(row =>
      activeCols.some(col => {
        const v = row[col];
        return v != null && String(v).toLowerCase().includes(lower);
      })
    );
  }, [sortedData, debouncedSearch, activeCols]);

  const rowVirtualizer = useVirtualizer({
    count: displayData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
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
    setSearchTerm('');
    setSelectedCell(null);
    setPopover(null);
    setEditingCell(null);
    setEditValue('');
    setLocalOverrides({});
  }, []);

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

      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(13,17,23,0.85)' }}>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(200,146,42,0.12)' }}>
              <IconTableExport size={16} style={{ color: '#c8922a' }} />
            </div>
            <div>
              <h2 className="text-white font-black text-sm tracking-tight">Table Inspector</h2>
              <div className="flex items-center gap-2 mt-0.5" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                <span className="flex items-center gap-1 font-bold">
                  <IconList size={10} /> {rawData.length.toLocaleString()} rows
                </span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span className="flex items-center gap-1 font-bold">
                  <IconLayoutColumns size={10} /> {activeCols.length} columns
                </span>
                {displayData.length < rawData.length && (
                  <>
                    <span style={{ opacity: 0.3 }}>·</span>
                    <span className="flex items-center gap-1 font-bold" style={{ color: '#c8922a' }}>
                      <IconSearch size={10} /> {displayData.length} filtered
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className="px-3 py-1.5 rounded-lg transition-all"
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.3)',
                  background: activeTab === tab ? '#c8922a' : 'transparent',
                  boxShadow: activeTab === tab ? '0 0 15px rgba(200,146,42,0.3)' : 'none',
                }}
              >
                {tab.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            <IconSearch size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across all columns..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '11px',
                fontWeight: 600,
                width: 160,
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ padding: 2, color: 'rgba(255,255,255,0.3)' }}>
                <IconX size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => downloadXLSX(rawData, `${activeTab.replace(/_/g, '_')}.xlsx`)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
            style={{
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'rgba(0,200,100,0.1)',
              color: '#00c864',
              border: '1px solid rgba(0,200,100,0.25)',
            }}
            title={`Download ${activeTab.replace(/_/g, ' ')} as Excel`}
          >
            <IconDownload size={13} />
            DOWNLOAD EXCEL
          </button>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
            style={{
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: sortOrder === 'desc' ? '#c8922a' : 'rgba(200,146,42,0.1)',
              color: sortOrder === 'desc' ? '#000' : '#c8922a',
              border: `1px solid ${sortOrder === 'desc' ? '#c8922a' : 'rgba(200,146,42,0.25)'}`,
            }}
          >
            <IconClock size={13} />
            {sortOrder === 'asc' ? 'OLDEST FIRST' : 'LATEST FIRST'}
          </button>
        </div>
      </div>

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
              {debouncedSearch ? 'No records match your search.' : 'No records found for this table.'}
            </p>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="h-full w-full overflow-auto"
              style={{ scrollBehavior: 'auto' }}
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
                  width: editingCell.width - 32,
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
          </>
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
      `}} />
    </div>
  );
};

export default Sheets;

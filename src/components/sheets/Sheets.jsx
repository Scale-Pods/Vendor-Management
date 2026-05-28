import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IconX, IconClock, IconLayoutColumns, IconList, IconTableExport, IconHash, IconDownload
} from '@tabler/icons-react';
import BoxLoader from '../ui/BoxLoader';
import { downloadXLSX } from '../../utils/exportXLSX';

/* ─── Table-specific column schemas ─── */
const TABLE_SCHEMAS = {
  'PO Data': ['sr_no', 'Ref', 'po_date', 'Approve / Reject', 'Status', 'Project', 'Company', 'Pending Approval', 'Supplier', 'PO Class', 'Entered By', 'Entered Time', 'Req Ref', 'qc_ref', 'Doc. Remarks', 'Terms & Conditions', 'Attachments', 'Approval History', 'Approval Config', 'Discount', 'Net Price', 'VAT', 'Total Price', 'Status_1', 'Original Pirce', 'Charges', 'Month', 'change_in_price_1', 'change_in_price_1_date', 'change_in_price_2', 'change_in_price_2_date', 'change_in_price_3', 'change_in_price_3_date', 'change_in_price_4', 'change_in_price_4_date', 'change_in_price_5', 'change_in_price_5_date', 'created_at'],
  'material_detail_25': ['Project', 'PR', 'Description', 'Qty', 'Req Qty', 'Reamin Qty', 'Next Doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'change2_description', 'change2_qty', 'change2_rate', 'change2_price', 'change2_vat', 'change2_total', 'change2_supplier', 'change3_description', 'change3_qty', 'change3_rate', 'change3_price', 'change3_vat', 'change3_total', 'change3_supplier', 'change4_description', 'change4_qty', 'change4_rate', 'change4_price', 'change4_vat', 'change4_total', 'change4_supplier', 'change5_description', 'change5_qty', 'change5_rate', 'change5_price', 'change5_vat', 'change5_total', 'change5_supplier'],
  'material_detail_26': ['sr_no', 'Project', 'PR', 'Description', 'Qty', 'Req Qty', 'Reamin Qty', 'Next Doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'change2_description', 'change2_qty', 'change2_rate', 'change2_price', 'change2_vat', 'change2_total', 'change2_supplier', 'change1_date', 'change2_date'],
  'pr_data_25': ['Sr.No', 'Project', 'PR', 'Previous Charges', 'Current Charges', 'Remark'],
  'pr_data_26': ['sr_no', 'project', 'pr', 'previous_charges', 'current_charges', 'remark', 'status', 'initial_pr', 'initial_pr_percentage_amount', 'second_time_pr', 'second_time_pr_percentage_amount'],
  'purchase_orders': ['PR', 'Sr_No', 'Project', 'Description', 'UOM', 'Req_Qty', 'Remain_Qty', 'Next_Doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'change2_description', 'change2_qty', 'change2_rate', 'change2_price', 'change2_vat', 'change2_total', 'change2_supplier', 'change3_description', 'change3_qty', 'change3_rate', 'change3_price', 'change3_vat', 'change3_total', 'change3_supplier', 'change4_description', 'change4_qty', 'change4_rate', 'change4_price', 'change4_vat', 'change4_total', 'change4_supplier', 'change5_description', 'change5_qty', 'change5_rate', 'change5_price', 'change5_vat', 'change5_total', 'change5_supplier', 'change1_date', 'change2_date', 'change3_date', 'change4_date', 'change5_date'],
  'merged': ['sr_no', 'project', 'pr', 'description', 'unit', 'req_qty', 'remain_qty', 'next_doc', 'change1_description', 'change1_qty', 'change1_rate', 'change1_price', 'change1_vat', 'change1_total', 'change1_supplier', 'material', 'material_1', 'material_2']
};

const TABS = ['PO Data', 'material_detail_25', 'material_detail_26', 'pr_data_25', 'pr_data_26', 'purchase_orders', 'merged'];

/* ─── Main Sheets Component ─── */
const Sheets = () => {
  const [activeTab, setActiveTab] = useState('pr_data_26');
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colWidths, setColWidths] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [popover, setPopover] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  /* ─── Data Fetching ─── */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setRawData([]);
      try {
        const url = `/api/n8n/webhook/e7af6af6-25f1-4c46-96f7-61a57f9e0978?action=${encodeURIComponent(activeTab)}`;
        const response = await fetch(url);
        const json = await response.json();

        let data = [];
        if (Array.isArray(json)) {
          data = json[0]?.data && Array.isArray(json[0].data) ? json[0].data : json;
        } else if (json?.data && Array.isArray(json.data)) {
          data = json.data;
        }

        setRawData(data || []);
      } catch (err) {
        console.error('Error fetching sheet data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  /* ─── Columns: Use schema, fallback to auto-detect ─── */
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

  /* ─── Sorted Data ─── */
  const sortedData = useMemo(() => {
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

  /* ─── Column Resize ─── */
  const startResize = useCallback((colName, e) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colName] || 180;

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

  /* ─── Cell click → popover ─── */
  const handleCellClick = (val, colName, rIdx, e) => {
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
    setSelectedCell({ rIdx, colName });
  };

  /* ─── Render cell text ─── */
  const cellText = (val) => {
    if (val === null || val === undefined) return '—';
    const s = String(val);
    return s;
  };

  /* ─── Backdrop click closes popover ─── */
  useEffect(() => {
    const handler = (e) => {
      if (popover && !e.target.closest('.cell-popover')) {
        setPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popover]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#06090F' }}>

      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(13,17,23,0.85)' }}>

        <div className="flex items-center gap-5">
          {/* Meta Info */}
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
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
          {/* Download XLSX */}
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

          {/* Sort Toggle */}
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

      {/* ─── Table Area ─── */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          /* ─── BoxLoader while data loads ─── */
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <BoxLoader />
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Loading {activeTab.replace(/_/g, ' ')}…
            </div>
          </div>
        ) : rawData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700 }}>No records found for this table.</p>
          </div>
        ) : (
          /* ─── Actual Table ─── */
          <div className="h-full w-full overflow-auto" style={{ scrollBehavior: 'smooth' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>

              {/* ─── Header ─── */}
              <thead>
                <tr style={{ height: 44, position: 'sticky', top: 0, zIndex: 60 }}>
                  {/* Row Number Header */}
                  <th style={{
                    position: 'sticky', left: 0, zIndex: 70,
                    width: 56, minWidth: 56,
                    background: '#0F1520',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    borderBottom: '2px solid rgba(200,146,42,0.3)',
                    textAlign: 'center',
                  }}>
                    <IconHash size={13} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
                  </th>

                  {activeCols.map((col, idx) => (
                    <th
                      key={col}
                      style={{
                        position: idx === 0 ? 'sticky' : 'relative',
                        left: idx === 0 ? 56 : undefined,
                        zIndex: idx === 0 ? 70 : 50,
                        width: colWidths[col] || 180,
                        minWidth: 120,
                        height: 44,
                        background: '#0F1520',
                        borderRight: '1px solid rgba(255,255,255,0.1)',
                        borderBottom: '2px solid rgba(200,146,42,0.3)',
                        padding: '0 16px',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{
                        color: '#c8922a',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                      }}>
                        {col.replace(/_/g, ' ')}
                      </span>
                      {/* Resize Handle */}
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
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ─── Body ─── */}
              <tbody>
                {sortedData.map((row, rIdx) => {
                  const isSelected = selectedCell?.rIdx === rIdx;
                  return (
                    <tr
                      key={rIdx}
                      className="sheet-row"
                      style={{
                        height: 44,
                        background: isSelected
                          ? 'rgba(200,146,42,0.06)'
                          : rIdx % 2 === 0 ? '#0d1117' : '#111827',
                        borderLeft: isSelected ? '3px solid #c8922a' : '3px solid transparent',
                      }}
                    >
                      {/* Row Number */}
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 40,
                        width: 56, minWidth: 56,
                        background: 'inherit',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        textAlign: 'center',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        color: 'rgba(255,255,255,0.2)',
                      }}>
                        {rIdx + 1}
                      </td>

                      {activeCols.map((col, cIdx) => {
                        const rawVal = row[col];
                        const displayVal = cellText(rawVal);
                        const isFrozen = cIdx === 0;
                        const isThisSelected = selectedCell?.rIdx === rIdx && selectedCell?.colName === col;

                        return (
                          <td
                            key={col}
                            title={displayVal}
                            onClick={(e) => handleCellClick(rawVal, col, rIdx, e)}
                            style={{
                              position: isFrozen ? 'sticky' : 'relative',
                              left: isFrozen ? 56 : undefined,
                              zIndex: isFrozen ? 30 : 'auto',
                              width: colWidths[col] || 180,
                              minWidth: 120,
                              height: 44,
                              padding: '0 16px',
                              background: isThisSelected ? 'rgba(200,146,42,0.08)' : 'inherit',
                              borderRight: '1px solid rgba(255,255,255,0.04)',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              borderColor: isThisSelected ? 'rgba(200,146,42,0.4)' : undefined,
                              fontSize: '12px',
                              fontWeight: isFrozen ? 700 : 500,
                              color: isFrozen ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: colWidths[col] || 180,
                            }}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Cell Content Popover ─── */}
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

      {/* ─── Hover styles ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .sheet-row:hover {
          background: #1a2035 !important;
          border-left: 3px solid #c8922a !important;
        }
        .sheet-row:hover td {
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
      `}} />
    </div>
  );
};

export default Sheets;

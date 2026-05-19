import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { IconPlus, IconLoader2, IconHistory, IconChevronRight, IconX, IconClock } from '@tabler/icons-react';
import { processPRItems } from '../../utils/prUtils';

const Sheets = () => {
  const [activeTab, setActiveTab] = useState('pr_data_26');
  const [tabs, setTabs] = useState(['PO Data', 'material_detail_25', 'material_detail_26', 'pr_data_25', 'pr_data_26', 'purchase_orders']);
  const [selectedCell, setSelectedCell] = useState({ row: 1, col: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [materialColumns, setMaterialColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [colWidths, setColWidths] = useState({});
  const [popover, setPopover] = useState(null);
  const [historyPanel, setHistoryPanel] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const [deletedRows, setDeletedRows] = useState(new Set());
  const [addedRows, setAddedRows] = useState([]);
  const [sortOrder, setSortOrder] = useState('asc');
  
  const editRef = useRef(null);
  const tableRef = useRef(null);
  const resizingRef = useRef(null);
  const resizingRowRef = useRef(null);

  const theme = {
    bg: '#06090F',
    strip: 'rgba(255,255,255,0.015)',
    tabBg: 'rgba(255,255,255,0.02)',
    tabActiveBg: 'rgba(245,158,11,0.06)',
    tabInactiveText: 'rgba(255,255,255,0.25)',
    tabActiveText: '#F59E0B',
    tabHoverText: 'rgba(255,255,255,0.6)',
    rowNumBg: '#0F1520',
    rowNumText: 'rgba(255,255,255,0.25)',
    headerBg: '#0F1520',
    headerText: 'rgba(255,255,255,0.4)',
    headerActiveBg: 'rgba(245,158,11,0.06)',
    headerActiveText: '#F59E0B',
    cellText: 'rgba(255,255,255,0.85)',
    cellBorder: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)',
    selectedBg: 'rgba(245,158,11,0.04)',
    row1Bg: 'rgba(245,158,11,0.04)',
    row1Text: '#F59E0B',
    plusColor: 'rgba(255,255,255,0.2)',
    plusHover: '#F59E0B',
    scrollbarThumb: 'rgba(255,255,255,0.08)',
    scrollbarHover: 'rgba(255,255,255,0.15)',
  };

  // Sort raw data
  const sortedRawData = useMemo(() => {
    const data = [...rawData];
    
    return data.sort((a, b) => {
      const getVal = (obj) => {
        // 1. Try date-based sorting first
        const dateStr = obj['Request Date'] || obj.Date || obj.created_at || obj['Created Date'];
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) return d.getTime();
        }
        
        // 2. Fallback to ID or Serial Number
        const val = obj.id || obj.SR_No || obj.Sr_No || obj['Sr.No'] || obj.PR_No || obj.PR || 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[^0-9.]/g, ''));
          return isNaN(num) ? val : num;
        }
        return 0;
      };
      
      const valA = getVal(a);
      const valB = getVal(b);
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [rawData, sortOrder]);

  // Process data using utility
  const processedMaterialData = useMemo(() => {
    if (activeTab !== 'material_detail_25' && activeTab !== 'material_detail_26') return [];
    return processPRItems(sortedRawData);
  }, [sortedRawData, activeTab]);

  const columns = {
    'PO Data': ['PO Number', 'Date', 'Supplier', 'Items', 'Amount (AED)', 'Status', 'Shipment', 'Remarks'],
    'material_detail_25': ['History', 'PR', 'Description', 'UOM', 'Req_Qty', 'Supplier', 'Total', 'Project', 'Next_Doc'],
    'material_detail_26': ['History', 'PR', 'Description', 'UOM', 'Req_Qty', 'Supplier', 'Total', 'Project', 'Next_Doc'],
    'pr_data_25': ['PR Number', 'Request Date', 'Department', 'Total Estimated', 'Status', 'Approved By'],
    'pr_data_26': ['PR Number', 'Request Date', 'Department', 'Total Estimated', 'Status', 'Approved By'],
    'purchase_orders': ['PO ID', 'Vendor', 'Created Date', 'Value', 'Delivery Date', 'Payment Terms', 'Status']
  };

  useEffect(() => {
    const fetchMaterialData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_BASE}/e7af6af6-25f1-4c46-96f7-61a57f9e0978?action=${encodeURIComponent(activeTab)}`);
        const json = await response.json();
        
        let data = [];
        if (Array.isArray(json)) {
          data = json[0]?.data && Array.isArray(json[0].data) ? json[0].data : json;
        } else if (json?.data && Array.isArray(json.data)) {
          data = json.data;
        }

        if (data && data.length > 0) {
          setRawData(data);
          
          const initialWidths = {};
          // Default widths
          initialWidths[0] = 80; // History
          initialWidths[1] = 120; // PR
          initialWidths[2] = 400; // Description
          for (let i = 3; i < 20; i++) initialWidths[i] = 150;
          setColWidths(initialWidths);
        }
      } catch (error) {
        console.error('Error fetching material data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterialData();
  }, [activeTab]);

  useEffect(() => {
    if (editingCell && editRef.current) {
      editRef.current.focus();
    }
  }, [editingCell]);

  const onMouseDown = (index, e) => {
    resizingRef.current = {
      index,
      startX: e.pageX,
      startWidth: colWidths[index] || 180
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const onMouseMove = useCallback((e) => {
    if (!resizingRef.current) return;
    const { index, startX, startWidth } = resizingRef.current;
    const newWidth = Math.max(60, startWidth + (e.pageX - startX));
    setColWidths(prev => ({ ...prev, [index]: newWidth }));
  }, [colWidths]);

  const onMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'default';
  }, [onMouseMove]);

  const onMouseDownRow = (index, e) => {
    resizingRowRef.current = {
      index,
      startY: e.pageY,
      startHeight: rowHeights[index] || 38
    };
    document.addEventListener('mousemove', onMouseMoveRow);
    document.addEventListener('mouseup', onMouseUpRow);
    document.body.style.cursor = 'row-resize';
  };

  const onMouseMoveRow = useCallback((e) => {
    if (!resizingRowRef.current) return;
    const { index, startY, startHeight } = resizingRowRef.current;
    const newHeight = Math.max(24, startHeight + (e.pageY - startY));
    setRowHeights(prev => ({ ...prev, [index]: newHeight }));
  }, []);

  const onMouseUpRow = useCallback(() => {
    resizingRowRef.current = null;
    document.removeEventListener('mousemove', onMouseMoveRow);
    document.removeEventListener('mouseup', onMouseUpRow);
    document.body.style.cursor = 'default';
  }, [onMouseMoveRow]);

  const handleContextMenu = (e, rowIndex) => {
    e.preventDefault();
    if (window.confirm('Delete this row?')) {
      const newDeleted = new Set(deletedRows);
      newDeleted.add(rowIndex);
      setDeletedRows(newDeleted);
    }
  };

  const handleCellClick = (row, col, value, e) => {
    setSelectedCell({ row, col });
  };

  const isMaterialTab = activeTab === 'material_detail_25' || activeTab === 'material_detail_26';
  
  const activeCols = useMemo(() => {
    if (isMaterialTab) return columns[activeTab] || [];
    if (sortedRawData && sortedRawData.length > 0) {
      // Gather all unique keys from the first 20 rows to ensure no columns are missed
      const allKeys = new Set();
      const sampleSize = Math.min(sortedRawData.length, 20);
      for (let i = 0; i < sampleSize; i++) {
        Object.keys(sortedRawData[i]).forEach(key => {
          if (typeof sortedRawData[i][key] !== 'object' && !key.startsWith('_')) {
            allKeys.add(key);
          }
        });
      }
      return Array.from(allKeys);
    }
    return columns[activeTab] || [];
  }, [sortedRawData, activeTab, isMaterialTab]);

  const baseRowCount = Math.max(50, isMaterialTab ? processedMaterialData.length : sortedRawData.length);
  const rowCount = baseRowCount + addedRows.length;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden transition-colors duration-300" style={{ background: theme.bg }}>
      {/* Tab Strip */}
      <div 
        style={{ borderBottom: `0.5px solid ${theme.border}`, height: '36px', background: theme.tabBg }}
        className="flex items-center px-2 shrink-0"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center transition-all duration-200 font-medium"
              style={{
                height: '36px',
                padding: '0 16px',
                fontSize: '12px',
                borderBottom: isActive ? '2px solid #F59E0B' : 'none',
                color: isActive ? theme.tabActiveText : theme.tabInactiveText,
                background: isActive ? theme.tabActiveBg : 'transparent',
              }}
            >
              {tab}
            </button>
          );
        })}
        <button 
          onClick={() => setAddedRows([...addedRows, {}])}
          style={{ color: theme.plusColor }}
          className="ml-3 p-1.5 hover:text-[#F59E0B] transition-colors"
          title="Add New Row"
        >
          <IconPlus size={15} />
        </button>

        <button
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className={`ml-4 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
            sortOrder === 'desc' 
              ? 'bg-[#F59E0B] text-black border border-[#F59E0B]' 
              : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]'
          }`}
        >
          <IconClock size={14} />
          {sortOrder === 'asc' ? 'OLDEST FIRST' : 'LATEST FIRST'}
        </button>

        {loading && (
          <div className="ml-auto mr-4 flex items-center gap-2 text-[10px]" style={{ color: theme.tabInactiveText }}>
            <IconLoader2 size={12} className="animate-spin" />
            LIVE SYNC
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-hidden p-4 relative">
        <div className="table-wrapper h-full w-full bg-[#06090F] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-auto">
          <table className="sheets-table-container">
            <thead className="sticky top-0 z-30">
              <tr style={{ height: '32px' }}>
                <th 
                  style={{ 
                    width: '24px', 
                    minWidth: '24px',
                    background: theme.headerBg, 
                    borderRight: `1px solid ${theme.border}`, 
                    borderBottom: `1px solid ${theme.border}`,
                    position: 'sticky',
                    left: 0,
                    zIndex: 40
                  }}
                />
                {activeCols.map((col, i) => {
                  const isColActive = selectedCell.col === i;
                  return (
                    <th
                      key={i}
                      style={{
                        width: colWidths[i] || 180,
                        background: isColActive ? theme.headerActiveBg : theme.headerBg,
                        color: isColActive ? theme.headerActiveText : theme.headerText,
                        borderRight: `1px solid ${theme.border}`,
                        borderBottom: `1px solid ${theme.border}`,
                        height: '32px',
                        position: 'relative'
                      }}
                    >
                      <div className="truncate px-3 font-black text-[10px] uppercase tracking-widest text-center">
                        {col}
                      </div>
                      <div 
                        className={`resize-handle ${resizingRef.current?.index === i ? 'resizing' : ''}`}
                        onMouseDown={(e) => onMouseDown(i, e)}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, rowIndex) => {
                if (deletedRows.has(rowIndex)) return null;

                const rowNum = rowIndex + 1;
                const isMaterialTab = activeTab === 'material_detail_25' || activeTab === 'material_detail_26';
                const sourceData = isMaterialTab ? processedMaterialData : sortedRawData;
                
                let rowData = null;
                if (rowIndex < sourceData.length) {
                  rowData = sourceData[rowIndex];
                } else if (rowIndex >= baseRowCount) {
                  rowData = addedRows[rowIndex - baseRowCount];
                }

                const isSelectedRow = selectedCell.row === rowNum;

                return (
                  <tr 
                    key={rowIndex} 
                    className={isSelectedRow ? 'selected-row group' : 'group'}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex)}
                    style={{ 
                      height: rowHeights[rowIndex] || 38,
                      background: isSelectedRow ? theme.selectedBg : (rowIndex % 2 === 1 ? theme.strip : 'transparent')
                    }}
                  >
                    <td 
                      style={{ 
                        width: '24px', 
                        minWidth: '24px',
                        background: theme.rowNumBg, 
                        color: theme.rowNumText, 
                        fontSize: '9px', 
                        textAlign: 'center', 
                        borderRight: `1px solid ${theme.border}`,
                        borderBottom: `1px solid ${theme.cellBorder}`,
                        position: 'sticky',
                        left: 0,
                        zIndex: 20
                      }}
                    >
                      {rowNum}
                      <div 
                        className={`resize-handle-row ${resizingRowRef.current?.index === rowIndex ? 'resizing' : ''}`}
                        onMouseDown={(e) => onMouseDownRow(rowIndex, e)}
                      />
                    </td>
                    {activeCols.map((colName, colIndex) => {
                      const isSelected = selectedCell.row === rowNum && selectedCell.col === colIndex;
                      const val = (() => {
                        const editKey = `${rowIndex}-${colName}`;
                        if (editedData[editKey] !== undefined) return editedData[editKey];
                        if (!rowData) return '';
                        if (rowData[colName] !== undefined) return rowData[colName];
                        const targetKey = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const foundKey = Object.keys(rowData).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === targetKey);
                        return foundKey ? rowData[foundKey] : '';
                      })();
                      
                      const isEditing = editingCell?.row === rowNum && editingCell?.col === colIndex;
                      
                      // Custom rendering for History column
                      if (colName === 'History') {
                        return (
                          <td key={colIndex} className="text-center" style={{ borderRight: `1px solid ${theme.cellBorder}`, borderBottom: `1px solid ${theme.cellBorder}` }}>
                            {rowData?._hasChanges ? (
                              <button 
                                onClick={() => setHistoryPanel(rowData)}
                                className="p-1.5 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg hover:bg-[#F59E0B] hover:text-black transition-all flex items-center gap-1 mx-auto"
                              >
                                <IconHistory size={14} />
                                <span className="text-[9px] font-black">{rowData._maxChange}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-[rgba(255,255,255,0.1)] font-bold">—</span>
                            )}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={colIndex}
                          onClick={(e) => handleCellClick(rowNum, colIndex, val, e)}
                          onDoubleClick={() => setEditingCell({ row: rowNum, col: colIndex })}
                          style={{
                            width: colWidths[colIndex] || 180,
                            fontSize: '12px',
                            color: theme.cellText,
                            background: isSelected ? theme.selectedBg : 'transparent',
                            border: isSelected ? '1.5px solid #F59E0B' : `1px solid ${theme.cellBorder}`,
                            cursor: 'cell',
                            padding: '0 12px'
                          }}
                        >
                          {isEditing ? (
                            <input
                              ref={editRef}
                              type="text"
                              value={val}
                              onChange={(e) => setEditedData({...editedData, [`${rowIndex}-${colName}`]: e.target.value})}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null); }}
                              className="w-full bg-transparent outline-none text-[#F59E0B]"
                            />
                          ) : (
                            <div className="truncate w-full font-medium" title={val}>
                              {val}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="p-4 flex justify-center border-t border-[rgba(255,255,255,0.08)]">
            <button 
              onClick={() => setAddedRows([...addedRows, {}])}
              className="px-6 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg hover:bg-[rgba(245,158,11,0.2)] transition-all flex items-center gap-2 font-bold text-sm"
            >
              <IconPlus size={16} /> Add New Row
            </button>
          </div>
        </div>

        {/* History Modal / Drawer */}
        {historyPanel && (
          <div className="absolute inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryPanel(null)}></div>
            <div className="relative w-full max-w-lg bg-[#06090F] border-l border-[rgba(255,255,255,0.1)] h-full shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-6 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Revision History</h3>
                  <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-bold uppercase tracking-widest mt-1">Item: {historyPanel.PR}</p>
                </div>
                <button onClick={() => setHistoryPanel(null)} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-full text-[rgba(255,255,255,0.5)]">
                  <IconX size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Current (Latest) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#F59E0B] text-black text-[9px] font-black rounded uppercase">Current Revision</span>
                    <div className="flex-1 h-[1px] bg-[rgba(245,158,11,0.2)]"></div>
                  </div>
                  <div className="p-4 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)] rounded-xl">
                    <p className="text-[12px] font-bold text-white mb-2">{historyPanel._latest.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase">Supplier</p>
                        <p className="text-[12px] text-white">{historyPanel._latest.supplier || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase">Total Amount</p>
                        <p className="text-[12px] text-[#F59E0B] font-bold">AED {historyPanel._latest.total || '0'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Previous Versions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-[rgba(255,255,255,0.3)] uppercase tracking-[0.2em]">Previous History</span>
                    <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.05)]"></div>
                  </div>
                  {historyPanel._history.map((hist, idx) => (
                    <div key={idx} className="relative pl-6 border-l border-[rgba(255,255,255,0.1)] py-2">
                      <div className="absolute left-[-5px] top-4 w-2 h-2 rounded-full bg-[rgba(255,255,255,0.2)]"></div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest">{hist.version}</span>
                        <div className="flex items-center gap-1 text-[9px] text-[rgba(255,255,255,0.2)] font-bold">
                          <IconClock size={10} /> AUDIT LOGGED
                        </div>
                      </div>
                      <p className="text-[11px] text-[rgba(255,255,255,0.6)] mb-3">{hist.description}</p>
                      <div className="flex gap-6">
                        <div>
                          <p className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase">Supplier</p>
                          <p className="text-[11px] text-[rgba(255,255,255,0.45)]">{hist.supplier || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-[rgba(255,255,255,0.2)] uppercase">Price</p>
                          <p className="text-[11px] text-[rgba(255,255,255,0.45)]">AED {hist.total || '0'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sheets-table-container th {
          position: relative;
        }
        .resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          width: 4px;
          height: 100%;
          cursor: col-resize;
          z-index: 10;
        }
        .resize-handle:hover {
          background: #F59E0B;
        }
        .resize-handle-row {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 4px;
          width: 100%;
          cursor: row-resize;
          z-index: 10;
        }
        .resize-handle-row:hover {
          background: #F59E0B;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}} />
    </div>
  );
};

export default Sheets;

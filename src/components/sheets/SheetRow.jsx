import React, { useCallback } from 'react';
import SheetCell from './SheetCell';

const ROW_HEIGHT = 44;

const STATUS_OPTIONS = ['Open', 'Sent for Approval', 'Approved'];

const SheetRow = React.memo(({
  row,
  rowIndex,
  columns,
  colWidths,
  selectedCell,
  onCellClick,
  onCellDoubleClick,
  activeTab,
  onStatusChange,
}) => {
  const isSelected = selectedCell?.rIdx === rowIndex;

  const handleClick = useCallback((val, colName, e) => {
    onCellClick?.(val, colName, rowIndex, e);
  }, [onCellClick, rowIndex]);

  const handleDoubleClick = useCallback((val, colName, e) => {
    onCellDoubleClick?.(val, colName, rowIndex, e);
  }, [onCellDoubleClick, rowIndex]);

  const handleStatusSelect = useCallback((e) => {
    const newVal = e.target.value;
    onStatusChange?.(rowIndex, newVal);
  }, [onStatusChange, rowIndex]);

  return (
    <div
      className="sheet-row"
      style={{
        height: ROW_HEIGHT,
        display: 'flex',
        background: isSelected
          ? 'rgba(200,146,42,0.06)'
          : rowIndex % 2 === 0 ? '#0d1117' : '#111827',
        borderLeft: isSelected ? '3px solid #c8922a' : '3px solid transparent',
        width: 'max-content',
      }}
    >
      <div style={{
        position: 'sticky',
        left: 0,
        zIndex: 40,
        width: 56,
        minWidth: 56,
        height: ROW_HEIGHT,
        background: 'inherit',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontFamily: 'monospace',
        color: 'rgba(255,255,255,0.2)',
        boxSizing: 'border-box',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {rowIndex + 1}
      </div>

      {columns.map((col, cIdx) => {
        const isFrozen = cIdx === 0;
        const isThisSelected = selectedCell?.rIdx === rowIndex && selectedCell?.colName === col;
        const isStatus = col === 'Status' && activeTab === 'PO Data';

        if (isStatus) {
          const val = row[col];
          const colW = colWidths[col] || 180;
          const options = STATUS_OPTIONS.includes(val) ? STATUS_OPTIONS : [val, ...STATUS_OPTIONS];
          return (
            <div
              key={col}
              style={{
                position: isFrozen ? 'sticky' : 'relative',
                left: isFrozen ? 56 : undefined,
                zIndex: isFrozen ? 30 : 'auto',
                width: colW,
                minWidth: 120,
                height: ROW_HEIGHT,
                padding: '0 16px',
                background: isThisSelected ? 'rgba(200,146,42,0.08)' : 'inherit',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}
            >
              <select
                value={val ?? ''}
                onChange={handleStatusSelect}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  padding: 0,
                }}
              >
                {options.map(opt => (
                  <option key={opt} value={opt} style={{ background: '#111827', color: '#fff' }}>
                    {opt}
                  </option>
                ))}
              </select>
              <span style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.2)',
                fontSize: '8px',
                pointerEvents: 'none',
              }}>▼</span>
            </div>
          );
        }

        return (
          <SheetCell
            key={col}
            value={row[col]}
            column={col}
            width={colWidths[col] || 180}
            isFrozen={isFrozen}
            isSelected={isThisSelected}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          />
        );
      })}
    </div>
  );
});

SheetRow.displayName = 'SheetRow';

export default SheetRow;

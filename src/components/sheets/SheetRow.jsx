import React, { useCallback } from 'react';
import SheetCell from './SheetCell';

const ROW_HEIGHT = 44;

const SheetRow = React.memo(({
  row,
  rowIndex,
  columns,
  colWidths,
  selectedCell,
  onCellClick,
  onCellDoubleClick,
}) => {
  const isSelected = selectedCell?.rIdx === rowIndex;

  const handleClick = useCallback((val, colName, e) => {
    onCellClick?.(val, colName, rowIndex, e);
  }, [onCellClick, rowIndex]);

  const handleDoubleClick = useCallback((val, colName, e) => {
    onCellDoubleClick?.(val, colName, rowIndex, e);
  }, [onCellDoubleClick, rowIndex]);

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

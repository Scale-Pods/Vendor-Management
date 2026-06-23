import React from 'react';

const ROW_HEIGHT = 44;

const SheetCell = React.memo(({
  value,
  column,
  width,
  isFrozen,
  isSelected,
  onClick,
  onDoubleClick,
}) => {
  const displayValue = value === null || value === undefined ? '\u2014' : String(value);
  const canPopover = displayValue.length >= 25;

  return (
    <div
      onClick={(e) => onClick?.(value, column, e)}
      onDoubleClick={(e) => onDoubleClick?.(value, column, e)}
      title={canPopover ? displayValue : undefined}
      style={{
        position: isFrozen ? 'sticky' : 'relative',
        left: isFrozen ? 56 : undefined,
        zIndex: isFrozen ? 30 : 'auto',
        width: width || 180,
        minWidth: 120,
        height: ROW_HEIGHT,
        padding: '0 16px',
        background: isSelected ? 'rgba(200,146,42,0.08)' : 'inherit',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderColor: isSelected ? 'rgba(200,146,42,0.4)' : undefined,
        fontSize: '12px',
        fontWeight: isFrozen ? 700 : 500,
        color: isFrozen ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
        cursor: 'default',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: width || 180,
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {displayValue}
    </div>
  );
});

SheetCell.displayName = 'SheetCell';

export default SheetCell;

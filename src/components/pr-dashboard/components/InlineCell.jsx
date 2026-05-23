import { useState, useRef, useEffect, useCallback } from 'react';

const detectType = (value) => {
  if (value === null || value === undefined || value === '') return 'text';
  const num = parseFloat(value);
  if (!isNaN(num) && String(value).trim() !== '') return 'number';
  if (String(value).match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
  return 'text';
};

const InlineCell = ({ value: initialValue, row, column, onSave, options }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [changed, setChanged] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(initialValue);
    setChanged(false);
  }, [initialValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const type = options?.type || detectType(initialValue);
  const isSelect = options?.options || (type === 'text' && options?.dropdown);

  const handleSave = useCallback(() => {
    setEditing(false);
    if (changed && onSave) {
      onSave(row, column, value);
      setChanged(false);
    }
  }, [changed, value, row, column, onSave]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setValue(initialValue); setChanged(false); setEditing(false); }
  };

  if (!editing) {
    return (
      <div
        className="group cursor-pointer flex items-center min-h-[28px] px-1.5 -mx-1.5 rounded hover:bg-[rgba(245,158,11,0.08)] transition-colors"
        onClick={() => { setEditing(true); setChanged(false); }}
        title="Click to edit"
      >
        <span className={`truncate text-[12px] leading-tight ${changed ? 'text-[#F59E0B]' : ''}`}>
          {value || '—'}
        </span>
        <span className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </span>
      </div>
    );
  }

  if (isSelect) {
    return (
      <select
        ref={inputRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); setChanged(e.target.value !== initialValue); }}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className="w-full bg-[#0F1520] border border-[rgba(245,158,11,0.3)] rounded text-[12px] px-2 py-1 text-white outline-none focus:ring-1 focus:ring-[#F59E0B]"
        autoFocus
      >
        {(options?.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (type === 'number') {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => { setValue(e.target.value); setChanged(e.target.value !== String(initialValue)); }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#0F1520] border border-[rgba(245,158,11,0.3)] rounded text-[12px] px-2 py-1 text-white text-right outline-none focus:ring-1 focus:ring-[#F59E0B] [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  }

  if (type === 'date') {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value ? String(value).split('T')[0] : ''}
        onChange={(e) => { setValue(e.target.value); setChanged(e.target.value !== String(initialValue).split('T')[0]); }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#0F1520] border border-[rgba(245,158,11,0.3)] rounded text-[12px] px-2 py-1 text-white outline-none focus:ring-1 focus:ring-[#F59E0B]"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => { setValue(e.target.value); setChanged(e.target.value !== String(initialValue)); }}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="w-full bg-[#0F1520] border border-[rgba(245,158,11,0.3)] rounded text-[12px] px-2 py-1 text-white outline-none focus:ring-1 focus:ring-[#F59E0B]"
    />
  );
};

export default InlineCell;

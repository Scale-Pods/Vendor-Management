import { useMemo } from 'react';
import { IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react';

const normalizeChanges = (row, changeCount = 5) => {
  const changes = [];
  for (let i = 1; i <= changeCount; i++) {
    const hasAny = Object.keys(row).some(
      (k) => k.startsWith(`${i === 1 ? 'change' : `change${i}_`}`) || k.startsWith(`change${i}_`)
    );
    const prefix = i === 1 ? 'change' : `change${i}_`;
    const c = {
      change_no: i,
      supplier: row[`${prefix}supplier`] || row[`change${i}_supplier`] || '',
      qty: row[`${prefix}qty`] || row[`change${i}_qty`] || '',
      rate: row[`${prefix}rate`] || row[`change${i}_rate`] || '',
      price: row[`${prefix}price`] || row[`change${i}_price`] || '',
      vat: row[`${prefix}vat`] || row[`change${i}_vat`] || '',
      total: row[`${prefix}total`] || row[`change${i}_total`] || '',
      date: row[`${prefix}date`] || row[`change${i}_date`] || '',
      description: row[`${prefix}description`] || row[`change${i}_description`] || '',
    };
    const hasValue = Object.values(c).some((v) => v !== null && v !== undefined && v !== '');
    if (hasValue) changes.push(c);
  }
  return changes;
};

const DeltaIndicator = ({ current, previous }) => {
  const cur = parseFloat(current) || 0;
  const prev = parseFloat(previous) || 0;
  if (prev === 0 && cur === 0) return <IconMinus size={14} className="text-[rgba(255,255,255,0.3)]" />;
  if (cur > prev) return <IconArrowUpRight size={14} className="text-[#EF4444]" />;
  if (cur < prev) return <IconArrowDownRight size={14} className="text-[#10B981]" />;
  return <IconMinus size={14} className="text-[rgba(255,255,255,0.3)]" />;
};

const ChangeTimeline = ({ row, changeCount = 5, compact = false, latestHighlighted = true }) => {
  const changes = useMemo(() => normalizeChanges(row, changeCount), [row, changeCount]);

  if (changes.length === 0) return null;

  const visible = changes.filter(
    (c) => Object.values(c).some((v) => v !== null && v !== undefined && v !== '')
  );

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((change, idx) => {
        const isLatest = idx === visible.length - 1 && latestHighlighted;
        const prevChange = idx > 0 ? visible[idx - 1] : null;

        return (
          <div
            key={change.change_no}
            className={`
              relative border rounded-xl p-3 transition-all
              ${isLatest
                ? 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.04)] shadow-[0_0_12px_rgba(245,158,11,0.06)]'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]'
              }
              ${compact ? 'p-2' : 'p-3'}
            `}
          >
            {/* Timeline connector */}
            {idx < visible.length - 1 && (
              <div className="absolute left-5 top-10 bottom-0 w-px bg-[rgba(255,255,255,0.06)]" />
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className={`
                w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black
                ${isLatest
                  ? 'bg-[rgba(245,158,11,0.2)] text-[#F59E0B] border border-[rgba(245,158,11,0.3)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.08)]'
                }
              `}>
                {change.change_no === 1 ? 'B' : `V${change.change_no - 1}`}
              </span>
              <span className="text-[11px] font-bold text-[rgba(255,255,255,0.5)]">
                {change.change_no === 1 ? 'Baseline' : `Change ${change.change_no - 1}`}
              </span>
              {change.date && (
                <span className="text-[10px] text-[rgba(255,255,255,0.3)] ml-auto">{change.date}</span>
              )}
              {isLatest && (
                <span className="text-[9px] font-black uppercase tracking-wider text-[#F59E0B] bg-[rgba(245,158,11,0.12)] px-1.5 py-0.5 rounded ml-1">
                  Latest
                </span>
              )}
            </div>

            <div className={`grid gap-x-4 gap-y-1 ${compact ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4'}`}>
              {change.supplier && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.3)]">Supplier</span>
                  <p className="text-[12px] font-semibold text-[#F59E0B] truncate">{change.supplier}</p>
                </div>
              )}
              {change.qty && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.3)]">Qty</span>
                  <p className="text-[12px] font-semibold flex items-center gap-1">
                    {change.qty}
                    {prevChange && <DeltaIndicator current={change.qty} previous={prevChange.qty} />}
                  </p>
                </div>
              )}
              {change.rate && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.3)]">Rate</span>
                  <p className="text-[12px] font-semibold flex items-center gap-1">
                    {change.rate}
                    {prevChange && <DeltaIndicator current={change.rate} previous={prevChange.rate} />}
                  </p>
                </div>
              )}
              {change.price && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.3)]">Price</span>
                  <p className="text-[12px] font-semibold flex items-center gap-1">
                    {change.price}
                    {prevChange && <DeltaIndicator current={change.price} previous={prevChange.price} />}
                  </p>
                </div>
              )}
              {change.vat && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.3)]">VAT</span>
                  <p className="text-[12px] font-semibold">{change.vat}</p>
                </div>
              )}
              {change.total && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-[rgba(255,255,255,0.3)]">Total</span>
                  <p className="text-[12px] font-bold text-white flex items-center gap-1">
                    {change.total}
                    {prevChange && <DeltaIndicator current={change.total} previous={prevChange.total} />}
                  </p>
                </div>
              )}
            </div>

            {change.description && (
              <p className="text-[11px] text-[rgba(255,255,255,0.5)] mt-1.5 line-clamp-2">{change.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChangeTimeline;

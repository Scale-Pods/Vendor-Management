const STATUS_STYLES = {
  Approved: 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.3)]',
  'Partially Approved': 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]',
  Pending: 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6] border-[rgba(59,130,246,0.3)]',
  Rejected: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]',
  Open: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]',
  Closed: 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.1)]',
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const s = String(status || 'Open');
  const style = STATUS_STYLES[s] || STATUS_STYLES.Open;
  const sz = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';
  return (
    <span className={`rounded-full font-bold uppercase tracking-wider border ${sz} ${style}`}>
      {s}
    </span>
  );
};

export default StatusBadge;

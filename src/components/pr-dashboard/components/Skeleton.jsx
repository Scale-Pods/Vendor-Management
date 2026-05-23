export const RowSkeleton = ({ cols = 8 }) => (
  <div className="flex items-center gap-4 px-6 py-4 border-b border-[rgba(255,255,255,0.04)] animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-3 bg-[rgba(255,255,255,0.06)] rounded flex-1" style={{ maxWidth: i === 0 ? '100px' : i === 1 ? '140px' : '80px' }} />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 8, cols = 8 }) => (
  <div className="divide-y divide-[rgba(255,255,255,0.04)]">
    {Array.from({ length: rows }).map((_, i) => (
      <RowSkeleton key={i} cols={cols} />
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 space-y-4 animate-pulse">
    <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded w-1/3" />
    <div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-2/3" />
    <div className="flex gap-3">
      <div className="h-12 bg-[rgba(255,255,255,0.04)] rounded-xl flex-1" />
      <div className="h-12 bg-[rgba(255,255,255,0.04)] rounded-xl flex-1" />
      <div className="h-12 bg-[rgba(255,255,255,0.04)] rounded-xl flex-1" />
    </div>
  </div>
);

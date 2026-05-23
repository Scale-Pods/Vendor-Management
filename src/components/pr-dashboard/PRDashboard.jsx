import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePRList } from './hooks/usePRData';
import PRDrawer from './PRDrawer';
import StatusBadge from './components/StatusBadge';
import { RowSkeleton } from './components/Skeleton';
import {
  IconSearch,
  IconArrowUp,
  IconArrowDown,
  IconBuildingStore,
  IconChevronRight,
  IconCoins,
} from '@tabler/icons-react';

const PRDashboard = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPR, setSelectedPR] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);

  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const {
    data: allRows,
    totalCount,
    isLoading,
    isProcessing,
    isError,
    error,
    refetch,
  } = usePRList({ search: debouncedSearch, sortOrder });

  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const handlePRClick = useCallback((row) => {
    setSelectedPR(row.pr);
    setSelectedSummary(row);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedPR(null);
    setSelectedSummary(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Search & Controls */}
      <div className="sticky top-0 z-20 bg-[#06090F] border-b border-[rgba(255,255,255,0.06)] px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
            <input
              type="text"
              placeholder="Search by PR, Project, Supplier, Company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white placeholder-[rgba(255,255,255,0.25)] outline-none focus:border-[rgba(245,158,11,0.3)] focus:bg-[rgba(245,158,11,0.03)] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder('desc')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                sortOrder === 'desc'
                  ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]'
                  : 'text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <IconArrowDown size={14} />
              Latest
            </button>
            <button
              onClick={() => setSortOrder('asc')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                sortOrder === 'asc'
                  ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]'
                  : 'text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <IconArrowUp size={14} />
              Oldest
            </button>
          </div>

          <div className="text-[11px] text-[rgba(255,255,255,0.3)] font-medium flex items-center gap-2">
            {isProcessing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : totalCount > 0 ? (
              <span>
                <span className="text-white font-bold">{allRows.length}</span> / {totalCount} PRs
              </span>
            ) : isLoading ? (
              'Loading...'
            ) : (
              'No PRs'
            )}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="sticky top-[65px] z-10 bg-[#06090F] border-b border-[rgba(255,255,255,0.06)] px-6 py-2.5">
        <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)]">
          <span className="w-[120px] shrink-0">PR</span>
          <span className="flex-1 min-w-[120px]">Project</span>
          <span className="w-[160px] shrink-0 hidden sm:block">Supplier</span>
          <span className="w-[100px] shrink-0 text-right hidden md:block">Amount</span>
          <span className="w-[80px] shrink-0 text-right hidden lg:block">VAT</span>
          <span className="w-[60px] shrink-0 text-right">Entries</span>
          <span className="w-[100px] shrink-0">Status</span>
          <span className="w-[120px] shrink-0 hidden xl:block">Activity</span>
          <span className="w-8 shrink-0" />
        </div>
      </div>

      {/* Virtualized List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <RowSkeleton key={i} cols={8} />
            ))}
          </div>
        ) : isError ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[#EF4444] font-bold">Failed to load PRs</p>
            <p className="text-[rgba(255,255,255,0.3)] text-sm mt-1">{error?.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold"
            >
              Retry
            </button>
          </div>
        ) : allRows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <IconSearch size={32} className="mx-auto text-[rgba(255,255,255,0.1)] mb-3" />
            <p className="text-[rgba(255,255,255,0.3)] font-medium">No PRs found</p>
            {debouncedSearch && (
              <p className="text-[rgba(255,255,255,0.2)] text-sm mt-1">
                No results matching &quot;{debouncedSearch}&quot;
              </p>
            )}
          </div>
        ) : (
          <div
            className="relative px-6"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = allRows[virtualRow.index];
              if (!row) return null;
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-6 right-6 flex items-center gap-2 px-3 py-3 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-[rgba(245,158,11,0.12)] hover:bg-[rgba(245,158,11,0.03)]"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => handlePRClick(row)}
                >
                  <span className="w-[120px] shrink-0 text-[13px] font-bold text-[#F59E0B] tracking-tight truncate">
                    <span className="flex items-center gap-1.5">
                      <IconCoins size={14} className="shrink-0" />
                      {row.pr}
                    </span>
                  </span>
                  <span className="flex-1 min-w-[120px] text-[12px] text-[rgba(255,255,255,0.7)] truncate">
                    {row.project}
                  </span>
                  <span className="w-[160px] shrink-0 hidden sm:flex items-center gap-1 text-[12px] text-[rgba(255,255,255,0.5)] truncate">
                    <IconBuildingStore size={12} className="text-[#F59E0B] shrink-0" />
                    <span className="truncate">{row.supplier}</span>
                  </span>
                  <span className="w-[100px] shrink-0 text-right text-[13px] font-semibold text-white hidden md:block">
                    {row.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="w-[80px] shrink-0 text-right text-[12px] text-[rgba(255,255,255,0.5)] hidden lg:block">
                    {row.totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="w-[60px] shrink-0 text-right text-[12px] font-bold text-[rgba(255,255,255,0.7)]">
                    {row.totalEntries}
                  </span>
                  <span className="w-[100px] shrink-0">
                    <StatusBadge status={row.latestStatus} />
                  </span>
                  <span className="w-[120px] shrink-0 hidden xl:block text-[11px] text-[rgba(255,255,255,0.3)] truncate">
                    {row.latestActivityDate}
                  </span>
                  <span className="w-8 shrink-0 flex items-center justify-center text-[rgba(255,255,255,0.2)]">
                    <IconChevronRight size={14} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PR Detail Drawer */}
      {selectedPR && (
        <PRDrawer
          pr={selectedPR}
          summary={selectedSummary}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
};

export default PRDashboard;

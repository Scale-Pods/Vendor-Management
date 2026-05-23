import { useState, useCallback, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTabMutation } from './hooks/usePRData';
import { downloadXLSX } from '../../utils/exportXLSX';
import StatusBadge from './components/StatusBadge';
import { CardSkeleton } from './components/Skeleton';
import { IconX, IconRefresh, IconBuildingStore, IconBriefcase, IconCoins, IconFileText, IconDownload } from '@tabler/icons-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: IconCoins },
  { id: 'poData', label: 'PO Data', icon: IconFileText },
  { id: 'purchaseOrders', label: 'Purchase Orders', icon: IconBriefcase },
  { id: 'material25', label: 'Material 25', icon: IconFileText },
  { id: 'material26', label: 'Material 26', icon: IconFileText },
  { id: 'prData25', label: 'PR Data 25', icon: IconFileText },
  { id: 'prData26', label: 'PR Data 26', icon: IconFileText },
  { id: 'mergedData', label: 'Merged Data', icon: IconFileText },
  { id: 'attachments', label: 'Attachments', icon: IconFileText },
];

const TABS_MAP = {
  overview: lazy(() => import('./tabs/OverviewTab')),
  poData: lazy(() => import('./tabs/PODataTab')),
  purchaseOrders: lazy(() => import('./tabs/PurchaseOrdersTab')),
  material25: lazy(() => import('./tabs/Material25Tab')),
  material26: lazy(() => import('./tabs/Material26Tab')),
  prData25: lazy(() => import('./tabs/PRData25Tab')),
  prData26: lazy(() => import('./tabs/PRData26Tab')),
  mergedData: lazy(() => import('./tabs/MergedDataTab')),
  attachments: lazy(() => import('./tabs/AttachmentsTab')),
};

const PRDrawer = ({ pr, summary, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const mutation = useTabMutation();
  const queryClient = useQueryClient();

  const handleSave = useCallback(
    (row, column, value) => {
      const table = TABS.find((t) => t.id === activeTab)?.label.replace(/\s+/g, '_').toLowerCase() || activeTab;
      mutation.mutate({
        table,
        pr,
        updatedRows: [{ id: row.id || row.ID, [column]: value }],
      });
    },
    [activeTab, pr, mutation]
  );

  const handleDownload = useCallback(() => {
    const data = queryClient.getQueryData(['pr-dashboard', 'tab', activeTab, pr]);
    if (!data || (Array.isArray(data) && data.flat(Infinity).filter(Boolean).length === 0)) return;
    const tabLabel = TABS.find((t) => t.id === activeTab)?.label || activeTab;
    downloadXLSX(data, `${pr}_${tabLabel.replace(/\s+/g, '_')}.xlsx`);
  }, [activeTab, pr, queryClient]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 w-full max-w-[900px] h-full z-50 flex flex-col bg-[#06090F] border-l border-[rgba(255,255,255,0.1)] shadow-2xl animate-slide-in-right">
        <div className="sticky top-0 z-20 flex-shrink-0 bg-[rgba(6,9,15,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center shrink-0">
                <IconCoins size={18} className="text-[#F59E0B]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[18px] font-black text-white tracking-tight truncate">{pr}</h2>
                {summary && (
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[rgba(255,255,255,0.4)]">
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <IconBriefcase size={12} /> {summary.project}
                    </span>
                    <span className="opacity-30">·</span>
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <IconBuildingStore size={12} className="text-[#F59E0B]" /> {summary.supplier}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={summary?.latestStatus} size="md" />
              <button
                onClick={onClose}
                className="p-2 text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-none">
            <div className="flex px-4 gap-1 pb-0 min-w-max">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-bold whitespace-nowrap rounded-t-lg transition-all border-b-2
                      ${isActive
                        ? 'text-[#F59E0B] border-[#F59E0B] bg-[rgba(245,158,11,0.06)]'
                        : 'text-[rgba(255,255,255,0.4)] border-transparent hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.02)]'
                      }
                    `}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-2 border-b border-[rgba(255,255,255,0.06)]">
            <span className="text-[11px] font-bold text-[rgba(255,255,255,0.3)]">
              {TABS.find((t) => t.id === activeTab)?.label || ''}
            </span>
            <button
              onClick={handleDownload}
              title={`Download ${TABS.find((t) => t.id === activeTab)?.label || ''} as XLSX`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#F59E0B] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.1)] transition-all"
            >
              <IconDownload size={14} />
              Export XLSX
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Suspense
            fallback={
              <div className="space-y-4">
                <CardSkeleton />
                <div className="h-64 bg-[rgba(255,255,255,0.02)] rounded-xl animate-pulse" />
              </div>
            }
          >
            <TabContentSwitch activeTab={activeTab} pr={pr} onSave={handleSave} />
          </Suspense>
        </div>
      </div>
    </>
  );
};

const TabContentSwitch = ({ activeTab, pr, onSave }) => {
  const Tab = TABS_MAP[activeTab];
  if (!Tab) return null;
  return <Tab pr={pr} onSave={onSave} />;
};

export default PRDrawer;

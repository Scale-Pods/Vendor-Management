import React, { useState, useEffect } from 'react';
import { 
  IconLayoutDashboard, 
  IconUpload, 
  IconFileInvoice, 
  IconGitCompare, 
  IconBuildingStore, 
  IconChartDots,
  IconSun,
  IconMoon,
  IconSearch,
  IconBell,
  IconTable,
  IconClipboardList,
  IconClipboardCheck,
  IconCalendar,
  IconChevronDown
} from '@tabler/icons-react';
import Overview from './components/dashboard/Overview';
import VendorAnalysis from './components/vendors/VendorAnalysis';
import FileUploader from './components/upload/FileUploader';
import PRTable from './components/records/PRTable';
import InsightsPanel from './components/insights/InsightsPanel';
import Sheets from './components/sheets/Sheets';
import POLog from './components/polog/POLog';
import ReviewYear from './components/dashboard/ReviewYear';
import ReviewDashboard from './components/dashboard/ReviewDashboard';
import { SearchBar } from './components/ui/search-bar';

const SIDEBAR_W = 260;

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPR, setSelectedPR] = useState(null);

  const handleSelectPR = (pr) => {
    setSelectedPR(pr);
    setActiveTab('dashboard');
  };

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  ];

  const reviewNav = [
    { 
      id: 'review-group', 
      label: 'Review', 
      icon: IconClipboardCheck,
      children: [
        { id: 'review2025', label: '2025 Cycle', icon: IconCalendar },
        { id: 'review2026', label: '2026 Cycle', icon: IconCalendar },
      ]
    }
  ];


  const dataNav = [
    { id: 'sheets', label: 'Sheets', icon: IconTable },
    { id: 'polog', label: 'Material List', icon: IconClipboardList },
  ];

  const [isReviewExpanded, setIsReviewExpanded] = useState(false);

  const NavItem = ({ item, isSubItem, hasChildren, isExpanded, onExpand }) => {
    const isActive = activeTab === item.id;
    return (
      <div>
        <button
          onClick={() => {
            setActiveTab(item.id);
            if (hasChildren) {
              onExpand(true);
            }
          }}
          className={`relative w-full flex items-center gap-3 px-4 py-[11px] transition-all duration-200 group text-left ${
            isActive 
              ? 'bg-[rgba(245,158,11,0.15)] border-l-2 border-[#F59E0B] text-[#F59E0B] rounded-r-[10px]' 
              : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] rounded-[8px]'
          } ${isSubItem ? 'pl-11 pr-4 py-[8px]' : ''}`}
        >
          <item.icon
            size={isSubItem ? 16 : 20}
            stroke={1.5}
            className={isActive ? 'text-[#F59E0B]' : 'text-[rgba(255,255,255,0.4)]'}
          />
          <span className="flex-1" style={{
            fontSize: isSubItem ? '12px' : '13px',
            fontWeight: isActive ? 600 : 400,
            letterSpacing: '0.01em',
          }}>
            {item.label}
          </span>
          {hasChildren && (
            <IconChevronDown 
              size={14} 
              className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} opacity-40`} 
            />
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {item.children.map(child => (
              <NavItem key={child.id} item={child} isSubItem={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#06090F] relative overflow-hidden">
      {/* Ambient Blobs */}
      <div className="ambient-blob blob-1" />
      <div className="ambient-blob blob-2" />
      <div className="ambient-blob blob-3" />

      {/* Sidebar */}
      <aside
        style={{ width: `${SIDEBAR_W}px` }}
        className="fixed inset-y-0 left-0 z-50 glass-panel !rounded-none border-r border-[rgba(255,255,255,0.08)] hidden md:flex flex-col"
      >
        {/* Logo — ScalePods wordmark, untouched */}
        <div className="px-6 pt-8 pb-8 flex items-center justify-center border-b border-[rgba(255,255,255,0.08)]">
          <img
            src="/scalepods-logo.png"
            alt="ScalePods"
            style={{
              width: '220px',
              height: 'auto',
              display: 'block',
              filter: 'invert(1)',
              mixBlendMode: 'screen',
              opacity: 0.95,
            }}
          />
        </div>

        {/* Nav Groups */}
        <div className="flex-1 overflow-y-auto px-3 pt-2">
          {/* MAIN group */}
          <div className="px-2 pt-5 pb-2 text-[9px] font-bold uppercase tracking-[1px] text-[rgba(255,255,255,0.25)]">
            MAIN
          </div>
          <nav className="space-y-[2px]">
            {mainNav.map((item) => <NavItem key={item.id} item={item} />)}
          </nav>

          {/* REVIEW group */}
          <div className="px-2 pt-6 pb-2 text-[9px] font-bold uppercase tracking-[1px] text-[rgba(255,255,255,0.25)]">
            REVIEW
          </div>
          <nav className="space-y-[2px]">
            {reviewNav.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                hasChildren={!!item.children} 
                isExpanded={isReviewExpanded}
                onExpand={setIsReviewExpanded}
              />
            ))}
          </nav>


          {/* DATA group */}
          <div className="px-2 pt-6 pb-2 text-[9px] font-bold uppercase tracking-[1px] text-[rgba(255,255,255,0.25)]">
            DATA
          </div>
          <nav className="space-y-[2px]">
            {dataNav.map((item) => <NavItem key={item.id} item={item} />)}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="px-3 py-6 border-t border-[rgba(255,255,255,0.08)] space-y-4">
          {/* User row */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.05)] border-2 border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center justify-center text-xs font-bold text-[#F59E0B]">
                TM
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-[rgba(255,255,255,0.8)] truncate">
                Taslim
              </span>
              <span className="text-[11px] text-[rgba(255,255,255,0.4)] truncate">
                Admin Account
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: `${SIDEBAR_W}px` }} className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Topbar */}
        <header className="sticky top-0 z-30 glass-panel !rounded-none border-b border-[rgba(255,255,255,0.07)] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-72 z-50">
              <SearchBar placeholder="Search POs, Suppliers..." />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative p-2 text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] rounded-full transition-colors">
              <IconBell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#F59E0B] rounded-full border-2 border-[#06090F]"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#D97706] border-2 border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.3)]"></div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className={activeTab === 'sheets' || activeTab === 'polog' ? "flex-1 w-full overflow-hidden" : "p-8 w-full overflow-y-auto"}>
          {activeTab === 'dashboard' && <Overview darkMode={true} initialPR={selectedPR} />}
          {activeTab === 'review-group' && <ReviewDashboard />}
          {activeTab === 'review2025' && <ReviewYear year="2025" action="25" onSelectPR={handleSelectPR} />}
          {activeTab === 'review2026' && <ReviewYear year="2026" action="26" onSelectPR={handleSelectPR} />}
          {activeTab === 'records' && <PRTable />}
          {activeTab === 'changes' && <PRTable showChangesOnly={true} />}
          {activeTab === 'vendors' && <VendorAnalysis />}
          {activeTab === 'insights' && <InsightsPanel />}
          {activeTab === 'sheets' && <Sheets darkMode={true} />}
          {activeTab === 'polog' && <POLog />}
        </div>
      </main>
    </div>
  );
};


export default App;

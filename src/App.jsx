import { useState, useEffect } from 'react';
import { 
  IconBell,
  IconClipboardList,
  IconCalendar,
  IconChevronDown,
  IconLogout,
  IconUsers,
  IconShieldLock,
  IconMenu2,
  IconX,
  IconLayoutDashboard,
  IconDatabaseImport,
  IconPackage,
  IconUpload
} from '@tabler/icons-react';
import VendorAnalysis from './components/vendors/VendorAnalysis';
import PRTable from './components/records/PRTable';
import InsightsPanel from './components/insights/InsightsPanel';
import Sheets from './components/sheets/Sheets';
import POLog from './components/polog/POLog';
import ReviewYear from './components/dashboard/ReviewYear';
import ReviewDashboard from './components/dashboard/ReviewDashboard';
import QuoteRegister from './components/quotes/QuoteRegister';
import { SearchBar } from './components/ui/search-bar';
import Login from './components/auth/Login';
import UserManagement from './components/admin/UserManagement';

const SIDEBAR_W = 260;

const App = () => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('scale_pods_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState('polog');
  const [selectedPR, setSelectedPR] = useState(null);

  // Diagnostic logging to track role changes
  useEffect(() => {
    if (user) {
      console.log('Current Auth State:', {
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin'
      });
    }
  }, [user]);

  const handleLogin = (userData) => {
    console.log('Login event triggered with data:', userData);
    setUser(userData);
    localStorage.setItem('scale_pods_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('scale_pods_user');
  };

  const handleSelectPR = (pr) => {
    setSelectedPR(pr);
    setActiveTab('polog');
  };

  const isViewer = user?.role === 'viewer';
  const isAdmin = user?.role === 'admin';

  const adminNav = [
    { id: 'users', label: 'User Management', icon: IconUsers },
  ];

  // Purchase Order Request group
  const poRequestNav = [
    { id: 'po-dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
    { id: 'polog', label: 'Data + Upload Data', icon: IconDatabaseImport },
    { id: 'prlist', label: 'Material Request', icon: IconPackage },
  ];

  // Review Data group
  const reviewDataNav = [
    { 
      id: 'review-dashboard-group', 
      label: 'Dashboard', 
      icon: IconLayoutDashboard,
      children: [
        { id: 'review2025', label: '2025', icon: IconCalendar },
        { id: 'review2026', label: '2026', icon: IconCalendar },
      ]
    },
    { id: 'sheets', label: 'Upload Data', icon: IconUpload, restricted: true },
  ];

  // Purchase Quote Register group
  const quoteRegisterNav = [
    { id: 'qr-dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
    { id: 'qr-data', label: 'Data', icon: IconClipboardList },
    { id: 'qr-material', label: 'Material', icon: IconPackage },
    { id: 'qr-upload', label: 'Upload Data', icon: IconUpload },
  ];

  const [expandedGroups, setExpandedGroups] = useState({
    poRequest: true,
    reviewData: false,
    quoteRegister: false,
    reviewDashboard: false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const NavItem = ({ item, isSubItem, hasChildren, isExpanded, onExpand }) => {
    const isActive = activeTab === item.id;
    // Hide restricted items for viewers
    if (isViewer && item.restricted) return null;

    return (
      <div>
        <button
          onClick={() => {
            if (hasChildren) {
              onExpand(!isExpanded);
              // Also set the first child as active if expanding and no child is active
              if (!isExpanded && item.children) {
                const anyChildActive = item.children.some(c => c.id === activeTab);
                if (!anyChildActive) {
                  setActiveTab(item.children[0].id);
                }
              }
            } else {
              setActiveTab(item.id);
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

  /* ─── Sidebar Section Header (collapsible group) ─── */
  const SidebarSection = ({ title, groupKey, items, expandState, onExpandItem }) => (
    <div className="mb-1">
      <button 
        onClick={() => toggleGroup(groupKey)}
        className="w-full flex items-center justify-between px-2 pt-5 pb-2 group cursor-pointer"
      >
        <span className="text-[9px] font-bold uppercase tracking-[1px] text-[rgba(255,255,255,0.25)] group-hover:text-[rgba(255,255,255,0.4)] transition-colors">
          {title}
        </span>
        <IconChevronDown 
          size={12} 
          className={`transition-transform duration-300 text-[rgba(255,255,255,0.15)] group-hover:text-[rgba(255,255,255,0.3)] ${
            expandedGroups[groupKey] ? 'rotate-180' : ''
          }`} 
        />
      </button>
      {expandedGroups[groupKey] && (
        <nav className="space-y-[2px] animate-in slide-in-from-top-2 duration-200">
          {items.map((item) => (
            <NavItem 
              key={item.id} 
              item={item} 
              hasChildren={!!item.children}
              isExpanded={expandState?.[item.id]}
              onExpand={(val) => onExpandItem?.(item.id, val)}
            />
          ))}
        </nav>
      )}
    </div>
  );

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

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
        <div className="px-6 pt-4 pb-4 flex items-center justify-center border-b border-[rgba(255,255,255,0.08)]">
          <img
            src="/scalepods-logo.png"
            alt="ScalePods"
            style={{
              width: '180px',
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
          {/* Purchase Order Request */}
          <SidebarSection 
            title="Purchase Order Request" 
            groupKey="poRequest" 
            items={poRequestNav} 
          />

          {/* Review Data */}
          <SidebarSection 
            title="Review Data" 
            groupKey="reviewData" 
            items={reviewDataNav}
            expandState={{ 'review-dashboard-group': expandedGroups.reviewDashboard }}
            onExpandItem={(id) => {
              if (id === 'review-dashboard-group') toggleGroup('reviewDashboard');
            }}
          />

          {/* Purchase Quote Register */}
          <SidebarSection 
            title="Purchase Quote Register" 
            groupKey="quoteRegister" 
            items={quoteRegisterNav} 
          />
        </div>

        {/* Bottom Section */}
        <div className="px-3 py-6 border-t border-[rgba(255,255,255,0.08)] space-y-4">
          {/* Admin Tools - Quick Access */}
          {isAdmin && (
            <div className="pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <nav className="space-y-[2px]">
                {adminNav.map((item) => <NavItem key={item.id} item={item} />)}
              </nav>
            </div>
          )}

          {/* User row */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-9 h-9 rounded-full bg-[rgba(255,255,255,0.05)] border-2 ${
                  isAdmin ? 'border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 
                  user.role === 'editor' ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 
                  'border-[rgba(255,255,255,0.1)]'
                } flex items-center justify-center text-xs font-bold ${
                  isAdmin ? 'text-[#F59E0B]' : 
                  user.role === 'editor' ? 'text-blue-400' : 
                  'text-[rgba(255,255,255,0.4)]'
                }`}>
                  {isAdmin ? <IconShieldLock size={16} /> : (user.email?.charAt(0).toUpperCase() || 'U')}
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-[rgba(255,255,255,0.8)] truncate">
                  {user.email?.split('@')[0]}
                </span>
                <span className={`text-[10px] ${
                  isAdmin ? 'text-[#F59E0B]' : 
                  user.role === 'editor' ? 'text-blue-400' : 
                  'text-[rgba(255,255,255,0.3)]'
                } font-black uppercase tracking-[0.1em] truncate`}>
                  {user.role === 'admin' ? 'Owner' : user.role}
                </span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-label hover:text-white transition-colors"
              title="Logout"
            >
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside
            style={{ width: '260px' }}
            className="absolute inset-y-0 left-0 glass-panel !rounded-none border-r border-[rgba(255,255,255,0.08)] flex flex-col animate-in slide-in-from-left duration-300"
          >
            <div className="px-6 pt-8 pb-6 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)]">
              <img
                src="/scalepods-logo.png"
                alt="ScalePods"
                style={{ width: '160px', height: 'auto', filter: 'invert(1)', mixBlendMode: 'screen', opacity: 0.95 }}
              />
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[rgba(255,255,255,0.5)] hover:text-white rounded-lg transition-colors">
                <IconX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pt-2">
              <SidebarSection 
                title="Purchase Order Request" 
                groupKey="poRequest" 
                items={poRequestNav} 
              />
              <SidebarSection 
                title="Review Data" 
                groupKey="reviewData" 
                items={reviewDataNav}
                expandState={{ 'review-dashboard-group': expandedGroups.reviewDashboard }}
                onExpandItem={(id, val) => {
                  if (id === 'review-dashboard-group') toggleGroup('reviewDashboard');
                }}
              />
              <SidebarSection 
                title="Purchase Quote Register" 
                groupKey="quoteRegister" 
                items={quoteRegisterNav} 
              />
            </div>

            <div className="px-3 py-6 border-t border-[rgba(255,255,255,0.08)] space-y-4">
              {isAdmin && (
                <div className="pb-2 border-b border-[rgba(255,255,255,0.05)]">
                  <nav className="space-y-[2px]">
                    {adminNav.map((item) => <NavItem key={item.id} item={item} />)}
                  </nav>
                </div>
              )}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-bold text-[rgba(255,255,255,0.4)]">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium text-[rgba(255,255,255,0.8)] truncate">{user.email?.split('@')[0]}</span>
                    <span className="text-[10px] text-[rgba(255,255,255,0.3)] font-black uppercase tracking-[0.1em] truncate">{user.role === 'admin' ? 'Owner' : user.role}</span>
                  </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-label hover:text-white transition-colors" title="Logout">
                  <IconLogout size={18} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-[260px] flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Topbar */}
        <header className="sticky top-0 z-30 glass-panel !rounded-none border-b border-[rgba(255,255,255,0.07)] px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
            >
              <IconMenu2 size={22} />
            </button>
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
        <div className={activeTab === 'sheets' || activeTab === 'polog' || activeTab === 'prlist' ? "flex-1 w-full overflow-hidden" : "flex-1 w-full overflow-y-auto"}>
          {/* Purchase Order Request */}
          {activeTab === 'po-dashboard' && <ReviewDashboard />}
          {activeTab === 'polog' && <POLog initialPR={selectedPR} />}
          {activeTab === 'prlist' && <POLog mode="prlist" />}

          {/* Review Data */}
          {activeTab === 'review2025' && <ReviewYear year="2025" action="25" onSelectPR={handleSelectPR} />}
          {activeTab === 'review2026' && <ReviewYear year="2026" action="26" onSelectPR={handleSelectPR} />}
          {activeTab === 'sheets' && !isViewer && <Sheets darkMode={true} />}
          {activeTab === 'sheets' && isViewer && <div className="p-8 text-center text-red-400 font-bold glass-panel">Access Denied: You do not have permission to access Sheets.</div>}

          {/* Purchase Quote Register */}
          {activeTab === 'qr-dashboard' && <QuoteRegister subView="dashboard" />}
          {activeTab === 'qr-data' && <QuoteRegister subView="data" />}
          {activeTab === 'qr-material' && <QuoteRegister subView="material" />}
          {activeTab === 'qr-upload' && <QuoteRegister subView="upload" />}

          {/* Admin */}
          {activeTab === 'users' && isAdmin && <UserManagement />}

          {/* Legacy routes */}
          {activeTab === 'records' && <PRTable />}
          {activeTab === 'changes' && <PRTable showChangesOnly={true} />}
          {activeTab === 'vendors' && <VendorAnalysis />}
          {activeTab === 'insights' && <InsightsPanel />}
        </div>
      </main>
    </div>
  );
};

export default App;

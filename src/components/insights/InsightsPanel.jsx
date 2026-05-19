import React from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Award
} from 'lucide-react';

const SEVERITY = {
  warning: {
    iconBg: 'rgba(239,68,68,0.1)',
    iconBorder: 'rgba(239,68,68,0.2)',
    iconColor: '#EF4444',
    cardBorder: 'rgba(239,68,68,0.15)',
    cardGlow: 'rgba(239,68,68,0.04)',
    badge: { bg: 'rgba(239,68,68,0.1)', text: '#EF4444' },
  },
  success: {
    iconBg: 'rgba(16,185,129,0.1)',
    iconBorder: 'rgba(16,185,129,0.2)',
    iconColor: '#10B981',
    cardBorder: 'rgba(16,185,129,0.15)',
    cardGlow: 'rgba(16,185,129,0.04)',
    badge: { bg: 'rgba(16,185,129,0.1)', text: '#10B981' },
  },
  info: {
    iconBg: 'rgba(99,102,241,0.1)',
    iconBorder: 'rgba(99,102,241,0.2)',
    iconColor: '#6366F1',
    cardBorder: 'rgba(99,102,241,0.15)',
    cardGlow: 'rgba(99,102,241,0.04)',
    badge: { bg: 'rgba(99,102,241,0.1)', text: '#6366F1' },
  },
};

const InsightCard = ({ type, title, description, action, severity = 'info', index = 0 }) => {
  const s = SEVERITY[severity];

  const Icon = {
    alert: AlertCircle,
    sync: RefreshCw,
    shield: ShieldCheck,
    trend: TrendingUp,
    time: Clock,
  }[type];

  return (
    <div
      className="glass-panel p-8 flex gap-6 group hover:-translate-y-1 cursor-pointer transition-all duration-300 stagger-item"
      style={{
        borderColor: s.cardBorder,
        background: `linear-gradient(135deg, ${s.cardGlow} 0%, rgba(255,255,255,0.02) 100%)`,
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div
        className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}`, color: s.iconColor }}
      >
        <Icon size={26} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-3 gap-2">
          <h3 className="font-bold text-[17px] text-white tracking-tight leading-tight">{title}</h3>
          <span
            className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full shrink-0"
            style={{ background: s.badge.bg, color: s.badge.text }}
          >
            AI DETECT
          </span>
        </div>
        <p className="text-[13px] text-[rgba(255,255,255,0.45)] leading-relaxed mb-5 font-medium">{description}</p>
        <button
          className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider group-hover:gap-3 transition-all duration-200"
          style={{ color: s.iconColor }}
        >
          {action} <ArrowRight size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

const InsightsPanel = () => {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-6 stagger-item">
        <div className="w-16 h-16 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-2xl flex items-center justify-center text-[#F59E0B]">
          <Sparkles size={30} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">AI Insights</h1>
          <p className="text-[rgba(255,255,255,0.4)] font-medium mt-1">Automated anomaly detection and pattern recognition for your procurement cycle.</p>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightCard index={1} type="alert" severity="warning" title="Potential Price Inflation" description="We detected a 12.5% price increase for 'Dell PowerEdge' servers compared to last quarter's average. Significantly above the market trend." action="Review Historical Prices" />
        <InsightCard index={2} type="shield" severity="success" title="Duplicate PR Detected" description="PR-2024-089 appears to be a duplicate of PR-2024-045. Both have identical line items and quantities for the same project code." action="Resolve Conflict" />
        <InsightCard index={3} type="sync" severity="info" title="Frequent Reorder Alert" description="'Ink Cartridges - XL' are ordered weekly. Consolidating into a monthly bulk purchase could reduce logistics overhead by up to 15%." action="Optimize Schedule" />
        <InsightCard index={4} type="trend" severity="info" title="Volume Discount Opportunity" description="You are AED 4,500 away from the next discount tier with Cisco. Adding pending licenses now would trigger an 8% flat discount." action="View Tier Details" />
      </div>

      {/* Hero CTA */}
      <div className="relative glass-panel p-12 overflow-hidden stagger-item" style={{ animationDelay: '450ms' }}>
        {/* Ambient glows */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-xl flex items-center justify-center text-[#F59E0B]">
              <Award size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[rgba(255,255,255,0.4)]">Quarterly Intelligence Report</span>
          </div>
          <h2 className="text-5xl font-bold mb-5 tracking-tight text-white leading-tight">
            AED 24,500 in<br />
            <span className="text-[#F59E0B]">Identified Savings</span>
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] mb-10 text-[16px] leading-relaxed font-medium max-w-lg">
            ProcureSync's AI engine identified consolidation and early-discount opportunities across your active procurement pipeline this quarter.
          </p>
          <button className="px-10 py-4 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-black rounded-[14px] font-black text-[14px] hover:shadow-[0_8px_32px_rgba(245,158,11,0.5)] hover:-translate-y-1 active:scale-95 transition-all">
            DOWNLOAD FULL ANALYSIS
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;

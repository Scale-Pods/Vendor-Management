const FinancialCard = ({ label, value, prefix = 'AED', trend, color, sub }) => (
  <div className={`
    rounded-xl p-3.5 border
    ${color === 'gold'
      ? 'bg-[rgba(245,158,11,0.06)] border-[rgba(245,158,11,0.15)]'
      : color === 'green'
      ? 'bg-[rgba(16,185,129,0.06)] border-[rgba(16,185,129,0.15)]'
      : color === 'red'
      ? 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.15)]'
      : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]'
    }
  `}>
    <p className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] mb-1">{label}</p>
    <p className={`text-lg font-black flex items-center gap-1.5 ${
      color === 'gold' ? 'text-[#F59E0B]' :
      color === 'green' ? 'text-[#10B981]' :
      color === 'red' ? 'text-[#EF4444]' : 'text-white'
    }`}>
      <span className="text-[11px] font-bold opacity-60">{prefix}</span>
      {typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value || '0.00'}
      {trend && <span className={`text-[11px] ${trend > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%</span>}
    </p>
    {sub && <p className="text-[10px] text-[rgba(255,255,255,0.3)] mt-0.5">{sub}</p>}
  </div>
);

export default FinancialCard;

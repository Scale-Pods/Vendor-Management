import { useMemo } from 'react';
import { useTabData } from '../hooks/usePRData';
import { CardSkeleton } from '../components/Skeleton';
import { IconFileText, IconFile, IconClock } from '@tabler/icons-react';

const AttachmentsTab = ({ pr }) => {
  const po = useTabData('poData', pr);
  const poLines = useTabData('purchaseOrders', pr);

  if (po.isPending || poLines.isPending) return <CardSkeleton />;

  const poData = Array.isArray(po.data) ? po.data.flat(Infinity) : [];
  const purchOrders = Array.isArray(poLines.data) ? poLines.data.flat(Infinity) : [];

  const items = useMemo(() => {
    const results = [];
    poData.forEach((row) => {
      if (row.Attachments || row.attachments) results.push({ source: 'PO Data', ref: row.Ref || 'N/A', value: row.Attachments || row.attachments, type: 'attachment' });
      if (row['Approval History'] || row.approval_history) results.push({ source: 'PO Data', ref: row.Ref || 'N/A', value: row['Approval History'] || row.approval_history, type: 'approval' });
    });
    purchOrders.forEach((row) => {
      if (row.Next_Doc || row.next_doc) results.push({ source: 'Purchase Orders', ref: row.PR || 'N/A', value: row.Next_Doc || row.next_doc, type: 'document', srNo: row.Sr_No || row.sr_no });
    });
    return results;
  }, [poData, purchOrders]);

  const typeConfig = {
    attachment: { icon: IconFileText, color: 'text-[#F59E0B]', label: 'Attachment' },
    approval: { icon: IconClock, color: 'text-[#3B82F6]', label: 'Approval History' },
    document: { icon: IconFile, color: 'text-[#10B981]', label: 'Document' },
  };

  if (items.length === 0) return <p className="text-[rgba(255,255,255,0.3)] text-sm py-8 text-center">No attachments or approval history.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] px-2 pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <IconFileText size={14} /><span>{items.length} items</span>
      </div>
      {items.map((item, idx) => {
        const cfg = typeConfig[item.type] || typeConfig.attachment;
        const Icon = cfg.icon;
        return (
          <div key={idx} className="flex items-start gap-3 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:border-[rgba(245,158,11,0.15)] transition-colors">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color} bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]`}><Icon size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase text-[rgba(255,255,255,0.3)]">{cfg.label}</span>
                <span className="text-[10px] text-[rgba(255,255,255,0.2)]">·</span>
                <span className="text-[10px] text-[#F59E0B]">{item.source}</span>
                {item.ref && <span className="text-[10px] text-[rgba(255,255,255,0.3)]">· {item.ref}</span>}
              </div>
              <p className="text-[13px] text-[rgba(255,255,255,0.7)] break-words">{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttachmentsTab;

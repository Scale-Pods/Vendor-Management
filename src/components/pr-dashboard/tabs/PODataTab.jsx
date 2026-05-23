import { useState, useCallback, Fragment } from 'react';
import { useTabData } from '../hooks/usePRData';
import InlineCell from '../components/InlineCell';
import ChangeTimeline from '../components/ChangeTimeline';
import { TableSkeleton } from '../components/Skeleton';
import { IconChevronDown, IconChevronRight, IconClock } from '@tabler/icons-react';

const PO_COLUMNS = [
  { key: 'created_at', label: 'Created At', width: 110 },
  { key: 'sr_no', label: 'Sr No', width: 60 },
  { key: 'Ref', label: 'Ref', width: 110 },
  { key: 'po_date', label: 'PO Date', width: 100 },
  { key: 'Approve / Reject', label: 'Approve / Reject', width: 100 },
  { key: 'Status', label: 'Status', width: 90 },
  { key: 'Project', label: 'Project', width: 130 },
  { key: 'Company', label: 'Company', width: 120 },
  { key: 'Pending Approval', label: 'Pending Approval', width: 110 },
  { key: 'Supplier', label: 'Supplier', width: 130 },
  { key: 'PO Class', label: 'PO Class', width: 90 },
  { key: 'Entered By', label: 'Entered By', width: 100 },
  { key: 'Entered Time', label: 'Entered Time', width: 90 },
  { key: 'Req Ref', label: 'Req Ref', width: 100 },
  { key: 'qc_ref', label: 'QC Ref', width: 90 },
  { key: 'Doc. Remarks', label: 'Doc. Remarks', width: 180 },
  { key: 'Terms & Conditions', label: 'Terms & Conditions', width: 180 },
  { key: 'Attachments', label: 'Attachments', width: 120 },
  { key: 'Approval History', label: 'Approval History', width: 120 },
  { key: 'Approval Config', label: 'Approval Config', width: 120 },
  { key: 'Discount', label: 'Discount', width: 80 },
  { key: 'Net Price', label: 'Net Price', width: 90 },
  { key: 'VAT', label: 'VAT', width: 80 },
  { key: 'Total Price', label: 'Total Price', width: 90 },
  { key: 'Status_1', label: 'Status 1', width: 80 },
  { key: 'Original Pirce', label: 'Original Price', width: 100 },
  { key: 'change_in_price_1', label: 'Change 1', width: 90 },
  { key: 'change_in_price_1_date', label: 'Change 1 Date', width: 105 },
  { key: 'change_in_price_2', label: 'Change 2', width: 90 },
  { key: 'change_in_price_2_date', label: 'Change 2 Date', width: 105 },
  { key: 'change_in_price_3', label: 'Change 3', width: 90 },
  { key: 'change_in_price_3_date', label: 'Change 3 Date', width: 105 },
  { key: 'change_in_price_4', label: 'Change 4', width: 90 },
  { key: 'change_in_price_4_date', label: 'Change 4 Date', width: 105 },
  { key: 'change_in_price_5', label: 'Change 5', width: 90 },
  { key: 'change_in_price_5_date', label: 'Change 5 Date', width: 105 },
  { key: 'Month', label: 'Month', width: 70 },
  { key: 'id', label: 'ID', width: 70 },
  { key: 'Charges', label: 'Charges', width: 80 },
];

const totalWidth = PO_COLUMNS.reduce((s, c) => s + c.width, 0) + 40;

const PODataTab = ({ pr, onSave }) => {
  const { data, isPending, isFetching, isError, refetch } = useTabData('poData', pr);

  const rows = Array.isArray(data) ? data.flat(Infinity).filter(Boolean) : [];

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = useCallback(
    (idx) => setExpandedRows((p) => ({ ...p, [idx]: !p[idx] })),
    []
  );

  if (isPending || isFetching) return <TableSkeleton rows={8} cols={6} />;

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-[#EF4444] font-bold text-sm">Failed to load PO Data</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-[rgba(245,158,11,0.1)] text-[#F59E0B] rounded-lg border border-[rgba(245,158,11,0.2)] text-[12px] font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-[rgba(255,255,255,0.3)] text-sm py-8 text-center">
        No PO Data available for this PR.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-none rounded-xl border border-[rgba(255,255,255,0.06)]"
      style={{ minWidth: `${totalWidth}px` }}
    >
      <table className="w-full border-collapse" style={{ minWidth: `${totalWidth}px` }}>
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#0A0E17]">
            <th className="w-8 px-2 py-2.5 border-r border-[rgba(255,255,255,0.06)]" />
            {PO_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.35)] px-2 py-2.5 text-left whitespace-nowrap"
                style={{ width: col.width, minWidth: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <Fragment key={row.id || idx}>
              <tr
                className={`border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.01)] transition-colors ${
                  expandedRows[idx] ? 'bg-[rgba(245,158,11,0.03)]' : ''
                }`}
              >
                <td className="w-8 px-2 py-1.5 border-r border-[rgba(255,255,255,0.06)]">
                  <button
                    onClick={() => toggleRow(idx)}
                    className="text-[rgba(255,255,255,0.3)] hover:text-[#F59E0B] transition-colors"
                    title={expandedRows[idx] ? 'Collapse' : 'Expand timeline'}
                  >
                    {expandedRows[idx] ? (
                      <IconChevronDown size={14} />
                    ) : (
                      <IconChevronRight size={14} />
                    )}
                  </button>
                </td>
                {PO_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="px-2 py-1.5 text-[12px]"
                    style={{ minWidth: col.width, maxWidth: col.width }}
                  >
                    <InlineCell
                      value={row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : ''}
                      row={row}
                      column={col.key}
                      onSave={onSave}
                    />
                  </td>
                ))}
              </tr>
              {expandedRows[idx] && (
                <tr>
                  <td
                    colSpan={PO_COLUMNS.length + 1}
                    className="px-4 py-3 bg-[rgba(255,255,255,0.01)] border-b border-[rgba(255,255,255,0.06)]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <IconClock size={14} className="text-[#F59E0B]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
                          Change Timeline
                        </span>
                      </div>
                      <ChangeTimeline row={row} changeCount={5} />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PODataTab;

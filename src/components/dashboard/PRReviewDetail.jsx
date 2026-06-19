import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IconBriefcase, IconBuildingStore, IconPackage,
  IconArrowsDiff, IconCurrencyDollar
} from '@tabler/icons-react';

const extractVersions = (row) => {
  const versions = [];
  const desc = row.Description || row.description || '';
  let hasChange1 = false;

  for (let i = 1; i <= 20; i++) {
    const hasAnyChange = Object.keys(row).some(key => key.startsWith(`change${i}_`) && row[key] != null && row[key] !== '');
    if (hasAnyChange) {
      if (i === 1) hasChange1 = true;
      versions.push({
        version: i === 1 ? 'Baseline' : `Version ${i - 1}`,
        qty: row[`change${i}_qty`] || row[`change${i}_Qty`] || '0.00',
        rate: row[`change${i}_rate`] || row[`change${i}_Rate`] || '0.00',
        price: row[`change${i}_price`] || row[`change${i}_Price`] || '0.00',
        vat: row[`change${i}_vat`] || row[`change${i}_Vat`] || '0.00',
        total: row[`change${i}_total`] || row[`change${i}_Total`] || '0.00',
        supplier: row[`change${i}_supplier`] || row[`change${i}_Supplier`] || 'N/A',
        desc: row[`change${i}_description`] || row[`change${i}_Description`] || desc
      });
    }
  }

  if (!hasChange1) {
    const qty = row.Req_Qty || row.ReqQty || row.Qty || row.qty;
    const rate = row.Rate || row.rate;
    const price = row.Price || row.price;
    const vat = row.VAT || row.vat;
    const total = row.Total || row.total;
    const supplier = row.Supplier || row.supplier;

    if (qty != null || rate != null || price != null) {
      versions.unshift({
        version: 'Baseline',
        qty: qty || '0.00',
        rate: rate || '0.00',
        price: price || '0.00',
        vat: vat || '0.00',
        total: total || '0.00',
        supplier: supplier || 'N/A',
        desc
      });
    }
  }

  return versions;
};

const isDiff = (field, idx, versions) => {
  if (idx === 0) return false;
  const currentVal = String(versions[idx][field] || '').trim().toLowerCase();
  const prevVal = String(versions[idx - 1][field] || '').trim().toLowerCase();
  return currentVal !== prevVal;
};

const renderCell = (field, idx, versions) => {
  const val = versions[idx][field] || '0.00';
  const hasDiff = isDiff(field, idx, versions);
  return (
    <span className={hasDiff ? "text-[#F59E0B] font-extrabold bg-[rgba(245,158,11,0.12)] px-1.5 py-0.5 rounded border border-[rgba(245,158,11,0.25)]" : "text-white"}>
      {val}
    </span>
  );
};

const MaterialCard = ({ item }) => {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const versions = extractVersions(item);
  const pr = item.PR || item.PR_No || 'N/A';
  const srNo = item['Sr.No'] || item.Sr_No || '1';
  const project = item.Project || 'N/A';
  const desc = item.Description || item.description || 'No description';
  const supplier = versions.length > 0 ? versions[versions.length - 1].supplier : 'N/A';

  return (
    <div className="bg-[#121824] border border-[rgba(255,255,255,0.04)] rounded-2xl p-6 space-y-4 hover:border-[#F59E0B]/40 transition-all duration-300">
      <div className="flex justify-between items-center">
        <h5 className="text-base font-black text-[#F59E0B] tracking-tight uppercase">
          {pr}
        </h5>
        <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)] uppercase tracking-wider shrink-0">
          Item SN: {srNo}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase">Project</p>
          <div className="flex items-center gap-1.5 text-white font-bold text-sm mt-0.5 truncate" title={project}>
            <IconBriefcase size={14} className="text-[rgba(255,255,255,0.4)] shrink-0" />
            <span className="truncate">{project}</span>
          </div>
        </div>
        <div className="flex-1 text-right min-w-0">
          <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase">Supplier</p>
          <div className="flex items-center justify-end gap-1.5 text-[#F59E0B] font-semibold text-[11px] mt-0.5 truncate" title={supplier}>
            <IconBuildingStore size={12} className="shrink-0" />
            <span className="truncate max-w-[140px]">{supplier}</span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase mb-1">Description</p>
        <p
          onClick={() => setIsDescExpanded(!isDescExpanded)}
          className={`text-xs text-[rgba(255,255,255,0.7)] font-medium leading-relaxed cursor-pointer select-none ${
            isDescExpanded ? '' : 'line-clamp-2'
          }`}
          title="Click to expand description"
        >
          {desc}
        </p>
      </div>

      {versions.length > 0 && (
        <div className="overflow-x-auto border border-[rgba(255,255,255,0.05)] rounded-xl bg-[#090e17]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
                <th className="px-4 py-2.5">Version</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">Rate</th>
                <th className="px-4 py-2.5">Price</th>
                <th className="px-4 py-2.5">VAT</th>
                <th className="px-4 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.85)]">
              {versions.slice(-2).map((v, idx, arr) => {
                const label = idx === arr.length - 1 ? 'Current' : 'Previous';
                return (
                <tr key={idx} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                  <td className="px-4 py-3 font-extrabold text-[#F59E0B] uppercase">{label}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('qty', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('rate', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('price', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-semibold">{renderCell('vat', versions.indexOf(v), versions)}</td>
                  <td className="px-4 py-3 font-bold text-white">{renderCell('total', versions.indexOf(v), versions)}</td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {versions.length > 2 && (
        <div className="flex items-center gap-2 text-[10px] text-[rgba(255,255,255,0.3)] font-bold uppercase tracking-wider">
          <IconArrowsDiff size={14} />
          <span>{versions.length} versions — showing last 2</span>
        </div>
      )}
    </div>
  );
};

const PRReviewDetail = ({ pr, year }) => {
  const { data: prData = [], isLoading, error } = useQuery({
    queryKey: ['pr-review-detail', pr, year],
    queryFn: async () => {
      const response = await fetch(`/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_PR_DETAIL}?pr=${encodeURIComponent(pr)}&year=${encodeURIComponent(year)}`);
      if (!response.ok) throw new Error('Failed to fetch PR detail data');
      const json = await response.json();
      return normalizeWebhookData(json);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!pr,
  });

  const latestSupplier = useMemo(() => {
    if (!prData.length) return 'N/A';
    for (const item of prData) {
      const versions = extractVersions(item);
      if (versions.length > 0) return versions[versions.length - 1].supplier;
    }
    return 'N/A';
  }, [prData]);

  const totalChanges = useMemo(() => {
    let count = 0;
    prData.forEach(item => {
      if (extractVersions(item).length > 1) count++;
    });
    return count;
  }, [prData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="w-12 h-12 border-4 border-white/5 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] animate-pulse">Loading PR Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <IconPackage size={48} className="text-red-500/30" />
        <p className="text-sm font-bold text-red-400">Failed to load PR details</p>
        <p className="text-[10px] text-white/30 font-medium">{error.message}</p>
      </div>
    );
  }

  if (!prData.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <IconPackage size={48} className="text-white/10" />
        <p className="text-sm font-bold text-white/30 uppercase tracking-[0.2em]">No material data found for {pr}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0d1117] border border-white/[0.05] rounded-2xl p-5">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">PR Number</p>
          <p className="text-xl font-black text-[#F59E0B]">{pr}</p>
        </div>
        <div className="bg-[#0d1117] border border-white/[0.05] rounded-2xl p-5">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Supplier</p>
          <p className="text-sm font-bold text-white truncate">{latestSupplier}</p>
        </div>
        <div className="bg-[#0d1117] border border-white/[0.05] rounded-2xl p-5">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Items with Changes</p>
          <p className="text-xl font-black text-white">{totalChanges} / {prData.length}</p>
        </div>
      </div>

      {/* Material Items */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <IconPackage size={18} className="text-[#F59E0B]" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Material Items</h3>
          <span className="text-[10px] text-white/30 font-bold ml-auto">{prData.length} items</span>
        </div>
        {prData.map((item, idx) => (
          <MaterialCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
};

const normalizeWebhookData = (data) => {
  if (!data) return [];

  let current = data;
  while (Array.isArray(current) && current.length === 1) {
    current = current[0];
  }

  const findPrContainer = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = findPrContainer(item);
        if (found) return found;
      }
      return null;
    }

    const prVal = obj.pr || obj.PR || obj.PR_No || obj.PR_Number || obj['PR No'] || obj.prNo || obj.pr_no || obj.pr_number || obj['Req Ref'] || obj.Req_Ref;
    const itemsArr = obj.items || obj.Items || obj.material_items || obj.materialItems || obj.pr_items || obj.prItems || obj.list;

    if (prVal && itemsArr && Array.isArray(itemsArr)) {
      return {
        pr: prVal,
        project: obj.project || obj.Project || obj.project_name || obj.projectName || 'N/A',
        items: itemsArr
      };
    }

    for (const key of Object.keys(obj)) {
      const found = findPrContainer(obj[key]);
      if (found) return found;
    }
    return null;
  };

  const prContainer = findPrContainer(current);

  if (prContainer && Array.isArray(prContainer.items)) {
    return prContainer.items.map(item => {
      const mapped = {
        PR: prContainer.pr,
        Project: prContainer.project,
        'Sr.No': item.sr_no || item.Sr_No || item.srNo || item.serial || '1',
        Description: item.description || item.Description || item.desc || 'No description',
        Req_Qty: item.req_qty || item.Req_Qty || item.qty || item.quantity || '0.00',
      };

      const versionsList = item.versions || item.Versions || item.history || item.History || [];
      if (Array.isArray(versionsList)) {
        versionsList.forEach(v => {
           const i = v.version || v.Version || v.v || 1;
           mapped[`change${i}_qty`] = v.qty || v.Qty || v.quantity || '0.00';
           mapped[`change${i}_rate`] = v.rate || v.Rate || v.price || '0.00';
           mapped[`change${i}_price`] = v.price || v.Price || v.amount || '0.00';
           mapped[`change${i}_vat`] = v.vat || v.Vat || '0.00';
           mapped[`change${i}_total`] = v.total || v.Total || v.total_amount || '0.00';
           mapped[`change${i}_supplier`] = v.supplier || v.Supplier || 'N/A';
           mapped[`change${i}_description`] = v.description || v.Description || item.description || 'No description';
        });
      }
      return mapped;
    });
  }

  if (typeof current === 'object' && !Array.isArray(current)) {
    if (Array.isArray(current.data)) current = current.data;
    else if (Array.isArray(current.items)) current = current.items;
    else if (Array.isArray(current.result)) current = current.result;
    else {
      const keys = Object.keys(current);
      if (keys.length === 1 && Array.isArray(current[keys[0]])) {
        current = current[keys[0]];
      }
    }
  }

  let items = Array.isArray(current) ? current : [current];
  return items
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      PR: item.PR || item.pr || item.PR_No || item['Req Ref'] || 'N/A',
      Project: item.Project || item.project || 'N/A',
      'Sr.No': item['Sr.No'] || item.Sr_No || item.sr_no || '1',
      Description: item.Description || item.description || 'No description',
      Req_Qty: item.Req_Qty || item.req_qty || item.Qty || item.qty || '0.00',
      ...Object.fromEntries(
        Object.entries(item).filter(([key]) => key.startsWith('change'))
      )
    }))
    .filter(item => {
      const hasChangeData = Object.keys(item).some(k => k.startsWith('change'));
      const hasDescription = item.Description && item.Description !== 'No description' && item.Description.trim() !== '';
      const hasQty = item.Req_Qty && item.Req_Qty !== '0.00';
      const hasRate = item.Rate || item.rate || false;
      return hasDescription || hasQty || hasRate || hasChangeData;
    });
};

export default PRReviewDetail;

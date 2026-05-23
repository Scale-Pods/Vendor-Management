self.onmessage = (e) => {
  const { rows } = e.data;

  const getRowStr = (row, ...keys) => {
    for (const k of keys) {
      const v = row[k];
      if (v !== null && v !== undefined && v !== '') return String(v).trim();
    }
    return '';
  };

  const groups = {};

  for (const row of rows) {
    const pr = getRowStr(row, 'Req Ref', 'req_ref', 'Req_Ref', 'PR', 'pr');
    if (!pr) continue;

    if (!groups[pr]) {
      groups[pr] = {
        pr,
        rows: [],
        projects: new Set(),
        suppliers: new Set(),
        companies: new Set(),
        statuses: [],
        dates: [],
      };
    }

    groups[pr].rows.push(row);
    const proj = getRowStr(row, 'Project', 'project');
    if (proj) groups[pr].projects.add(proj);
    const supp = getRowStr(row, 'Supplier', 'supplier');
    if (supp) groups[pr].suppliers.add(supp);
    const comp = getRowStr(row, 'Company', 'company');
    if (comp) groups[pr].companies.add(comp);
    const st = getRowStr(row, 'Status', 'status');
    if (st) groups[pr].statuses.push(st);
    const dt = getRowStr(row, 'PO Date', 'po_date', 'created_at', 'date', 'Date');
    if (dt) groups[pr].dates.push(dt);
  }

  const result = Object.values(groups).map((g) => ({
    pr: g.pr,
    project: g.projects.values().next().value || g.rows[0]?.Project || 'N/A',
    supplier: g.suppliers.values().next().value || g.rows[0]?.Supplier || 'N/A',
    company: g.companies.values().next().value || g.rows[0]?.Company || 'N/A',
    totalAmount: g.rows.reduce((s, r) => s + (parseFloat(r['Net Price']) || 0), 0),
    totalVAT: g.rows.reduce((s, r) => s + (parseFloat(r.VAT) || 0), 0),
    totalEntries: g.rows.length,
    latestStatus: g.statuses[g.statuses.length - 1] || 'Open',
    latestActivityDate: g.dates.sort().reverse()[0] || '',
  }));

  self.postMessage({ groups: result });
};

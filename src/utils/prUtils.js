
/**
 * Utility to parse PR items with multiple potential changes.
 */
export const processPRItems = (items) => {
  if (!items || !Array.isArray(items)) return [];
  
  return items.map(item => {
    const history = [];
    
    // Determine the starting point. 
    // If ANY change1 field exists, it is the actual "Version 1" / Baseline.
    // Otherwise, we use the root properties as "Original".
    const hasChange1 = Object.keys(item).some(key => key.startsWith('change1_') && item[key] != null && item[key] !== '');

    if (!hasChange1) {
      history.push({
        version: 'Original',
        description: item.Description,
        qty: item.Req_Qty,
        uom: item.UOM,
        project: item.Project,
        remainQty: item.Remain_Qty,
        nextDoc: item.Next_Doc,
        rate: item.Rate || null, 
        price: item.Price || null,
        vat: item.VAT || null,
        total: item.Total || null,
        supplier: item.Supplier || null,
        srNo: item.Sr_No,
        prNo: item.PR || item.PR_No
      });
    }

    // Collect all Change 1-20
    for (let i = 1; i <= 20; i++) {
      const hasAnyChange = Object.keys(item).some(key => key.startsWith(`change${i}_`) && item[key] != null && item[key] !== '');
      if (hasAnyChange) {
        history.push({
          version: `Version ${i}`,
          description: item[`change${i}_description`] || item.Description,
          qty: item[`change${i}_qty`],
          rate: item[`change${i}_rate`],
          price: item[`change${i}_price`],
          vat: item[`change${i}_vat`],
          total: item[`change${i}_total`],
          supplier: item[`change${i}_supplier`],
          uom: item.UOM,
          project: item.Project,
          nextDoc: item.Next_Doc
        });
      }
    }

    const latest = history[history.length - 1] || {};
    const original = history[0] || {};
    
    const changes = {
      supplier: String(latest.supplier || '').trim().toLowerCase() !== String(original.supplier || '').trim().toLowerCase(),
      qty: Math.abs(parseFloat(latest.qty || 0) - parseFloat(original.qty || 0)) >= 0.01,
      rate: Math.abs(parseFloat(latest.rate || 0) - parseFloat(original.rate || 0)) >= 0.01,
      description: String(latest.description || '').trim().toLowerCase() !== String(original.description || '').trim().toLowerCase()
    };

    return {
      ...item,
      Description: latest.description || item.Description,
      Req_Qty: latest.qty || item.Req_Qty,
      Supplier: latest.supplier || item.Supplier,
      Total: latest.total || item.Total,
      Rate: latest.rate || item.Rate,
      Price: latest.price || item.Price,
      VAT: latest.vat || item.VAT,
      _latest: latest,
      _original: original,
      _history: history.slice(0, -1).reverse(),
      _hasChanges: history.length > 1,
      _fieldChanges: changes,
      _verification: null 
    };
  }).filter(item => item.Sr_No !== 'Sr.No');
};

/**
 * Intelligent Parser that handles data with OR without headers.
 * It uses heuristics to map columns if no clear header is found.
 */
export const parseClipboardData = (text) => {
  if (!text) return [];
  
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Determine separator
  let sep = '\t';
  if (!lines[0].includes('\t')) {
    if (lines[0].includes('|')) sep = '|';
    else if (lines[0].includes(',')) sep = ',';
    else sep = / {2,}/; 
  }

  const rows = lines.map(line => line.split(sep).map(c => c.trim()));
  
  // Heuristic: Is the first row a header?
  const headerKeywords = ['sr', 'no', 'description', 'item', 'supplier', 'vendor', 'qty', 'rate', 'price', 'amount', 'total'];
  const firstRowLower = rows[0].map(c => c.toLowerCase());
  const isHeader = firstRowLower.some(cell => headerKeywords.some(k => cell.includes(k)));

  let dataRows = isHeader ? rows.slice(1) : rows;
  let headers = isHeader ? firstRowLower.map(h => h.replace(/[^a-z0-9]/g, '')) : null;

  // If no headers, we'll return raw arrays and let the verifier handle the mapping intelligently
  if (!headers) {
    return dataRows.map(row => ({ _raw: row }));
  }

  return dataRows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  });
};

/**
 * Enhanced Verification Engine
 * Handles cases where columns are unidentified by performing cross-matching.
 */
export const verifyPRWithExternal = (prItems, externalData) => {
  return prItems.map(item => {
    // 1. Find the best matching row from pasted data
    let matchRow = null;
    let matchObj = null;

    for (const ext of externalData) {
      if (ext._raw) {
        // Handle raw row (no headers)
        const row = ext._raw;
        // Match by Sr No (usually first column or small integer)
        const likelySr = row.find(c => String(c) === String(item.Sr_No));
        // Match by Description (fuzzy search in any long string cell)
        const likelyDesc = row.find(c => c.length > 10 && (item.Description.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(item.Description.toLowerCase())));
        
        if (likelySr || likelyDesc) {
          matchRow = row;
          break;
        }
      } else {
        // Handle object with headers
        const extSr = ext.srno || ext.no || ext.itemno || ext.sn;
        const extDesc = ext.description || ext.item || ext.itemdescription || ext.material;
        if ((extSr && String(extSr) === String(item.Sr_No)) || (extDesc && item.Description.toLowerCase().includes(extDesc.toLowerCase()))) {
          matchObj = ext;
          break;
        }
      }
    }

    if (!matchRow && !matchObj) return { ...item, _verification: { status: 'missing' } };

    // 2. Extract values intelligently
    let extSupplier, extQty, extRate;

    if (matchObj) {
      extSupplier = matchObj.supplier || matchObj.vendor || matchObj.suppliername || '';
      extQty = matchObj.qty || matchObj.quantity || matchObj.reqqty || matchObj.orderedqty || '0';
      extRate = matchObj.rate || matchObj.price || matchObj.unitprice || matchObj.itemrate || '0';
    } else {
      // Heuristic for raw rows
      // Supplier: Look for cells with "LLC", "Trading", "General", or strings matching item.Supplier
      extSupplier = matchRow.find(c => /llc|trading|general|est|corp|limited/i.test(c) || (item.Supplier && c.toLowerCase().includes(item.Supplier.toLowerCase()))) || '';
      
      // Numbers: Find all numeric values in the row
      const numbers = matchRow.map(c => parseFloat(String(c).replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
      
      // Qty is usually the one closest to item.Req_Qty
      extQty = numbers.find(n => Math.abs(n - parseFloat(item.Req_Qty)) < 0.1) || numbers[0] || '0';
      
      // Rate is usually the one closest to item.Rate
      extRate = numbers.find(n => Math.abs(n - parseFloat(item.Rate)) < 1) || numbers[1] || '0';
      
      // If we only found one number, assign it to the more likely field
      if (numbers.length === 1) {
        if (Math.abs(numbers[0] - parseFloat(item.Req_Qty)) < Math.abs(numbers[0] - parseFloat(item.Rate))) {
          extQty = numbers[0];
          extRate = '0';
        } else {
          extRate = numbers[0];
          extQty = '0';
        }
      }
    }

    // 3. Diffing
    const diffs = {
      supplier: extSupplier ? String(extSupplier).trim().toLowerCase() !== String(item.Supplier || '').trim().toLowerCase() : false,
      qty: parseFloat(String(extQty).replace(/,/g, '')) !== parseFloat(String(item.Req_Qty || 0).replace(/,/g, '')),
      rate: parseFloat(String(extRate).replace(/,/g, '')) !== parseFloat(String(item.Rate || 0).replace(/,/g, ''))
    };

    return {
      ...item,
      _verification: {
        status: (diffs.supplier || diffs.qty || diffs.rate) ? 'mismatch' : 'match',
        diffs,
        external: { supplier: extSupplier, qty: extQty, rate: extRate }
      }
    };
  });
};

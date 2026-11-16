/**
 * Shared price-history helpers.
 *
 * Stored price model:
 *   current_*  → the latest / current price (shown as "Current")
 *   change1_*  → the price that was current before `current_*` (one step back)
 *   change2_*  → the price before change1 (two steps back)
 *   ...and so on for change3, change4, change5.
 *
 * In other words, a higher change number is OLDER. Any consumer that needs a
 * chronological list must reverse the numeric order and put `current_*` last.
 */

const MAX_CHANGES = 5;

const VERSION_FIELDS = [
  'description',
  'qty',
  'rate',
  'price',
  'vat',
  'total',
  'supplier',
  'date',
];

const isBlank = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '');

const getField = (row, prefix, field) => {
  if (!row) return undefined;

  const prefixes = [prefix, prefix.toUpperCase()];
  const fields = [field, field.toUpperCase(), field.charAt(0).toUpperCase() + field.slice(1)];

  for (const p of prefixes) {
    for (const f of fields) {
      const key = `${p}_${f}`;
      if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    }
  }

  return undefined;
};

const hasAnyValue = (version) =>
  VERSION_FIELDS.some((field) => !isBlank(version[field]));

const buildVersion = (row, prefix, sourceIndex) => {
  const version = { source: prefix, sourceIndex };

  VERSION_FIELDS.forEach((field) => {
    version[field] = getField(row, prefix, field);
  });

  return version;
};

/**
 * Returns a chronological (oldest → newest) list of price versions for a row.
 * `current_*` is always the last item when present. If a row has no current_*
 * values (older data), the lowest available change number is treated as the
 * latest value.
 */
export function getPriceHistory(row) {
  if (!row) return [];

  const versions = [];

  for (let i = 1; i <= MAX_CHANGES; i += 1) {
    const version = buildVersion(row, `change${i}`, i);
    if (hasAnyValue(version)) versions.push(version);
  }

  // A higher change index is older, so sort descending first (oldest → newest).
  versions.sort((a, b) => b.sourceIndex - a.sourceIndex);

  const current = buildVersion(row, 'current', 0);
  if (hasAnyValue(current)) versions.push(current);

  return versions.map((version, index) => ({
    ...version,
    label:
      index === versions.length - 1
        ? 'Current'
        : index === 0
          ? 'Baseline'
          : `Change ${index}`,
    isCurrent: index === versions.length - 1,
  }));
}

export function getCurrentVersion(row) {
  const history = getPriceHistory(row);
  return history.length ? history[history.length - 1] : null;
}

export function getPreviousVersion(row) {
  const history = getPriceHistory(row);
  return history.length > 1 ? history[history.length - 2] : null;
}

/**
 * The newest version that actually carries a monetary value.
 *
 * Versions where price/VAT/total are all blank or zero are treated as empty,
 * so a populated `change1_*` still surfaces when the current revision has no
 * numbers yet. Missing pieces are derived where possible:
 *   - price  ← rate × qty, or total − VAT, or total
 *   - total  ← price + VAT
 *   - VAT    ← total − price
 */
export function getVersionAmounts(version) {
  if (!version) return null;

  let price = toNumber(version.price);
  let vat = toNumber(version.vat);
  let total = toNumber(version.total);
  const rate = toNumber(version.rate);
  const qty = toNumber(version.qty);

  if (price === null && rate !== null && qty !== null) price = rate * qty;

  const hasAmount = [price, vat, total].some(
    (value) => value !== null && value !== 0,
  );
  if (!hasAmount) return null;

  if (total === null && (price !== null || vat !== null)) {
    total = (price || 0) + (vat || 0);
  }
  if (vat === null && total !== null && price !== null && price !== 0) {
    vat = total - price;
  }
  if (price === null || (price === 0 && total !== null)) {
    price = total !== null ? total - (vat || 0) : price;
  }
  if (vat === null) vat = 0;
  if (total === null) total = (price || 0) + (vat || 0);

  return { price, vat, total };
}

export function getCurrentAmounts(row) {
  const history = getPriceHistory(row);

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const version = history[i];
    const amounts = getVersionAmounts(version);
    if (!amounts) continue;

    return {
      ...amounts,
      version,
      versionIndex: i,
      isCurrent: i === history.length - 1,
    };
  }

  return null;
}

export function getOriginalVersion(row) {
  const history = getPriceHistory(row);
  return history.length ? history[0] : null;
}

/**
 * Number of recorded revisions. A baseline plus one newer price = 1 change.
 */
export function countPriceChanges(row) {
  return Math.max(0, getPriceHistory(row).length - 1);
}

export function toNumber(value) {
  if (isBlank(value)) return null;

  const parsed = parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

const getVersionAmount = (version, { skipZero = false } = {}) => {
  if (!version) return null;

  const values = [version.total, version.price];

  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed === null) continue;
    if (skipZero && parsed === 0) continue;
    return parsed;
  }

  return null;
};

const getFallbackTotal = (row) => {
  const fallbackKeys = [
    'Total Price',
    'Net Price',
    'Total',
    'total',
    'Price',
    'price',
    'Amount',
    'amount',
  ];

  for (const key of fallbackKeys) {
    const amount = toNumber(row?.[key]);
    if (amount !== null && amount !== 0) return amount;
  }

  return 0;
};

const findAmount = (history, { reverse = false, skipZero = false } = {}) => {
  if (reverse) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const amount = getVersionAmount(history[i], { skipZero });
      if (amount !== null) return amount;
    }
  } else {
    for (let i = 0; i < history.length; i += 1) {
      const amount = getVersionAmount(history[i], { skipZero });
      if (amount !== null) return amount;
    }
  }

  return null;
};

/**
 * The newest monetary value. Prefers `current_total` / `current_price`, then
 * walks backwards through change1, change2, ... if needed.
 */
export function getLatestTotal(row) {
  const history = getPriceHistory(row);
  const amount = findAmount(history, { reverse: true, skipZero: true });

  return amount !== null ? amount : getFallbackTotal(row);
}

/**
 * The oldest / baseline monetary value (highest change number).
 */
export function getOriginalTotal(row) {
  const history = getPriceHistory(row);
  const amount = findAmount(history);

  if (amount !== null) return amount;

  const latest = findAmount(history, { reverse: true, skipZero: true });
  return latest !== null ? latest : getFallbackTotal(row);
}

/**
 * One-pass summary used by dashboards/tables. Avoid calling the individual
 * helpers in a loop when this is available.
 */
export function summarizePriceHistory(row) {
  const history = getPriceHistory(row);
  const latest = findAmount(history, { reverse: true, skipZero: true });
  const original = findAmount(history);

  return {
    history,
    current: history.length ? history[history.length - 1] : null,
    original: history.length ? history[0] : null,
    latestTotal: latest !== null ? latest : getFallbackTotal(row),
    originalTotal: original !== null ? original : (latest !== null ? latest : getFallbackTotal(row)),
    changeCount: Math.max(0, history.length - 1),
  };
}

export function getCurrentSupplier(row) {
  const current = getCurrentVersion(row);
  return (
    current?.supplier ||
    row?.change1_supplier ||
    row?.Supplier ||
    row?.supplier ||
    'Unknown'
  );
}

export function getCurrentDescription(row) {
  const current = getCurrentVersion(row);
  return (
    current?.description ||
    row?.change1_description ||
    row?.Description ||
    row?.description ||
    ''
  );
}

export { MAX_CHANGES };

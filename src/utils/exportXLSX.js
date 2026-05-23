import * as XLSX from 'xlsx';

export const downloadXLSX = (data, filename = 'export.xlsx') => {
  if (!data) return;
  const rows = Array.isArray(data) ? data.flat(Infinity).filter(Boolean) : [];
  if (rows.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
};

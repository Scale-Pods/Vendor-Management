import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useGroupedData from './useGroupedData';

const LIST_WEBHOOK = '/api/n8n/webhook/e7af6af6-25f1-4c46-96f7-61a57f9e0978';

const DETAIL_WEBHOOK = '/api/n8n/webhook/813fa9e5-144b-4f95-8f31-2a5c6f064d4a';

const fetchList = async (action = 'PO Data') => {
  const url = `${LIST_WEBHOOK}?action=${encodeURIComponent(action)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`List webhook returned ${res.status}`);
  const json = await res.json();
  let data = [];
  if (Array.isArray(json)) {
    data = json[0]?.data && Array.isArray(json[0].data) ? json[0].data : json;
  } else if (json?.data && Array.isArray(json.data)) {
    data = json.data;
  }
  return data || [];
};

const filterPRs = (groups, search) => {
  if (!search) return groups;
  const q = search.toLowerCase();
  return groups.filter(
    (g) =>
      g.pr.toLowerCase().includes(q) ||
      g.project.toLowerCase().includes(q) ||
      g.supplier.toLowerCase().includes(q) ||
      g.company.toLowerCase().includes(q)
  );
};

const sortPRs = (groups, order) => {
  const sorted = [...groups];
  sorted.sort((a, b) => {
    const dateA = a.latestActivityDate || a.pr;
    const dateB = b.latestActivityDate || b.pr;
    return order === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
  });
  return sorted;
};

export const usePRList = ({ search = '', sortOrder = 'desc' } = {}) => {
  const query = useQuery({
    queryKey: ['pr-dashboard', 'pr-list-raw'],
    queryFn: () => fetchList('PO Data'),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const { groups, isProcessing } = useGroupedData(query.data);

  const filtered = useMemo(() => filterPRs(groups, search), [groups, search]);
  const sorted = useMemo(() => sortPRs(filtered, sortOrder), [filtered, sortOrder]);
  const totalCount = groups.length;

  return {
    data: sorted,
    totalCount,
    isLoading: query.isLoading,
    isProcessing,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

const fetchJSON = async (action, pr) => {
  const body = JSON.stringify({ action, pr });
  const res = await fetch(DETAIL_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`Webhook ${res.status} action=${action} pr=${pr}`);
  const text = await res.text();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
};

const TAB_ACTIONS = {
  poData: 'po_data',
  purchaseOrders: 'purchase_orders',
  material25: 'material_25',
  material26: 'material_26',
  prData25: 'pr_data_25',
  prData26: 'pr_data_26',
  mergedData: 'merged_data',
};

export const useTabData = (tabId, pr) => {
  const action = TAB_ACTIONS[tabId];
  return useQuery({
    queryKey: ['pr-dashboard', 'tab', tabId, pr],
    queryFn: () => fetchJSON(action, pr),
    enabled: !!pr && !!action,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useTabMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ table, pr, updatedRows }) => {
      const res = await fetch(DETAIL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_table', table, pr, updated_rows: updatedRows }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (_, { table, pr }) => {
      queryClient.invalidateQueries({ queryKey: ['pr-dashboard', 'tab', table, pr] });
    },
  });
};

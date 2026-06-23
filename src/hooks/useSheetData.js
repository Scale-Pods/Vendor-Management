import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adminSupabase } from '../lib/supabase';

const N8N_WEBHOOK = `/api/n8n/webhook/${import.meta.env.VITE_N8N_WEBHOOK_MASTER_PO}`;
const PAGE_SIZE = 500;

const SUPABASE_TABLES = {
  'PO Data': { table: 'po_data', sortColumn: 'created_at' },
  'material_detail_25': { table: 'material_detail_25', sortColumn: 'id' },
  'material_detail_26': { table: 'material_detail_26', sortColumn: 'id' },
  'pr_data_25': { table: 'pr_data_25', sortColumn: 'id' },
  'pr_data_26': { table: 'pr_data_26', sortColumn: 'id' },
  'purchase_orders': { table: 'purchase_orders', sortColumn: 'id' },
  'merged': { table: 'merged_data', sortColumn: 'id' },
};

async function fetchSheetData(activeTab) {
  const url = `${N8N_WEBHOOK}?action=${encodeURIComponent(activeTab)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch sheet data: ${response.status}`);
  const json = await response.json();

  let data = [];
  if (Array.isArray(json)) {
    data = json[0]?.data && Array.isArray(json[0].data) ? json[0].data : json;
  } else if (json?.data && Array.isArray(json.data)) {
    data = json.data;
  }
  return data || [];
}

async function fetchSupabasePage({ activeTab, page, sortOrder }) {
  const config = SUPABASE_TABLES[activeTab];
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await adminSupabase
    .from(config.table)
    .select('*')
    .order(config.sortColumn, { ascending: sortOrder === 'asc' })
    .range(from, to);

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  return data || [];
}

export function useSheetData(activeTab, options = {}) {
  const { sortOrder = 'desc' } = options;
  const config = SUPABASE_TABLES[activeTab];

  const query = useInfiniteQuery({
    queryKey: ['sheet-data', activeTab, ...(config ? [sortOrder] : [])],
    queryFn: ({ pageParam = 0 }) => {
      if (config) return fetchSupabasePage({ activeTab, page: pageParam, sortOrder });
      return fetchSheetData(activeTab);
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!config) return undefined;
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + 1;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const flatData = useMemo(() => query.data?.pages?.flat() ?? [], [query.data]);

  return {
    data: flatData,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    fetchNextPage: config ? query.fetchNextPage : undefined,
    hasNextPage: config ? query.hasNextPage : undefined,
    isFetchingNextPage: config ? query.isFetchingNextPage : undefined,
  };
}

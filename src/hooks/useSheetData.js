import { useQuery } from '@tanstack/react-query';

const N8N_WEBHOOK = '/api/n8n/webhook/e7af6af6-25f1-4c46-96f7-61a57f9e0978';

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

export function useSheetData(activeTab) {
  return useQuery({
    queryKey: ['sheet-data', activeTab],
    queryFn: () => fetchSheetData(activeTab),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

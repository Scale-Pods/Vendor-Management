import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function applyZoom() {
  const vw = window.innerWidth;
  document.documentElement.style.setProperty('--vw', String(vw));
  document.documentElement.style.setProperty('--zoom', String(vw <= 800 ? 'high' : vw <= 1100 ? 'medium' : 'normal'));
}
applyZoom();
window.addEventListener('resize', applyZoom);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

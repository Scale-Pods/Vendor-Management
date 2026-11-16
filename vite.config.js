import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  css: {
    // Use this project's PostCSS config, not one from a parent directory.
    // Tailwind itself is handled by the @tailwindcss/vite plugin above.
    postcss: {
      plugins: [],
    },
  },
  server: {
    proxy: {
      '/api/n8n': {
        target: process.env.VITE_N8N_SERVER_URL || 'https://n8n.srv1010832.hstgr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
        secure: false,
      },
    },
  },
})


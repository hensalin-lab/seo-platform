import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('html2canvas') || id.includes('html-to-image') || id.includes('file-saver')) return 'export-libs';
            if (id.includes('jspdf') || id.includes('pdf-lib')) return 'pdf-libs';
            if (id.includes('dompurify') || id.includes('purify') || id.includes('marked') || id.includes('dom-sanitizer')) return 'sanitize-libs';
            if (id.includes('lucide-react') || id.includes('lucide')) return 'icons';
            if (id.includes('react-router') || id.includes('react-router-dom')) return 'router';
            if (id.includes('react') || id.includes('scheduler') || id.includes('react-dom')) return 'react-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
})

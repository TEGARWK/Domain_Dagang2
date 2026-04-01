import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3009',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          axios: ['axios'],
          chart: ['recharts'],
          ui: ['@heroicons/react', 'sweetalert2'],
          utils: ['date-fns', 'html2pdf.js']
        }
      }
    }
  }
})

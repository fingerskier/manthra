import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: '/manthra',
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  // the repo-root README.md is imported (?raw) as the quote seed source
  server: { fs: { allow: ['..'] } },
})

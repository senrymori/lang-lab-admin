/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend serves the build at /admin/ (admin.langlab.uk behind Cloudflare Access). In dev the API is the
// local backend: `uv run uvicorn app.main:app` in lang-lab-backend, proxied so the page and API share an origin.
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: { proxy: { '/admin/api': 'http://127.0.0.1:8000' } },
  // tests: a browser-like DOM, the API answered by the test (src/test/api.ts) — nothing reaches a server
  test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] },
})

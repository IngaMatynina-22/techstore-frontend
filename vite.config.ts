import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  // Backend launchSettings http profile uses :5184 (not :5000)
  const apiTarget = env.VITE_API_PROXY || 'http://127.0.0.1:5184'

  // #region agent log
  fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7481c3' },
    body: JSON.stringify({
      sessionId: '7481c3',
      runId: 'post-fix',
      hypothesisId: 'A',
      location: 'vite.config.ts:apiTarget',
      message: 'Vite proxy target resolved',
      data: { apiTarget, envProxy: env.VITE_API_PROXY || null, mode },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(rootDir, './src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              // #region agent log
              fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7481c3' },
                body: JSON.stringify({
                  sessionId: '7481c3',
                  runId: 'post-fix',
                  hypothesisId: 'A',
                  location: 'vite.config.ts:proxy.error',
                  message: 'Proxy connection failed',
                  data: {
                    apiTarget,
                    url: req.url,
                    code: (err as NodeJS.ErrnoException).code,
                    errMessage: err.message,
                  },
                  timestamp: Date.now(),
                }),
              }).catch(() => {})
              // #endregion
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              // #region agent log
              fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7481c3' },
                body: JSON.stringify({
                  sessionId: '7481c3',
                  runId: 'post-fix',
                  hypothesisId: 'A',
                  location: 'vite.config.ts:proxy.proxyRes',
                  message: 'Proxy response OK path',
                  data: { apiTarget, url: req.url, status: proxyRes.statusCode },
                  timestamp: Date.now(),
                }),
              }).catch(() => {})
              // #endregion
            })
          },
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

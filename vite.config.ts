import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api/smtp2go': {
          target: 'https://api.smtp2go.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/smtp2go/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Add the API key header
              if (env.VITE_SMTP2GO_API_KEY) {
                proxyReq.setHeader('X-Smtp2go-Api-Key', env.VITE_SMTP2GO_API_KEY);
              }
            });
          }
        }
      }
    }
  }
})



import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'

import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'jeep-sqlite'
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['jeep-sqlite', 'better-sqlite3', 'drizzle-orm/better-sqlite3']
  }
})

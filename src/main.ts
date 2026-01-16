import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { initDB } from '@/db/index.ts'
import router from './router'
import { syncService } from '@/sync/syncService'

async function bootstrap() {
  await initDB()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')

  // Initialize sync after DB is ready
  await syncService.init()
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err)
})

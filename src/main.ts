import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { initDB } from '@/db/index.ts'
import router from './router'
import { syncService } from '@/sync/syncService'
import i18n from './i18n'

async function bootstrap() {
  await initDB()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(i18n)
  app.mount('#app')

  // Initialize sync after DB is ready
  await syncService.init()
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err)
})

import { createRouter, createWebHistory } from 'vue-router'

import StaffRegister from '@/views/staffRegister/StaffRegister.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: StaffRegister
    },
    {
      path: '/staff-register',
      name: 'staffRegister',
      component: StaffRegister
    }
  ]
})

export default router

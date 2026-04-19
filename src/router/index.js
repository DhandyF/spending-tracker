import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'AddSpending',
    component: () => import('@/views/AddSpending.vue'),
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/History.vue'),
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
  },
  {
    path: '/budget',
    name: 'Budget',
    component: () => import('@/views/Budget.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
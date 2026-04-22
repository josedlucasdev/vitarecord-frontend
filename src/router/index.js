import { createRouter, createWebHistory } from '@ionic/vue-router'
import { useAuthStore } from '../store/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patients',
    name: 'Patients',
    component: () => import('../views/PatientsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/staff',
    name: 'AdminStaff',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patients/create',
    name: 'PatientCreate',
    component: () => import('../views/PatientCreateView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patients/:id/history',
    name: 'MedicalHistory',
    component: () => import('../views/MedicalHistoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patients/:id/evolution/new',
    name: 'EvolutionCreate',
    component: () => import('../views/EvolutionCreateView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patient/:id/timeline',
    name: 'PatientTimeline',
    component: () => import('../views/MedicalHistoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/patients/:id/edit',
    name: 'PatientEdit',
    component: () => import('../views/PatientEditView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login')
  } else if (to.path === '/login' && authStore.user) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router

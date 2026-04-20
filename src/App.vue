<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { useAuthStore } from './store/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoginRoute = computed(() => route.path === '/login')

// Estado del sidebar para moviles
const isSidebarOpen = ref(false)
const toggleSidebar = () => isSidebarOpen.value = !isSidebarOpen.value

const logout = () => {
  authStore.logout()
  router.push('/login')
}

// Datos del usuario dinámicos
const userInitials = computed(() => authStore.user?.name?.substring(0, 1).toUpperCase() || 'U')
const userName = computed(() => authStore.user?.name || 'Usuario')
const userRoleLabel = computed(() => {
  const roles = { admin: 'Administrador', doctor: 'Personal Médico', patient: 'Paciente' }
  return roles[authStore.user?.role] || 'Usuario'
})
</script>

<template>
  <div v-if="isLoginRoute">
    <RouterView />
  </div>

  <div v-else class="bg-background text-on-surface h-screen flex overflow-hidden relative">
    
    <!-- Overlay para móvil -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 bg-black/50 z-40 md:hidden"></div>

    <!-- Navbar (Sidebar Lateral) -->
    <nav 
      class="bg-surface-container-low flex flex-col h-screen shrink-0 w-64 border-r border-outline-variant/15 py-8 px-4 z-50 transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 md:relative"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <div class="flex flex-col mb-10 px-4 mt-4 text-left">
        <template v-if="authStore.user?.photo_path">
          <img :src="authStore.user.photo_path" class="w-12 h-12 rounded-full object-cover shadow-sm mb-3 border-2 border-primary/20"/>
        </template>
        <div v-else class="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-headline font-bold text-on-primary shadow-sm mb-3">
          {{ userInitials }}
        </div>
        <div>
          <p class="font-headline font-bold text-sm text-on-surface">{{ userName }}</p>
          <p class="font-label text-xs text-on-surface-variant">{{ userRoleLabel }}</p>
        </div>
      </div>

      <div class="flex-grow space-y-1">
        <!-- Links para Médicos y Admins -->
        <router-link v-if="authStore.user?.role === 'doctor' || authStore.user?.role === 'admin'" to="/dashboard" class="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-sm tracking-wide" active-class="bg-white text-primary font-bold shadow-sm" @click="isSidebarOpen = false">
          <span class="material-symbols-outlined icon-filled">analytics</span>
          <span>Panel de Insights</span>
        </router-link>

        <router-link v-if="authStore.user?.role === 'doctor' || authStore.user?.role === 'admin'" to="/patients" class="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-sm tracking-wide" active-class="bg-white text-primary font-bold shadow-sm" @click="isSidebarOpen = false">
          <span class="material-symbols-outlined icon-filled">groups</span>
          <span>Directorio de Pacientes</span>
        </router-link>

        <!-- Links SOLO para Admins -->
        <router-link v-if="authStore.user?.role === 'admin'" to="/admin/staff" class="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-sm tracking-wide" active-class="bg-white text-primary font-bold shadow-sm" @click="isSidebarOpen = false">
          <span class="material-symbols-outlined icon-filled">medical_services</span>
          <span>Nómina Médica</span>
        </router-link>
      </div>
      
      <div class="mt-auto pt-4 border-t border-outline-variant/15 space-y-1">
        <button @click="logout" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-error hover:bg-error-container/20 transition-colors font-body text-sm tracking-wide">
          <span class="material-symbols-outlined">logout</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </nav>

    <!-- Área Principal Completa -->
    <div class="flex-1 flex flex-col min-w-0">
      <RouterView @toggle-sidebar="toggleSidebar" />
    </div>
  </div>
</template>

<style>
/* Global Print Fixes */
@media print {
  html, body, #app {
    height: auto !important;
    overflow: visible !important;
    position: static !important;
  }
  
  .h-screen {
    height: auto !important;
  }
  
  .overflow-hidden {
    overflow: visible !important;
  }

  /* Force multi-page continuity */
  .flex {
    display: block !important;
  }
  
  nav {
    display: none !important;
  }
}
</style>


<script setup>
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { computed, ref } from 'vue'
import { useAuthStore } from './store/auth'
import { useUiStore } from './store/ui'
import router from './router' // Importamos la instancia directamente

const authStore = useAuthStore()
const uiStore = useUiStore()

// Usamos la instancia del router para evitar el error de inyección en el componente raíz
const isLoginRoute = computed(() => router.currentRoute.value.path === '/login')

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
const isSettingsOpen = ref(false)

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
}
</script>

<template>
  <ion-app>
    <div class="bg-background text-on-surface h-screen flex overflow-hidden relative">
      
      <!-- Overlay para móvil -->
      <div v-if="!isLoginRoute && uiStore.isSidebarOpen" @click="uiStore.closeSidebar()" class="fixed inset-0 bg-black/50 z-40 md:hidden"></div>

      <!-- Navbar (Sidebar Lateral) -->
      <nav 
        v-if="!isLoginRoute"
        class="bg-surface-container-low flex flex-col h-screen shrink-0 w-64 border-r border-outline-variant/15 py-8 px-4 z-50 transition-all duration-300 ease-in-out fixed inset-y-0 left-0 md:relative overflow-y-auto hide-scrollbar"
        :class="uiStore.isSidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:translate-x-0 md:-ml-64'"
      >
        <div class="flex flex-col mb-10 px-4 mt-4 text-left relative">
          <!-- Desktop Close Button -->
          <button @click="uiStore.closeSidebar()" class="hidden md:flex absolute -top-4 -right-2 p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors rounded-lg">
             <span class="material-symbols-outlined text-[20px]">close</span>
          </button>

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
          <router-link v-if="authStore.user?.role === 'doctor' || authStore.user?.role === 'admin'" to="/dashboard" class="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-sm tracking-wide" active-class="bg-white text-primary font-bold shadow-sm" @click="uiStore.closeSidebar()">
            <span class="material-symbols-outlined icon-filled">analytics</span>
            <span>Panel de Insights</span>
          </router-link>

          <router-link v-if="authStore.user?.role === 'doctor' || authStore.user?.role === 'admin'" to="/patients" class="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-sm tracking-wide" active-class="bg-white text-primary font-bold shadow-sm" @click="uiStore.closeSidebar()">
            <span class="material-symbols-outlined icon-filled">groups</span>
            <span>Directorio de Pacientes</span>
          </router-link>

          <router-link v-if="authStore.user?.role === 'admin'" to="/admin/staff" class="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-sm tracking-wide" active-class="bg-white text-primary font-bold shadow-sm" @click="uiStore.closeSidebar()">
            <span class="material-symbols-outlined icon-filled">medical_services</span>
            <span>Nómina Médica</span>
          </router-link>

          <!-- Dropdown Configuración -->
          <div v-if="authStore.user?.role === 'doctor' || authStore.user?.role === 'admin'" class="space-y-1">
            <button 
              @click="toggleSettings"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-sm tracking-wide group"
              :class="isSettingsOpen ? 'text-primary' : ''"
            >
              <div class="flex items-center space-x-3">
                <span class="material-symbols-outlined icon-filled">settings</span>
                <span>Configuración</span>
              </div>
              <span class="material-symbols-outlined transition-transform duration-200 text-sm" :class="isSettingsOpen ? 'rotate-180' : ''">expand_more</span>
            </button>

            <!-- Submenu Perfil -->
            <div v-show="isSettingsOpen" class="pl-9 space-y-1 animate-fade-in">
              <router-link to="/profile" class="flex items-center space-x-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface transition-colors font-body text-xs tracking-wide" active-class="text-primary font-bold" @click="uiStore.closeSidebar()">
                <span>Mí Perfil</span>
              </router-link>
            </div>
          </div>
        </div>
        
        <div class="mt-auto pt-4 border-t border-outline-variant/15 space-y-1">
          <button @click="logout" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-error hover:bg-error-container/20 transition-colors font-body text-sm tracking-wide">
            <span class="material-symbols-outlined">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      <!-- Área Principal -->
      <div class="flex-1 flex flex-col min-w-0 relative h-full">
        <!-- Botón flotante para abrir el menú en desktop -->
        <button 
          v-if="!isLoginRoute && !uiStore.isSidebarOpen"
          @click="uiStore.openSidebar()" 
          class="hidden md:flex absolute top-6 left-6 z-50 w-10 h-10 bg-surface-container-low border border-outline-variant/20 rounded-xl items-center justify-center text-on-surface hover:text-primary transition-colors shadow-lg"
        >
          <span class="material-symbols-outlined">menu</span>
        </button>

        <ion-router-outlet />
      </div>
    </div>
  </ion-app>
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


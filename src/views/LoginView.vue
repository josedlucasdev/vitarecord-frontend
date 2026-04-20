<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
    if (!email.value || !password.value) return
    isLoading.value = true
    try {
        const success = await authStore.login({
            email: email.value,
            password: password.value
        })
        
        if (success) {
            // Redirección basada en rol
            if (authStore.user.role === 'admin') {
                router.push('/admin/staff')
            } else {
                router.push('/dashboard')
            }
        }
    } catch (error) {
        alert('Error al iniciar sesión: ' + (error.message || 'Verifique sus credenciales'))
        console.error("Login Error:", error)
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-body">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center text-primary mb-2">
        <span class="material-symbols-outlined text-[48px]">local_hospital</span>
      </div>
      <h2 class="mt-2 text-center text-3xl font-extrabold text-on-surface font-headline tracking-tight">
        VitaRecord
      </h2>
      <p class="mt-2 text-center text-sm text-on-surface-variant font-label uppercase tracking-widest">
        Acceso de Personal Autorizado
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-surface-container-lowest py-8 px-4 shadow-[0px_12px_32px_rgba(25,28,29,0.04)] sm:rounded-xl border border-outline-variant/15 sm:px-10">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="email" class="block font-label text-xs font-semibold text-on-surface-variant mb-1 ml-1 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div class="mt-1">
              <input 
                id="email" 
                name="email" 
                type="email" 
                v-model="email"
                autocomplete="email" 
                required 
                placeholder="dr.ejemplo@clinica.com"
                class="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 rounded-t-md px-4 py-2.5 font-body text-sm text-on-surface transition-all"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block font-label text-xs font-semibold text-on-surface-variant mb-1 ml-1 uppercase tracking-wider">
              Contraseña
            </label>
            <div class="mt-1">
              <input 
                id="password" 
                name="password" 
                type="password" 
                v-model="password"
                autocomplete="current-password" 
                required 
                placeholder="••••••••"
                class="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 rounded-t-md px-4 py-2.5 font-body text-sm text-on-surface transition-all"
              />
            </div>
          </div>

          <div class="flex items-center justify-end">
            <div class="text-sm">
              <a href="#" class="font-medium text-primary hover:text-primary-container transition-colors">¿Olvidaste tu contraseña?</a>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              :disabled="isLoading"
              class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-headline text-sm font-bold text-on-primary bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
            >
              <span v-if="isLoading" class="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              {{ isLoading ? 'INGRESANDO...' : 'INICIAR SESIÓN' }}
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-outline-variant/30"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-surface-container-lowest text-on-surface-variant text-xs uppercase tracking-tight">Portal Exclusivo</span>
            </div>
          </div>
          <div class="mt-6 text-center text-xs text-on-surface-variant">
            Si eres paciente, por favor utiliza el enlace único enviado a tu correo o SMS por tu médico tratante.
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

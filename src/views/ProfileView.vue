<script setup>
import { 
  IonPage, 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonMenuButton,
  IonButton,
  IonIcon,
  IonSpinner,
  toastController
} from '@ionic/vue'
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'

const authStore = useAuthStore()
const uiStore = useUiStore()
const API_URL = import.meta.env.VITE_API_BASE_URL

const isLoading = ref(false)
const isSaving = ref(false)
const isUploading = ref({ photo: false, signature: false, stamp: false })

const profileForm = ref({
  name: authStore.user?.name || '',
  email: authStore.user?.email || '',
  phone: authStore.user?.phone || '',
})

const passwordForm = ref({
  current_password: '',
  password: '',
  password_confirmation: ''
})

const photoPreview = ref(authStore.user?.photo_path || null)
const signaturePreview = ref(null)
const stampPreview = ref(null)

const fetchSecureImage = async (url) => {
  if (!url) return null
  const bustUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
  try {
    const response = await fetch(bustUrl, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json',
      },
    })
    if (response.ok) {
      const data = await response.json()
      // La API ahora retorna un JSON con el Base64 de la imagen protegido por Token
      return data.content || null
    }
  } catch (error) {
    console.error('Error fetching secure image:', error)
  }
  return null
}

const showToast = async (message, color = 'success') => {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'bottom',
    cssClass: 'custom-toast'
  })
  await toast.present()
}

const autoUploadFile = async (file, field) => {
  isUploading.value[field] = true
  try {
    const formData = new FormData()
    formData.append(field, file)
    formData.append('name', profileForm.value.name)
    formData.append('email', profileForm.value.email)

    const res = await fetch(`${API_URL}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: formData
    })

    if (res.ok) {
      const data = await res.json()
      authStore.user = data
      localStorage.setItem('user', JSON.stringify(data))
      
      // La foto sigue siendo pública
      photoPreview.value = data.photo_path
      
      // La firma y sello son seguros, los recargamos
      if (field === 'signature') {
        if (signaturePreview.value) URL.revokeObjectURL(signaturePreview.value)
        signaturePreview.value = await fetchSecureImage(data.signature_path)
      } else if (field === 'stamp') {
        if (stampPreview.value) URL.revokeObjectURL(stampPreview.value)
        stampPreview.value = await fetchSecureImage(data.stamp_path)
      }
      
      showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} actualizado correctamente.`)
    } else {
      const error = await res.json()
      showToast(error.message || `Error al subir ${field}`, 'danger')
    }
  } catch (error) {
    console.error(error)
    showToast('Error de conexión al subir el archivo', 'danger')
  } finally {
    isUploading.value[field] = false
  }
}

onMounted(async () => {
  // Pequeña pausa para asegurar que el token esté listo si hay redirecciones
  setTimeout(async () => {
    if (authStore.user?.signature_path) {
      signaturePreview.value = await fetchSecureImage(authStore.user.signature_path)
    }
    if (authStore.user?.stamp_path) {
      stampPreview.value = await fetchSecureImage(authStore.user.stamp_path)
    }
  }, 100)
})

const handlePhotoChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    photoPreview.value = URL.createObjectURL(file)
    autoUploadFile(file, 'photo')
  }
}

const handleSignatureChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    signaturePreview.value = URL.createObjectURL(file)
    autoUploadFile(file, 'signature')
  }
}

const handleStampChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    stampPreview.value = URL.createObjectURL(file)
    autoUploadFile(file, 'stamp')
  }
}

const updateProfile = async () => {
  isSaving.value = true
  try {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(profileForm.value)
    })

    if (res.ok) {
      const data = await res.json()
      authStore.user = data
      localStorage.setItem('user', JSON.stringify(data))
      showToast('Datos de perfil actualizados.')
    } else {
      const error = await res.json()
      showToast(error.message || 'Error al actualizar perfil', 'danger')
    }
  } catch (error) {
    console.error(error)
    showToast('Error de conexión', 'danger')
  } finally {
    isSaving.value = false
  }
}

const updatePassword = async () => {
  if (passwordForm.value.password !== passwordForm.value.password_confirmation) {
    showToast('Las contraseñas no coinciden', 'warning')
    return
  }

  isSaving.value = true
  try {
    const res = await fetch(`${API_URL}/profile/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(passwordForm.value)
    })

    if (res.ok) {
      showToast('Contraseña actualizada correctamente.')
      passwordForm.value = { current_password: '', password: '', password_confirmation: '' }
    } else {
      const error = await res.json()
      showToast(error.message || 'Error al actualizar contraseña', 'danger')
    }
  } catch (error) {
    console.error(error)
    showToast('Error de conexión', 'danger')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <ion-page>
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-background font-body relative">
      
      <header class="h-16 border-b border-outline-variant/10 flex items-center px-8 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
         <nav class="flex items-center text-sm font-medium space-x-2">
            <span class="text-on-surface-variant">Configuración</span>
            <span class="material-symbols-outlined text-sm text-outline">chevron_right</span>
            <span class="text-primary">Mí Perfil</span>
         </nav>
      </header>

      <main class="flex-1 overflow-y-auto px-4 md:px-8 py-8 md:py-12 w-full max-w-5xl mx-auto hide-scrollbar">
        
        <div class="mb-10">
          <h1 class="text-3xl md:text-4xl font-headline font-bold text-on-background tracking-tight mb-2">Mi Perfil Profesional</h1>
          <p class="text-on-surface-variant">Gestiona tu información personal, seguridad y credenciales médicas.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Lado Izquierdo: Fotos y Credenciales -->
          <div class="lg:col-span-1 space-y-6">
            <!-- Foto de Perfil -->
            <div class="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 shadow-sm text-center">
              <h2 class="text-xs font-bold uppercase tracking-widest text-outline mb-6">Foto de Perfil</h2>
              <div class="relative w-32 h-32 mx-auto mb-6 group">
                <div v-if="isUploading.photo" class="absolute inset-0 z-20 bg-background/60 rounded-full flex items-center justify-center backdrop-blur-[1px]">
                   <ion-spinner name="crescent" color="primary"></ion-spinner>
                </div>
                <img v-if="photoPreview" :src="photoPreview" class="w-full h-full rounded-full object-cover border-4 border-white shadow-md transition-transform group-hover:scale-105" />
                <div v-else class="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span class="material-symbols-outlined text-4xl">person</span>
                </div>
                <label class="absolute bottom-0 right-0 w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary-hover active:scale-90 transition-all z-30">
                  <span class="material-symbols-outlined text-sm">photo_camera</span>
                  <input type="file" class="hidden" @change="handlePhotoChange" accept="image/*" />
                </label>
              </div>
              <p class="text-[10px] text-on-surface-variant italic">Recomendado: Imagen cuadrada de máx. 2MB</p>
            </div>

            <!-- Identidad Digital: Firma -->
            <div class="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 shadow-sm text-center">
              <h2 class="text-xs font-bold uppercase tracking-widest text-outline mb-4">Mí Firma</h2>
              <div class="border-2 border-dashed border-outline-variant/20 rounded-2xl p-4 mb-3 relative min-h-[100px] flex items-center justify-center bg-surface-container-high/20 group">
                <div v-if="isUploading.signature" class="absolute inset-0 z-20 bg-background/60 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                   <ion-spinner name="crescent" color="primary"></ion-spinner>
                </div>
                <img v-if="signaturePreview" :src="signaturePreview" class="max-h-20 object-contain" />
                <div v-else class="text-center opacity-40">
                  <span class="material-symbols-outlined text-3xl mb-1">draw</span>
                  <p class="text-[10px]">Sin firma</p>
                </div>
                <label class="absolute inset-0 cursor-pointer opacity-0 z-10">
                  <input type="file" @change="handleSignatureChange" accept="image/*" />
                </label>
              </div>
              <p class="text-[9px] text-on-surface-variant leading-tight">Su firma manuscrita sobre fondo blanco.</p>
            </div>

            <!-- Identidad Digital: Sello -->
            <div class="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 shadow-sm text-center relative">
              <h2 class="text-xs font-bold uppercase tracking-widest text-outline mb-4">Mí Sello</h2>
              <div class="border-2 border-dashed border-outline-variant/20 rounded-2xl p-4 mb-3 relative min-h-[100px] flex items-center justify-center bg-surface-container-high/20 group">
                <div v-if="isUploading.stamp" class="absolute inset-0 z-20 bg-background/60 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                   <ion-spinner name="crescent" color="primary"></ion-spinner>
                </div>
                <img v-if="stampPreview" :src="stampPreview" class="max-h-20 object-contain" />
                <div v-else class="text-center opacity-40">
                  <span class="material-symbols-outlined text-3xl mb-1">approval</span>
                  <p class="text-[10px]">Sin sello</p>
                </div>
                <label class="absolute inset-0 cursor-pointer opacity-0 z-10">
                  <input type="file" @change="handleStampChange" accept="image/*" />
                </label>
              </div>
              <p class="text-[9px] text-on-surface-variant leading-tight">El sello institucional con su registro médico.</p>
            </div>
          </div>

          <!-- Lado Derecho: Formularios -->
          <div class="lg:col-span-2 space-y-8">
            
            <!-- Datos Personales -->
            <section class="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
              <div class="flex items-center gap-3 mb-8">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span class="material-symbols-outlined">person_pin</span>
                </div>
                <h2 class="text-xl font-headline font-bold text-on-surface">Información del Médico</h2>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-outline ml-1">Nombre Completo</label>
                  <input v-model="profileForm.name" type="text" class="w-full bg-surface-container-highest border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Tu nombre..." />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-outline ml-1">Correo Electrónico</label>
                  <input v-model="profileForm.email" type="email" class="w-full bg-surface-container-highest border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="correo@ejemplo.com" />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-outline ml-1">Especialidad (Solo Lectura)</label>
                  <input :value="authStore.user?.specialty" type="text" disabled class="w-full bg-outline-variant/10 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-on-surface-variant cursor-not-allowed" />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-outline ml-1">Teléfono</label>
                  <input v-model="profileForm.phone" type="text" class="w-full bg-surface-container-highest border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="+58..." />
                </div>
              </div>

              <div class="mt-10 pt-6 border-t border-outline-variant/10 flex justify-end">
                <button @click="updateProfile" :disabled="isSaving" class="bg-primary text-on-primary px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg hover:bg-primary-hover active:scale-95 disabled:opacity-50 flex items-center">
                  <ion-spinner v-if="isSaving" name="crescent" size="small" class="mr-2"></ion-spinner>
                  Guardar Perfil
                </button>
              </div>
            </section>

            <!-- Seguridad -->
            <section class="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
              <div class="flex items-center gap-3 mb-8">
                <div class="w-10 h-10 rounded-xl bg-error-container/20 flex items-center justify-center text-error">
                  <span class="material-symbols-outlined">lock_reset</span>
                </div>
                <h2 class="text-xl font-headline font-bold text-on-surface">Seguridad & Contraseña</h2>
              </div>

              <div class="space-y-6">
                <div class="space-y-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-outline ml-1">Contraseña Actual</label>
                  <input v-model="passwordForm.current_password" type="password" class="w-full bg-surface-container-highest border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="••••••••" />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-outline ml-1">Nueva Contraseña</label>
                    <input v-model="passwordForm.password" type="password" class="w-full bg-surface-container-highest border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Mínimo 8 caracteres" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-outline ml-1">Confirmar Nueva Contraseña</label>
                    <input v-model="passwordForm.password_confirmation" type="password" class="w-full bg-surface-container-highest border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <div class="mt-10 pt-6 border-t border-outline-variant/10 flex justify-end">
                <button @click="updatePassword" :disabled="isSaving" class="bg-surface-variant text-on-surface-variant px-8 py-3.5 rounded-2xl font-bold transition-all hover:bg-outline-variant/20 active:scale-95 disabled:opacity-50 flex items-center border border-outline-variant/10">
                  <ion-spinner v-if="isSaving" name="crescent" size="small" class="mr-2"></ion-spinner>
                  Actualizar Contraseña
                </button>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  </ion-page>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

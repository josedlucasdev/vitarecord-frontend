<script setup>
const API_URL = import.meta.env.VITE_API_BASE_URL
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const formData = ref({
  name: '',
  age: '',
  identity_card: '',
  occupation: '',
  phone: '',
  address: '',
  email: '',
  // Base History
  menarche: null,
  menstrual_cycle: '',
  last_menstruation_date: null,
  sexarche: null,
  sexual_partners: null,
  contraceptive_method: '',
  pregnancies_gpcav: '',
  last_pap_smear: '',
  last_mammography: '',
  bloodType: 'Desconocido',
  allergies: '',
  personal_pathological: '',
  surgical: '',
  habits: '',
  family_history: ''
})

const handleSave = async () => {
  isLoading.value = true
  try {
    const res = await fetch(`${API_URL}/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData.value)
    })
    
    if (res.ok) {
      alert('Paciente registrado exitosamente.')
      router.push('/dashboard')
    } else {
      const data = await res.json()
      alert('Error: ' + JSON.stringify(data.errors || data.message))
    }
  } catch (error) {
    alert('Error de conexión con el servidor.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex-1 bg-background text-on-surface font-body min-h-screen overflow-y-auto">
    <main class="flex flex-col items-center justify-start py-12 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
      
      <!-- Header Section -->
      <div class="w-full max-w-4xl mb-12 flex items-center justify-between">
        <div>
          <button @click="router.back()" class="inline-flex items-center text-primary font-label font-medium text-sm mb-4 hover:opacity-80 transition-opacity">
            <span class="material-symbols-outlined mr-2 text-lg font-bold">arrow_back</span>
            Volver al Directorio
          </button>
          <h1 class="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-2 italic">Registrar Nuevo Paciente</h1>
          <p class="font-body text-on-surface-variant text-lg max-w-2xl">Complete el perfil inicial de ingreso. Asegúrese que los datos base sean precisos antes de guardar en el registro clínico.</p>
        </div>
        
        <!-- Progress (Static indicator from design) -->
        <div class="hidden md:flex space-x-2 items-center">
          <div class="h-2 w-12 bg-primary rounded-full"></div>
          <div class="h-2 w-12 bg-surface-container-highest rounded-full"></div>
          <div class="h-2 w-12 bg-surface-container-highest rounded-full"></div>
        </div>
      </div>

      <!-- Form Canvas -->
      <form class="w-full max-w-4xl space-y-8" @submit.prevent="handleSave">
        
        <!-- Section 1: Personal Data -->
        <section class="bg-surface-container-low rounded-xl p-8 relative overflow-hidden group shadow-sm border border-outline-variant/10">
          <div class="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary to-primary-container opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
          <header class="mb-8 flex items-center">
            <div class="bg-surface-container-lowest p-3 rounded-full mr-4 shadow-sm">
              <span class="material-symbols-outlined text-primary text-2xl font-bold">person</span>
            </div>
            <div>
              <h2 class="font-headline text-2xl font-bold tracking-tight text-on-surface">Información Personal</h2>
              <p class="font-label text-sm text-on-surface-variant tracking-wide mt-1 uppercase italic">Sección 01</p>
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Nombre Completo Legal</label>
              <input v-model="formData.name" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all" placeholder="Ej. Ivon Pacheco" type="text" required/>
            </div>
            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Edad</label>
              <input v-model="formData.age" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all" placeholder="Ej. 33" type="number" required/>
            </div>
            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Cédula / ID Nacional</label>
              <input v-model="formData.identity_card" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all" placeholder="Ej. 22.942.xxx" type="text" required/>
            </div>
            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Número de Contacto</label>
              <input v-model="formData.phone" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all" placeholder="0412-xxxxx" type="tel"/>
            </div>
            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Ocupación</label>
              <input v-model="formData.occupation" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all" placeholder="Ej. Abogada" type="text"/>
            </div>
            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Dirección de Habitación</label>
              <input v-model="formData.address" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all" placeholder="Ej. Calle Principal, Edificio X, Apto Y. Ciudad." type="text"/>
            </div>
          </div>
        </section>

        <!-- Section 2: Medical Baseline -->
        <section class="bg-surface-container-low rounded-xl p-8 relative overflow-hidden group shadow-sm border border-outline-variant/10">
          <div class="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary to-primary-container opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
          <header class="mb-8 flex items-center">
            <div class="bg-surface-container-lowest p-3 rounded-full mr-4 shadow-sm">
              <span class="material-symbols-outlined text-primary text-2xl font-bold">monitor_heart</span>
            </div>
            <div>
              <h2 class="font-headline text-2xl font-bold tracking-tight text-on-surface">Base Médica Inicial</h2>
              <p class="font-label text-sm text-on-surface-variant tracking-wide mt-1 uppercase italic">Sección 02</p>
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <!-- Blood Type -->
            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-4 ml-1">Grupo Sanguíneo</label>
              <div class="flex flex-wrap gap-3">
                <label v-for="type in ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Desconocido']" :key="type" class="cursor-pointer">
                  <input v-model="formData.bloodType" :value="type" class="peer sr-only" name="bloodType" type="radio"/>
                  <div class="px-5 py-2.5 rounded-full bg-surface-container-highest text-on-surface font-body font-medium peer-checked:bg-primary peer-checked:text-on-primary transition-colors duration-200 text-sm">
                    {{ type }}
                  </div>
                </label>
              </div>
            </div>

            <!-- Antecedentes GO -->
            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Menarquia (Edad)</label>
              <input v-model="formData.menarche" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all" type="number"/>
            </div>
            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Ciclo Menstrual</label>
              <input v-model="formData.menstrual_cycle" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all" placeholder="Ej. Regulares" type="text"/>
            </div>
            
            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Obstetricia (G: P: C: A: V:)</label>
              <input v-model="formData.pregnancies_gpcav" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all" placeholder="G:0 P:0 C:0 A:0 V:0" type="text"/>
            </div>

            <div>
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Última Citología / Mamografía</label>
              <div class="grid grid-cols-2 gap-2">
                <input v-model="formData.last_pap_smear" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all" placeholder="Citología" type="text"/>
                <input v-model="formData.last_mammography" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all" placeholder="Mamografía" type="text"/>
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1 text-primary font-bold">Antecedentes Personales Patológicos</label>
              <textarea v-model="formData.personal_pathological" class="w-full bg-surface-container-highest border-0 rounded-xl px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all resize-none" placeholder="Enfermedades crónicas, diagnósticos previos..." rows="3"></textarea>
            </div>

            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Antecedentes Quirúrgicos</label>
              <textarea v-model="formData.surgical" class="w-full bg-surface-container-highest border-0 rounded-xl px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all resize-none" placeholder="Cirugías previas y fechas..." rows="2"></textarea>
            </div>

            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Antecedentes Familiares</label>
              <textarea v-model="formData.family_history" class="w-full bg-surface-container-highest border-0 rounded-xl px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all resize-none" placeholder="Cáncer, diabetes, hipertensión en familiares directos..." rows="2"></textarea>
            </div>

            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Hábitos y Estilo de Vida</label>
              <textarea v-model="formData.habits" class="w-full bg-surface-container-highest border-0 rounded-xl px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all resize-none" placeholder="Tabaquismo, alcohol, actividad física..." rows="2"></textarea>
            </div>

            <div class="md:col-span-2">
              <label class="block font-label text-sm font-medium text-on-surface-variant mb-2 ml-1">Alergias Conocidas</label>
              <textarea v-model="formData.allergies" class="w-full bg-surface-container-highest border-0 rounded-lg px-4 py-3 font-body text-on-surface focus:ring-1 focus:ring-primary transition-all resize-none" placeholder="Medicamentos, alimentos..." rows="2"></textarea>
            </div>
          </div>
        </section>

        <!-- Form Actions -->
        <div class="flex items-center justify-end space-x-4 pt-6 border-t border-outline-variant/15">
          <button @click="router.back()" class="px-6 py-3 rounded-lg bg-surface-container-highest text-on-surface-variant font-label font-semibold hover:bg-surface-variant transition-colors" type="button">
            Cancelar
          </button>
          <button :disabled="isLoading" class="px-8 py-3 rounded-lg bg-primary text-on-primary font-label font-semibold shadow-lg hover:bg-primary-container transition-all flex items-center" type="submit">
            <span v-if="isLoading" class="material-symbols-outlined animate-spin mr-2 text-sm">progress_activity</span>
            <span v-else class="material-symbols-outlined mr-2 text-sm font-bold">save</span>
            {{ isLoading ? 'GUARDANDO...' : 'GUARDAR REGISTRO' }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
const API_URL = import.meta.env.VITE_API_BASE_URL
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()
const emit = defineEmits(['toggle-sidebar'])

const patients = ref([])
const searchQuery = ref('')
const currentFilter = ref('todos') 
const sortBy = ref('ultima_visita')
const isLoading = ref(true)

// Paginación
const paginationData = ref(null)
const currentPage = ref(1)

const fetchPatients = async (page = 1) => {
  isLoading.value = true
  currentPage.value = page
  try {
    const q = searchQuery.value ? `&q=${encodeURIComponent(searchQuery.value)}` : ''
    const res = await fetch(`${API_URL}/patients?page=${page}${q}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      }
    })
    if (res.ok) {
      const resp = await res.json()
      paginationData.value = resp
      patients.value = resp.data.map(pt => ({
        id: pt.id,
        name: pt.name,
        cId: pt.identity_card,
        age: pt.age,
        phone: pt.phone,
        lastConsult: 'Hoy', 
        reason: pt.occupation || 'Consulta General',
        status: 'Estable',
        statusClass: 'bg-green-50 text-green-700',
        dot: 'bg-green-500',
        initials: pt.name.substring(0, 2).toUpperCase(),
        color: 'bg-primary-fixed text-on-primary-fixed'
      }))
    }
  } catch (error) {
    console.error("Error fetching patients:", error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchPatients)

watch(searchQuery, () => {
  fetchPatients(1)
})

const filteredPatients = computed(() => {
  let list = [...patients.value]
  if (sortBy.value === 'nombre') {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return list
})

const goToPage = (page) => {
  if (page >= 1 && page <= paginationData.value?.last_page) {
    fetchPatients(page)
  }
}

const goToCreate = () => router.push('/patients/create')
</script>

<template>
  <div class="flex-1 flex flex-col h-screen overflow-hidden bg-background">
    <!-- TopNavBar -->
    <header class="bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/15 flex justify-between items-center h-16 px-8 shrink-0">
      <div class="flex items-center space-x-4">
        <button @click="emit('toggle-sidebar')" class="md:hidden text-on-surface-variant hover:bg-[#f3f4f5] transition-colors duration-300 p-2 rounded-full">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <div class="flex items-center bg-surface-container-low rounded-full px-4 py-2 w-64 md:w-96 max-w-full">
          <span class="material-symbols-outlined text-outline mr-2 text-lg">search</span>
          <input 
            v-model="searchQuery"
            class="bg-transparent border-none focus:ring-0 text-sm font-body text-on-surface w-full placeholder-outline" 
            placeholder="Buscar en el directorio..." 
            type="text"
          />
        </div>
      </div>
      <div class="flex items-center space-x-6 text-on-surface-variant">
        <button class="hover:text-primary transition-all relative">
          <span class="material-symbols-outlined text-xl">notifications</span>
          <span class="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <div class="h-8 w-8 rounded-full overflow-hidden border-2 border-surface-container">
          <img alt="Doctor Profile" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNETwc-cYqbeCrEP_8QDwtk5gEx7Plmz_wFbFJaF0OIQQd9rIjl7YxwSF6bYMS00Vo7aBXfC2LbH4tILgtki3oU0Zz0LT-TCNnruQiQXDqgDJndrXv-lmNR8toCu27VVMljr6BV9YaSJ9UkYnMeElP9nHWvQMb4xBLIbivXc79zQ4r6gA187jlKtsM1OVxAzkaXBoRPLvf_1psbvi8hE3yLGeCzvwgVmC6a3G3-H0CIwrDndVjSunWBQ-1fMFUbWmazC_PoJE3xK4T"/>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
      <!-- Page Header -->
      <div class="flex justify-between items-end mb-8 max-w-7xl mx-auto">
        <div>
          <h2 class="text-3xl font-headline font-semibold text-on-surface mb-1 tracking-tight">Directorio de Pacientes</h2>
          <p class="text-on-surface-variant font-label text-sm uppercase tracking-wider">Tus expedientes asignados</p>
        </div>
        <button @click="goToCreate" class="py-2.5 px-5 bg-primary text-on-primary rounded-lg font-medium text-sm flex items-center shadow-lg hover:bg-primary-container transition-all">
          <span class="material-symbols-outlined mr-2 text-[18px]">person_add</span> Nuevo Paciente
        </button>
      </div>

      <!-- Filters & Tools Bar -->
      <div class="flex justify-between items-center mb-6 bg-surface-container-lowest p-2 rounded-xl max-w-7xl mx-auto border border-outline-variant/10">
        <div class="flex space-x-2">
          <button 
            @click="currentFilter = 'todos'"
            :class="[currentFilter === 'todos' ? 'bg-surface-container-low text-primary font-bold' : 'bg-transparent text-on-surface-variant']"
            class="px-4 py-2 rounded-full text-sm font-medium hover:bg-surface-variant transition-colors"
          >
            Todos
          </button>
          <button 
            @click="currentFilter = 'recientes'"
            :class="[currentFilter === 'recientes' ? 'bg-surface-container-low text-primary font-bold' : 'bg-transparent text-on-surface-variant']"
            class="px-4 py-2 rounded-full text-sm font-medium hover:bg-surface-container-low transition-colors"
          >
            Recientes
          </button>
        </div>
        <div class="flex items-center space-x-3 text-on-surface-variant">
          <span class="text-sm font-medium mr-2">Ordenar por:</span>
          <select v-model="sortBy" class="bg-surface-container-low border-none rounded-lg text-sm py-2 pl-3 pr-8 focus:ring-1 focus:ring-primary cursor-pointer text-on-surface">
            <option value="ultima_visita">Última Visita</option>
            <option value="nombre">Nombre (A-Z)</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-surface-container-low rounded-xl p-4 max-w-7xl mx-auto">
        <div v-if="isLoading" class="py-20 flex flex-col items-center justify-center text-on-surface-variant">
          <span class="material-symbols-outlined animate-spin text-4xl mb-4 text-primary">progress_activity</span>
          <p class="font-label text-sm uppercase tracking-widest">Cargando directorio...</p>
        </div>

        <div v-else-if="filteredPatients.length === 0" class="py-20 flex flex-col items-center justify-center text-on-surface-variant border-2 border-dashed border-outline-variant/20 rounded-xl">
          <span class="material-symbols-outlined text-5xl mb-4 opacity-20">group_off</span>
          <p class="font-headline text-lg font-bold mb-1">No se encontraron pacientes</p>
          <p class="text-sm font-body mb-6">Prueba con otros términos de búsqueda.</p>
        </div>

        <template v-else>
          <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-surface-variant/50 mb-2">
            <div class="col-span-12 md:col-span-4 text-xs font-label uppercase tracking-widest text-on-surface-variant">Paciente</div>
            <div class="col-span-2 hidden md:block text-xs font-label uppercase tracking-widest text-on-surface-variant">Edad</div>
            <div class="col-span-3 hidden md:block text-xs font-label uppercase tracking-widest text-on-surface-variant">Info</div>
            <div class="col-span-2 hidden md:block text-xs font-label uppercase tracking-widest text-on-surface-variant">Estatus</div>
            <div class="col-span-1 hidden md:block text-right text-xs font-label uppercase tracking-widest text-on-surface-variant">Acción</div>
          </div>

          <div class="space-y-1">
            <div v-for="pt in filteredPatients" :key="pt.id" class="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-lowest rounded-lg hover:bg-surface-container-highest transition-colors items-center group">
              <div class="col-span-12 md:col-span-4 flex items-center space-x-4">
                <div :class="[pt.color]" class="w-10 h-10 rounded-full flex items-center justify-center font-headline font-semibold text-sm shrink-0">
                  {{ pt.initials }}
                </div>
                <div>
                  <p class="font-headline font-semibold text-on-surface text-base">{{ pt.name }}</p>
                  <p class="font-body text-xs text-on-surface-variant">ID: {{ pt.cId }}</p>
                </div>
              </div>
              <div class="col-span-12 md:col-span-2">
                <p class="font-body text-sm text-on-surface">{{ pt.age }} años</p>
              </div>
              <div class="col-span-12 md:col-span-3">
                <p class="font-body text-sm text-on-surface">{{ pt.lastConsult }}</p>
                <p class="font-body text-xs text-on-surface-variant truncate">Causa: {{ pt.reason }}</p>
              </div>
              <div class="col-span-12 md:col-span-2">
                <span :class="[pt.statusClass]" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium">
                  <span :class="[pt.dot]" class="w-1.5 h-1.5 rounded-full mr-1.5"></span> {{ pt.status }}
                </span>
              </div>
              <div class="col-span-12 md:col-span-1 flex justify-end items-center gap-4">
                <router-link :to="`/patients/${pt.id}/edit`" class="text-xs font-bold text-on-surface-variant hover:text-primary transition-all flex items-center" title="Editar Paciente">
                  <span class="material-symbols-outlined text-[18px]">edit</span>
                </router-link>
                <router-link :to="`/patients/${pt.id}/history`" class="text-xs font-bold text-primary hover:text-primary-container tracking-wider uppercase transition-all whitespace-nowrap flex items-center">
                  <span class="material-symbols-outlined text-sm mr-1">visibility</span> Historia
                </router-link>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="paginationData" class="flex flex-col md:flex-row justify-between items-center mt-8 px-6 py-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm gap-4">
            <div class="text-xs text-on-surface-variant font-label uppercase tracking-widest">
              Mostrando <span class="font-bold text-primary">{{ paginationData.from }} - {{ paginationData.to }}</span> de {{ paginationData.total }} pacientes
            </div>
            <div class="flex items-center gap-2">
              <button @click="goToPage(paginationData.current_page - 1)" :disabled="paginationData.current_page === 1" class="p-2 rounded-lg hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <div class="flex items-center gap-1">
                <button v-for="page in paginationData.last_page" :key="page" @click="goToPage(page)" :class="[paginationData.current_page === page ? 'bg-primary text-on-primary shadow-md' : 'hover:bg-surface-container-highest text-on-surface-variant']" class="w-8 h-8 rounded-lg text-xs font-bold transition-all">
                  {{ page }}
                </button>
              </div>
              <button @click="goToPage(paginationData.current_page + 1)" :disabled="paginationData.current_page === paginationData.last_page" class="p-2 rounded-lg hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

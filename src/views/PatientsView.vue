<script setup>
import { IonPage } from '@ionic/vue'
const API_URL = import.meta.env.VITE_API_BASE_URL
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'
import { formatHumanDate } from '../utils/date'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

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
        lastConsult: formatHumanDate(pt.evolutions_max_date || pt.created_at),
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
  <ion-page>
  <div class="flex-1 flex flex-col h-screen overflow-hidden bg-background">
    <!-- TopNavBar -->
    <header class="bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/15 flex justify-between items-center h-16 px-8 shrink-0">
      <div class="flex items-center space-x-4">
        <button @click="uiStore.openSidebar()" class="md:hidden text-on-surface-variant hover:bg-[#f3f4f5] transition-colors duration-300 p-2 rounded-full">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h1 class="text-lg font-headline font-bold text-on-surface md:hidden">Directorio</h1>
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

    <main class="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 max-w-7xl mx-auto gap-4">
        <div>
          <h2 class="text-2xl md:text-3xl font-headline font-semibold text-on-surface mb-1 tracking-tight">Directorio de Pacientes</h2>
          <p class="text-on-surface-variant font-label text-[10px] md:text-sm uppercase tracking-wider">Tus expedientes asignados</p>
        </div>
        <button @click="goToCreate" class="w-full md:w-auto py-2.5 px-5 bg-primary text-on-primary rounded-lg font-medium text-sm flex items-center justify-center shadow-lg hover:bg-primary-container transition-all">
          <span class="material-symbols-outlined mr-2 text-[18px]">person_add</span> Nuevo Paciente
        </button>
      </div>

      <!-- Filters & Tools Bar -->
      <div class="flex flex-row justify-between items-center mb-6 bg-surface-container-lowest p-2 md:p-3 rounded-xl max-w-7xl mx-auto border border-outline-variant/10 gap-2 md:gap-4 shadow-sm">

        <!-- Search Bar en la tabla -->
        <div class="flex-1 min-w-0 flex items-center">
          <div class="flex items-center bg-surface-container-high/30 rounded-full px-3 py-1.5 md:px-4 md:py-2 w-full border border-outline-variant/20 focus-within:border-primary/50 focus-within:bg-surface-container-lowest shadow-inner transition-all duration-300">
            <span class="material-symbols-outlined text-primary mr-1.5 md:mr-2 text-base md:text-lg">search</span>
            <input 
              v-model="searchQuery"
              class="bg-transparent border-none focus:ring-0 text-[11px] md:text-sm font-body text-on-surface w-full placeholder-outline p-0" 
              placeholder="Buscar..." 
              type="text"
            />
          </div>
        </div>

        <div class="flex items-center text-on-surface-variant flex-shrink-0">
          <span class="hidden md:inline text-sm font-medium mr-2">Ordenar por:</span>
          <select v-model="sortBy" class="bg-surface-container-low border-none rounded-lg text-[11px] md:text-sm py-1.5 md:py-2 pl-2 md:pl-3 pr-7 md:pr-8 focus:ring-1 focus:ring-primary cursor-pointer text-on-surface">
            <option value="ultima_visita">Última</option>
            <option value="nombre">Nombre</option>
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

          <div class="space-y-2">
            <div v-for="pt in filteredPatients" :key="pt.id" class="flex flex-col md:grid md:grid-cols-12 md:gap-4 px-4 py-3 md:px-6 md:py-4 bg-surface-container-lowest rounded-xl hover:bg-surface-container-highest transition-all items-start md:items-center group border border-outline-variant/5 shadow-sm md:shadow-none">
              <!-- Paciente y Avatar -->
              <div class="w-full md:col-span-4 flex items-center justify-between md:justify-start space-x-3 mb-2 md:mb-0">
                <div class="flex items-center space-x-3">
                  <div :class="[pt.color]" class="w-10 h-10 rounded-full flex items-center justify-center font-headline font-semibold text-sm shrink-0 shadow-sm border border-white/10">
                    {{ pt.initials }}
                  </div>
                  <div>
                    <p class="font-headline font-bold text-on-surface text-sm md:text-base leading-tight">{{ pt.name }}</p>
                    <p class="font-body text-[11px] md:text-xs text-on-surface-variant">ID: {{ pt.cId }}</p>
                  </div>
                </div>
                <!-- Status en movil (esquina superior derecha) -->
                <div class="md:hidden">
                  <span :class="[pt.statusClass]" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <span :class="[pt.dot]" class="w-1 h-1 rounded-full mr-1.5"></span> {{ pt.status }}
                  </span>
                </div>
              </div>

              <!-- Edad -->
              <div class="w-full md:col-span-2 flex md:block items-center justify-between mb-1.5 md:mb-0 px-1 md:px-0">
                <span class="md:hidden text-[11px] font-label text-on-surface-variant uppercase tracking-widest">Edad:</span>
                <p class="font-body text-xs md:text-sm text-on-surface">{{ pt.age }} años</p>
              </div>

              <!-- Info / Ultima Consulta -->
              <div class="w-full md:col-span-3 mb-3 md:mb-0 px-1 md:px-0">
                 <div class="flex flex-col">
                    <div class="flex md:block items-center justify-between mb-0.5 md:mb-0">
                      <span class="md:hidden text-[11px] font-label text-on-surface-variant uppercase tracking-widest">Última:</span>
                      <p class="font-body text-xs md:text-sm text-on-surface font-medium md:font-normal">{{ pt.lastConsult }}</p>
                    </div>
                    <p class="font-body text-[11px] md:text-xs text-on-surface-variant truncate flex items-center bg-surface-container-high/40 md:bg-transparent px-2 py-0.5 md:p-0 rounded md:rounded-none">
                      <span class="material-symbols-outlined text-[10px] md:hidden mr-1">medical_information</span>
                      {{ pt.reason }}
                    </p>
                 </div>
              </div>

              <!-- Estatus en Desktop -->
              <div class="hidden md:block md:col-span-2">
                <span :class="[pt.statusClass]" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium">
                  <span :class="[pt.dot]" class="w-1.5 h-1.5 rounded-full mr-1.5"></span> {{ pt.status }}
                </span>
              </div>

              <!-- Acciones -->
              <div class="w-full md:col-span-1 flex justify-between md:justify-end items-center pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/10 md:gap-4">
                <router-link :to="`/patients/${pt.id}/edit`" class="p-2 md:p-0 text-on-surface-variant hover:text-primary transition-all flex items-center gap-1" title="Editar Paciente">
                  <span class="material-symbols-outlined text-[18px]">edit</span>
                  <span class="md:hidden text-xs font-medium">Editar</span>
                </router-link>
                <router-link :to="`/patients/${pt.id}/history`" class="bg-primary/5 md:bg-transparent px-3 py-1.5 md:px-0 md:py-0 rounded-lg md:rounded-none text-[11px] md:text-xs font-bold text-primary hover:text-primary-container tracking-wider uppercase transition-all whitespace-nowrap flex items-center">
                  <span class="material-symbols-outlined text-sm mr-1">history</span> Historia
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
  </ion-page>
</template>

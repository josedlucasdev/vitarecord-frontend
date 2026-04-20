<script setup>
const API_URL = import.meta.env.VITE_API_BASE_URL
import { ref, onMounted, shallowRef, watch, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import * as echarts from 'echarts'

const router = useRouter()
const authStore = useAuthStore()
const emit = defineEmits(['toggle-sidebar'])

// Referencias de DOM para ECharts
const activityChartRef = ref(null)
const ageChartRef = ref(null)
const reasonsChartRef = ref(null)
const sourceChartRef = ref(null)

// Instancias de ECharts
const instances = {
  activity: shallowRef(null),
  age: shallowRef(null),
  reasons: shallowRef(null),
  source: shallowRef(null)
}

// Referencias
const pendingReferrals = ref([])

// Estadísticas
const dashboardStats = ref(null)
const isStatsLoading = ref(true)

const fetchReferrals = async () => {
  try {
    const res = await fetch(`${API_URL}/referrals`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      }
    })
    if (res.ok) {
      const data = await res.json()
      pendingReferrals.value = data.filter(r => r.status === 'pending')
    }
  } catch (error) {
    console.error(error)
  }
}

const updateReferralStatus = async (referralId, status) => {
  try {
    const res = await fetch(`${API_URL}/referrals/${referralId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ status })
    })
    if (res.ok) {
      fetchReferrals()
      fetchDashboardStats()
    }
  } catch (error) {
    console.error(error)
  }
}

// Inicialización de Gráficos ECharts
const initActivityChart = () => {
  if (!activityChartRef.value || !dashboardStats.value?.activity) return
  if (!instances.activity.value) instances.activity.value = echarts.init(activityChartRef.value)
  
  const option = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 12 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: dashboardStats.value.activity.map(d => d.date),
      show: false
    },
    yAxis: { type: 'value', show: false },
    series: [{
      data: dashboardStats.value.activity.map(d => d.count),
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 3, color: '#00478d' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 71, 141, 0.3)' },
          { offset: 1, color: 'rgba(0, 71, 141, 0)' }
        ])
      }
    }]
  }
  instances.activity.value.setOption(option)
}

const initAgeChart = () => {
  if (!ageChartRef.value || !dashboardStats.value?.demographics) return
  if (!instances.age.value) instances.age.value = echarts.init(ageChartRef.value)
  
  const data = [
    { name: '0-18', value: dashboardStats.value.demographics.find(d => d.age_group === '0-18')?.count || 0, color: '#3b82f6' },
    { name: '19-35', value: dashboardStats.value.demographics.find(d => d.age_group === '19-35')?.count || 0, color: '#10b981' },
    { name: '36-60', value: dashboardStats.value.demographics.find(d => d.age_group === '36-60')?.count || 0, color: '#f59e0b' },
    { name: '60+', value: dashboardStats.value.demographics.find(d => d.age_group === '60+')?.count || 0, color: '#f43f5e' }
  ]

  const option = {
    grid: { left: '3%', right: '10%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
    yAxis: { 
      type: 'category', 
      data: data.map(d => d.name + ' años'),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontWeight: 'bold', color: '#424752' }
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [0, 20, 20, 0] } })),
      barWidth: 15,
      label: { show: true, position: 'right', fontWeight: 'bold' }
    }]
  }
  instances.age.value.setOption(option)
}

const initReasonsChart = () => {
  if (!reasonsChartRef.value || !dashboardStats.value?.top_reasons) return
  if (!instances.reasons.value) instances.reasons.value = echarts.init(reasonsChartRef.value)
  
  const sorted = [...dashboardStats.value.top_reasons].reverse()
  const option = {
    grid: { left: '3%', right: '15%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
    yAxis: { 
      type: 'category', 
      data: sorted.map(r => r.reason_for_consultation),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { 
        width: 150, 
        overflow: 'truncate',
        color: '#424752'
      }
    },
    series: [{
      type: 'bar',
      data: sorted.map(r => r.count),
      barWidth: 12,
      itemStyle: { color: '#00478d', borderRadius: 20 },
      label: { show: true, position: 'right', fontWeight: 'bold', color: '#00478d' }
    }]
  }
  instances.reasons.value.setOption(option)
}

const initSourceChart = () => {
  if (!sourceChartRef.value || !dashboardStats.value?.sources) return
  if (!instances.source.value) instances.source.value = echarts.init(sourceChartRef.value)
  
  const option = {
    series: [{
      type: 'pie',
      radius: ['60%', '85%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: dashboardStats.value.sources.map(s => ({
        name: s.label,
        value: s.count,
        itemStyle: { color: s.label === 'Directos' ? '#00478d' : '#793100' }
      }))
    }]
  }
  instances.source.value.setOption(option)
}

const resizeCharts = () => {
  Object.values(instances).forEach(inst => inst.value?.resize())
}

const fetchDashboardStats = async () => {
  isStatsLoading.value = true
  try {
    const res = await fetch(`${API_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      }
    })
    
    if (res.ok) {
      dashboardStats.value = await res.json()
      await nextTick()
      initActivityChart()
      initAgeChart()
      initReasonsChart()
      initSourceChart()
    }
  } catch (error) {
    console.error("Error fetching stats:", error)
  } finally {
    isStatsLoading.value = false
  }
}

onMounted(() => {
  fetchReferrals()
  fetchDashboardStats()
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  Object.values(instances).forEach(inst => inst.value?.dispose())
})
</script>

<template>
  <div class="flex-1 flex flex-col h-screen overflow-hidden bg-background">
    <!-- TopNavBar -->
    <header class="bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/15 flex justify-between items-center h-16 px-8 shrink-0">
      <div class="flex items-center space-x-4">
        <button @click="emit('toggle-sidebar')" class="md:hidden text-on-surface-variant hover:bg-[#f3f4f5] transition-colors duration-300 p-2 rounded-full">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h1 class="text-lg font-headline font-bold text-on-surface">Panel de Analíticas</h1>
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

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
      
      <!-- Insights Section -->
      <section class="max-w-7xl mx-auto mb-10">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-1.5 h-6 bg-primary rounded-full"></div>
          <h2 class="text-xl font-headline font-bold text-on-surface">Estado de la Consulta</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center justify-between group">
            <div>
              <p class="text-[10px] font-bold text-outline uppercase mb-1">Total Directorio</p>
              <h3 class="text-3xl font-headline font-bold text-on-surface">{{ isStatsLoading ? '...' : dashboardStats?.kpis.total_patients }}</h3>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">groups</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center justify-between group">
            <div>
              <p class="text-[10px] font-bold text-outline uppercase mb-1">Actividad (7d)</p>
              <h3 class="text-3xl font-headline font-bold text-on-surface">{{ isStatsLoading ? '...' : dashboardStats?.kpis.recent_evolutions }}</h3>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">query_stats</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center justify-between group">
            <div>
              <p class="text-[10px] font-bold text-outline uppercase mb-1">Referidos</p>
              <h3 class="text-3xl font-headline font-bold text-on-surface">{{ isStatsLoading ? '...' : dashboardStats?.kpis.pending_referrals }}</h3>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">diversity_1</span>
            </div>
          </div>
        </div>        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
           <!-- Activity Trend Chart (ECharts) -->
           <div class="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-xl shadow-primary/5">
              <div class="flex justify-between items-center mb-10">
                <div>
                  <h4 class="font-headline font-bold text-lg text-on-surface">Tendencia de Consultas</h4>
                  <p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-[0.2em] mt-1">Últimos 30 días</p>
                </div>
                <div class="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  <span class="text-[10px] font-bold text-primary uppercase">En Vivo</span>
                </div>
              </div>
              
              <div class="h-44 w-full relative">
                 <div ref="activityChartRef" class="w-full h-full"></div>
                 <div v-if="isStatsLoading" class="absolute inset-0 bg-surface-container-lowest/50 flex items-center justify-center">
                    <div class="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                       <div class="h-full bg-primary/20 animate-shimmer-horiz"></div>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Demographics Chart (ECharts) -->
           <div class="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-xl shadow-primary/5">
              <div class="flex justify-between items-center mb-10">
                <div>
                  <h4 class="font-headline font-bold text-lg text-on-surface">Distribución por Edades</h4>
                  <p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-[0.2em] mt-1">Perfil Demográfico</p>
                </div>
                <div class="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                  <span class="material-symbols-outlined text-xl">bar_chart</span>
                </div>
              </div>

              <div class="h-44 w-full relative">
                 <div ref="ageChartRef" class="w-full h-full"></div>
                 <div v-if="isStatsLoading" class="absolute inset-0 bg-surface-container-lowest/50 flex flex-col justify-around">
                    <div v-for="i in 4" :key="i" class="h-2 bg-surface-container-high rounded-full animate-pulse"></div>
                 </div>
              </div>
           </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
           <!-- Top Reasons for Consultation (ECharts) -->
           <div class="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-xl shadow-primary/5">
              <div class="flex justify-between items-center mb-8">
                <div>
                  <h4 class="font-headline font-bold text-lg text-on-surface">Motivos de Consulta</h4>
                  <p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-[0.2em] mt-1">Ranking de Casos</p>
                </div>
                <span class="material-symbols-outlined text-primary">diversity_3</span>
              </div>
              
              <div class="h-64 w-full relative">
                 <div ref="reasonsChartRef" class="w-full h-full"></div>
                 <div v-if="isStatsLoading" class="absolute inset-0 space-y-4">
                    <div v-for="i in 5" :key="i" class="h-10 bg-surface-container-low rounded-xl animate-pulse"></div>
                 </div>
              </div>
           </div>

           <!-- Patient Sources (ECharts Donut) -->
           <div class="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-xl shadow-primary/5">
              <div class="flex justify-between items-center mb-10">
                <div>
                  <h4 class="font-headline font-bold text-lg text-on-surface">Origen de Pacientes</h4>
                  <p class="text-[10px] text-on-surface-variant font-medium uppercase tracking-[0.2em] mt-1">Propios vs Referidos</p>
                </div>
                <span class="material-symbols-outlined text-tertiary">share</span>
              </div>

              <div class="flex flex-col md:flex-row items-center gap-10">
                 <!-- Donut Chart -->
                 <div class="relative w-44 h-44 shrink-0">
                    <div ref="sourceChartRef" class="w-full h-full"></div>
                    <div v-if="!isStatsLoading" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <p class="text-[10px] font-bold text-outline-variant uppercase">Total</p>
                       <p class="text-2xl font-black text-on-surface">{{ dashboardStats?.kpis.total_patients }}</p>
                    </div>
                 </div>

                 <!-- Legends -->
                 <div class="flex-1 space-y-4 w-full" v-if="!isStatsLoading">
                    <div v-for="source in dashboardStats?.sources" :key="source.label" class="flex items-center justify-between">
                       <div class="flex items-center gap-3">
                          <div class="w-3 h-3 rounded-full" :class="source.label === 'Directos' ? 'bg-primary' : 'bg-tertiary'"></div>
                          <span class="text-sm font-semibold text-on-surface">{{ source.label }}</span>
                       </div>
                       <div class="flex flex-col items-end">
                          <span class="text-sm font-black text-on-surface">{{ source.count }}</span>
                          <span class="text-[9px] font-bold text-outline-variant uppercase">{{ (source.count / (dashboardStats?.kpis.total_patients || 1) * 100).toFixed(0) }}%</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      <!-- Referral Inbox -->
      <section v-if="pendingReferrals.length > 0" class="max-w-7xl mx-auto">
         <div class="bg-primary-container/20 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center space-x-4">
               <div class="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center">
                  <span class="material-symbols-outlined">mail</span>
               </div>
               <div>
                  <h3 class="text-lg font-headline font-bold text-on-surface">Nuevas Referencias</h3>
                  <p class="text-sm text-on-surface-variant italic">Solicitudes de acceso pendientes.</p>
               </div>
            </div>
            <div class="flex items-center gap-3 overflow-x-auto w-full md:w-auto">
               <div v-for="ref in pendingReferrals" :key="ref.id" class="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex items-center gap-4 shrink-0 shadow-sm min-w-[300px]">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-on-surface truncate">{{ ref.patient?.name }}</p>
                    <p class="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">De: {{ ref.from_doctor?.name }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button @click="updateReferralStatus(ref.id, 'rejected')" class="text-error border border-error/20 p-2 rounded-lg hover:bg-error/10 transition-colors">
                       <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                    <button @click="updateReferralStatus(ref.id, 'accepted')" class="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">Aceptar</button>
                  </div>
               </div>
            </div>
         </div>
      </section>
    </main>
  </div>
</template>

<script setup>
const API_URL = import.meta.env.VITE_API_BASE_URL
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const patientId = route.params.id
const patient = ref(null)
const timeline = ref([])
const isLoading = ref(true)

const selectedEvolution = ref(null)
const isModalOpen = ref(false)

const isSendingReferral = ref(false)
const doctors = ref([])
const isReferralModalOpen = ref(false)
const selectedDoctorId = ref(null)

// LIGHTBOX LOGIC
const isLightboxOpen = ref(false)
const lightboxImage = ref('')

const openLightbox = (url) => {
  lightboxImage.value = url
  isLightboxOpen.value = true
}

const closeLightbox = () => {
  isLightboxOpen.value = false
  lightboxImage.value = ''
}

const getAttachmentUrl = (path) => {
  if (!path) return ''
  try {
    // Usamos el API nativo de URL para obtener solo el dominio (https://api.vitarecord.com)
    const url = new URL(API_URL)
    const finalUrl = `${url.origin}/storage/${path}`
    return finalUrl
  } catch (e) {
    // Si falla, usamos el dominio por defecto
    return `https://api.vitarecord.com/storage/${path}`
  }
}

const fetchTimeline = async () => {
  isLoading.value = true
  try {
    const res = await fetch(`${API_URL}/patients/${patientId}/timeline`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      }
    })
    if (res.ok) {
      const data = await res.json()
      patient.value = data.patient
      timeline.value = data.timeline
    }
  } catch (error) {
    console.error("Error fetching timeline:", error)
  } finally {
    isLoading.value = false
  }
}

const showDetails = (evo) => {
  selectedEvolution.value = { ...evo } // Clone to ensure reactivity and fresh data
  isModalOpen.value = true
}

const closeDetails = () => {
  isModalOpen.value = false
  selectedEvolution.value = null
}

const printReport = () => {
  window.print()
}

// SECTION EDIT LOGIC
const isSectionModalOpen = ref(false)
const activeSection = ref('')
const isSavingSection = ref(false)
const sectionForm = ref({})

const openSectionEdit = (section) => {
  activeSection.value = section
  isSectionModalOpen.value = true
  
  // Clone current data
  if (section === 'base') {
    sectionForm.value = {
      blood_type: patient.value.base_history?.blood_type || 'O+',
      menarche: patient.value.base_history?.menarche,
      menstrual_cycle: patient.value.base_history?.menstrual_cycle,
      pregnancies_gpcav: patient.value.base_history?.pregnancies_gpcav
    }
  } else if (section === 'allergies') {
    sectionForm.value = { allergies: patient.value.base_history?.allergies }
  } else if (section === 'pathological') {
    sectionForm.value = { personal_pathological: patient.value.base_history?.personal_pathological }
  } else if (section === 'surgical') {
    sectionForm.value = { surgical: patient.value.base_history?.surgical }
  } else if (section === 'family_habits') {
    sectionForm.value = { 
      family_history: patient.value.base_history?.family_history,
      habits: patient.value.base_history?.habits
    }
  }
}

const saveSection = async () => {
  isSavingSection.value = true
  try {
    const res = await fetch(`${API_URL}/patients/${patientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ...patient.value, // Send current patient data
        ...sectionForm.value // Override with edited fields
      })
    })

    if (res.ok) {
      const updatedData = await res.json()
      patient.value = updatedData
      isSectionModalOpen.value = false
    } else {
      alert('Error al guardar los cambios')
    }
  } catch (error) {
    console.error(error)
  } finally {
    isSavingSection.value = false
  }
}

const fetchDoctors = async () => {
  try {
    const res = await fetch(`${API_URL}/admin/doctors`, {
      headers: { 'Accept': 'application/json' }
    })
    if (res.ok) {
      const data = await res.json()
      // Filter out current user and inactive doctors
      doctors.value = data.filter(d => d.id !== authStore.user.id && d.is_active)
    }
  } catch (error) {
    console.error(error)
  }
}

const openReferralModal = () => {
  fetchDoctors()
  isReferralModalOpen.value = true
}

const sendReferral = async () => {
  if (!selectedDoctorId.value) return
  isSendingReferral.value = true
  try {
    const res = await fetch(`${API_URL}/referrals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        patient_id: patientId,
        to_doctor_id: selectedDoctorId.value
      })
    })

    if (res.ok) {
      alert('Referencia enviada con éxito. El colega deberá aceptarla para ver al paciente.')
      isReferralModalOpen.value = false
    } else {
      const error = await res.json()
      alert(error.message || 'Error al enviar la referencia')
    }
  } catch (error) {
    console.error(error)
  } finally {
    isSendingReferral.value = false
  }
}
onMounted(fetchTimeline)

const goToNewEvolution = () => {
  router.push(`/patients/${patientId}/evolution/new`)
}
</script>

<template>
  <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-background font-body relative">
    
    <!-- PRINT HEADER (Only visible in PDF/Print) -->
    <div class="hidden print:block mb-10 border-b-2 border-primary-container pb-6">
       <div class="flex justify-between items-start">
          <div>
             <h1 class="text-3xl font-headline font-extrabold text-primary mb-1">REPORTE DE HISTORIA CLÍNICA</h1>
             <p class="text-sm text-on-surface-variant font-bold uppercase tracking-widest">VitaRecord • Gestión Médica Integral</p>
          </div>
          <div class="text-right">
             <p class="text-sm font-bold text-on-surface">Fecha de Impresión: {{ new Date().toLocaleDateString() }}</p>
             <p v-if="patient?.address" class="text-[10px] text-on-surface-variant italic">Dirección: {{ patient.address }}</p>
             <p class="text-[10px] text-outline uppercase tracking-tighter">Documento Digital Valido únicamente para fines informativos</p>
          </div>
       </div>
    </div>

    <!-- Top Nav Placeholder / Breadcrumbs -->
    <header class="h-16 border-b border-outline-variant/10 flex items-center px-8 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-10 shrink-0 print:hidden">
       <nav class="flex items-center text-sm font-medium space-x-2">
          <router-link to="/dashboard" class="text-on-surface-variant hover:text-primary transition-colors">Directorio</router-link>
          <span class="material-symbols-outlined text-sm text-outline">chevron_right</span>
          <span class="text-primary">Historia Clínica</span>
       </nav>
    </header>

    <main v-if="!isLoading && patient" class="flex-1 overflow-y-auto px-8 py-10 w-full max-w-7xl mx-auto print:p-0 print:overflow-visible">
      
      <!-- Patient Profile Header -->
      <div class="mb-10 animate-fade-in print:mb-8">
        <h1 class="text-4xl font-headline font-bold text-on-background tracking-tight mb-2 print:text-3xl">{{ patient.name }}</h1>
        <div class="flex items-center gap-4 text-sm font-label uppercase tracking-widest text-on-surface-variant print:text-xs">
           <span>ID: {{ patient.identity_card }}</span>
           <span class="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
           <span>Edad: {{ patient.age }} años</span>
           <span class="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
           <span class="text-primary font-bold">{{ patient.occupation }}</span>
           <span v-if="patient.address" class="text-outline uppercase tracking-tight flex items-center gap-1">
             <span class="material-symbols-outlined text-[12px]">location_on</span> {{ patient.address }}
           </span>
           <button @click="openReferralModal" class="ml-4 flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold hover:bg-primary hover:text-on-primary transition-all print:hidden">
              <span class="material-symbols-outlined text-sm">share</span> Referir a Colega
           </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-10 print:gap-4 print:block">
        
        <!-- SIDEBAR: Modular Clinical Profile -->
        <aside class="w-full lg:w-80 shrink-0 flex flex-col gap-5 print:mb-8">
          
          <!-- Card 1: Información Base & GO -->
          <div class="bg-surface-container-low rounded-2xl p-6 shadow-sm border border-outline-variant/10 print:bg-white group">
            <header class="flex justify-between items-start mb-6 border-b border-outline-variant/20 pb-2">
              <h2 class="text-[10px] font-label uppercase text-on-surface-variant tracking-[0.2em]">Información Base</h2>
              <button @click="openSectionEdit('base')" class="text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 print:hidden">
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
            </header>
            
            <div class="space-y-6">
              <!-- Blood Type -->
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center shadow-sm">
                  <span class="material-symbols-outlined text-xl">bloodtype</span>
                </div>
                <div>
                  <p class="text-[10px] uppercase font-bold text-on-surface-variant">Tipo de Sangre</p>
                  <p class="text-lg font-headline font-bold text-on-background leading-none">{{ patient.base_history?.blood_type || 'O+' }}</p>
                </div>
              </div>

              <!-- GO Data -->
              <div v-if="patient.base_history?.menarche" class="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/10">
                  <div>
                    <p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Menarquia</p>
                    <p class="text-sm font-bold text-on-surface">{{ patient.base_history.menarche }} años</p>
                  </div>
                  <div>
                    <p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Ciclo</p>
                    <p class="text-sm font-bold text-on-surface">{{ patient.base_history.menstrual_cycle || 'Regulares' }}</p>
                  </div>
              </div>

              <div v-if="patient.base_history?.pregnancies_gpcav" class="pt-4 border-t border-outline-variant/10">
                  <p class="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Obs (GPCAV)</p>
                  <p class="text-xs font-mono font-bold bg-surface-container-highest px-3 py-2 rounded-lg text-on-surface-variant">
                    {{ patient.base_history.pregnancies_gpcav }}
                  </p>
              </div>
            </div>
          </div>

          <!-- Card 2: Allergies (Prominent Alert) -->
          <div v-if="patient.base_history?.allergies" class="bg-error-container/10 border border-error/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-error opacity-40"></div>
            <header class="flex justify-between items-start mb-3">
              <h3 class="text-[10px] font-bold text-error uppercase tracking-widest flex items-center">
                <span class="material-symbols-outlined text-sm mr-2">warning</span> Alergias Conocidas
              </h3>
              <button @click="openSectionEdit('allergies')" class="text-error opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 print:hidden">
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
            </header>
            <p class="text-sm text-on-surface italic leading-relaxed">
              {{ patient.base_history.allergies }}
            </p>
          </div>

          <!-- Card 3: Personal Pathological -->
          <div v-if="patient.base_history?.personal_pathological" class="bg-surface-container-low rounded-2xl p-6 shadow-sm border border-outline-variant/10 group">
             <header class="flex justify-between items-start mb-3">
               <h3 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Antecedentes Personales Patológicos</h3>
               <button @click="openSectionEdit('pathological')" class="text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 print:hidden">
                 <span class="material-symbols-outlined text-sm">edit</span>
               </button>
             </header>
             <p class="text-xs text-on-surface leading-loose text-justify">
               {{ patient.base_history.personal_pathological }}
             </p>
          </div>

          <!-- Card 4: Surgical -->
          <div v-if="patient.base_history?.surgical" class="bg-surface-container-low rounded-2xl p-6 shadow-sm border border-outline-variant/10 group">
             <header class="flex justify-between items-start mb-3">
               <h3 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Antecedentes Quirúrgicos</h3>
               <button @click="openSectionEdit('surgical')" class="text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 print:hidden">
                 <span class="material-symbols-outlined text-sm">edit</span>
               </button>
             </header>
             <p class="text-xs text-on-surface leading-loose">
               {{ patient.base_history.surgical }}
             </p>
          </div>

          <!-- Card 5: Family & Habits -->
          <div v-if="patient.base_history?.family_history || patient.base_history?.habits" class="bg-surface-container-low rounded-2xl p-6 shadow-sm border border-outline-variant/10 group">
             <header class="flex justify-between items-start mb-3">
               <h3 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Historia & Estilo de Vida</h3>
               <button @click="openSectionEdit('family_habits')" class="text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 print:hidden">
                 <span class="material-symbols-outlined text-sm">edit</span>
               </button>
             </header>
             <div class="space-y-6 mt-3">
               <div v-if="patient.base_history?.family_history">
                  <p class="text-[8px] uppercase font-bold text-on-surface-variant mb-1">Antecedentes Familiares</p>
                  <p class="text-xs text-on-surface leading-loose">{{ patient.base_history.family_history }}</p>
               </div>
               <div v-if="patient.base_history?.habits" class="pt-4 border-t border-outline-variant/10">
                  <p class="text-[8px] uppercase font-bold text-on-surface-variant mb-1">Hábitos</p>
                  <p class="text-xs text-on-surface leading-loose">{{ patient.base_history.habits }}</p>
               </div>
             </div>
          </div>

        </aside>

        <!-- MAIN: Timeline -->
        <div class="flex-1 flex flex-col min-w-0 print:block">
          
          <div class="flex justify-between items-end mb-8 print:mb-4">
            <div class="print:hidden">
              <h2 class="text-2xl font-headline font-semibold text-on-background">Línea de Tiempo</h2>
              <p class="text-sm text-on-surface-variant mt-1">Sucesión cronológica de eventos médicos.</p>
            </div>
            <div class="hidden print:block shadow-none">
               <h2 class="text-xl font-headline font-bold text-primary border-b-2 border-primary/10 pb-2">CRONOLOGÍA DE EVOLUCIONES CLÍNICAS</h2>
            </div>
            <div class="flex gap-2 print:hidden">
              <button @click="printReport" class="border border-outline text-on-surface rounded-xl py-3 px-6 font-bold text-sm flex items-center hover:bg-surface-container-high transition-colors">
                <span class="material-symbols-outlined mr-2">download</span> Exportar PDF
              </button>
              <button @click="goToNewEvolution" class="bg-primary text-on-primary rounded-xl py-3 px-6 font-bold text-sm flex items-center shadow-lg hover:scale-95 transition-transform">
                <span class="material-symbols-outlined mr-2">edit_document</span> Nueva Evolución
              </button>
            </div>
          </div>

          <!-- Empty Timeline -->
          <div v-if="timeline.length === 0" class="py-20 flex flex-col items-center justify-center text-on-surface-variant border-2 border-dashed border-outline-variant/20 rounded-2xl">
             <span class="material-symbols-outlined text-5xl mb-4 opacity-10">timeline</span>
             <p class="font-headline text-lg font-bold">Sin historias registradas</p>
          </div>

          <!-- REAL TIMELINE -->
          <div v-else class="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:to-transparent print:space-y-8 print:before:hidden">
            
            <div v-for="evo in timeline" :key="evo.id" class="relative flex items-center justify-between group print:block print:break-inside-avoid">
              <!-- Node (Hidden in print) -->
              <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary-container text-on-primary-container shadow-sm shrink-0 relative z-10 scale-90 group-hover:scale-100 transition-transform print:hidden">
                <span class="material-symbols-outlined text-lg">medical_services</span>
              </div>
              
              <!-- Card -->
              <div class="w-[calc(100%-4rem)] p-6 rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/15 hover:bg-surface-bright transition-colors print:w-full print:bg-white print:border-outline-variant/30 print:shadow-none print:p-4">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <span class="text-[10px] font-bold uppercase text-primary tracking-widest block mb-1">Evolución Clínica • Dr. {{ evo.doctor?.name }}</span>
                    <h3 class="font-headline font-bold text-xl text-on-background print:text-lg">{{ evo.reason_for_consultation }}</h3>
                  </div>
                  <span class="text-xs text-on-surface-variant font-bold bg-surface-container-high px-2 py-1.5 rounded-full print:bg-white print:border print:border-outline-variant/20">{{ new Date(evo.date).toLocaleDateString() }}</span>
                </div>
                
                <div class="space-y-4">
                  <div v-if="evo.current_illness">
                    <p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Enfermedad Actual</p>
                    <p class="text-sm text-on-surface leading-relaxed italic font-serif print:not-italic print:line-clamp-none" v-html="evo.current_illness"></p>
                  </div>

                  <!-- Expanded Details for Print -->
                  <div class="hidden print:grid print:grid-cols-1 print:gap-4 print:pt-4 print:border-t print:border-outline-variant/10">
                    <div v-if="evo.vital_signs">
                      <p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1 text-primary">Examen Físico (Signos & Medidas)</p>
                      <p class="text-xs font-bold">{{ evo.vital_signs }}</p>
                      <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p v-if="evo.weight" class="text-[10px]">Peso: <span class="font-bold">{{ evo.weight }}</span></p>
                        <p v-if="evo.height" class="text-[10px]">Talla: <span class="font-bold">{{ evo.height }}</span></p>
                        <p v-if="evo.fetal_heart_rate" class="text-[10px]">FCF: <span class="font-bold">{{ evo.fetal_heart_rate }}</span></p>
                        <p v-if="evo.uterine_height" class="text-[10px]">AU: <span class="font-bold">{{ evo.uterine_height }}</span></p>
                      </div>
                    </div>
                    <div v-if="evo.physical_exam">
                       <p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1 text-primary">Notas Examen Físico</p>
                       <div class="text-[10px] leading-relaxed italic" v-html="evo.physical_exam"></div>
                    </div>
                    <div v-if="evo.diagnostic_impression">
                       <p class="text-[10px] uppercase font-bold text-on-surface-variant mb-1 text-primary">Impresión Diagnóstica</p>
                       <p class="text-xs">{{ evo.diagnostic_impression }}</p>
                    </div>
                    <!-- Prescriptions in Print -->
                    <div v-if="evo.prescriptions?.length > 0">
                       <p class="text-[10px] uppercase font-bold text-primary mb-2">Receta Médica Extendida</p>
                       <div class="space-y-2">
                          <div v-for="rx in evo.prescriptions" :key="rx.id" class="text-xs pl-3 border-l-2 border-primary/20">
                             <span class="font-bold">{{ rx.medications }}:</span> {{ rx.indications }}
                          </div>
                       </div>
                    </div>
                  </div>
                  <!-- Lego Tags Section (Visual Feedback) -->
                  <div class="flex flex-wrap gap-3 pt-4 mt-4 border-t border-outline-variant/10 print:hidden">
                    <div v-if="evo.prescriptions?.some(r => !r.attachment_path)" class="flex items-center gap-2 bg-primary-fixed text-on-primary-fixed text-[10px] font-bold px-3 py-1.5 rounded-full uppercase">
                      <span class="material-symbols-outlined text-sm">prescriptions</span> Receta Digital
                    </div>
                    <div v-if="evo.prescriptions?.some(r => r.attachment_path)" class="flex items-center gap-2 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold px-3 py-1.5 rounded-full uppercase">
                      <span class="material-symbols-outlined text-sm">description</span> Receta Manual Foto
                    </div>
                    <div v-if="evo.exams?.length > 0" class="flex items-center gap-2 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold px-3 py-1.5 rounded-full uppercase">
                      <span class="material-symbols-outlined text-sm">image</span> Ecos Adjuntos
                    </div>
                    <div v-if="evo.vital_signs || evo.weight || evo.fetal_heart_rate" class="flex items-center gap-2 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold px-3 py-1.5 rounded-full uppercase">
                      <span class="material-symbols-outlined text-sm">clinical_notes</span> Examen Físico
                    </div>
                  </div>

                  <!-- Clinical Image Previews (Visual Evidence) -->
                  <div v-if="evo.exams?.length > 0 || evo.prescriptions?.some(r => r.attachment_path)" class="grid grid-cols-4 md:grid-cols-6 gap-3 mt-6 w-full print:hidden">
                    <div v-for="eco in evo.exams" :key="eco.id" 
                      @click.stop="openLightbox(getAttachmentUrl(eco.attachment_path))"
                      class="aspect-square rounded-xl overflow-hidden border-2 border-outline-variant/10 cursor-zoom-in hover:scale-110 hover:z-10 transition-all shadow-sm relative group"
                    >
                      <img :src="getAttachmentUrl(eco.attachment_path)" class="w-full h-full object-cover" @error="e => e.target.src = 'https://placehold.co/400x400?text=Error'"/>
                      <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-sm">zoom_in</span>
                      </div>
                    </div>
                    
                    <div v-for="rx in evo.prescriptions.filter(r => r.attachment_path)" :key="rx.id" 
                      @click.stop="openLightbox(getAttachmentUrl(rx.attachment_path))"
                      class="aspect-square rounded-xl overflow-hidden border-2 border-secondary/20 cursor-zoom-in hover:scale-110 hover:z-10 transition-all shadow-sm relative group"
                    >
                      <img :src="getAttachmentUrl(rx.attachment_path)" class="w-full h-full object-cover" @error="e => e.target.src = 'https://placehold.co/400x400?text=Error'"/>
                      <div class="absolute inset-0 bg-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-sm">description</span>
                      </div>
                      <div class="absolute bottom-1 left-1 bg-secondary text-white text-[6px] font-black px-1 rounded">RECETA</div>
                    </div>
                  </div>
                </div>

                <div class="mt-6 flex items-center justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low/50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl print:hidden">
                   <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-base">person</span> {{ evo.doctor?.name }}
                   </div>
                   <button @click="showDetails(evo)" class="text-primary hover:underline flex items-center gap-1 transition-all">
                     Ver Detalle <span class="material-symbols-outlined text-sm">arrow_forward</span>
                   </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>

    <!-- LOADING STATE -->
    <div v-else class="flex-1 flex flex-col items-center justify-center p-20 text-on-surface-variant print:hidden">
       <span class="material-symbols-outlined animate-spin text-4xl mb-4 text-primary">progress_activity</span>
       <p class="font-label text-sm uppercase tracking-widest animate-pulse">Consultando Expediente...</p>
    </div>

    <!-- DETAIL MODAL -->
    <Transition name="fade">
      <div v-if="isModalOpen && selectedEvolution" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
        <div class="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" @click="closeDetails"></div>
        
        <div class="bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in border border-outline-variant/20">
          <!-- Modal Header -->
          <div class="p-6 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
            <div>
              <span class="text-[10px] font-bold uppercase text-primary tracking-widest">Detalle de Consulta</span>
              <h2 class="text-2xl font-headline font-bold text-on-background">{{ selectedEvolution.reason_for_consultation }}</h2>
            </div>
            <button @click="closeDetails" class="w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-8 overflow-y-auto space-y-8">
            
            <!-- Disease Section -->
            <section>
              <h3 class="text-xs font-bold uppercase text-on-surface-variant tracking-widest mb-4 flex items-center">
                <span class="material-symbols-outlined text-base mr-2">description</span> Enfermedad Actual
              </h3>
              <div class="text-base text-on-surface leading-relaxed font-serif italic" v-html="selectedEvolution.current_illness"></div>
            </section>

            <!-- Physical Exam & Vitals Grid -->
            <section v-if="selectedEvolution.vital_signs || selectedEvolution.weight" class="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15">
              <h3 class="text-xs font-bold uppercase text-on-surface-variant tracking-widest mb-4">Examen Físico (Signos & Medidas)</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <!-- Vitals from string -->
                 <div v-for="part in (selectedEvolution.vital_signs || '').split(',')" :key="part" class="flex flex-col">
                    <span v-if="part.includes(':')" class="text-[10px] font-bold text-outline uppercase">{{ part.split(':')[0] }}</span>
                    <span v-if="part.includes(':')" class="font-bold text-on-surface">{{ part.split(':')[1] }}</span>
                 </div>
                 <!-- New Structured Fields -->
                 <div v-if="selectedEvolution.weight" class="flex flex-col">
                    <span class="text-[10px] font-bold text-outline uppercase">Peso</span>
                    <span class="font-bold text-on-surface">{{ selectedEvolution.weight }}</span>
                 </div>
                 <div v-if="selectedEvolution.height" class="flex flex-col">
                    <span class="text-[10px] font-bold text-outline uppercase">Talla</span>
                    <span class="font-bold text-on-surface">{{ selectedEvolution.height }}</span>
                 </div>
                 <div v-if="selectedEvolution.fetal_heart_rate" class="flex flex-col">
                    <span class="text-[10px] font-bold text-outline uppercase">FC Fetal</span>
                    <span class="font-bold text-on-surface">{{ selectedEvolution.fetal_heart_rate }}</span>
                 </div>
                 <div v-if="selectedEvolution.uterine_height" class="flex flex-col">
                    <span class="text-[10px] font-bold text-outline uppercase">A. Uterina</span>
                    <span class="font-bold text-on-surface">{{ selectedEvolution.uterine_height }}</span>
                 </div>
              </div>

              <!-- Physical Exam Detailed Notes -->
              <div v-if="selectedEvolution.physical_exam" class="mt-6 pt-6 border-t border-outline-variant/10">
                <p class="text-[10px] font-bold uppercase text-on-surface-variant mb-2">Descripción del Examen</p>
                <div class="text-sm text-on-surface italic leading-relaxed" v-html="selectedEvolution.physical_exam"></div>
              </div>
            </section>

            <!-- Prescription Module -->
            <section v-if="selectedEvolution.prescriptions?.length > 0">
               <h3 class="text-xs font-bold uppercase text-primary tracking-widest mb-4 flex items-center">
                 <span class="material-symbols-outlined text-base mr-2">prescriptions</span> Receta Médica
               </h3>
               <div class="space-y-3">
                  <div v-for="rx in selectedEvolution.prescriptions" :key="rx.id" class="p-4 rounded-xl bg-primary-fixed-dim/10 border border-primary-fixed/30">
                     <p class="font-bold text-on-surface">{{ rx.medications }}</p>
                     <p class="text-sm text-on-surface-variant">{{ rx.indications }}</p>
                  </div>
               </div>
            </section>

            <!-- Diagnostic Impression -->
            <section v-if="selectedEvolution.diagnostic_impression">
              <h3 class="text-xs font-bold uppercase text-on-surface-variant tracking-widest mb-4">Impresión Diagnóstica</h3>
              <div class="p-4 rounded-xl bg-surface-container-highest/50 border border-outline-variant/15">
                <p class="text-sm font-medium text-on-surface">{{ selectedEvolution.diagnostic_impression }}</p>
              </div>
            </section>

            <!-- Attachments Gallery in Details -->
            <section v-if="selectedEvolution.exams?.length > 0 || selectedEvolution.prescriptions?.some(r => r.attachment_path)">
               <h3 class="text-xs font-bold uppercase text-on-surface-variant tracking-widest mb-4 flex items-center">
                 <span class="material-symbols-outlined text-base mr-2 text-primary">collections</span> Adjuntos Complementarios
               </h3>
               <div class="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <!-- Ecos -->
                  <div v-for="eco in selectedEvolution.exams" :key="eco.id" 
                    @click="openLightbox(getAttachmentUrl(eco.attachment_path))"
                    class="aspect-video rounded-2xl overflow-hidden border border-outline-variant/20 cursor-zoom-in relative group shadow-lg"
                  >
                     <img :src="getAttachmentUrl(eco.attachment_path)" class="w-full h-full object-cover" @error="e => e.target.src = 'https://placehold.co/800x600?text=Estudio+No+Disponible'"/>
                     <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-[10px] text-white font-bold uppercase opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-sm">analytics</span>
                          Estudio Ecográfico
                        </div>
                     </div>
                  </div>
                  <!-- Manual Prescription -->
                  <div v-for="rx in selectedEvolution.prescriptions.filter(r => r.attachment_path)" :key="rx.id" 
                    @click="openLightbox(getAttachmentUrl(rx.attachment_path))"
                    class="aspect-video rounded-2xl overflow-hidden border border-secondary/30 cursor-zoom-in relative group shadow-lg"
                  >
                     <img :src="getAttachmentUrl(rx.attachment_path)" class="w-full h-full object-cover" @error="e => e.target.src = 'https://placehold.co/800x600?text=Receta+No+Disponible'"/>
                     <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-secondary/80 to-transparent p-4 text-[10px] text-white font-bold uppercase">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-sm">description</span>
                          Receta Manual Adjunta
                        </div>
                     </div>
                  </div>
               </div>
            </section>

          </div>

          <!-- Modal Footer -->
          <div class="p-6 border-t border-outline-variant/10 bg-surface-container-low/50 flex justify-between items-center shrink-0">
             <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                   <span class="material-symbols-outlined text-sm">person</span>
                </div>
                <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                   Dr. {{ selectedEvolution.doctor?.name }}
                </div>
             </div>
             <span class="text-xs font-bold text-outline">{{ new Date(selectedEvolution.date).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- SECTION EDIT MODAL -->
    <Transition name="fade">
      <div v-if="isSectionModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden">
        <div class="absolute inset-0 bg-on-surface/60 backdrop-blur-md" @click="isSectionModalOpen = false"></div>
        
        <div class="bg-surface-container-lowest w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-zoom-in border border-outline-variant/30">
          <!-- Header -->
          <div class="p-8 border-b border-outline-variant/10 flex items-center justify-between bg-primary-container/5">
            <div>
              <p class="text-[10px] uppercase font-bold text-primary tracking-[0.2em] mb-1">Módulo de Actualización</p>
              <h2 class="text-2xl font-headline font-bold text-on-background capitalize">Editar {{ activeSection.replace('_', ' ') }}</h2>
            </div>
            <button @click="isSectionModalOpen = false" class="w-12 h-12 rounded-full hover:bg-surface-container-high transition-all flex items-center justify-center">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="p-8 space-y-6">
            
            <!-- Inputs conditional to activeSection -->
            <div v-if="activeSection === 'base'" class="space-y-6">
               <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Menarquia</label>
                    <input v-model="sectionForm.menarche" type="number" class="w-full bg-surface-container-high border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all shadow-inner"/>
                  </div>
                  <div>
                    <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Ciclo Menstrual</label>
                    <input v-model="sectionForm.menstrual_cycle" type="text" class="w-full bg-surface-container-high border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all shadow-inner"/>
                  </div>
               </div>
               <div>
                  <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Obstetricia (GPCAV)</label>
                  <input v-model="sectionForm.pregnancies_gpcav" type="text" class="w-full bg-surface-container-high border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all shadow-inner" placeholder="Ej: G:2 P:0 C:1 A:1 V:1"/>
               </div>
               <div>
                  <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-3">Tipo de Sangre</label>
                  <div class="flex flex-wrap gap-2">
                    <button 
                      v-for="bt in ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']" 
                      :key="bt"
                      @click="sectionForm.blood_type = bt"
                      :class="[sectionForm.blood_type === bt ? 'bg-primary text-on-primary ring-2 ring-primary-container' : 'bg-surface-container-high text-on-surface hover:bg-surface-variant']"
                      class="px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
                    >
                      {{ bt }}
                    </button>
                  </div>
               </div>
            </div>

            <div v-if="activeSection === 'allergies'">
               <label class="block text-[10px] uppercase font-bold text-error mb-2">Alergias Conocidas</label>
               <textarea v-model="sectionForm.allergies" rows="4" class="w-full bg-surface-container-high border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-error transition-all italic text-on-surface shadow-inner resize-none"></textarea>
            </div>

            <div v-if="activeSection === 'pathological'">
               <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Antecedentes Personales Patológicos</label>
               <textarea v-model="sectionForm.personal_pathological" rows="6" class="w-full bg-surface-container-high border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all text-on-surface shadow-inner resize-none"></textarea>
            </div>

            <div v-if="activeSection === 'surgical'">
               <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Antecedentes Quirúrgicos</label>
               <textarea v-model="sectionForm.surgical" rows="6" class="w-full bg-surface-container-high border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all text-on-surface shadow-inner resize-none"></textarea>
            </div>

            <div v-if="activeSection === 'family_habits'" class="space-y-6">
               <div>
                 <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Antecedentes Familiares</label>
                 <textarea v-model="sectionForm.family_history" rows="3" class="w-full bg-surface-container-high border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all shadow-inner resize-none"></textarea>
               </div>
               <div>
                 <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Hábitos y Estilo de Vida</label>
                 <textarea v-model="sectionForm.habits" rows="3" class="w-full bg-surface-container-high border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary transition-all shadow-inner resize-none"></textarea>
               </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="p-8 bg-surface-container-low/50 border-t border-outline-variant/10 flex gap-4">
             <button @click="isSectionModalOpen = false" class="flex-1 py-4 px-6 rounded-2xl bg-surface-container-highest text-on-surface-variant font-bold text-sm hover:bg-surface-variant transition-colors">
               Cancelar
             </button>
             <button @click="saveSection" :disabled="isSavingSection" class="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-lg hover:bg-primary-container transition-all flex items-center justify-center">
               <span v-if="isSavingSection" class="material-symbols-outlined animate-spin mr-2 text-sm">progress_activity</span>
               <span v-else class="material-symbols-outlined mr-2 text-sm font-bold">save</span>
               {{ isSavingSection ? 'GUARDANDO...' : 'GUARDAR CAMBIOS' }}
             </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- PRINT FOOTER (Only PDF) -->
    <div class="hidden print:block mt-12 border-t border-outline-variant/30 pt-4 text-center">
       <div class="flex justify-center gap-8 mb-4">
          <div class="text-center">
             <div class="w-24 h-0.5 bg-outline mx-auto mb-2 opacity-30"></div>
             <p class="text-[8px] uppercase font-bold text-outline">Sello Institucional</p>
          </div>
          <div class="text-center">
             <div class="w-32 h-0.5 bg-outline mx-auto mb-2 opacity-30"></div>
             <p class="text-[8px] uppercase font-bold text-outline">Firma del Especialista</p>
          </div>
       </div>
       <p class="text-[8px] text-outline text-center uppercase tracking-widest">Generado automáticamente por VitaRecord - Todos los derechos reservados.</p>
    </div>
    <!-- REFERRAL MODAL -->
    <Transition name="fade">
      <div v-if="isReferralModalOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4 print:hidden">
        <div class="absolute inset-0 bg-on-surface/60 backdrop-blur-md" @click="isReferralModalOpen = false"></div>
        <div class="bg-surface-container-lowest w-full max-w-md rounded-[2rem] shadow-2xl relative z-10 overflow-hidden border border-outline-variant/30">
          <div class="p-8 border-b border-outline-variant/10 bg-primary-container/10">
            <h2 class="text-xl font-headline font-bold text-on-background">Referir Paciente</h2>
            <p class="text-xs text-on-surface-variant mt-1">Comparte el acceso a la historia clínica con un colega.</p>
          </div>
          <div class="p-8 space-y-6">
            <div>
              <label class="block text-[10px] uppercase font-bold text-on-surface-variant mb-3">Seleccionar Especialista</label>
              <select v-model="selectedDoctorId" class="w-full bg-surface-container-high border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary transition-all shadow-inner text-on-surface">
                <option value="" disabled>Seleccione un médico...</option>
                <option v-for="doc in doctors" :key="doc.id" :value="doc.id">
                  {{ doc.name }} ({{ doc.specialty }})
                </option>
              </select>
            </div>
            <div class="bg-primary/5 p-4 rounded-xl border border-primary/10">
               <p class="text-[10px] text-primary leading-relaxed font-medium">
                 <span class="material-symbols-outlined text-sm inline-block translate-y-1 mr-1">info</span>
                 Al referir a este paciente, el colega seleccionado podrá ver la línea de tiempo completa y registrar nuevas evoluciones.
               </p>
            </div>
          </div>
          <div class="p-8 bg-surface-container-low/50 border-t border-outline-variant/10 flex gap-4">
             <button @click="isReferralModalOpen = false" class="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-variant transition-colors">Cancelar</button>
             <button @click="sendReferral" :disabled="isSendingReferral || !selectedDoctorId" class="flex-[2] py-3 px-4 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center">
                <span v-if="isSendingReferral" class="material-symbols-outlined animate-spin mr-2 text-sm">progress_activity</span>
                {{ isSendingReferral ? 'ENVIANDO...' : 'ENVIAR REFERENCIA' }}
             </button>
          </div>
        </div>
      </div>
    </Transition>
    <!-- LIGHTBOX MODAL -->
    <Transition name="fade">
      <div v-if="isLightboxOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
        <div class="absolute inset-0 bg-black/90 backdrop-blur-xl" @click="closeLightbox"></div>
        <div class="relative z-10 max-w-5xl w-full max-h-[90vh] flex flex-col items-center animate-zoom-in">
           <button @click="closeLightbox" class="absolute -top-12 right-0 text-white hover:text-primary transition-colors flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
              Cerrar Visor <span class="material-symbols-outlined text-lg">close</span>
           </button>
           <img :src="lightboxImage" class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"/>
           <div class="mt-6 flex gap-4">
              <a :href="lightboxImage" download class="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border border-white/10">
                 <span class="material-symbols-outlined text-sm">download</span> Descargar Original
              </a>
           </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Global Print Fixes */
@media print {
  html, body, #app {
    height: auto !important;
    overflow: visible !important;
  }
  
  .h-screen {
    height: auto !important;
  }
  
  .overflow-hidden {
    overflow: visible !important;
  }

  .flex {
    display: block !important;
  }
}
</style>

<style scoped>
/* Print Styles Integration */
@media print {
  @page {
    margin: 2cm;
    size: A4;
  }
  
  html, body, #app {
    height: auto !important;
    overflow: visible !important;
  }

  /* Reset main layout for print */
  .h-screen, .overflow-hidden, .overflow-y-auto {
    height: auto !important;
    overflow: visible !important;
    display: block !important;
  }
  
  body {
    background: white !important;
    printing-color-adjust: exact;
  }

  .print\:hidden { display: none !important; }
  .print\:block { display: block !important; }
  .print\:grid { display: grid !important; }
  .print\:p-0 { padding: 0 !important; }
  .print\:mb-8 { margin-bottom: 2rem !important; }
  .print\:mb-4 { margin-bottom: 1rem !important; }
  .print\:text-3xl { font-size: 1.875rem !important; }
  .print\:text-lg { font-size: 1.125rem !important; }
  .print\:line-clamp-none { -webkit-line-clamp: unset !important; }
  
  /* Force containers to full width and visible */
  main {
    max-width: 100% !important;
    width: 100% !important;
    padding: 0 !important;
    overflow: visible !important;
    height: auto !important;
  }
}
</style>


<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.animate-zoom-in { animation: zoomIn 0.3s ease-out; }
@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>



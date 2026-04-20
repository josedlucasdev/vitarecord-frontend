<script setup>
const API_URL = import.meta.env.VITE_API_BASE_URL
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const patientId = route.params.id
const patient = ref(null)
const isLoading = ref(false)
const isSaving = ref(false)

// Voice & AI Logic
const isListening = ref(false)
const isProcessingAI = ref(false)
const shouldSummarize = ref(false)
let recognition = null
let silenceTimeoutId = null
let textBeforeSession = ""
let sessionFinalTranscript = ""
let isManualStop = false

// Tiptap Editor Logic
const activeEditorId = ref('notes') // 'notes' or 'physical'
const editor = ref(null)
const physicalExamEditor = ref(null)

onMounted(() => {
  // Clinical Notes Editor
  editor.value = new Editor({
    content: formData.value.current_illness,
    extensions: [StarterKit, Underline],
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none min-h-[300px] italic font-serif leading-relaxed text-on-surface p-2',
      },
    },
    onUpdate: ({ editor }) => {
      formData.value.current_illness = editor.getHTML()
    },
  })

  // Physical Exam Editor
  physicalExamEditor.value = new Editor({
    content: formData.value.physical_exam,
    extensions: [StarterKit, Underline],
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none min-h-[300px] italic font-serif leading-relaxed text-on-surface p-2',
      },
    },
    onUpdate: ({ editor }) => {
      formData.value.physical_exam = editor.getHTML()
    },
  })
})

onBeforeUnmount(() => {
  if (editor.value) editor.value.destroy()
  if (physicalExamEditor.value) physicalExamEditor.value.destroy()
})

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'es-ES'
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onresult = (event) => {
    resetSilenceTimer()
    let interimTranscript = ""
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        sessionFinalTranscript += event.results[i][0].transcript + " "
      } else {
        interimTranscript += event.results[i][0].transcript
      }
    }

    const currentTranscript = textBeforeSession + (textBeforeSession ? '\n' : '') + sessionFinalTranscript + interimTranscript
    if (activeEditorId.value === 'notes') {
      formData.value.current_illness = currentTranscript
    } else {
      formData.value.physical_exam = currentTranscript
    }
  }

  recognition.onend = async () => {
    // AUTO-RESTART logic: If it wasn't a manual stop or timeout, RESTART immediately
    if (isListening.value && !isManualStop) {
      try {
        recognition.start()
        return // Exit, we don't want to process AI yet
      } catch (e) {
        console.error("Error restarting recognition:", e)
      }
    }
    
    // If it was a manual stop or we really finished
    if (isManualStop || !isListening.value) {
      isListening.value = false
      if (sessionFinalTranscript.trim()) {
        await processVoiceInput(sessionFinalTranscript.trim())
      }
      isManualStop = false // Reset for next session
    }
  }

  recognition.onerror = (event) => {
    // If it's a 'no-speech' error, don't kill everything, let onend handle the restart if needed
    if (event.error === 'no-speech') return 
    console.error('Speech recognition error:', event.error)
    stopRecording()
  }
}

const resetSilenceTimer = () => {
  clearTimeout(silenceTimeoutId)
  silenceTimeoutId = setTimeout(() => {
    if (isListening.value) {
      console.log("Auto-stopping due to 3m silence")
      stopRecording()
    }
  }, 180000) 
}

const toggleMic = (targetId = 'notes') => {
  if (!recognition) {
    alert('Tu navegador no soporta reconocimiento de voz.')
    return
  }

  if (isListening.value) {
    stopRecording()
  } else {
    activeEditorId.value = targetId
    startRecording()
  }
}

const startRecording = () => {
  const targetEditor = activeEditorId.value === 'notes' ? editor.value : physicalExamEditor.value
  textBeforeSession = targetEditor ? targetEditor.getHTML() : ""
  
  sessionFinalTranscript = ""
  isListening.value = true
  isManualStop = false
  recognition.start()
  resetSilenceTimer()
}

const stopRecording = () => {
  isManualStop = true // Mark as intentional
  isListening.value = false
  clearTimeout(silenceTimeoutId)
  if (recognition) recognition.stop()
}

const processVoiceInput = async (text) => {
  if (window.ai && window.ai.createTextSession) {
    isProcessingAI.value = true
    try {
      const session = await window.ai.createTextSession()
      let prompt = `Actúa como un asistente médico experto. Formatea y profesionaliza la siguiente nota clínica dictada por voz, usando terminología médica adecuada pero manteniendo la esencia original. Responde solo con el texto formateado: "${text}"`
      
      if (shouldSummarize.value) {
        prompt = `Actúa como un asistente médico experto. Genera un RESUMEN EJECUTIVO CONCISO (máximo 2-3 líneas) de la siguiente nota clínica dictada por voz. Usa terminología médica adecuada. Responde solo con el resumen precedido por "RESUMEN AI: ": "${text}"`
      }

      const result = await session.prompt(prompt)
      const targetEditor = activeEditorId.value === 'notes' ? editor.value : physicalExamEditor.value
      
      if (targetEditor) {
        targetEditor.commands.setContent(textBeforeSession + (textBeforeSession ? '<br>' : '') + result)
      }
      session.destroy()
    } catch (err) {
      console.error('AI Processing error:', err)
    } finally {
      isProcessingAI.value = false
    }
  }
}

const showPrescriptionModule = ref(false)
const medications = ref([])
const currentMed = ref({
  medication: '',
  dosage: '',
  frequency: '',
  duration: ''
})

const formData = ref({
  date: new Date().toISOString().split('T')[0],
  reason_for_consultation: '',
  current_illness: '',
  physical_exam: '',
  weight: '',
  height: '',
  fetal_heart_rate: '',
  uterine_height: '',
  vital_signs: '',
  diagnostic_impression: '',
  prescriptions: []
})

// Attachments logic
const ecoAttachments = ref([])
const manualRecipeFile = ref(null)
const previews = ref({
  ecos: [],
  recipe: null
})

const handleEcoFiles = (event) => {
  const files = Array.from(event.target.files)
  ecoAttachments.value = files
  previews.value.ecos = files.map(f => URL.createObjectURL(f))
}

const handleRecipeFile = (event) => {
  const file = event.target.files[0]
  if (file) {
    manualRecipeFile.value = file
    previews.value.recipe = URL.createObjectURL(file)
  }
}

// Sub-campos de Examen Físico para la UI
const vitals = ref({
  bp: '',
  hr: '',
  temp: '',
  spo2: '',
  weight: '',
  height: '',
  fcf: '',
  au: ''
})

const addMedication = () => {
  if (!currentMed.value.medication || !currentMed.value.dosage) return
  medications.value.push({ ...currentMed.value })
  currentMed.value = { medication: '', dosage: '', frequency: '', duration: '' }
}

const removeMedication = (index) => {
  medications.value.splice(index, 1)
}

const fetchPatient = async () => {
  isLoading.value = true
  try {
    const res = await fetch(`${API_URL}/patients/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      }
    })
    if (res.ok) {
      patient.value = await res.json()
    }
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchPatient)

const handleSave = async () => {
  isSaving.value = true
  
  // Usar FormData para permitir subida de archivos
  const data = new FormData()
  data.append('date', formData.value.date)
  data.append('reason_for_consultation', formData.value.reason_for_consultation)
  data.append('current_illness', formData.value.current_illness)
  data.append('weight', vitals.value.weight)
  data.append('height', vitals.value.height)
  data.append('fetal_heart_rate', vitals.value.fcf)
  data.append('uterine_height', vitals.value.au)
  data.append('vital_signs', `BP: ${vitals.value.bp}, HR: ${vitals.value.hr}, Temp: ${vitals.value.temp}, SpO2: ${vitals.value.spo2}`)
  data.append('physical_exam', formData.value.physical_exam)
  data.append('diagnostic_impression', formData.value.diagnostic_impression)
  
  // Recetas digitales como JSON string
  data.append('prescriptions', JSON.stringify(medications.value))
  
  // Archivos
  if (manualRecipeFile.value) {
    data.append('manual_prescription_file', manualRecipeFile.value)
  }
  
  ecoAttachments.value.forEach((file, index) => {
    data.append(`eco_attachments[${index}]`, file)
  })
  
  try {
    const res = await fetch(`${API_URL}/patients/${patientId}/evolutions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Accept': 'application/json'
      },
      body: data
    })
    
    if (res.ok) {
      alert('Evolución y adjuntos guardados correctamente.')
      router.push(`/patients/${patientId}/history`)
    } else {
      const resp = await res.json()
      alert('Error al guardar: ' + JSON.stringify(resp.errors || resp.message))
    }
  } catch (error) {
    alert('Error de conexión.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="flex-1 bg-background text-on-surface font-body min-h-screen overflow-y-auto">
    <main v-if="patient" class="flex flex-col min-w-0 p-8 w-full max-w-6xl mx-auto">
      
      <!-- Context Header -->
      <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav class="flex items-center text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 space-x-2">
            <button @click="router.back()" class="hover:text-primary transition-colors">Historia</button>
            <span class="material-symbols-outlined text-xs">chevron_right</span>
            <span class="text-primary">Nueva Evolución</span>
          </nav>
          <h1 class="font-headline text-4xl font-extrabold text-on-surface tracking-tight leading-tight">
            {{ patient.name }}
          </h1>
          <p class="text-on-surface-variant text-sm mt-1 uppercase tracking-wider font-bold">
            Expediente: {{ patient.identity_card }} • Ingreso: {{ formData.date }}
          </p>
        </div>
        
        <div class="flex items-center space-x-2 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/15">
          <span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
          <span class="font-label text-xs font-bold text-on-surface uppercase tracking-widest">Sesión Activa</span>
        </div>
      </div>

      <!-- Bento Grid Form -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32">
        
        <!-- LEFT: Vitals & Modules -->
        <div class="lg:col-span-4 space-y-8">
          
          <!-- Physical Exam Card -->
          <div class="bg-surface-container-low rounded-2xl p-6 shadow-sm border border-outline-variant/10 relative overflow-hidden group">
            <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-30 group-hover:opacity-100 transition-opacity"></div>
            <h2 class="font-headline font-bold text-lg mb-6 flex items-center text-on-surface">
              <span class="material-symbols-outlined mr-2 text-primary">clinical_notes</span> Examen Físico
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">T. Arterial</label>
                <input v-model="vitals.bp" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="120/80"/>
              </div>
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">F. Cardíaca</label>
                <input v-model="vitals.hr" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="72 lpm"/>
              </div>
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Temperatura</label>
                <input v-model="vitals.temp" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="36.5°C"/>
              </div>
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Saturación (O2)</label>
                <input v-model="vitals.spo2" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="98%"/>
              </div>
              <!-- New Fields -->
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Peso</label>
                <input v-model="vitals.weight" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="Ej. 70 kg"/>
              </div>
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Talla</label>
                <input v-model="vitals.height" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="Ej. 165 cm"/>
              </div>
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">F. Fetal (FCF)</label>
                <input v-model="vitals.fcf" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="Ej. 140 lpm"/>
              </div>
              <div class="bg-surface-container-highest/50 p-3 rounded-xl border border-outline-variant/10">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Altura Uterina</label>
                <input v-model="vitals.au" class="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder-on-surface-variant/30" placeholder="Ej. 30 cm"/>
              </div>
            </div>

            <!-- Descriptive Physical Exam Editor -->
            <div class="mt-6 pt-6 border-t border-outline-variant/10 animate-fade-in">
              <div class="flex items-center justify-between mb-3">
                <label class="block text-[10px] font-bold uppercase text-on-surface-variant">Descripción Examen Físico</label>
                <div class="flex items-center space-x-2">
                  <!-- AI Switch for Physical Exam -->
                  <div class="flex items-center gap-2 bg-surface-container-highest/50 px-2 py-1 rounded-full border border-outline-variant/10 scale-75 origin-right">
                     <span class="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant">Resumen AI</span>
                     <button @click="shouldSummarize = !shouldSummarize" :class="shouldSummarize ? 'bg-primary' : 'bg-outline-variant/30'" class="w-7 h-3.5 rounded-full relative transition-colors focus:outline-none">
                        <div :class="shouldSummarize ? 'translate-x-3.5' : 'translate-x-0'" class="absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform shadow-sm"></div>
                     </button>
                  </div>
                  <button 
                    type="button" 
                    @click="toggleMic('physical')"
                    :class="[isListening && activeEditorId === 'physical' ? 'bg-error text-white animate-pulse shadow-md scale-110' : 'text-outline hover:bg-surface-container-highest']"
                    class="p-1.5 rounded-full transition-all relative"
                  >
                    <span class="material-symbols-outlined text-sm">{{ isListening && activeEditorId === 'physical' ? 'graphic_eq' : 'mic' }}</span>
                    <span v-if="isProcessingAI && activeEditorId === 'physical'" class="absolute -top-1 -right-1 w-2 h-2 bg-primary border border-surface-container-low rounded-full animate-bounce"></span>
                  </button>
                </div>
              </div>
              <div v-if="physicalExamEditor" class="flex items-center gap-1 bg-surface-container-highest/20 p-1 rounded-lg border border-outline-variant/10 mb-2">
                <button type="button" @click="physicalExamEditor.chain().focus().toggleBold().run()" :class="{ 'bg-primary/20 text-primary': physicalExamEditor.isActive('bold') }" class="p-1.5 rounded hover:bg-surface-container-highest transition-colors">
                  <span class="material-symbols-outlined text-sm">format_bold</span>
                </button>
                <button type="button" @click="physicalExamEditor.chain().focus().toggleItalic().run()" :class="{ 'bg-primary/20 text-primary': physicalExamEditor.isActive('italic') }" class="p-1.5 rounded hover:bg-surface-container-highest transition-colors">
                  <span class="material-symbols-outlined text-sm">format_italic</span>
                </button>
                <div class="w-px h-4 bg-outline-variant/20 mx-1"></div>
                <button type="button" @click="physicalExamEditor.chain().focus().toggleBulletList().run()" :class="{ 'bg-primary/20 text-primary': physicalExamEditor.isActive('bulletList') }" class="p-1.5 rounded hover:bg-surface-container-highest transition-colors">
                  <span class="material-symbols-outlined text-sm">format_list_bulleted</span>
                </button>
              </div>
              <div class="bg-surface-container-highest/30 rounded-xl p-2 min-h-[150px] border border-transparent focus-within:border-primary/30 transition-all shadow-inner">
                <editor-content :editor="physicalExamEditor" class="prose-editor-compact" />
              </div>
            </div>
          </div>

          <!-- Prescription Module (LEGO Block) -->
          <div v-if="showPrescriptionModule" class="bg-surface-container-low rounded-2xl p-6 border border-primary/20 shadow-lg animate-fade-in">
              <h2 class="font-headline font-bold text-lg mb-6 flex items-center text-primary">
                <span class="material-symbols-outlined mr-2">prescriptions</span> Acoplar Receta
              </h2>
              
              <div class="space-y-4">
                 <div class="bg-surface-container-highest/30 p-4 rounded-xl space-y-3">
                    <input v-model="currentMed.medication" class="w-full bg-surface-container-lowest border-0 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary" placeholder="Medicamento (ej: Amoxicilina)"/>
                    <div class="grid grid-cols-2 gap-2">
                       <input v-model="currentMed.dosage" class="w-full bg-surface-container-lowest border-0 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary" placeholder="Dosis (500mg)"/>
                       <input v-model="currentMed.frequency" class="w-full bg-surface-container-lowest border-0 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary" placeholder="Frecuencia (8h)"/>
                    </div>
                    <input v-model="currentMed.duration" class="w-full bg-surface-container-lowest border-0 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary" placeholder="Duración (7 días)"/>
                    <button @click="addMedication" type="button" class="w-full py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20 transition-colors uppercase">
                       Añadir a la Receta
                    </button>
                 </div>

                 <!-- List of added meds -->
                 <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                    <div v-for="(m, idx) in medications" :key="idx" class="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg border-l-4 border-primary shadow-sm group">
                       <div class="min-w-0 flex-1 mr-2">
                          <p class="font-bold text-xs truncate">{{ m.medication }} <span class="font-normal opacity-60">{{ m.dosage }}</span></p>
                          <p class="text-[10px] text-on-surface-variant italic">Cada {{ m.frequency }} por {{ m.duration }}</p>
                       </div>
                       <button @click="removeMedication(idx)" type="button" class="text-error opacity-0 group-hover:opacity-100 transition-opacity p-1">
                          <span class="material-symbols-outlined text-sm">delete</span>
                       </button>
                    </div>
                 </div>
              </div>
          </div>

          <!-- Clinical Attachments (New Lego Block) -->
          <div class="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
             <h2 class="font-headline font-bold text-lg mb-6 flex items-center">
               <span class="material-symbols-outlined mr-2 text-primary">add_a_photo</span> Adjuntos Clínicos
             </h2>
             
             <div class="space-y-6">
                <!-- Ultrasound Upload -->
                <div>
                   <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-3 flex justify-between">
                     <span>Fotos de Ecografía (Ecos)</span>
                     <span class="text-primary">{{ ecoAttachments.length }} seleccionados</span>
                   </label>
                   <div class="relative group">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        @change="handleEcoFiles"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div class="border-2 border-dashed border-outline-variant/30 rounded-xl p-4 flex flex-col items-center justify-center bg-surface-container-lowest group-hover:bg-primary/5 transition-colors">
                         <span class="material-symbols-outlined text-outline text-2xl mb-1">upload_file</span>
                         <p class="text-[10px] font-bold text-outline uppercase">Subir Imágenes</p>
                      </div>
                   </div>
                   <!-- Eco Previews -->
                   <div v-if="previews.ecos.length > 0" class="flex flex-wrap gap-2 mt-4">
                      <div v-for="(src, i) in previews.ecos" :key="i" class="w-14 h-14 rounded-lg overflow-hidden border border-outline-variant/20 shadow-sm">
                         <img :src="src" class="w-full h-full object-cover"/>
                      </div>
                   </div>
                </div>

                <!-- Manual Recipe Upload -->
                <div class="pt-4 border-t border-outline-variant/10">
                   <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-3 flex justify-between">
                     <span>Receta Manual (Foto)</span>
                     <span v-if="manualRecipeFile" class="text-secondary">Cargado</span>
                   </label>
                   <div class="relative group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        @change="handleRecipeFile"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div class="border-2 border-dashed border-outline-variant/30 rounded-xl p-4 flex flex-col items-center justify-center" :class="manualRecipeFile ? 'bg-secondary/5 border-secondary/30' : 'bg-surface-container-lowest group-hover:bg-primary/5'">
                         <span class="material-symbols-outlined text-outline text-2xl mb-1" :class="manualRecipeFile ? 'text-secondary' : ''">description</span>
                         <p class="text-[10px] font-bold text-outline uppercase" :class="manualRecipeFile ? 'text-secondary' : ''">{{ manualRecipeFile ? 'Cambiar Foto' : 'Adjuntar Foto de Receta' }}</p>
                      </div>
                   </div>
                   <!-- Recipe Preview -->
                   <div v-if="previews.recipe" class="mt-4">
                      <div class="w-full h-24 rounded-lg overflow-hidden border border-outline-variant/20 shadow-sm relative">
                         <img :src="previews.recipe" class="w-full h-full object-cover"/>
                         <div class="absolute inset-0 bg-secondary/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span class="text-[8px] font-black text-white bg-secondary px-2 py-1 rounded">PREVIEW</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <!-- Reason & Diagnosis -->
          <div class="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
             <h2 class="font-headline font-bold text-lg mb-6 flex items-center">
               <span class="material-symbols-outlined mr-2 text-primary">stethoscope</span> Motivo y Diagnóstico
             </h2>
             <div class="space-y-4">
                <div>
                   <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-2">Motivo de Consulta</label>
                   <input v-model="formData.reason_for_consultation" class="w-full bg-surface-container-highest border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary transition-all" placeholder="Ej. Control Anual"/>
                </div>
                <div>
                   <label class="block text-[10px] font-bold uppercase text-on-surface-variant mb-2">Impresión Diagnóstica</label>
                   <textarea v-model="formData.diagnostic_impression" class="w-full bg-surface-container-highest border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary transition-all resize-none" rows="4" placeholder="Criterio médico final..."></textarea>
                </div>
             </div>
          </div>

        </div>

        <!-- RIGHT: Notes -->
        <div class="lg:col-span-8">
           <div class="bg-surface-container-low rounded-2xl p-6 shadow-sm border border-outline-variant/10 h-full flex flex-col">
              <!-- Header Section -->
              <div class="flex flex-col gap-4 mb-6">
                <h2 class="font-headline font-bold text-lg flex items-center">
                  <span class="material-symbols-outlined mr-2 text-primary">description</span> Notas Clínicas
                </h2>
                
                <div class="flex items-center justify-between">
                   <div class="flex items-center space-x-2">
                      <!-- Editor Toolbar -->
                      <div v-if="editor" class="flex items-center gap-1 bg-surface-container-highest/20 p-1 rounded-lg border border-outline-variant/10 mr-2">
                         <button type="button" @click="editor.chain().focus().toggleBold().run()" :class="{ 'bg-primary/20 text-primary': editor.isActive('bold') }" class="p-1.5 rounded hover:bg-surface-container-highest transition-colors" title="Negrita">
                           <span class="material-symbols-outlined text-sm">format_bold</span>
                         </button>
                         <button type="button" @click="editor.chain().focus().toggleItalic().run()" :class="{ 'bg-primary/20 text-primary': editor.isActive('italic') }" class="p-1.5 rounded hover:bg-surface-container-highest transition-colors" title="Itálica">
                           <span class="material-symbols-outlined text-sm">format_italic</span>
                         </button>
                         <button type="button" @click="editor.chain().focus().toggleUnderline().run()" :class="{ 'bg-primary/20 text-primary': editor.isActive('underline') }" class="p-1.5 rounded hover:bg-surface-container-highest transition-colors" title="Subrayado">
                            <span class="material-symbols-outlined text-sm">format_underlined</span>
                         </button>
                         <div class="w-px h-4 bg-outline-variant/20 mx-1"></div>
                         <button type="button" @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'bg-primary/20 text-primary': editor.isActive('bulletList') }" class="p-1.5 rounded hover:bg-surface-container-highest transition-colors" title="Lista">
                           <span class="material-symbols-outlined text-sm">format_list_bulleted</span>
                         </button>
                      </div>

                      <!-- AI Summary Toggle -->
                      <div class="flex items-center gap-2 bg-surface-container-highest/50 px-3 py-1.5 rounded-full border border-outline-variant/10">
                         <span class="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">Resumen AI</span>
                         <button 
                           @click="shouldSummarize = !shouldSummarize"
                           :class="shouldSummarize ? 'bg-primary' : 'bg-outline-variant/30'"
                           class="w-8 h-4 rounded-full relative transition-colors duration-300 focus:outline-none"
                         >
                           <div 
                             :class="shouldSummarize ? 'translate-x-4' : 'translate-x-0'"
                             class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 shadow-sm"
                           ></div>
                         </button>
                      </div>
                   </div>

                   <div class="flex items-center space-x-2">
                      <button 
                        type="button" 
                        @click="toggleMic('notes')"
                        :class="[
                          isListening && activeEditorId === 'notes' ? 'bg-error text-white animate-pulse shadow-lg scale-110' : 'hover:bg-surface-container-highest text-outline',
                          isProcessingAI ? 'opacity-50 cursor-wait' : ''
                        ]"
                        class="p-2 rounded-full transition-all duration-300 relative"
                        title="Dictar por voz (AI)"
                      >
                        <span class="material-symbols-outlined text-lg">
                          {{ isListening ? 'graphic_eq' : 'mic' }}
                        </span>
                        <span v-if="isProcessingAI" class="absolute -top-1 -right-1 w-3 h-3 bg-primary border-2 border-surface-container-low rounded-full animate-bounce"></span>
                      </button>
                      <button type="button" class="p-2 hover:bg-surface-container-highest rounded-full transition-colors"><span class="material-symbols-outlined text-outline text-lg">history</span></button>
                   </div>
                </div>
              </div>
              <div class="flex-1 w-full bg-surface-container-highest/30 border-0 rounded-2xl p-4 transition-all overflow-y-auto"><editor-content :editor="editor" /></div>
              
              <!-- Action Toolbar (Inner) -->
              <div class="mt-6 pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                 <div class="flex gap-4">
                    <button 
                      type="button"
                      @click="showPrescriptionModule = !showPrescriptionModule"
                      :class="[showPrescriptionModule ? 'bg-primary text-on-primary shadow-md' : 'text-primary hover:bg-primary/5']"
                      class="flex items-center gap-2 font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all border border-primary/20"
                    >
                      <span class="material-symbols-outlined text-base">{{ showPrescriptionModule ? 'check_circle' : 'prescriptions' }}</span> 
                      {{ showPrescriptionModule ? 'Receta Acoplada' : 'Acoplar Receta' }}
                    </button>
                 </div>
                 <div class="flex gap-3">
                    <button @click="router.back()" type="button" class="px-6 py-3 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-highest transition-colors">Descartar</button>
                    <button @click="handleSave" :disabled="isSaving" class="px-8 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-xl hover:scale-95 active:scale-90 transition-all flex items-center">
                       <span v-if="isSaving" class="material-symbols-outlined animate-spin mr-2 text-sm">progress_activity</span>
                       <span v-else class="material-symbols-outlined mr-2 text-sm">check_circle</span>
                       {{ isSaving ? 'GUARDANDO...' : 'GUARDAR EVOLUCIÓN' }}
                    </button>
                 </div>
              </div>
           </div>
        </div>

      </div>

    </main>
  </div>
</template>

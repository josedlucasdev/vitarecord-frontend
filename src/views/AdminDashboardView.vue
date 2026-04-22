<script setup>
import { IonPage } from '@ionic/vue'
const API_URL = import.meta.env.VITE_API_BASE_URL
import { ref, onMounted } from 'vue'
import { useUiStore } from '../store/ui'

const uiStore = useUiStore()

const newDoctor = ref({
  name: '',
  specialty: '',
  identity_card: '',
  address: '',
  phone: '',
  email: ''
})

const activeDoctors = ref([])
const isEditing = ref(false)
const editingDoctorId = ref(null)
const fileInput = ref(null)
const selectedFile = ref(null)
const photoPreview = ref(null)

const fetchDoctors = async () => {
  try {
    const res = await fetch(`${API_URL}/admin/doctors`)
    const data = await res.json()
    activeDoctors.value = data.map(doc => ({
      id: doc.id,
      name: doc.name,
      specialty: doc.specialty,
      identity_card: doc.identity_card,
      email: doc.email,
      phone: doc.phone,
      status: doc.is_active ? 'active' : 'inactive',
      initials: doc.name.substring(0, 2).toUpperCase(),
      photo: doc.photo_path
    }))
  } catch (error) {
    console.error("Error cargando doctores", error)
  }
}

const editDoctor = (doc) => {
  isEditing.value = true
  editingDoctorId.value = doc.id
  newDoctor.value = {
    name: doc.name,
    specialty: doc.specialty,
    identity_card: doc.identity_card,
    phone: doc.phone,
    email: doc.email
  }
  photoPreview.value = doc.photo
}

const cancelEdit = () => {
  isEditing.value = false
  editingDoctorId.value = null
  newDoctor.value = { name: '', specialty: '', identity_card: '', address: '', phone: '', email: '' }
  selectedFile.value = null
  photoPreview.value = null
}

const toggleDoctorStatus = async (docId) => {
  try {
    const res = await fetch(`${API_URL}/admin/doctors/${docId}/toggle-status`, {
      method: 'PATCH',
      headers: { 'Accept': 'application/json' }
    })
    if (res.ok) {
        fetchDoctors()
    }
  } catch (error) {
    console.error(error)
  }
}

const triggerFileInput = () => {
  fileInput.value.click()
}

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    selectedFile.value = file
    photoPreview.value = URL.createObjectURL(file)
  }
}

onMounted(() => {
  fetchDoctors()
})

const handleCreateProfile = async () => {
  try {
    const url = isEditing.value 
        ? `${API_URL}/admin/doctors/${editingDoctorId.value}`
        : `${API_URL}/admin/doctors`
    
    // For simulation and simplicity we use POST with _method=PUT for multipart updates in Laravel if needed,
    // but here we can try PUT directly with FormData if the backend supports it (Laravel sometimes needs _method)
    const formData = new FormData()
    formData.append('name', newDoctor.value.name)
    formData.append('specialty', newDoctor.value.specialty)
    formData.append('identity_card', newDoctor.value.identity_card)
    formData.append('phone', newDoctor.value.phone)
    formData.append('email', newDoctor.value.email)
    
    if (selectedFile.value) {
      formData.append('photo', selectedFile.value)
    }

    if (isEditing.value) {
      formData.append('_method', 'PUT')
    }

    const res = await fetch(url, {
      method: 'POST', // Use POST with _method spoofing for FormData + PUT
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    })
    
    if(res.ok) {
      alert(isEditing.value ? 'Perfil actualizado.' : 'Perfil médico creado exitosamente.')
      cancelEdit()
      fetchDoctors()
    } else {
      const errorData = await res.json()
      alert('Error: ' + JSON.stringify(errorData.errors || errorData.message))
    }
  } catch (error) {
    alert('Error de conexión.')
    console.error(error)
  }
}
</script>

<template>
  <ion-page>
  <div class="flex-1 flex flex-col h-screen overflow-hidden bg-background w-full">
    <!-- TopAppBar -->
    <header class="bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/15 flex justify-between items-center px-6 py-3 shrink-0">
      <div class="flex items-center space-x-4">
        <button @click="uiStore.openSidebar()" class="md:hidden text-on-surface-variant hover:bg-[#f3f4f5] transition-colors duration-300 p-2 rounded-full">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <span class="text-xl font-extrabold text-primary tracking-tight font-headline">VitaRecord</span>
        <span class="ml-4 px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold rounded uppercase tracking-wider">Portal Administrativo</span>
      </div>
      
      <div class="hidden md:flex flex-1 max-w-md ml-8">
        <div class="relative w-full">
          <span class="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          <input class="w-full bg-surface-container-highest border-none rounded-full py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-colors" placeholder="Buscar expedientes, personal..." type="text"/>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button class="p-2 text-primary hover:bg-surface-container-highest transition-colors duration-300 rounded-full">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <div class="h-6 w-px bg-outline-variant/30 mx-2"></div>
        <img alt="User profile avatar" class="w-8 h-8 rounded-full ml-2 border border-outline-variant/20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZmKc7JXhz-djZOyBrYKpEu-X5DE83k_uTAJNQFZPJNDEmbe_Wak7ANUXas2Z3sUwV0pOYygWuCOFoGS_h6mhAcczOvLvHEGnyAa8y9l5yKJust2_YMB1B_686Hb1kFpDqMjdnX5So6XT5UT93hZcH5tkp5ZkybOMH1DRta81T73scpRP1I3kRp6CiBWRoW5KrxfPjoSshItiwQDCQD_epMTRHtdQo2xpFUYr-9GpeY-eyb9Cd4o4zeJT9J5EnUgc4scTypVuqJEll"/>
      </div>
    </header>

    <!-- Page Content Scrollable Area -->
    <main class="flex-1 overflow-y-auto p-6 md:p-10 lg:px-12 xl:px-16 text-left shrink-0">
      <!-- Header Section -->
      <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="font-headline text-3xl font-extrabold text-on-surface tracking-tight mb-2">Gestión de Personal Médico</h1>
          <p class="font-label text-sm text-on-surface-variant uppercase tracking-wider">Directorio y Contrataciones</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <!-- Columna Izquierda: Formulario (Bento Grid) -->
        <div class="xl:col-span-1">
          <div class="bg-surface-container-low rounded-xl p-6 h-full border border-outline-variant/15 shadow-sm">
            <h2 class="font-headline text-xl font-bold text-on-surface mb-6 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">{{ isEditing ? 'edit_note' : 'person_add' }}</span>
                {{ isEditing ? 'Editar Perfil Médico' : 'Nuevo Perfil Profesional' }}
              </div>
              <button v-if="isEditing" @click="cancelEdit" class="text-xs font-bold text-outline hover:text-error transition-colors uppercase tracking-widest">
                Cancelar
              </button>
            </h2>
            
            <form class="space-y-5" @submit.prevent="handleCreateProfile">
              <!-- Carga de Foto -->
              <div @click="triggerFileInput" class="flex flex-col items-center justify-center p-3 h-40 bg-surface-container-highest rounded-lg border-2 border-dashed border-outline-variant/30 hover:bg-surface-container-lowest transition-all cursor-pointer group relative overflow-hidden">
                <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="onFileChange"/>
                
                <template v-if="photoPreview">
                  <img :src="photoPreview" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"/>
                  <div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                    <span class="material-symbols-outlined text-white text-3xl">add_a_photo</span>
                    <span class="text-white text-[10px] font-bold uppercase mt-1">Cambiar Foto</span>
                  </div>
                </template>
                <template v-else>
                  <div class="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mb-3 group-hover:bg-primary-container/10 transition-colors">
                    <span class="material-symbols-outlined text-3xl text-outline group-hover:text-primary">add_a_photo</span>
                  </div>
                  <span class="font-label text-sm font-bold text-primary">Subir Fotografía</span>
                  <p class="text-[10px] text-on-surface-variant mt-2 text-center px-4">Formatos sugeridos: JPG, PNG. Máx 2MB.</p>
                </template>
              </div>
              
              <!-- Campos -->
              <div>
                <label class="block font-label text-xs font-medium text-on-surface-variant mb-1 ml-1 uppercase tracking-wider italic">Nombre Completo</label>
                <input class="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 rounded-t-md px-4 py-3 font-body text-sm text-on-surface transition-all placeholder:text-outline/50" placeholder="Ej. Dra. Ivon Pacheco" type="text" v-model="newDoctor.name" required/>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs font-medium text-on-surface-variant mb-1 ml-1 uppercase tracking-wider italic">Especialidad</label>
                  <select class="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 rounded-t-md px-4 py-3 font-body text-sm text-on-surface transition-all cursor-pointer" v-model="newDoctor.specialty" required>
                    <option disabled value="">Seleccionar...</option>
                    <option>Ginecología</option>
                    <option>Cardiología</option>
                    <option>Neurología</option>
                    <option>Pediatría</option>
                  </select>
                </div>
                <div>
                  <label class="block font-label text-xs font-medium text-on-surface-variant mb-1 ml-1 uppercase tracking-wider italic">Cédula</label>
                  <input class="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 rounded-t-md px-4 py-3 font-body text-sm text-on-surface transition-all placeholder:text-outline/50" placeholder="00.000.000" type="text" v-model="newDoctor.identity_card" required/>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs font-medium text-on-surface-variant mb-1 ml-1 uppercase tracking-wider italic">Teléfono</label>
                  <input class="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 rounded-t-md px-4 py-3 font-body text-sm text-on-surface transition-all placeholder:text-outline/50" placeholder="0412 000 0000" type="tel" v-model="newDoctor.phone" required/>
                </div>
                <div>
                  <label class="block font-label text-xs font-medium text-on-surface-variant mb-1 ml-1 uppercase tracking-wider italic">Correo (Email)</label>
                  <input class="w-full bg-surface-container-highest border-none border-b-2 border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-0 rounded-t-md px-4 py-3 font-body text-sm text-on-surface transition-all placeholder:text-outline/50" placeholder="medico@clinica.com" type="email" v-model="newDoctor.email" required/>
                </div>
              </div>

              <div class="pt-6">
                <button class="w-full py-4 px-4 bg-primary text-on-primary rounded-lg font-headline text-base font-bold shadow-lg hover:bg-primary-container transition-all" type="submit">
                  {{ isEditing ? 'ACTUALIZAR PERFIL' : 'EMITIR CREDENCIALES' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Columna Derecha: Nómina Activa -->
        <div class="xl:col-span-2">
          <div class="bg-surface-container-low rounded-xl p-6 min-h-[500px] border border-outline-variant/15 flex flex-col">
            <div class="flex justify-between items-center mb-6">
              <h2 class="font-headline text-xl font-bold text-on-surface">Nómina Activa</h2>
              <div class="flex gap-2">
                <button class="p-2 rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-2 font-label text-sm">
                  <span class="material-symbols-outlined text-[20px]">filter_list</span>
                  <span>Filtros</span>
                </button>
              </div>
            </div>

            <div class="flex-1">
              <div class="grid grid-cols-12 gap-4 px-4 py-2 mb-2 font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                <div class="col-span-5 md:col-span-4">Profesional</div>
                <div class="col-span-4 md:col-span-3 hidden sm:block">Especialidad / ID</div>
                <div class="col-span-4 md:col-span-3 hidden md:block">Contacto</div>
                <div class="col-span-3 md:col-span-2 text-right">Acciones</div>
              </div>

              <div class="space-y-1">
                <div 
                  v-for="doctor in activeDoctors" 
                  :key="doctor.id" 
                  class="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-surface-container-highest transition-colors cursor-default bg-surface-container-lowest shadow-sm"
                  :class="{'opacity-70': doctor.status !== 'active'}"
                >
                  <div class="col-span-8 sm:col-span-5 md:col-span-4 flex items-center gap-3">
                    <!-- Foto / Avatar -->
                    <img v-if="doctor.photo" :src="doctor.photo" :class="{'grayscale': doctor.status !== 'active'}" class="w-10 h-10 rounded-full object-cover"/>
                    <div v-else class="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-headline font-bold text-on-secondary-container">
                      {{ doctor.initials }}
                    </div>

                    <div>
                      <div class="font-headline font-bold text-sm text-on-surface" :class="{'line-through decoration-outline': doctor.status !== 'active'}">
                        {{ doctor.name }}
                      </div>
                      <div class="font-label text-xs flex items-center gap-1 mt-0.5" :class="doctor.status === 'active' ? 'text-on-surface-variant' : 'text-error'">
                        <span class="w-1.5 h-1.5 rounded-full" :class="doctor.status === 'active' ? 'bg-[#10b981]' : 'bg-error'"></span> 
                        {{ doctor.status === 'active' ? 'Activo' : 'Suspendido' }}
                      </div>
                    </div>
                  </div>

                  <div class="col-span-4 md:col-span-3 hidden sm:flex flex-col justify-center">
                    <div class="font-body text-sm font-medium text-on-surface">{{ doctor.specialty }}</div>
                    <div class="font-label text-xs text-on-surface-variant">ID (C.I): {{ doctor.identity_card }}</div>
                  </div>

                  <div class="col-span-3 hidden md:flex flex-col justify-center">
                    <div class="font-body text-xs text-on-surface">{{ doctor.email }}</div>
                    <div class="font-body text-xs text-on-surface-variant">{{ doctor.phone }}</div>
                  </div>

                  <div class="col-span-4 sm:col-span-3 md:col-span-2 flex justify-end gap-1">
                    <button @click="editDoctor(doctor)" class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary-container/10 rounded-md transition-colors" title="Editar Perfil">
                      <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button v-if="doctor.status === 'active'" @click="toggleDoctorStatus(doctor.id)" class="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-md transition-colors" title="Suspender Acceso">
                      <span class="material-symbols-outlined text-[18px]">block</span>
                    </button>
                    <button v-else @click="toggleDoctorStatus(doctor.id)" class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary-container/10 rounded-md transition-colors" title="Restaurar Acceso">
                      <span class="material-symbols-outlined text-[18px]">restore</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-center justify-between border-t border-outline-variant/15 pt-4">
              <span class="font-label text-xs text-on-surface-variant">Mostrando 1-3 de 15 profesionales</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
  </ion-page>
</template>

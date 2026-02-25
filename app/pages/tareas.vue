<template>
  <div class="min-h-screen bg-[#0f0b1e] px-4 py-6 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl space-y-6">

      <!-- Header -->
      <TareasHeader
        :nombre-usuario="nombreUsuario"
        :conteos="conteos"
        @nueva="abrirNueva"
        @cerrar-sesion="cerrarSesion"
      />

      <!-- Filtros -->
      <TareasFiltros
        v-model:busqueda="busqueda"
        v-model:filtro-estado="filtroEstado"
        v-model:filtro-prioridad="filtroPrioridad"
      />

      <!-- Columnas Kanban -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <TareasColumna
          v-for="col in columnas"
          :key="col.estado"
          :titulo="col.titulo"
          :estado="col.estado"
          :tareas="tareasFiltradas(col.estado)"
          @nueva="abrirNuevaConEstado(col.estado)"
          @editar="abrirEdicion"
        />
      </div>

      <!-- Modal -->
      <TareasModal
        :visible="modalVisible"
        :tarea="tareaEditando"
        @cerrar="cerrarModal"
        @guardar="guardarTarea"
        @eliminar="eliminarTarea"
      />

    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig()
const API_URL = config.public.apiUrl

const getToken = () => localStorage.getItem('token')

// Extraer nombre de usuario del JWT
const parseToken = () => {
  try {
    const token = getToken()
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.usuario
  } catch { return null }
}

const nombreUsuario = parseToken() || 'Usuario'

// Estado reactivo
const busqueda = ref('')
const filtroEstado = ref(0)
const filtroPrioridad = ref(0)
const modalVisible = ref(false)
const tareaEditando = ref(null)
const tareas = ref([])

// Columnas del Kanban
const columnas = [
  { estado: 1, titulo: 'Pendiente' },
  { estado: 2, titulo: 'En Progreso' },
  { estado: 3, titulo: 'Completada' }
]

// Cargar tareas desde la API
const cargarTareas = async () => {
  try {
    const res = await fetch(`${API_URL}/tareas`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    if (res.ok) {
      tareas.value = await res.json()
    } else if (res.status === 401) {
      window.location.href = '/'
    }
  } catch (error) {
    console.error('Error al cargar tareas:', error)
  }
}

onMounted(() => {
  if (!getToken()) {
    window.location.href = '/'
    return
  }
  cargarTareas()
})

// Conteos por estado
const conteos = computed(() => ({
  pendientes: tareas.value.filter(t => t.estado === 1).length,
  enProgreso: tareas.value.filter(t => t.estado === 2).length,
  completadas: tareas.value.filter(t => t.estado === 3).length
}))

// Filtrar tareas para una columna
const tareasFiltradas = (estado) => {
  return tareas.value.filter(t => {
    if (t.estado !== estado) return false
    if (filtroEstado.value !== 0 && t.estado !== filtroEstado.value) return false
    if (filtroPrioridad.value !== 0 && t.prioridad !== filtroPrioridad.value) return false
    if (busqueda.value) {
      const q = busqueda.value.toLowerCase()
      const enTitulo = t.titulo.toLowerCase().includes(q)
      const enDesc = t.descripcion?.toLowerCase().includes(q) || false
      if (!enTitulo && !enDesc) return false
    }
    return true
  })
}

// Modal
const abrirNueva = () => {
  tareaEditando.value = null
  modalVisible.value = true
}

const abrirNuevaConEstado = (estado) => {
  tareaEditando.value = null
  modalVisible.value = true
}

const abrirEdicion = (tarea) => {
  tareaEditando.value = { ...tarea }
  modalVisible.value = true
}

const cerrarModal = () => {
  modalVisible.value = false
  tareaEditando.value = null
}

const guardarTarea = async (datos) => {
  try {
    if (datos.id_tarea) {
      // Editar
      await fetch(`${API_URL}/tareas/${datos.id_tarea}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(datos)
      })
    } else {
      // Crear
      await fetch(`${API_URL}/tareas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(datos)
      })
    }
    await cargarTareas()
    cerrarModal()
  } catch (error) {
    console.error('Error al guardar tarea:', error)
  }
}

const eliminarTarea = async (tarea) => {
  try {
    await fetch(`${API_URL}/tareas/${tarea.id_tarea}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    await cargarTareas()
    cerrarModal()
  } catch (error) {
    console.error('Error al eliminar tarea:', error)
  }
}

const cerrarSesion = () => {
  localStorage.removeItem('token')
  window.location.href = '/'
}
</script>
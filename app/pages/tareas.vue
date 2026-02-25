<template>
  <div class="min-h-screen bg-[#0f0b1e] px-4 py-6 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl space-y-6">

      <!-- Header -->
      <TareasHeader
        :nombre-usuario="nombreUsuario"
        :conteos="conteos"
        @nueva="abrirNueva"
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
const nombreUsuario = 'José García'

// Estado reactivo
const busqueda = ref('')
const filtroEstado = ref(0)
const filtroPrioridad = ref(0)
const modalVisible = ref(false)
const tareaEditando = ref(null)

// Columnas del Kanban
const columnas = [
  { estado: 1, titulo: 'Pendiente' },
  { estado: 2, titulo: 'En Progreso' },
  { estado: 3, titulo: 'Completada' }
]

// Datos de prueba
let nextId = 7
const tareas = ref([
  {
    id_tarea: 1,
    titulo: 'Conectar frontend con la API REST',
    descripcion: 'Integrar endpoints de tareas usando useFetch de Nuxt.',
    prioridad: 2,
    estado: 1,
    fecha_limite: '2026-03-10',
    usuario_id: 1
  },
  {
    id_tarea: 2,
    titulo: 'Pruebas e2e con Cypress',
    descripcion: 'Cubrir flujos de creación, edición y eliminación de tareas.',
    prioridad: 1,
    estado: 1,
    fecha_limite: '2026-03-15',
    usuario_id: 1
  },
  {
    id_tarea: 3,
    titulo: 'Implementar autenticación JWT',
    descripcion: 'Login, registro y refresh tokens con middleware de protección de rutas.',
    prioridad: 3,
    estado: 2,
    fecha_limite: '2026-03-05',
    usuario_id: 1
  },
  {
    id_tarea: 4,
    titulo: 'Crear componentes de UI para tareas',
    descripcion: 'Cards, toolbar, modal de creación/edición y filtros.',
    prioridad: 2,
    estado: 2,
    fecha_limite: '2026-03-08',
    usuario_id: 1
  },
  {
    id_tarea: 5,
    titulo: 'Diseñar la base de datos de usuarios',
    descripcion: 'Definir esquemas para MySQL con validaciones y relaciones necesarias.',
    prioridad: 3,
    estado: 3,
    fecha_limite: '2026-02-28',
    usuario_id: 1
  },
  {
    id_tarea: 6,
    titulo: 'Configurar el entorno de desarrollo',
    descripcion: 'Instalar dependencias, configurar ESLint y Prettier para el proyecto.',
    prioridad: 1,
    estado: 3,
    fecha_limite: '2026-02-20',
    usuario_id: 1
  }
])

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
  // Se abrirá el modal con el estado pre-seleccionado
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

const guardarTarea = (datos) => {
  if (datos.id_tarea) {
    // Editar
    const idx = tareas.value.findIndex(t => t.id_tarea === datos.id_tarea)
    if (idx !== -1) {
      tareas.value[idx] = { ...datos }
    }
  } else {
    // Crear
    tareas.value.push({
      ...datos,
      id_tarea: nextId++,
      usuario_id: 1
    })
  }
  cerrarModal()
}

const eliminarTarea = (tarea) => {
  tareas.value = tareas.value.filter(t => t.id_tarea !== tarea.id_tarea)
  cerrarModal()
}
</script>
<!--
  Página principal de gestión de tareas (vista Kanban).
  Muestra las tareas del usuario autenticado organizadas en columnas por estado:
  Pendiente, En Progreso y Completada. Incluye filtros por estado y prioridad,
  barra de búsqueda, y un modal para crear/editar/eliminar tareas.
  Requiere autenticación: si no hay token JWT válido, redirige al login.
-->
<template>
  <div class="min-h-screen bg-[#0f0b1e] px-4 py-6 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl space-y-6">

      <!-- Header con nombre de usuario, conteos por estado y botones de acción -->
      <TareasHeader
        :nombre-usuario="nombreUsuario"
        :conteos="conteos"
        @nueva="abrirNueva"
        @cerrar-sesion="cerrarSesion"
      />

      <!-- Barra de filtros: búsqueda por texto, filtro por estado y por prioridad -->
      <TareasFiltros
        v-model:busqueda="busqueda"
        v-model:filtro-estado="filtroEstado"
        v-model:filtro-prioridad="filtroPrioridad"
      />

      <!-- Columnas Kanban: una columna por cada estado de tarea -->
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

      <!-- Modal reutilizable para crear y editar tareas -->
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
// Obtener la URL base de la API desde la configuración de Nuxt
const config = useRuntimeConfig()
const API_URL = config.public.apiUrl

/**
 * Obtiene el token JWT almacenado en localStorage.
 * @returns {string|null} El token JWT o null si no existe.
 */
const getToken = () => localStorage.getItem('token')

/**
 * Decodifica el payload del token JWT para extraer el nombre de usuario.
 * Divide el token en sus partes (header.payload.signature), decodifica
 * el payload desde Base64 y extrae el campo 'usuario'.
 * @returns {string|null} El nombre de usuario o null si el token es inválido.
 */
const parseToken = () => {
  try {
    const token = getToken()
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.usuario
  } catch { return null }
}

// Nombre del usuario autenticado, extraído del token JWT
const nombreUsuario = parseToken() || 'Usuario'

// Estado reactivo para filtros y control del modal
const busqueda = ref('')
const filtroEstado = ref(0)
const filtroPrioridad = ref(0)
const modalVisible = ref(false)
const tareaEditando = ref(null)
const tareas = ref([])

// Definición de las columnas del tablero Kanban con su estado numérico y título
const columnas = [
  { estado: 1, titulo: 'Pendiente' },
  { estado: 2, titulo: 'En Progreso' },
  { estado: 3, titulo: 'Completada' }
]

/**
 * Carga las tareas del usuario autenticado desde la API.
 * Envía el token JWT en el header Authorization. Si la respuesta
 * es 401 (token inválido/expirado), redirige al login.
 */
const cargarTareas = async () => {
  try {
    const res = await fetch(`${API_URL}/tareas`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    if (res.ok) {
      tareas.value = await res.json()
    } else if (res.status === 401) {
      // Token inválido o expirado, redirigir al login
      window.location.href = '/'
    }
  } catch (error) {
    console.error('Error al cargar tareas:', error)
  }
}

// Al montar el componente, verificar autenticación y cargar tareas
onMounted(() => {
  if (!getToken()) {
    window.location.href = '/'
    return
  }
  cargarTareas()
})

/**
 * Propiedad computada que calcula los conteos de tareas por estado.
 * Se utiliza en el header para mostrar los badges de resumen.
 */
const conteos = computed(() => ({
  pendientes: tareas.value.filter(t => t.estado === 1).length,
  enProgreso: tareas.value.filter(t => t.estado === 2).length,
  completadas: tareas.value.filter(t => t.estado === 3).length
}))

/**
 * Filtra las tareas para una columna específica del Kanban.
 * Aplica los filtros activos de estado, prioridad y búsqueda por texto
 * (busca coincidencias en título y descripción).
 * @param {number} estado - El estado de la columna (1=pendiente, 2=en progreso, 3=completada).
 * @returns {Array<Object>} Arreglo de tareas filtradas para esa columna.
 */
const tareasFiltradas = (estado) => {
  return tareas.value.filter(t => {
    // Filtrar por estado de la columna
    if (t.estado !== estado) return false
    // Aplicar filtro global de estado si está activo
    if (filtroEstado.value !== 0 && t.estado !== filtroEstado.value) return false
    // Aplicar filtro de prioridad si está activo
    if (filtroPrioridad.value !== 0 && t.prioridad !== filtroPrioridad.value) return false
    // Aplicar búsqueda por texto en título y descripción
    if (busqueda.value) {
      const q = busqueda.value.toLowerCase()
      const enTitulo = t.titulo.toLowerCase().includes(q)
      const enDesc = t.descripcion?.toLowerCase().includes(q) || false
      if (!enTitulo && !enDesc) return false
    }
    return true
  })
}

/**
 * Abre el modal en modo creación (sin tarea preseleccionada).
 */
const abrirNueva = () => {
  tareaEditando.value = null
  modalVisible.value = true
}

/**
 * Abre el modal en modo creación con un estado predefinido.
 * Se invoca al presionar "+" en una columna específica del Kanban.
 * @param {number} estado - Estado inicial para la nueva tarea.
 */
const abrirNuevaConEstado = (estado) => {
  tareaEditando.value = null
  modalVisible.value = true
}

/**
 * Abre el modal en modo edición con los datos de la tarea seleccionada.
 * @param {Object} tarea - Objeto de la tarea a editar.
 */
const abrirEdicion = (tarea) => {
  tareaEditando.value = { ...tarea }
  modalVisible.value = true
}

/**
 * Cierra el modal y limpia la tarea en edición.
 */
const cerrarModal = () => {
  modalVisible.value = false
  tareaEditando.value = null
}

/**
 * Guarda una tarea (crea nueva o actualiza existente).
 * Si el objeto tiene id_tarea, realiza un PUT para actualizar;
 * de lo contrario, realiza un POST para crear. Después de guardar,
 * recarga las tareas y cierra el modal.
 * @param {Object} datos - Datos de la tarea a guardar.
 */
const guardarTarea = async (datos) => {
  try {
    if (datos.id_tarea) {
      // Actualizar tarea existente via PUT
      await fetch(`${API_URL}/tareas/${datos.id_tarea}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(datos)
      })
    } else {
      // Crear nueva tarea via POST
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

/**
 * Elimina una tarea del usuario. Realiza una petición DELETE al backend
 * y recarga la lista de tareas después de la eliminación.
 * @param {Object} tarea - Objeto de la tarea a eliminar.
 */
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

/**
 * Cierra la sesión del usuario eliminando el token JWT
 * de localStorage y redirigiendo al login.
 */
const cerrarSesion = () => {
  localStorage.removeItem('token')
  window.location.href = '/'
}
</script>
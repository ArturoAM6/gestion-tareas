<!--
  Componente TareasTarjeta.
  Representa una tarjeta individual de tarea dentro de una columna del Kanban.
  Muestra el título, descripción (si existe), fecha límite formateada, estado
  con badge de color y nivel de prioridad con indicador visual. Al hacer clic
  en la tarjeta, emite el evento 'editar' para abrir el modal de edición.
  Incluye un borde lateral de color que varía según el estado de la tarea.
-->
<template>
  <div
    @click="$emit('editar', tarea)"
    class="group relative cursor-pointer rounded-xl border border-white/5 bg-[#1a1533]/80 p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-lg hover:shadow-purple-500/5"
    :class="borderClass"
  >
    <!-- Borde lateral de color según el estado de la tarea -->
    <div class="absolute left-0 top-0 h-full w-1 rounded-l-xl" :class="accentClass"></div>

    <!-- Header de la tarjeta: título y badge de estado -->
    <div class="mb-2 flex items-start justify-between gap-2">
      <h4 class="text-sm font-semibold text-white leading-tight line-clamp-2">{{ tarea.titulo }}</h4>
      <!-- Badge con el texto del estado y color dinámico -->
      <span
        class="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        :class="badgeClass"
      >
        {{ estadoTexto }}
      </span>
    </div>

    <!-- Descripción de la tarea (se muestra solo si existe, truncada a 2 líneas) -->
    <p v-if="tarea.descripcion" class="mb-3 text-xs leading-relaxed text-gray-400 line-clamp-2">
      {{ tarea.descripcion }}
    </p>

    <!-- Footer de la tarjeta: fecha límite formateada y nivel de prioridad -->
    <div class="flex items-center justify-between text-[11px]">
      <!-- Fecha límite con ícono de calendario -->
      <div class="flex items-center gap-1.5 text-gray-500">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{{ fechaFormateada }}</span>
      </div>
      <!-- Indicador de prioridad con punto de color y texto -->
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-2 w-2 rounded-full" :class="prioridadDotClass"></span>
        <span :class="prioridadTextClass">{{ prioridadTexto }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props del componente
const props = defineProps({
  /** Objeto de la tarea con los campos: id_tarea, titulo, descripcion, estado, prioridad, fecha_limite */
  tarea: {
    type: Object,
    required: true
  }
})

// Evento emitido al hacer clic en la tarjeta
defineEmits(['editar'])

/**
 * Texto legible del estado de la tarea.
 * Mapea los códigos numéricos a etiquetas en español.
 */
const estadoTexto = computed(() => {
  const estados = { 1: 'Pendiente', 2: 'En Progreso', 3: 'Completada' }
  return estados[props.tarea.estado] || 'Pendiente'
})

/**
 * Texto legible del nivel de prioridad.
 * Mapea los códigos numéricos a etiquetas en español.
 */
const prioridadTexto = computed(() => {
  const prioridades = { 1: 'baja', 2: 'media', 3: 'alta' }
  return prioridades[props.tarea.prioridad] || 'media'
})

/**
 * Formatea la fecha límite de la tarea a un formato legible (ej: "15 Mar 2026").
 * Extrae los componentes de la fecha ISO y los convierte usando nombres
 * de meses abreviados en español.
 */
const fechaFormateada = computed(() => {
  if (!props.tarea.fecha_limite) return ''
  const dateStr = props.tarea.fecha_limite.substring(0, 10)
  const partes = dateStr.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${parseInt(partes[2])} ${meses[parseInt(partes[1]) - 1]} ${partes[0]}`
})

/**
 * Clase CSS del borde lateral de la tarjeta según el estado.
 * Cada estado tiene un color de acento diferente.
 */
const accentClass = computed(() => {
  const clases = {
    1: 'bg-amber-400',
    2: 'bg-cyan-400',
    3: 'bg-emerald-400'
  }
  return clases[props.tarea.estado] || 'bg-amber-400'
})

/**
 * Clase CSS del borde hover de la tarjeta según el estado.
 */
const borderClass = computed(() => {
  const clases = {
    1: 'hover:border-amber-500/20',
    2: 'hover:border-cyan-500/20',
    3: 'hover:border-emerald-500/20'
  }
  return clases[props.tarea.estado] || ''
})

/**
 * Clase CSS del badge de estado (fondo, texto y anillo).
 */
const badgeClass = computed(() => {
  const clases = {
    1: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    2: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30',
    3: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
  }
  return clases[props.tarea.estado] || clases[1]
})

/**
 * Clase CSS del punto indicador de prioridad.
 * Alta=rojo, Media=ámbar, Baja=cyan.
 */
const prioridadDotClass = computed(() => {
  const clases = { 1: 'bg-cyan-400', 2: 'bg-amber-400', 3: 'bg-red-400' }
  return clases[props.tarea.prioridad] || 'bg-amber-400'
})

/**
 * Clase CSS del texto de prioridad, coordinada con el punto indicador.
 */
const prioridadTextClass = computed(() => {
  const clases = { 1: 'text-cyan-400', 2: 'text-amber-400', 3: 'text-red-400' }
  return clases[props.tarea.prioridad] || 'text-amber-400'
})
</script>

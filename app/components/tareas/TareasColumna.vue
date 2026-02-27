<!--
  Componente TareasColumna.
  Representa una columna individual del tablero Kanban.
  Muestra un encabezado con el título del estado, un indicador de color,
  un badge con el conteo de tareas y un botón para agregar nuevas tareas.
  Renderiza las tarjetas de tareas (TareasTarjeta) correspondientes a su estado,
  o un mensaje vacío si no hay tareas.
-->
<template>
  <div class="flex min-w-[280px] flex-1 flex-col">
    <!-- Encabezado de columna: indicador de color, título, conteo y botón de nueva tarea -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <!-- Punto indicador de color según el estado -->
        <span class="inline-block h-3 w-3 rounded-full" :class="dotClass"></span>
        <h3 class="text-sm font-bold text-white">{{ titulo }}</h3>
        <!-- Badge con el número de tareas en esta columna -->
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
          :class="countBadgeClass"
        >
          {{ tareas.length }}
        </span>
      </div>
      <!-- Botón para agregar una nueva tarea en esta columna -->
      <button
        @click="$emit('nueva')"
        class="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Lista de tarjetas de tareas con scroll vertical -->
    <div class="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar" style="max-height: calc(100vh - 260px);">
      <TareasTarjeta
        v-for="tarea in tareas"
        :key="tarea.id_tarea"
        :tarea="tarea"
        @editar="(t) => $emit('editar', t)"
      />
      <!-- Estado vacío: se muestra cuando no hay tareas en la columna -->
      <div
        v-if="tareas.length === 0"
        class="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-8 text-center"
      >
        <svg class="mb-2 h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p class="text-xs text-gray-600">Sin tareas</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Definición de props del componente
const props = defineProps({
  /** Título de la columna (ej: "Pendiente", "En Progreso", "Completada") */
  titulo: { type: String, required: true },
  /** Código numérico del estado de la columna (1=pendiente, 2=en progreso, 3=completada) */
  estado: { type: Number, required: true },
  /** Arreglo de tareas a mostrar en la columna */
  tareas: { type: Array, default: () => [] }
})

// Eventos emitidos: 'nueva' para crear tarea, 'editar' para editar una existente
defineEmits(['nueva', 'editar'])

/**
 * Clase CSS del punto indicador de color según el estado.
 * Cada estado tiene un color diferente para facilitar la identificación visual.
 */
const dotClass = computed(() => {
  const clases = { 1: 'bg-amber-400 shadow-amber-400/50 shadow-sm', 2: 'bg-cyan-400 shadow-cyan-400/50 shadow-sm', 3: 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' }
  return clases[props.estado] || 'bg-gray-400'
})

/**
 * Clase CSS del badge de conteo según el estado.
 * Utiliza colores de fondo y texto coordinados con el indicador de la columna.
 */
const countBadgeClass = computed(() => {
  const clases = { 1: 'bg-amber-500/20 text-amber-300', 2: 'bg-cyan-500/20 text-cyan-300', 3: 'bg-emerald-500/20 text-emerald-300' }
  return clases[props.estado] || 'bg-gray-500/20 text-gray-300'
})
</script>

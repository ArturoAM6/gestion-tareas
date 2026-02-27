<!--
  Componente TareasFiltros.
  Barra de filtros para la vista de tareas. Permite al usuario filtrar
  las tareas por texto (búsqueda en título y descripción), por estado
  (Todos, Pendientes, En Progreso, Completadas) y por prioridad
  (Todas, Alta, Media, Baja). Los filtros seleccionados se comunican
  al componente padre mediante v-model de dos vías.
-->
<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Campo de búsqueda por texto con ícono de lupa -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        :value="busqueda"
        @input="$emit('update:busqueda', $event.target.value)"
        placeholder="Buscar tarea..."
        class="h-9 w-48 rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
      />
    </div>

    <!-- Separador visual vertical -->
    <div class="h-6 w-px bg-white/10"></div>

    <!-- Filtros de estado: permite seleccionar un estado específico o ver todos -->
    <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Estado</span>
    <div class="flex gap-1.5">
      <button
        v-for="f in filtrosEstado"
        :key="f.valor"
        @click="$emit('update:filtroEstado', f.valor)"
        class="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
        :class="filtroEstado === f.valor
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Separador visual vertical -->
    <div class="h-6 w-px bg-white/10"></div>

    <!-- Filtros de prioridad: permite seleccionar una prioridad específica o ver todas -->
    <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Prioridad</span>
    <div class="flex gap-1.5">
      <button
        v-for="p in filtrosPrioridad"
        :key="p.valor"
        @click="$emit('update:filtroPrioridad', p.valor)"
        class="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
        :class="filtroPrioridad === p.valor
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'"
      >
        {{ p.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
// Props del componente, enlazados con v-model desde el padre
defineProps({
  /** Texto de búsqueda actual */
  busqueda: { type: String, default: '' },
  /** Filtro de estado activo (0=todos, 1=pendiente, 2=en progreso, 3=completada) */
  filtroEstado: { type: Number, default: 0 },
  /** Filtro de prioridad activo (0=todas, 1=baja, 2=media, 3=alta) */
  filtroPrioridad: { type: Number, default: 0 }
})

// Eventos de v-model para comunicar cambios de filtro al componente padre
defineEmits(['update:busqueda', 'update:filtroEstado', 'update:filtroPrioridad'])

/** Opciones disponibles para el filtro de estado */
const filtrosEstado = [
  { label: 'Todos', valor: 0 },
  { label: 'Pendientes', valor: 1 },
  { label: 'En Progreso', valor: 2 },
  { label: 'Completadas', valor: 3 }
]

/** Opciones disponibles para el filtro de prioridad */
const filtrosPrioridad = [
  { label: 'Todas', valor: 0 },
  { label: 'Alta', valor: 3 },
  { label: 'Media', valor: 2 },
  { label: 'Baja', valor: 1 }
]
</script>

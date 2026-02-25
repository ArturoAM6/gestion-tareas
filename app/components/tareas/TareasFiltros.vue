<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Búsqueda -->
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

    <!-- Separador -->
    <div class="h-6 w-px bg-white/10"></div>

    <!-- Filtros de estado -->
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

    <!-- Separador -->
    <div class="h-6 w-px bg-white/10"></div>

    <!-- Filtros de prioridad -->
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
defineProps({
  busqueda: { type: String, default: '' },
  filtroEstado: { type: Number, default: 0 },
  filtroPrioridad: { type: Number, default: 0 }
})

defineEmits(['update:busqueda', 'update:filtroEstado', 'update:filtroPrioridad'])

const filtrosEstado = [
  { label: 'Todos', valor: 0 },
  { label: 'Pendientes', valor: 1 },
  { label: 'En Progreso', valor: 2 },
  { label: 'Completadas', valor: 3 }
]

const filtrosPrioridad = [
  { label: 'Todas', valor: 0 },
  { label: 'Alta', valor: 3 },
  { label: 'Media', valor: 2 },
  { label: 'Baja', valor: 1 }
]
</script>

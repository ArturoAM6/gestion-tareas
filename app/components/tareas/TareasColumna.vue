<template>
  <div class="flex min-w-[280px] flex-1 flex-col">
    <!-- Encabezado de columna -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span class="inline-block h-3 w-3 rounded-full" :class="dotClass"></span>
        <h3 class="text-sm font-bold text-white">{{ titulo }}</h3>
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
          :class="countBadgeClass"
        >
          {{ tareas.length }}
        </span>
      </div>
      <button
        @click="$emit('nueva')"
        class="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Lista de tarjetas -->
    <div class="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar" style="max-height: calc(100vh - 260px);">
      <TareasTarjeta
        v-for="tarea in tareas"
        :key="tarea.id_tarea"
        :tarea="tarea"
        @editar="(t) => $emit('editar', t)"
      />
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
const props = defineProps({
  titulo: { type: String, required: true },
  estado: { type: Number, required: true },
  tareas: { type: Array, default: () => [] }
})

defineEmits(['nueva', 'editar'])

const dotClass = computed(() => {
  const clases = { 1: 'bg-amber-400 shadow-amber-400/50 shadow-sm', 2: 'bg-cyan-400 shadow-cyan-400/50 shadow-sm', 3: 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' }
  return clases[props.estado] || 'bg-gray-400'
})

const countBadgeClass = computed(() => {
  const clases = { 1: 'bg-amber-500/20 text-amber-300', 2: 'bg-cyan-500/20 text-cyan-300', 3: 'bg-emerald-500/20 text-emerald-300' }
  return clases[props.estado] || 'bg-gray-500/20 text-gray-300'
})
</script>

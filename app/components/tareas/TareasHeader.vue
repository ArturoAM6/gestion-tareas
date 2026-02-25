<template>
  <header class="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
    <!-- Logo + Título -->
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
        <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-white tracking-tight">Mis Tareas</h1>
        <p class="text-xs text-gray-500 flex items-center gap-1.5">
          <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {{ nombreUsuario }}
        </p>
      </div>
    </div>

    <!-- Badges + Botón -->
    <div class="flex items-center gap-3 flex-wrap">
      <!-- Badge Pendientes -->
      <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20">
        <span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
        {{ conteos.pendientes }} Pendientes
      </span>
      <!-- Badge En Progreso -->
      <span class="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/20">
        <span class="inline-block h-2 w-2 rounded-full bg-cyan-400"></span>
        {{ conteos.enProgreso }} En Progreso
      </span>
      <!-- Badge Completadas -->
      <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
        <span class="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
        {{ conteos.completadas }} Completadas
      </span>

      <!-- Botón Nueva Tarea -->
      <button
        @click="$emit('nueva')"
        class="ml-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/40 hover:scale-105 active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva tarea
      </button>

      <!-- Botón Cerrar Sesión -->
      <button
        @click="$emit('cerrarSesion')"
        class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all duration-300 hover:from-rose-500 hover:to-red-500 hover:shadow-rose-500/40 hover:scale-105 active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
        </svg>
        Cerrar sesión
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  nombreUsuario: { type: String, default: 'Usuario' },
  conteos: {
    type: Object,
    default: () => ({ pendientes: 0, enProgreso: 0, completadas: 0 })
  }
})

defineEmits(['nueva', 'cerrarSesion'])
</script>

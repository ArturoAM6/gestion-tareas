<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('cerrar')"></div>

        <!-- Modal -->
        <div class="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1533] p-6 shadow-2xl shadow-purple-500/10">
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">
              {{ esEdicion ? 'Editar Tarea' : 'Nueva Tarea' }}
            </h2>
            <button
              @click="$emit('cerrar')"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Formulario -->
          <form @submit.prevent="guardar" class="space-y-4">
            <!-- Título -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Título</label>
              <input
                v-model="form.titulo"
                type="text"
                maxlength="50"
                required
                placeholder="Nombre de la tarea"
                class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
              />
            </div>

            <!-- Descripción -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Descripción</label>
              <textarea
                v-model="form.descripcion"
                rows="3"
                placeholder="Descripción de la tarea (opcional)"
                class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all resize-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
              ></textarea>
            </div>

            <!-- Fila: Estado + Prioridad -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</label>
                <select
                  v-model.number="form.estado"
                  class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 [&>option]:bg-[#1a1533]"
                >
                  <option :value="1">Pendiente</option>
                  <option :value="2">En Progreso</option>
                  <option :value="3">Completada</option>
                </select>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Prioridad</label>
                <select
                  v-model.number="form.prioridad"
                  class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 [&>option]:bg-[#1a1533]"
                >
                  <option :value="3">Alta</option>
                  <option :value="2">Media</option>
                  <option :value="1">Baja</option>
                </select>
              </div>
            </div>

            <!-- Fecha Límite -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha Límite</label>
              <input
                v-model="form.fecha_limite"
                type="date"
                required
                :min="new Date().toISOString().split('T')[0]"
                class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 [color-scheme:dark]"
              />
            </div>

            <!-- Acciones -->
            <div class="flex items-center justify-between pt-2">
              <div>
                <button
                  v-if="esEdicion"
                  type="button"
                  @click="$emit('eliminar', tarea)"
                  class="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
              <div class="flex gap-3">
                <button
                  type="button"
                  @click="$emit('cerrar')"
                  class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/40"
                >
                  {{ esEdicion ? 'Guardar Cambios' : 'Crear Tarea' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  tarea: { type: Object, default: null }
})

const emit = defineEmits(['cerrar', 'guardar', 'eliminar'])

const esEdicion = computed(() => !!props.tarea)

const formDefault = () => ({
  titulo: '',
  descripcion: '',
  estado: 1,
  prioridad: 2,
  fecha_limite: new Date().toISOString().split('T')[0]
})

const form = ref(formDefault())

watch(() => props.visible, (val) => {
  if (val) {
    if (props.tarea) {
      form.value = { ...props.tarea }
    } else {
      form.value = formDefault()
    }
  }
})

const guardar = () => {
  emit('guardar', { ...form.value })
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative {
  transform: scale(0.95) translateY(10px);
}
.modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
}
</style>

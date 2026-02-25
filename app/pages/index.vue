<template>
  <div class="flex min-h-screen items-center justify-center bg-[#0f0b1e] px-4 py-12">
    <div class="w-full max-w-md space-y-8">

      <!-- Logo + Título -->
      <div class="text-center">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
          <svg class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h2 class="mt-5 text-2xl font-bold tracking-tight text-white">Iniciar sesión</h2>
        <p class="mt-2 text-sm text-gray-500">
          ¿No tienes cuenta?
          <NuxtLink to="/register" class="font-semibold text-purple-400 hover:text-purple-300 transition-colors">Regístrate</NuxtLink>
        </p>
      </div>

      <!-- Formulario -->
      <div class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm">
        <form @submit.prevent="handleLogin" class="space-y-5">

          <div>
            <label for="user" class="block text-sm font-medium text-gray-300">Usuario</label>
            <div class="mt-2">
              <input
                id="user"
                v-model="user"
                name="user"
                type="text"
                autocomplete="username"
                required
                placeholder="Ingresa tu usuario"
                class="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-300">Contraseña</label>
            <div class="mt-2">
              <input
                id="password"
                v-model="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                placeholder="Ingresa tu contraseña"
                class="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <p v-if="errorMsg" class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">{{ errorMsg }}</p>

          <button
            type="submit"
            class="flex w-full justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/40"
          >
            Iniciar sesión
          </button>
        </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const user = ref('')
const password = ref('')
const errorMsg = ref('')

const handleLogin = async () => {
  errorMsg.value = ''
  try {
    const config = useRuntimeConfig()
    const response = await fetch(`${config.public.apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: user.value,
        contrasena: password.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      localStorage.setItem('token', data.token)
      window.location.href = '/tareas'
    } else {
      errorMsg.value = data.message === 'USUARIO_NO_ENCONTRADO'
        ? 'Usuario no encontrado'
        : data.message === 'PASSWORD_INCORRECTA'
        ? 'Contraseña incorrecta'
        : 'Error al iniciar sesión'
    }
  } catch (error) {
    console.error('Error de conexión:', error)
    errorMsg.value = 'No se pudo conectar al servidor'
  }
}
</script>
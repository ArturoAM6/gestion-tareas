<template>
  <div class="flex min-h-screen items-center justify-center bg-[#0f0b1e] px-4 py-12">
    <div class="w-full max-w-md space-y-8">

      <!-- Logo + Título -->
      <div class="text-center">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
          <svg class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 class="mt-5 text-2xl font-bold tracking-tight text-white">Crear una cuenta</h2>
        <p class="mt-2 text-sm text-gray-500">
          ¿Ya tienes cuenta?
          <NuxtLink to="/" class="font-semibold text-purple-400 hover:text-purple-300 transition-colors">Inicia sesión</NuxtLink>
        </p>
      </div>

      <!-- Formulario -->
      <div class="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-sm">
        <form @submit.prevent="handleRegister" class="space-y-5">

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
                placeholder="Elige un nombre de usuario"
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
                autocomplete="new-password"
                required
                placeholder="Mínimo 8 caracteres"
                class="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <!-- Requisitos de contraseña -->
            <ul class="mt-3 space-y-1 text-xs text-gray-500">
              <li>• Mínimo 8 caracteres</li>
              <li>• Al menos una letra minúscula</li>
              <li>• Al menos una letra mayúscula</li>
              <li>• Al menos un número</li>
              <li>• Al menos un carácter especial (!@#$%^&*...)</li>
            </ul>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-300">Confirmar Contraseña</label>
            <div class="mt-2">
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                placeholder="Repite tu contraseña"
                class="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <p v-if="errorMsg" class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">{{ errorMsg }}</p>
          <p v-if="successMsg" class="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-500/20">{{ successMsg }}</p>

          <button
            type="submit"
            class="flex w-full justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/40"
          >
            Registrarse
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
const confirmPassword = ref('')
const errorMsg = ref('')
const successMsg = ref('')



const handleRegister = async () => {
  errorMsg.value = ''
  successMsg.value = ''


  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden'
    return
  }

  try {
    const config = useRuntimeConfig()
    const response = await fetch(`${config.public.apiUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: user.value,
        contrasena: password.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      successMsg.value = '¡Cuenta creada! Redirigiendo al login...'
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } else {
      const mensajes = {
        USUARIO_YA_EXISTE: 'Este usuario ya está registrado',
        PASSWORD_LONGITUD_INVALIDA: 'La contraseña debe tener al menos 8 caracteres',
        PASSWORD_SIN_MINUSCULA: 'La contraseña debe tener al menos una letra minúscula',
        PASSWORD_SIN_MAYUSCULA: 'La contraseña debe tener al menos una letra mayúscula',
        PASSWORD_SIN_NUMERO: 'La contraseña debe tener al menos un número',
        PASSWORD_SIN_ESPECIAL: 'La contraseña debe tener al menos un carácter especial (!@#$%^&*...)',
        FALTAN_DATOS: 'Completa todos los campos'
      }
      errorMsg.value = mensajes[data.message] || 'Error al registrarse'
    }
  } catch (error) {
    console.error('Error de conexión:', error)
    errorMsg.value = 'No se pudo conectar al servidor'
  }
}
</script>

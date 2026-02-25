<template>
  <div class="flex min-h-screen bg-white">
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        
        <div>
          <svg class="h-8 w-auto text-indigo-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h2 class="mt-6 text-2xl font-bold leading-9 tracking-tight text-gray-900">Iniciar sesión</h2>
        </div>

        <div class="mt-8">
          <div>
            <form @submit.prevent="handleLogin" class="space-y-6">
              
              <div>
                <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Correo electrónico</label>
                <div class="mt-2">
                  <input id="email" v-model="email" name="email" type="email" autocomplete="email" required class="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div>
                <label for="password" class="block text-sm font-medium leading-6 text-gray-900">Contraseña</label>
                <div class="mt-2">
                  <input id="password" v-model="password" name="password" type="password" autocomplete="current-password" required class="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div>
                <button type="submit" :disabled="isLoading" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed">
                  <span v-if="isLoading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  {{ isLoading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
    
    <div class="relative hidden w-0 flex-1 lg:block">
      <img class="absolute inset-0 h-full w-full object-cover" src="/esnupichambiador.jpg" alt="Workspace setup" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  // Lógica de inicio de sesión
  console.log('Login attempt:', email.value, password.value, rememberMe.value)
  await new Promise(resolve => setTimeout(resolve, 800))
  if (email.value === 'admin@example.com' && password.value === 'password') {
    window.location.href = '/tareas'
  } else {
    console.log('Login failed')
    alert('Credenciales incorrectas')
  }
  isLoading.value = false
}

const loginWithGoogle = () => {
  console.log('Google login clicked')
}

const loginWithGithub = () => {
  console.log('GitHub login clicked')
}
</script>
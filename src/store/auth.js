import { defineStore } from 'pinia'

const API_URL = import.meta.env.VITE_API_BASE_URL

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null
  }),
  actions: {
    async login(credentials) {
      try {
        const res = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(credentials)
        })
        const data = await res.json()
        if (res.ok) {
          this.user = data.user
          this.token = data.access_token
          localStorage.setItem('user', JSON.stringify(data.user))
          localStorage.setItem('token', data.access_token)
          return true
        } else {
          throw new Error(data.message || 'Error de autenticación')
        }
      } catch (error) {
        console.error("Login failed", error)
        throw error
      }
    },
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    }
  }
})

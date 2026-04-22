import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    isSidebarOpen: true
  }),
  actions: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    },
    openSidebar() {
      this.isSidebarOpen = true
    },
    closeSidebar() {
      this.isSidebarOpen = false
    }
  }
})

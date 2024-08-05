import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: {},
    'global.WebSocket': 'window.WebSocket', // Ensure WebSocket is available globally
    'global.btoa': 'window.btoa.bind(window)', // Ensure btoa is available globally
  }
})

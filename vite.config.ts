import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages жобаны https://<username>.github.io/<repo>/ түрінде орналастырады —
  // репо атауын өз атауыңызбен ауыстырыңыз (мыс. '/tolqyn-ai/').
  base: '/tolqyn-ai/',
})

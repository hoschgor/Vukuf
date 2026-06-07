import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
                            server: {
                              host: '0.0.0.0',  // Tüm ağ arayüzlerinde dinle
                              port: 5173,        // İstediğiniz port (varsayılan 5173)
strictPort: false, // Port meşgulse başka port dene
                            }
})

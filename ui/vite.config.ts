import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Required for Cloud Shell Web Preview. It serves the browser from
  // https://5173-cs-....cloudshell.dev while vite listens locally, so vite's
  // host check rejects it as an unknown host and the page never loads.
  // allowedHosts: true is safe here -- the dev server is only reachable through
  // Google's authenticated Cloud Shell proxy.
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
})

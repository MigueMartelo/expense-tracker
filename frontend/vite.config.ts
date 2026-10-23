import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// SPA_BUILD=1 -> static files for S3/CloudFront (no server).
// Without it, the normal Nitro build is used (Vercel).
const isSpa = process.env.SPA_BUILD === '1'

const config = defineConfig({
  plugins: [
    devtools(),
    !isSpa && nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(
      isSpa
        ? { spa: { enabled: true, prerender: { outputPath: '/index.html' } } }
        : undefined,
    ),
    viteReact(),
  ],
})

export default config

import { defineConfig } from "vite"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      { find: /^figma:asset\/.*/, replacement: path.resolve(__dirname, "./public/assets/niko-avatar.png") },
      { find: "@", replacement: path.resolve(__dirname, "./src") }
    ]
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
})

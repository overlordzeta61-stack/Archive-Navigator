import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Foundry charge le module depuis dist/ : module.json et lang/ viennent de public/.
export default defineConfig(({ mode }) => ({
  publicDir: "public",
  plugins: [svelte()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: mode === "development",
    minify: mode !== "development",
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: () => "scripts/archive-navigator.js",
      cssFileName: "styles/archive-navigator",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
}));

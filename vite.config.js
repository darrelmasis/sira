import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { loadEnv as loadViteEnv } from "vite";
import svgr from "vite-plugin-svgr";

function siraApiPlugin() {
  const attachApi = (server) => {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api")) {
        next();
        return;
      }

      try {
        const viteEnv = loadViteEnv(server.config.mode, process.cwd(), "");
        for (const [key, value] of Object.entries(viteEnv)) {
          if (process.env[key] == null) {
            process.env[key] = value;
          }
        }

        const { loadEnv } = await import("./server/env.js");
        loadEnv();

        const [{ default: handler }, { handleApiRequest }] = await Promise.all([
          import("./server/core/router.js"),
          import("./server/adapt-request.js"),
        ]);
        await handleApiRequest(req, res, handler);
      } catch (error) {
        console.error("[api]", error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, message: error.message || "Server error" }));
        }
      }
    });
  };

  return {
    name: "sira-api",
    configureServer: attachApi,
    configurePreviewServer: attachApi,
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    siraApiPlugin(),
    svgr(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "SIRA - Registro Avícola",
        short_name: "SIRA",
        description: "Sistema Integral para Registro Avícola",
        theme_color: "#3f9f5a",
        background_color: "#09090b",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        lang: "es",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.method === "GET" && /\/api\//.test(request.url),
            handler: "NetworkFirst",
            options: {
              cacheName: "sira-api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

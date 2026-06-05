// vite.config.js
import { defineConfig } from "file:///C:/Users/Ernest%20Mpiani/OneDrive/Documents/portfolio%20projects/inventory-system/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.41_lightningcss@1.27.0_terser@5.47.1/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Ernest%20Mpiani/OneDrive/Documents/portfolio%20projects/inventory-system/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@20.19.41_lightningcss@1.27.0_terser@5.47.1_/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { VitePWA } from "file:///C:/Users/Ernest%20Mpiani/OneDrive/Documents/portfolio%20projects/inventory-system/node_modules/.pnpm/vite-plugin-pwa@0.20.5_vite@5.4.21_@types+node@20.19.41_lightningcss@1.27.0_terser@5.47.1__wo_v26qgkhulaog5iqws77ha2dvui/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Ernest Mpiani\\OneDrive\\Documents\\portfolio projects\\inventory-system\\apps\\web";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "StockFlow Inventory",
        short_name: "StockFlow",
        description: "Retail Inventory Management System",
        theme_color: "#0369a1",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      },
      workbox: {
        // Cache all app pages and assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Cache strategies
        runtimeCaching: [
          {
            // Cache API calls for offline use
            urlPattern: /^https?:\/\/.*\/api\/(products|categories|inventory|alerts)/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              // 24 hours
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") }
  },
  server: {
    port: 3e3,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBWaXRlUFdBKHtcclxuICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5pY28nLCAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnLCAnbWFza2VkLWljb24uc3ZnJ10sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgbmFtZTogJ1N0b2NrRmxvdyBJbnZlbnRvcnknLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdTdG9ja0Zsb3cnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUmV0YWlsIEludmVudG9yeSBNYW5hZ2VtZW50IFN5c3RlbScsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMDM2OWExJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxyXG4gICAgICAgIHNjb3BlOiAnLycsXHJcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHsgc3JjOiAncHdhLTE5MngxOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcclxuICAgICAgICAgIHsgc3JjOiAncHdhLTUxMng1MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcclxuICAgICAgICAgIHsgc3JjOiAncHdhLTUxMng1MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycsIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAgd29ya2JveDoge1xyXG4gICAgICAgIC8vIENhY2hlIGFsbCBhcHAgcGFnZXMgYW5kIGFzc2V0c1xyXG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmMn0nXSxcclxuICAgICAgICAvLyBDYWNoZSBzdHJhdGVnaWVzXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgLy8gQ2FjaGUgQVBJIGNhbGxzIGZvciBvZmZsaW5lIHVzZVxyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzPzpcXC9cXC8uKlxcL2FwaVxcLyhwcm9kdWN0c3xjYXRlZ29yaWVzfGludmVudG9yeXxhbGVydHMpLyxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ1N0YWxlV2hpbGVSZXZhbGlkYXRlJyxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2FwaS1jYWNoZScsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAyMDAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCB9LCAvLyAyNCBob3Vyc1xyXG4gICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7IHN0YXR1c2VzOiBbMCwgMjAwXSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuVklURV9BUElfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjQwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb0MsU0FBQSxvQkFBQTtBQUNwQyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZUFBZTtBQUh4QixJQUFBLG1DQUFvQztBQUtwQyxJQUFBLHNCQUFlLGFBQWE7RUFDMUIsU0FBUztJQUNQLE1BQUs7SUFDTCxRQUFRO01BQ04sY0FBYztNQUNkLGVBQWUsQ0FBQyxlQUFlLHdCQUF3QixpQkFBaUI7TUFDeEUsVUFBVTtRQUNSLE1BQU07UUFDTixZQUFZO1FBQ1osYUFBYTtRQUNiLGFBQWE7UUFDYixrQkFBa0I7UUFDbEIsU0FBUztRQUNULGFBQWE7UUFDYixPQUFPO1FBQ1AsV0FBVztRQUNYLE9BQU87VUFDTCxFQUFFLEtBQUssbUJBQW1CLE9BQU8sV0FBVyxNQUFNLFlBQVc7VUFDN0QsRUFBRSxLQUFLLG1CQUFtQixPQUFPLFdBQVcsTUFBTSxZQUFXO1VBQzdELEVBQUUsS0FBSyxtQkFBbUIsT0FBTyxXQUFXLE1BQU0sYUFBYSxTQUFTLGVBQWM7OztNQUcxRixTQUFTOztRQUVQLGNBQWMsQ0FBQyxzQ0FBc0M7O1FBRXJELGdCQUFnQjtVQUNkOztZQUVFLFlBQVk7WUFDWixTQUFTO1lBQ1QsU0FBUztjQUNQLFdBQVc7Y0FDWCxZQUFZLEVBQUUsWUFBWSxLQUFLLGVBQWUsS0FBSyxLQUFLLEdBQUU7O2NBQzFELG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxHQUFHLEdBQUcsRUFBQzs7Ozs7S0FLaEQ7O0VBRUgsU0FBUztJQUNQLE9BQU8sRUFBRSxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPLEVBQUM7O0VBRWhELFFBQVE7SUFDTixNQUFNO0lBQ04sT0FBTztNQUNMLFFBQVE7UUFDTixRQUFRLFFBQVEsSUFBSSxnQkFBZ0I7UUFDcEMsY0FBYzs7OztDQUlyQjsiLAogICJuYW1lcyI6IFtdCn0K

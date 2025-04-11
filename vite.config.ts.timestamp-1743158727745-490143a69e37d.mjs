// vite.config.ts
import path from "node:path";
import { vanillaExtractPlugin } from "file:///C:/Users/a.benbrahim/Desktop/work/srapi/node_modules/.pnpm/@vanilla-extract+vite-plugin@4.0.19_@types+node@22.13.13_babel-plugin-macros@3.1.0_lightningc_rgepg47fsutv2vfgq23xiimnyq/node_modules/@vanilla-extract/vite-plugin/dist/vanilla-extract-vite-plugin.cjs.js";
import react from "file:///C:/Users/a.benbrahim/Desktop/work/srapi/node_modules/.pnpm/@vitejs+plugin-react@4.3.3_vite@5.4.11_@types+node@22.13.13_lightningcss@1.29.2_sass@1.81.0_terser@5.36.0_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { visualizer } from "file:///C:/Users/a.benbrahim/Desktop/work/srapi/node_modules/.pnpm/rollup-plugin-visualizer@5.12.0_rollup@4.27.0/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { defineConfig, loadEnv } from "file:///C:/Users/a.benbrahim/Desktop/work/srapi/node_modules/.pnpm/vite@5.4.11_@types+node@22.13.13_lightningcss@1.29.2_sass@1.81.0_terser@5.36.0/node_modules/vite/dist/node/index.js";
import { createSvgIconsPlugin } from "file:///C:/Users/a.benbrahim/Desktop/work/srapi/node_modules/.pnpm/vite-plugin-svg-icons@2.0.1_vite@5.4.11_@types+node@22.13.13_lightningcss@1.29.2_sass@1.81.0_terser@5.36.0_/node_modules/vite-plugin-svg-icons/dist/index.mjs";
import tsconfigPaths from "file:///C:/Users/a.benbrahim/Desktop/work/srapi/node_modules/.pnpm/vite-tsconfig-paths@5.1.2_typescript@5.6.3_vite@5.4.11_@types+node@22.13.13_lightningcss@1.29_qkykkokb5d6r36gdlibzfszzhq/node_modules/vite-tsconfig-paths/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_APP_BASE_PATH || "/";
  const isProduction = mode === "production";
  return {
    base,
    plugins: [
      react({
        // 添加 React 插件的优化配置
        babel: {
          parserOpts: {
            plugins: ["decorators-legacy", "classProperties"]
          }
        }
      }),
      vanillaExtractPlugin({
        identifiers: ({ debugId }) => `${debugId}`
      }),
      tsconfigPaths(),
      createSvgIconsPlugin({
        iconDirs: [path.resolve(process.cwd(), "src/assets/icons")],
        symbolId: "icon-[dir]-[name]"
      }),
      isProduction && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: "treemap"
        // 使用树形图更直观
      })
    ].filter(Boolean),
    server: {
      open: true,
      host: true,
      port: 3001,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/api/, ""),
          secure: false
        },
        "/elasticsearch": {
          target: "http://localhost:9200",
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/elasticsearch/, ""),
          secure: false
        }
      }
    },
    build: {
      target: "esnext",
      minify: "esbuild",
      sourcemap: !isProduction,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-core": ["react", "react-dom", "react-router"],
            "vendor-ui": ["antd", "@ant-design/icons", "@ant-design/cssinjs", "framer-motion", "styled-components"],
            "vendor-utils": ["axios", "dayjs", "i18next", "zustand", "@iconify/react"],
            "vendor-charts": ["apexcharts", "react-apexcharts"]
          }
        }
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ["react", "react-dom", "react-router", "antd", "@ant-design/icons", "axios", "dayjs"],
      exclude: ["@iconify/react"]
      // 排除不需要预构建的依赖
    },
    // esbuild 优化配置
    esbuild: {
      drop: isProduction ? ["console", "debugger"] : [],
      legalComments: "none",
      target: "esnext"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhLmJlbmJyYWhpbVxcXFxEZXNrdG9wXFxcXHdvcmtcXFxcc3JhcGlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGEuYmVuYnJhaGltXFxcXERlc2t0b3BcXFxcd29ya1xcXFxzcmFwaVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYS5iZW5icmFoaW0vRGVza3RvcC93b3JrL3NyYXBpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xyXG5cclxuaW1wb3J0IHsgdmFuaWxsYUV4dHJhY3RQbHVnaW4gfSBmcm9tIFwiQHZhbmlsbGEtZXh0cmFjdC92aXRlLXBsdWdpblwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XHJcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tIFwicm9sbHVwLXBsdWdpbi12aXN1YWxpemVyXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCB7IGNyZWF0ZVN2Z0ljb25zUGx1Z2luIH0gZnJvbSBcInZpdGUtcGx1Z2luLXN2Zy1pY29uc1wiO1xyXG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiO1xyXG5cclxuLy8gLi4uIGV4aXN0aW5nIGltcG9ydHMgLi4uXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcblx0Y29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCBcIlwiKTtcclxuXHRjb25zdCBiYXNlID0gZW52LlZJVEVfQVBQX0JBU0VfUEFUSCB8fCBcIi9cIjtcclxuXHRjb25zdCBpc1Byb2R1Y3Rpb24gPSBtb2RlID09PSBcInByb2R1Y3Rpb25cIjtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdGJhc2UsXHJcblx0XHRwbHVnaW5zOiBbXHJcblxyXG5cdFx0XHRyZWFjdCh7XHJcblx0XHRcdFx0Ly8gXHU2REZCXHU1MkEwIFJlYWN0IFx1NjNEMlx1NEVGNlx1NzY4NFx1NEYxOFx1NTMxNlx1OTE0RFx1N0Y2RVxyXG5cdFx0XHRcdGJhYmVsOiB7XHJcblx0XHRcdFx0XHRwYXJzZXJPcHRzOiB7XHJcblx0XHRcdFx0XHRcdHBsdWdpbnM6IFtcImRlY29yYXRvcnMtbGVnYWN5XCIsIFwiY2xhc3NQcm9wZXJ0aWVzXCJdLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KSxcclxuXHRcdFx0dmFuaWxsYUV4dHJhY3RQbHVnaW4oe1xyXG5cdFx0XHRcdGlkZW50aWZpZXJzOiAoeyBkZWJ1Z0lkIH0pID0+IGAke2RlYnVnSWR9YCxcclxuXHRcdFx0fSksXHJcblx0XHRcdHRzY29uZmlnUGF0aHMoKSxcclxuXHRcdFx0Y3JlYXRlU3ZnSWNvbnNQbHVnaW4oe1xyXG5cdFx0XHRcdGljb25EaXJzOiBbcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIFwic3JjL2Fzc2V0cy9pY29uc1wiKV0sXHJcblx0XHRcdFx0c3ltYm9sSWQ6IFwiaWNvbi1bZGlyXS1bbmFtZV1cIixcclxuXHRcdFx0fSksXHJcblx0XHRcdGlzUHJvZHVjdGlvbiAmJlxyXG5cdFx0XHRcdHZpc3VhbGl6ZXIoe1xyXG5cdFx0XHRcdFx0b3BlbjogdHJ1ZSxcclxuXHRcdFx0XHRcdGd6aXBTaXplOiB0cnVlLFxyXG5cdFx0XHRcdFx0YnJvdGxpU2l6ZTogdHJ1ZSxcclxuXHRcdFx0XHRcdHRlbXBsYXRlOiBcInRyZWVtYXBcIiwgLy8gXHU0RjdGXHU3NTI4XHU2ODExXHU1RjYyXHU1NkZFXHU2NkY0XHU3NkY0XHU4OUMyXHJcblx0XHRcdFx0fSksXHJcblx0XHRdLmZpbHRlcihCb29sZWFuKSxcclxuXHJcblx0XHRzZXJ2ZXI6IHtcclxuXHRcdFx0b3BlbjogdHJ1ZSxcclxuXHRcdFx0aG9zdDogdHJ1ZSxcclxuXHRcdFx0cG9ydDogMzAwMSxcclxuXHRcdFx0cHJveHk6IHtcclxuXHRcdFx0XHRcIi9hcGlcIjoge1xyXG5cdFx0XHRcdFx0dGFyZ2V0OiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMFwiLFxyXG5cdFx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlLFxyXG5cdFx0XHRcdFx0cmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sIFwiXCIpLFxyXG5cdFx0XHRcdFx0c2VjdXJlOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdFwiL2VsYXN0aWNzZWFyY2hcIjp7XHJcblx0XHRcdFx0XHR0YXJnZXQgOiBcImh0dHA6Ly9sb2NhbGhvc3Q6OTIwMFwiLFxyXG5cdFx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlLFxyXG5cdFx0XHRcdFx0cmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2VsYXN0aWNzZWFyY2gvLCBcIlwiKSxcclxuXHRcdFx0XHRcdHNlY3VyZTogZmFsc2VcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cclxuXHRcdGJ1aWxkOiB7XHJcblx0XHRcdHRhcmdldDogXCJlc25leHRcIixcclxuXHRcdFx0bWluaWZ5OiBcImVzYnVpbGRcIixcclxuXHRcdFx0c291cmNlbWFwOiAhaXNQcm9kdWN0aW9uLFxyXG5cdFx0XHRjc3NDb2RlU3BsaXQ6IHRydWUsXHJcblx0XHRcdGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTUwMCxcclxuXHRcdFx0cm9sbHVwT3B0aW9uczoge1xyXG5cdFx0XHRcdG91dHB1dDoge1xyXG5cdFx0XHRcdFx0bWFudWFsQ2h1bmtzOiB7XHJcblx0XHRcdFx0XHRcdFwidmVuZG9yLWNvcmVcIjogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXJcIl0sXHJcblx0XHRcdFx0XHRcdFwidmVuZG9yLXVpXCI6IFtcImFudGRcIiwgXCJAYW50LWRlc2lnbi9pY29uc1wiLCBcIkBhbnQtZGVzaWduL2Nzc2luanNcIiwgXCJmcmFtZXItbW90aW9uXCIsIFwic3R5bGVkLWNvbXBvbmVudHNcIl0sXHJcblx0XHRcdFx0XHRcdFwidmVuZG9yLXV0aWxzXCI6IFtcImF4aW9zXCIsIFwiZGF5anNcIiwgXCJpMThuZXh0XCIsIFwienVzdGFuZFwiLCBcIkBpY29uaWZ5L3JlYWN0XCJdLFxyXG5cdFx0XHRcdFx0XHRcInZlbmRvci1jaGFydHNcIjogW1wiYXBleGNoYXJ0c1wiLCBcInJlYWN0LWFwZXhjaGFydHNcIl0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFx1NEYxOFx1NTMxNlx1NEY5RFx1OEQ1Nlx1OTg4NFx1Njc4NFx1NUVGQVxyXG5cdFx0b3B0aW1pemVEZXBzOiB7XHJcblx0XHRcdGluY2x1ZGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3Qtcm91dGVyXCIsIFwiYW50ZFwiLCBcIkBhbnQtZGVzaWduL2ljb25zXCIsIFwiYXhpb3NcIiwgXCJkYXlqc1wiXSxcclxuXHRcdFx0ZXhjbHVkZTogW1wiQGljb25pZnkvcmVhY3RcIl0sIC8vIFx1NjM5Mlx1OTY2NFx1NEUwRFx1OTcwMFx1ODk4MVx1OTg4NFx1Njc4NFx1NUVGQVx1NzY4NFx1NEY5RFx1OEQ1NlxyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBlc2J1aWxkIFx1NEYxOFx1NTMxNlx1OTE0RFx1N0Y2RVxyXG5cdFx0ZXNidWlsZDoge1xyXG5cdFx0XHRkcm9wOiBpc1Byb2R1Y3Rpb24gPyBbXCJjb25zb2xlXCIsIFwiZGVidWdnZXJcIl0gOiBbXSxcclxuXHRcdFx0bGVnYWxDb21tZW50czogXCJub25lXCIsXHJcblx0XHRcdHRhcmdldDogXCJlc25leHRcIixcclxuXHRcdH0sXHJcblx0fTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVQsT0FBTyxVQUFVO0FBRXBVLFNBQVMsNEJBQTRCO0FBQ3JDLE9BQU8sV0FBVztBQUNsQixTQUFTLGtCQUFrQjtBQUMzQixTQUFTLGNBQWMsZUFBZTtBQUN0QyxTQUFTLDRCQUE0QjtBQUNyQyxPQUFPLG1CQUFtQjtBQUkxQixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN6QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFDM0MsUUFBTSxPQUFPLElBQUksc0JBQXNCO0FBQ3ZDLFFBQU0sZUFBZSxTQUFTO0FBRTlCLFNBQU87QUFBQSxJQUNOO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFFUixNQUFNO0FBQUE7QUFBQSxRQUVMLE9BQU87QUFBQSxVQUNOLFlBQVk7QUFBQSxZQUNYLFNBQVMsQ0FBQyxxQkFBcUIsaUJBQWlCO0FBQUEsVUFDakQ7QUFBQSxRQUNEO0FBQUEsTUFDRCxDQUFDO0FBQUEsTUFDRCxxQkFBcUI7QUFBQSxRQUNwQixhQUFhLENBQUMsRUFBRSxRQUFRLE1BQU0sR0FBRyxPQUFPO0FBQUEsTUFDekMsQ0FBQztBQUFBLE1BQ0QsY0FBYztBQUFBLE1BQ2QscUJBQXFCO0FBQUEsUUFDcEIsVUFBVSxDQUFDLEtBQUssUUFBUSxRQUFRLElBQUksR0FBRyxrQkFBa0IsQ0FBQztBQUFBLFFBQzFELFVBQVU7QUFBQSxNQUNYLENBQUM7QUFBQSxNQUNELGdCQUNDLFdBQVc7QUFBQSxRQUNWLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFlBQVk7QUFBQSxRQUNaLFVBQVU7QUFBQTtBQUFBLE1BQ1gsQ0FBQztBQUFBLElBQ0gsRUFBRSxPQUFPLE9BQU87QUFBQSxJQUVoQixRQUFRO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTixRQUFRO0FBQUEsVUFDUCxRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsVUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxVQUFVLEVBQUU7QUFBQSxVQUM1QyxRQUFRO0FBQUEsUUFDVDtBQUFBLFFBQ0Esa0JBQWlCO0FBQUEsVUFDaEIsUUFBUztBQUFBLFVBQ1QsY0FBYztBQUFBLFVBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsb0JBQW9CLEVBQUU7QUFBQSxVQUN0RCxRQUFRO0FBQUEsUUFDVDtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsSUFFQSxPQUFPO0FBQUEsTUFDTixRQUFRO0FBQUEsTUFDUixRQUFRO0FBQUEsTUFDUixXQUFXLENBQUM7QUFBQSxNQUNaLGNBQWM7QUFBQSxNQUNkLHVCQUF1QjtBQUFBLE1BQ3ZCLGVBQWU7QUFBQSxRQUNkLFFBQVE7QUFBQSxVQUNQLGNBQWM7QUFBQSxZQUNiLGVBQWUsQ0FBQyxTQUFTLGFBQWEsY0FBYztBQUFBLFlBQ3BELGFBQWEsQ0FBQyxRQUFRLHFCQUFxQix1QkFBdUIsaUJBQWlCLG1CQUFtQjtBQUFBLFlBQ3RHLGdCQUFnQixDQUFDLFNBQVMsU0FBUyxXQUFXLFdBQVcsZ0JBQWdCO0FBQUEsWUFDekUsaUJBQWlCLENBQUMsY0FBYyxrQkFBa0I7QUFBQSxVQUNuRDtBQUFBLFFBQ0Q7QUFBQSxNQUNEO0FBQUEsSUFDRDtBQUFBO0FBQUEsSUFHQSxjQUFjO0FBQUEsTUFDYixTQUFTLENBQUMsU0FBUyxhQUFhLGdCQUFnQixRQUFRLHFCQUFxQixTQUFTLE9BQU87QUFBQSxNQUM3RixTQUFTLENBQUMsZ0JBQWdCO0FBQUE7QUFBQSxJQUMzQjtBQUFBO0FBQUEsSUFHQSxTQUFTO0FBQUEsTUFDUixNQUFNLGVBQWUsQ0FBQyxXQUFXLFVBQVUsSUFBSSxDQUFDO0FBQUEsTUFDaEQsZUFBZTtBQUFBLE1BQ2YsUUFBUTtBQUFBLElBQ1Q7QUFBQSxFQUNEO0FBQ0QsQ0FBQzsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K

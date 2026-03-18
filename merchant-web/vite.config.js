import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const rootDir = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    root: rootDir,
    plugins: [react()],
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
    },
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true
    }
});

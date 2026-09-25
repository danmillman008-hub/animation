import { defineConfig } from "vite"; import react from "@vitejs/plugin-react"; import { writeFileSync } from "node:fs";
const savePlugin = () => ({ name: "save", configureServer(s: any) { s.middlewares.use("/__save", (req: any, res: any) => { if (req.method !== "POST") { res.statusCode = 405; return res.end(); } let b = ""; req.on("data", (c: any) => (b += c)); req.on("end", () => { writeFileSync("/home/user/film_editor/overrides.json", b); res.end("ok"); }); }); } });
export default defineConfig({ plugins: [react(), savePlugin()], server: { host: "0.0.0.0", port: 5173, allowedHosts: true, fs: { allow: ["/home/user"] }, watch: { followSymlinks: true } },
  resolve: { preserveSymlinks: true, alias: { "@west": "/home/user/film_editor/src/west" } } });

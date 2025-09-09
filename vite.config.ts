import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    build: {
        lib: {
            entry: "./src/thread-gate.ts",
            name: "ThreadGate",
            formats: ["es", "cjs", "umd"],
            fileName: (format) => {
                if (format === "es") return "thread-gate.esm.js";
                if (format === "cjs") return "thread-gate.cjs.js";
                if (format === "umd") return "thread-gate.umd.js";
                return `thread-gate.${format}.js`;
            },
        },
        rollupOptions: {
            output: {
                exports: "named",
            }
        },
    },
    plugins: [
        dts({
            insertTypesEntry: true,
            include: ["src/**/*"],
            outDir: "dist",
        }),
    ],
});

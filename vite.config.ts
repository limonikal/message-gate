import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    build: {
        lib: {
            entry: "./src/message-gate.ts",
            name: "MessageGate",
            formats: ["es", "cjs", "umd"],
            fileName: (format) => {
                if (format === "es") return "message-gate.esm.js";
                if (format === "cjs") return "message-gate.cjs.js";
                if (format === "umd") return "message-gate.umd.js";
                return `message-gate.${format}.js`;
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

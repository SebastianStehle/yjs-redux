import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        dts({
            insertTypesEntry: true,
        }),
    ],
    build: {
        lib: {
            name: 'YjsRedux',
            entry: './lib/index.ts',
            formats: ['es'],
        },
        rollupOptions: {
            external: ['react', 'react/jsx-runtime', 'react-dom'],
        },
        sourcemap: true,
        target: 'es2020',
    },

    test: {
        browser: {
            name: 'chrome', // browser name is required
        },

        root: "./"
    }
} as unknown);

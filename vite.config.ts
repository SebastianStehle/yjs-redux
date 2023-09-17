import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    root: "./sample/",

    test: {
        browser: {
            name: 'chrome', // browser name is required
        },

        root: "./"
    }
} as unknown);

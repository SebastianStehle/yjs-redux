import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    test: {
        browser: {
            name: 'chrome', // browser name is required
        },
    }
} as unknown);

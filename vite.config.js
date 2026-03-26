var _a;
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': "http://localhost:".concat((_a = process.env.PORT) !== null && _a !== void 0 ? _a : '3002'),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        css: true,
        globals: true,
    },
});

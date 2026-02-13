import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		electron({
			entry: {
				main: 'src/electron/main.ts',
				preload: 'src/electron/preload.ts',
			},
			onstart(options) {
				options.startup();
			},
			vite: {
				build: {
					outDir: 'dist-electron',
					rollupOptions: {
						output: {
							entryFileNames: '[name].js',
						},
					},
				},
			},
		}),
	],
});

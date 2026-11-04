import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
	return {
		plugins: [tailwindcss(), solidPlugin(), tsconfigPaths()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
		publicDir: './public',
		server: {
			host: true,
			allowedHosts: true,
			fs: {
				allow: ['..'],
			},
			hmr: process.env.DISABLE_HMR !== 'true',
			watch: process.env.DISABLE_HMR === 'true' ? null : {},
		},
		build: {
			target: 'esnext',
			sourcemap: false,
		},
	};
});

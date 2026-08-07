import env from "./app/lib/env";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	modules: ['@nuxt/ui', '@nuxtjs/color-mode'],
	colorMode: {
		preference: 'dark',
		classSuffix: ''
	},
	devServer: {
		port: 3148
	},
	app: {
		head: {
			title: 'Dijon 26 - Discover Dijon, Burgundy & Region Maps',
			meta: [
				{ name: 'description', content: 'Explore Dijon Wikipedia articles, historic landmarks, regional map downloads (KMZ), and high-resolution geography maps of Burgundy, France.' }
			],
			link: [
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
			]
		}
	},
	css: ['~/assets/css/main.css'],
	postcss: {
		plugins: {
			'@tailwindcss/postcss': {},
			autoprefixer: {}
		}
	},
	nitro: {
		esbuild: {
			options: {
				target: 'es2022'
			}
		}
	},
	runtimeConfig: {
		public: {
			nodeEnv: env.NODE_ENV
		}
	}
})


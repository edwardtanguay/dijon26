import env from "./app/lib/env";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	modules: ['@nuxt/ui', '@nuxtjs/color-mode', '@nuxtjs/kinde'],
	colorMode: {
		preference: 'dark',
		classSuffix: ''
	},
	devServer: {
		port: 3148
	},
	app: {
		head: {
			title: 'Turso Showcase',
			meta: [
				{ name: 'description', content: 'A Nuxt 3, Prisma, and Turso database showcase application' }
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
			nodeEnv: env.NODE_ENV,
			bypassAuth: process.env.NUXT_PUBLIC_BYPASS_AUTH === 'true'
		}
	}
})


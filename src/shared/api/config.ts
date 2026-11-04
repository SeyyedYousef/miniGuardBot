/**
 * API Configuration
 * 2026 Production Standards
 */

const resolveDefaultBaseUrl = (): string => {
	if (import.meta.env.VITE_API_URL) {
		return import.meta.env.VITE_API_URL;
	}
	if (typeof window !== 'undefined') {
		const host = window.location.hostname;
		// Automatically route Cloudflare Pages & external static hosts to the live VPS API
		if (host.endsWith('.pages.dev') || host.endsWith('.workers.dev')) {
			return 'https://guard-109-172-94-139.sslip.io/api/v1';
		}
	}
	return '/api/v1';
};

export const API_CONFIG = {
	// detect if running in Telegram Mini App production environment
	IS_PRODUCTION: import.meta.env.PROD,

	// Base URL for real API
	BASE_URL: resolveDefaultBaseUrl(),

	// Should we use mocks?
	USE_MOCKS: import.meta.env.DEV || import.meta.env.VITE_FORCE_MOCKS === 'true',

	TIMEOUT: 15000,
};

export const buildAvatarUrl = (rawUrl: string | undefined): string => {
	if (!rawUrl) return '';
	if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
	const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
	try {
		const base = new URL(API_CONFIG.BASE_URL);
		return `${base.origin}${cleanPath}`;
	} catch {
		const base = API_CONFIG.BASE_URL.replace(/\/api\/v1\/?$/, '');
		return `${base}${cleanPath}`;
	}
};

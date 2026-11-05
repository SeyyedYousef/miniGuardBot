import { miniApp, retrieveLaunchParams, themeParams } from '@tma.js/sdk-solid';
import { createEffect, createRoot, createSignal } from 'solid-js';

export type TgColorScheme = 'light' | 'dark';

const LIGHT_VARS: Record<string, string> = {
	'--tg-bg': '#efeff4',
	'--tg-secondary-bg': '#e5e5ea',
	'--tg-section-bg': '#ffffff',
	'--tg-header-bg': 'rgba(248, 248, 248, 0.9)',
	'--tg-text': '#000000',
	'--tg-hint': '#8e8e93',
	'--tg-link': '#007aff',
	'--tg-button': '#007aff',
	'--tg-button-text': '#ffffff',
	'--tg-accent-soft': 'rgba(0, 122, 255, 0.12)',
	'--tg-destructive': '#ff3b30',
	'--tg-separator': 'rgba(60, 60, 67, 0.14)',
	'--tg-input-bg': '#e5e5ea',
	'--tg-card-border': 'rgba(0, 0, 0, 0.05)',
};

const DARK_VARS: Record<string, string> = {
	'--tg-bg': '#000000',
	'--tg-secondary-bg': '#2c2c2e',
	'--tg-section-bg': '#1c1c1e',
	'--tg-header-bg': 'rgba(28, 28, 30, 0.88)',
	'--tg-text': '#ffffff',
	'--tg-hint': '#8e8e93',
	'--tg-link': '#0a84ff',
	'--tg-button': '#0a84ff',
	'--tg-button-text': '#ffffff',
	'--tg-accent-soft': 'rgba(10, 132, 255, 0.16)',
	'--tg-destructive': '#ff453a',
	'--tg-separator': 'rgba(84, 84, 88, 0.48)',
	'--tg-input-bg': '#2c2c2e',
	'--tg-card-border': 'rgba(255, 255, 255, 0.08)',
};

const isHexDark = (hex?: string): boolean => {
	if (!hex?.startsWith('#')) return true;
	const clean = hex.slice(1);
	const num = parseInt(
		clean.length === 3
			? clean
					.split('')
					.map((c) => c + c)
					.join('')
			: clean,
		16,
	);
	if (Number.isNaN(num)) return true;
	const r = (num >> 16) & 255;
	const g = (num >> 8) & 255;
	const b = num & 255;
	const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return lum < 0.5;
};

export const detectTelegramScheme = (): TgColorScheme => {
	try {
		const saved = localStorage.getItem('tg_theme_override') as TgColorScheme | null;
		if (saved === 'light' || saved === 'dark') return saved;

		try {
			const tp = themeParams.state?.() as any;
			const bg = tp?.bgColor || tp?.bg_color;
			if (bg) return isHexDark(bg) ? 'dark' : 'light';
		} catch {}

		try {
			const lp = retrieveLaunchParams() as any;
			const tp = lp?.tgWebAppThemeParams;
			const bg = tp?.bgColor || tp?.bg_color;
			if (bg) return isHexDark(bg) ? 'dark' : 'light';
		} catch {}

		const tgWebApp = (window as any).Telegram?.WebApp;
		const tgBg = tgWebApp?.themeParams?.bg_color || tgWebApp?.themeParams?.bgColor;
		if (tgBg) {
			return isHexDark(tgBg) ? 'dark' : 'light';
		}
		if (tgWebApp?.colorScheme === 'light' || tgWebApp?.colorScheme === 'dark') {
			return tgWebApp.colorScheme;
		}

		if (typeof document !== 'undefined') {
			const attr = document.documentElement.getAttribute('data-theme');
			if (attr === 'light' || attr === 'dark') return attr;
		}

		if (
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-color-scheme: light)').matches
		) {
			return 'light';
		}
	} catch {}
	return 'light';
};

const [colorScheme, setColorSchemeSignal] = createSignal<TgColorScheme>(detectTelegramScheme());

export const applyTgThemeToDOM = (scheme: TgColorScheme) => {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.classList.toggle('dark', scheme === 'dark');
	root.classList.toggle('light', scheme === 'light');
	root.setAttribute('data-theme', scheme);

	const vars = scheme === 'dark' ? DARK_VARS : LIGHT_VARS;
	for (const [k, v] of Object.entries(vars)) {
		root.style.setProperty(k, v);
	}

	try {
		const headerHex = scheme === 'dark' ? '#1c1c1e' : '#f8f8f8';
		const bgHex = scheme === 'dark' ? '#000000' : '#efeff4';
		if (miniApp && typeof miniApp.isMounted === 'function' && miniApp.isMounted()) {
			if (typeof miniApp.setHeaderColor === 'function') miniApp.setHeaderColor(headerHex);
			if (typeof (miniApp as any).setBackgroundColor === 'function')
				(miniApp as any).setBackgroundColor(bgHex);
			if (typeof (miniApp as any).setBottomBarColor === 'function')
				(miniApp as any).setBottomBarColor(headerHex);
		}
		const tgWebApp = (window as any).Telegram?.WebApp;
		if (tgWebApp?.isVersionAtLeast?.('7.10')) {
			tgWebApp.setBottomBarColor?.(headerHex);
		}
	} catch {}
};

export const syncThemeWithTelegram = () => {
	const detected = detectTelegramScheme();
	setColorSchemeSignal(detected);
	applyTgThemeToDOM(detected);
};

export const setThemeScheme = (scheme: TgColorScheme) => {
	localStorage.setItem('tg_theme_override', scheme);
	setColorSchemeSignal(scheme);
	applyTgThemeToDOM(scheme);
};

export const toggleThemeScheme = () => {
	setThemeScheme(colorScheme() === 'dark' ? 'light' : 'dark');
};

export { colorScheme };

createRoot(() => {
	applyTgThemeToDOM(colorScheme());

	createEffect(() => {
		applyTgThemeToDOM(colorScheme());
	});
});

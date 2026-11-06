import * as i18n from '@solid-primitives/i18n';
import { initData } from '@tma.js/sdk-solid';
import { createContext, createEffect, createRoot, createSignal, useContext } from 'solid-js';
import { setLanguage } from '@/shared/api/profile.js';

import { dict as en } from './en.js';

export type Locale = 'fa' | 'en' | 'ar' | 'ru' | 'tr' | 'es' | 'pt' | 'de' | 'fr' | 'zh';

export type Dictionary = typeof en;

export interface LanguageOption {
	code: Locale;
	native: string;
	label: string;
	flag: string;
	rtl: boolean;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
	{ code: 'fa', native: 'فارسی', label: 'فارسی (Persian)', flag: '🇮🇷', rtl: true },
	{ code: 'en', native: 'English', label: 'English', flag: '🇬🇧', rtl: false },
	{ code: 'ar', native: 'العربية', label: 'العربية (Arabic)', flag: '🇸🇦', rtl: true },
	{ code: 'ru', native: 'Русский', label: 'Русский (Russian)', flag: '🇷🇺', rtl: false },
	{ code: 'tr', native: 'Türkçe', label: 'Türkçe (Turkish)', flag: '🇹🇷', rtl: false },
	{ code: 'es', native: 'Español', label: 'Español (Spanish)', flag: '🇪🇸', rtl: false },
	{ code: 'pt', native: 'Português', label: 'Português (Portuguese)', flag: '🇧🇷', rtl: false },
	{ code: 'de', native: 'Deutsch', label: 'Deutsch (German)', flag: '🇩🇪', rtl: false },
	{ code: 'fr', native: 'Français', label: 'Français (French)', flag: '🇫🇷', rtl: false },
	{ code: 'zh', native: '简体中文', label: '简体中文 (Chinese)', flag: '🇨🇳', rtl: false },
] as const;

export const VALID_LOCALE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export const RTL_LOCALES: Locale[] = ['fa', 'ar'];

export const getLanguageLabel = (code?: Locale): string => {
	const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
	return found ? `${found.flag} ${found.native}` : '🇮🇷 فارسی';
};

const mapLanguageCode = (code?: string): Locale => {
	if (!code) return 'fa';
	const c = code.toLowerCase();
	if (c.startsWith('fa') || c.startsWith('per') || c.startsWith('prs')) return 'fa';
	if (c.startsWith('ar')) return 'ar';
	if (c.startsWith('ru') || c.startsWith('uk') || c.startsWith('be')) return 'ru';
	if (c.startsWith('tr')) return 'tr';
	if (c.startsWith('es')) return 'es';
	if (c.startsWith('pt')) return 'pt';
	if (c.startsWith('de')) return 'de';
	if (c.startsWith('fr')) return 'fr';
	if (c.startsWith('zh')) return 'zh';
	if (c.startsWith('en')) return 'en';
	return 'en';
};

const getInitialLocale = (): Locale => {
	try {
		const saved = localStorage.getItem('user_selected_locale') as Locale | null;
		if (saved && VALID_LOCALE_CODES.includes(saved)) {
			return saved;
		}
	} catch {}

	try {
		const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
		const tgWebAppData = params.get('tgWebAppData');
		if (tgWebAppData) {
			const data = new URLSearchParams(tgWebAppData);
			const user = JSON.parse(decodeURIComponent(data.get('user') || '{}'));
			if (user.language_code) return mapLanguageCode(user.language_code);
		}
	} catch (_e) {}

	return 'fa';
};

const [getLocale, rawSetLocale] = createSignal<Locale>(getInitialLocale());

export { getLocale as locale };

const enFlattened = i18n.flatten(en);
const [loadedDicts, setLoadedDicts] = createSignal<Record<string, any>>({
	en: enFlattened,
});

export const loadDictionary = async (loc: Locale) => {
	if (loc === 'en') return;
	const current = loadedDicts();
	if (current[loc] && Object.keys(current[loc]).length > 0) return;

	try {
		let module: { dict: any } | undefined;
		switch (loc) {
			case 'fa':
				module = await import('./fa.js');
				break;
			case 'ar':
				module = await import('./ar.js');
				break;
			case 'ru':
				module = await import('./ru.js');
				break;
			case 'tr':
				module = await import('./tr.js');
				break;
			case 'es':
				module = await import('./es.js');
				break;
			case 'pt':
				module = await import('./pt.js');
				break;
			case 'de':
				module = await import('./de.js');
				break;
			case 'fr':
				module = await import('./fr.js');
				break;
			case 'zh':
				module = await import('./zh.js');
				break;
			default:
				module = { dict: en };
				break;
		}
		if (module?.dict) {
			const flattened = i18n.flatten(module.dict);
			setLoadedDicts((prev) => ({ ...prev, [loc]: flattened }));
		}
	} catch (err) {
		console.error(`Failed to load dictionary for ${loc}:`, err);
	}
};

// Initial background load for selected locale
loadDictionary(getInitialLocale());

export const setLocale = (newLocale: Locale) => {
	try {
		localStorage.setItem('user_selected_locale', newLocale);
	} catch {}
	rawSetLocale(newLocale);
	loadDictionary(newLocale);
	setLanguage(newLocale).catch(() => {});
};

export const isRtl = () => RTL_LOCALES.includes(getLocale());

createRoot(() => {
	// Reactively detect language from Telegram SDK after it initializes
	createEffect(() => {
		try {
			if (localStorage.getItem('user_selected_locale')) return;
		} catch {}
		const user = initData.user();
		if (user?.language_code) {
			const loc = mapLanguageCode(user.language_code);
			rawSetLocale(loc);
			loadDictionary(loc);
		}
	});

	// Keep HTML lang attribute in sync, handle RTL
	createEffect(() => {
		const currentLocale = getLocale();
		if (typeof document !== 'undefined') {
			document.documentElement.dir = RTL_LOCALES.includes(currentLocale) ? 'rtl' : 'ltr';
			document.documentElement.lang = currentLocale;
		}
	});
});

// Auto-generate all valid translation key paths from the dictionary structure
type FlattenKeys<T, Prefix extends string = ''> = {
	[K in keyof T & string]: T[K] extends Record<string, unknown>
		? FlattenKeys<T[K], `${Prefix}${K}.`>
		: `${Prefix}${K}`;
}[keyof T & string];

export type DictPaths = FlattenKeys<Dictionary>;

// Flatten dictionary for performance with 'en' fallback for missing keys
export const getDict = () => {
	const currentLocale = getLocale();
	const dicts = loadedDicts();
	if (
		currentLocale === 'en' ||
		!dicts[currentLocale] ||
		Object.keys(dicts[currentLocale]).length === 0
	) {
		return enFlattened;
	}
	return { ...enFlattened, ...dicts[currentLocale] };
};

export const customResolveTemplate = (template: string, ...args: any[]): string => {
	if (typeof template !== 'string') return (template as any) || '';
	if (!args || args.length === 0) return template;

	let result = template;
	const firstArg = args[0];

	if (firstArg && typeof firstArg === 'object') {
		for (const key of Object.keys(firstArg)) {
			const val =
				firstArg[key] !== undefined && firstArg[key] !== null ? String(firstArg[key]) : '';
			result = result.split(`{{${key}}}`).join(val).split(`{${key}}`).join(val);
		}
	} else {
		for (let i = 0; i < args.length; i++) {
			const val = args[i] !== undefined && args[i] !== null ? String(args[i]) : '';
			result = result.split(`{{${i}}}`).join(val).split(`{${i}}`).join(val);
		}
	}

	return result;
};

// Type-safe translator: wrong keys cause a compile-time error
export const t = i18n.translator(getDict, customResolveTemplate) as (
	key: DictPaths,
	args?: Record<string, any>,
) => string;

export const getIntlLocale = (): string => {
	return 'en-US';
};

export const formatNumber = (num: number): string => {
	if (num === undefined || num === null || Number.isNaN(num)) return '0';
	return num.toLocaleString('en-US');
};

export const formatCoins = (coins: number | undefined | null): string => {
	if (!coins) return '+0';
	if (coins >= 1000) return `+${formatNumber(Math.floor(coins / 1000))}k`;
	return `+${formatNumber(Math.floor(coins))}`;
};

export const I18nContext = createContext({ t, locale: getLocale, setLocale, isRtl, formatNumber });
export const useI18n = () => useContext(I18nContext);

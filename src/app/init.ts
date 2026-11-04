import {
	backButton,
	emitEvent,
	hapticFeedback,
	initData,
	init as initSDK,
	isTMA,
	miniApp,
	mockTelegramEnv,
	retrieveLaunchParams,
	setDebug,
	type ThemeParams,
	themeParams,
	viewport,
} from '@tma.js/sdk-solid';

import { syncThemeWithTelegram } from '@/shared/lib/tg-theme.js';
import { initProfileSync, profileSettings } from '@/shared/store/profile.js';

/**
 * Initializes the application and configures its dependencies.
 */
export async function init(options: {
	debug: boolean;
	eruda: boolean;
	mockForMacOS: boolean;
}): Promise<void> {
	// 1. First, handle environment mocking if we're not in Telegram
	// This must happen BEFORE initSDK to prevent hanging
	let realParams: any;
	try {
		realParams = retrieveLaunchParams();
	} catch (_e) {
		// ignore
	}

	if (import.meta.env.DEV && !(await isTMA()) && !realParams) {
		console.info('TMA Mock Environment enabled for local development.');
		mockTelegramEnv({
			launchParams: new URLSearchParams([
				[
					'tgWebAppThemeParams',
					JSON.stringify({
						accent_text_color: '#6ab2f2',
						bg_color: '#17212b',
						button_color: '#5288c1',
						button_text_color: '#ffffff',
						destructive_text_color: '#ec3942',
						header_bg_color: '#17212b',
						hint_color: '#708499',
						link_color: '#6ab3f3',
						secondary_bg_color: '#232e3c',
						section_bg_color: '#17212b',
						section_header_text_color: '#6ab3f3',
						subtitle_text_color: '#708499',
						text_color: '#f5f5f5',
					}),
				],
				[
					'tgWebAppData',
					new URLSearchParams([
						[
							'user',
							JSON.stringify({
								id: 99281932,
								first_name: 'Andrew',
								last_name: 'Rogue',
								username: 'rogue',
								language_code: 'fa',
								is_premium: true,
								allows_write_to_pm: true,
							}),
						],
						['hash', '89d6079ad6762351f38c6dbbc41bb53048019256a9443988af7a48bcad16ba31'],
						['signature', '5O_G2H_wXgI32v2G-w0y-W_O3G_4G'],
						['auth_date', '1716922846'],
						['start_param', 'debug'],
						['chat_type', 'sender'],
						['chat_instance', '8428209589180549439'],
					]).toString(),
				],
				['tgWebAppVersion', '8'],
				['tgWebAppPlatform', 'tdesktop'],
			]),
		});
	}

	// 2. Now initialize the SDK
	setDebug(options.debug);
	initSDK();

	// Add Eruda if needed.
	if (import.meta.env.DEV && options.eruda) {
		void import('eruda').then(({ default: eruda }) => {
			eruda.init();
			eruda.position({ x: window.innerWidth - 50, y: 0 });
		});
	}

	// Telegram for macOS has a ton of bugs, including cases, when the client doesn't
	// even response to the "web_app_request_theme" method. It also generates an incorrect
	// event for the "web_app_request_safe_area" method.
	if (options.mockForMacOS) {
		let firstThemeSent = false;
		let currentParams: any;
		try {
			currentParams = retrieveLaunchParams();
		} catch (_e) {}

		// We must pass the existing launchParams to avoid resetting user session
		// when we mock the environment for the macOS bug workaround!
		mockTelegramEnv({
			launchParams: currentParams as any,
			onEvent(event, next) {
				if (event.name === 'web_app_request_theme') {
					let tp: ThemeParams = {};
					if (firstThemeSent) {
						try {
							tp = themeParams.state();
						} catch (_e) {}
					} else {
						firstThemeSent = true;
						try {
							tp = retrieveLaunchParams().tgWebAppThemeParams || {};
						} catch (_e) {}
					}
					return emitEvent('theme_changed', { theme_params: tp });
				}

				if (event.name === 'web_app_request_safe_area') {
					return emitEvent('safe_area_changed', { left: 0, top: 0, right: 0, bottom: 0 });
				}

				next();
			},
		});
	}

	// Mount all components used in the project.
	// We use try-catch for each component to prevent the entire app from crashing.

	try {
		if (backButton && typeof backButton.mount === 'function') {
			const mountResult = backButton.mount() as any;
			if (mountResult && typeof mountResult.then === 'function') await mountResult;
		}
	} catch (e) {
		console.warn('BackButton mount failed', e);
	}

	try {
		if (initData && typeof initData.restore === 'function') {
			initData.restore();
		}
	} catch (e) {
		console.warn('initData restore failed', e);
	}

	try {
		if (miniApp && typeof miniApp.mount === 'function') {
			const mountResult = miniApp.mount() as any;
			if (mountResult && typeof mountResult.then === 'function') await mountResult;
		}
		if (miniApp && typeof miniApp.ready === 'function') {
			miniApp.ready();
		}
		if (themeParams && typeof themeParams.mount === 'function') {
			const mountResult = themeParams.mount() as any;
			if (mountResult && typeof mountResult.then === 'function') await mountResult;
		}
		if (themeParams && typeof themeParams.bindCssVars === 'function') {
			themeParams.bindCssVars();
		}
	} catch (e) {
		console.warn('MiniApp/ThemeParams mount failed', e);
	}

	try {
		if (viewport && typeof viewport.mount === 'function') {
			const mountResult = viewport.mount();
			if (mountResult instanceof Promise) {
				await Promise.race([mountResult, new Promise((resolve) => setTimeout(resolve, 250))]);
			}
			if (typeof viewport.bindCssVars === 'function') viewport.bindCssVars();
			if (typeof viewport.expand === 'function') viewport.expand();
		}
		const tgWebApp = (window as any).Telegram?.WebApp;
		tgWebApp?.ready?.();
		tgWebApp?.expand?.();
		tgWebApp?.disableVerticalSwipes?.();
	} catch (e) {
		console.warn('Viewport mount or expansion failed', e);
	}

	// Sync theme scheme (Light / Dark) with Telegram launch/theme params
	syncThemeWithTelegram();

	// Initialize profile settings persistence
	initProfileSync();

	// Wrap hapticFeedback methods to respect user preferences
	try {
		const hf = hapticFeedback as any;
		if (hf && typeof hf.impactOccurred === 'function') {
			const originalImpact = hf.impactOccurred;
			const originalNotification = hf.notificationOccurred;
			const originalSelection = hf.selectionChanged;

			hf.impactOccurred = (style: any) => {
				if (profileSettings()?.hapticEnabled !== false) {
					originalImpact.call(hf, style);
				}
			};

			hf.notificationOccurred = (type: any) => {
				if (profileSettings()?.hapticEnabled !== false) {
					originalNotification.call(hf, type);
				}
			};

			hf.selectionChanged = () => {
				if (profileSettings()?.hapticEnabled !== false) {
					originalSelection.call(hf);
				}
			};
		}
	} catch (e) {
		console.warn('Failed to wrap hapticFeedback', e);
	}
}

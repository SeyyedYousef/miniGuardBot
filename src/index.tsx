/* @refresh reload */

import * as Sentry from '@sentry/browser';
import { isTMA, mockTelegramEnv, retrieveLaunchParams } from '@tma.js/sdk-solid';
import { render } from 'solid-js/web';
import { init } from '@/app/init.js';
import { Root } from '@/app/Root.js';
import { bootstrapAuth } from '@/shared/api/axios.js';
import { hideSplash } from '@/shared/lib/splash.js';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary.js';
import '@/shared/lib/tg-theme.js';

import './app/styles/index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
	Sentry.init({
		dsn: import.meta.env.VITE_SENTRY_DSN,
		integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
		tracesSampleRate: 0.1,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
	});
}

async function startApp() {
	const root = document.getElementById('root');
	if (!root) return;

	// Prevent iOS Safari native pinch-to-zoom gesture
	document.addEventListener('gesturestart', (e) => {
		e.preventDefault();
	});

	try {
		// 1. Check if we already have real launch params (e.g. from URL or Session Storage)
		let realParams: any;
		try {
			realParams = retrieveLaunchParams();
		} catch (_e) {
			// Clear any corrupted launchParams in sessionStorage from v2 format
			try {
				sessionStorage.removeItem('tapps/launchParams');
				sessionStorage.removeItem('telegram-mini-apps-launch-params');
				for (let i = sessionStorage.length - 1; i >= 0; i--) {
					const k = sessionStorage.key(i);
					if (k?.toLowerCase().includes('launchparams')) {
						sessionStorage.removeItem(k);
					}
				}
			} catch {}
		}

		// 2. Check environment and mock if necessary BEFORE anything else
		const isTelegram = await isTMA();

		if (!isTelegram && !realParams) {
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
							['query_id', 'AAHdF60pAAAAANYXrSkW1'],
						]).toString(),
					],
					['tgWebAppVersion', '7.2'],
					['tgWebAppPlatform', 'tdesktop'],
				]),
			});
		}

		// 3. Now it's safe to retrieve params
		const launchParams = retrieveLaunchParams();
		const debug =
			import.meta.env.DEV &&
			((launchParams.tgWebAppStartParam || '').includes('debug') ||
				localStorage.getItem('debug') === 'true');

		if (debug) {
			try {
				const eruda = await import('eruda');
				eruda.default.init();
			} catch (e) {
				console.warn('Failed to load Eruda', e);
			}
		}

		// 4. Initialize App logic
		await init({
			debug,
			eruda: false,
			mockForMacOS: launchParams.tgWebAppPlatform === 'macos',
		});

		// 4.5. Proactively obtain JWT before any API calls to avoid 401→refresh loops
		await bootstrapAuth();

		// 5. Final Render
		render(
			() => (
				<ErrorBoundary>
					<Root />
				</ErrorBoundary>
			),
			root,
		);

		// 6. Hide splash — دو rAF پشت سر هم تضمین می‌کند اولین فریم واقعی
		//    اپ روی صفحه نقاشی شده باشد و کاربر بین splash و UI، فلش سیاه نبیند.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => hideSplash());
		});
	} catch (e) {
		console.error('Startup Error:', e);
		// P0-F1: Use DOM API instead of innerHTML to prevent XSS from error messages
		const errorContainer = document.createElement('div');
		errorContainer.style.cssText =
			'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f1014;color:white;font-family:sans-serif;text-align:center;padding:20px;';

		const title = document.createElement('h1');
		title.style.fontSize = '20px';
		title.textContent = 'Failed to initialize';

		const msg = document.createElement('p');
		msg.style.cssText = 'color:#a0a4ad;font-size:14px;';
		msg.textContent = e instanceof Error ? e.message : 'Unknown error';

		const btn = document.createElement('button');
		btn.textContent = 'Reload';
		btn.onclick = () => location.reload();
		btn.style.cssText =
			'margin-top:20px;padding:10px 20px;background:#0088CC;border:none;border-radius:20px;color:white;cursor:pointer;';

		errorContainer.append(title, msg, btn);
		root.replaceChildren(errorContainer);
		hideSplash(true); // فوری، چون کاربر باید پیام خطا و دکمه Reload را ببیند
	}
}

startApp();

// Register Service Worker for offline support and immediate refresh updates in production
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/sw.js')
			.then((registration) => {
				console.info('[SW] ServiceWorker registered with scope:', registration.scope);

				// Listen for updates
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener('statechange', () => {
							if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
								console.info('[SW] New version detected, notifying worker to skip waiting...');
								newWorker.postMessage({ type: 'SKIP_WAITING' });
							}
						});
					}
				});
			})
			.catch((err) => {
				console.error('[SW] Registration failed:', err);
			});
	});

	let refreshing = false;
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (!refreshing) {
			refreshing = true;
			window.location.reload();
		}
	});
}

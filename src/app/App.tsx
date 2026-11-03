import * as Sentry from '@sentry/browser';
import { HashRouter, Navigate, Route, useNavigate } from '@solidjs/router';
import { retrieveLaunchParams } from '@tma.js/sdk-solid';
import { createEffect, ErrorBoundary, For } from 'solid-js';
import { routes } from '@/app/router/routes.js';
import { t } from '@/shared/i18n/index.js';
import { PageTransition } from '@/shared/ui/PageTransition.js';
import { ImpersonationBanner } from '@/widgets/owner/ImpersonationBanner.js';

const PageErrorFallback = (err: any, reset: () => void) => {
	Sentry.captureException(err);
	const isChunkError =
		err?.message?.includes('dynamically imported module') ||
		err?.message?.includes('Failed to fetch') ||
		err?.message?.includes('Loading chunk');

	return (
		<div class="tg-canvas min-h-screen flex flex-col items-center justify-center p-6 text-center">
			<div class="w-16 h-16 rounded-full bg-[var(--tg-destructive)]/10 flex items-center justify-center mb-4 text-[var(--tg-destructive)]">
				<span class="material-symbols-outlined text-[32px]">error</span>
			</div>
			<h1 class="text-lg font-bold mb-2 text-[var(--tg-text)]">{t('error.title')}</h1>
			<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed mb-6 max-w-xs">
				{err?.message || 'An unexpected rendering error occurred.'}
			</p>
			<button
				onClick={() => {
					if (isChunkError) {
						window.location.reload();
					} else {
						reset();
					}
				}}
				class="tg-btn-primary h-11 px-6 flex items-center justify-center gap-2"
			>
				<span class="material-symbols-outlined text-[18px]">refresh</span>
				{t('error.tryAgain')}
			</button>
		</div>
	);
};

const RouteWrapper = (props: { component: any; [key: string]: any }) => {
	return (
		<ErrorBoundary fallback={(err, reset) => PageErrorFallback(err, reset)}>
			<ImpersonationBanner />
			<PageTransition>
				<props.component {...props} />
			</PageTransition>
		</ErrorBoundary>
	);
};

const DeepLinkHandler = () => {
	const navigate = useNavigate();

	createEffect(() => {
		try {
			const launchParams = retrieveLaunchParams();
			const startParam = launchParams.tgWebAppStartParam;
			if (!startParam) return;

			if (startParam.startsWith('commands_')) {
				const groupId = startParam.substring('commands_'.length);
				if (groupId) navigate(`/group/${groupId}/commands`, { replace: true });
			} else if (startParam.startsWith('verify_')) {
				const groupId = startParam.substring('verify_'.length);
				if (groupId) navigate(`/group/${groupId}?verify_join=1&biometric=1`, { replace: true });
			} else if (startParam.startsWith('group_')) {
				const groupId = startParam.substring(6);
				if (groupId) navigate(`/group/${groupId}`, { replace: true });
			}
		} catch (e) {
			console.warn('[DeepLink] Failed to parse parameters or redirect:', e);
		}
	});

	return null;
};

const AppLayout = (props: { children?: any }) => {
	return (
		<>
			<DeepLinkHandler />
			{props.children}
		</>
	);
};

export function App() {
	return (
		<HashRouter root={AppLayout}>
			<For each={routes}>
				{(route) => (
					<Route
						path={route.path}
						component={(props) => <RouteWrapper component={route.Component} {...props} />}
					/>
				)}
			</For>
			<Route path="*" component={() => <Navigate href="/" />} />
		</HashRouter>
	);
}

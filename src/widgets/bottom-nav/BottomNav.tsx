import { A, useLocation } from '@solidjs/router';
import { Component } from 'solid-js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';

export const BottomNav: Component = () => {
	const location = useLocation();
	const txt = () => uiText();

	const isActive = (path: string) => {
		if (path === '/') return location.pathname === '/';
		if (path === '/dashboard') {
			return (
				location.pathname === '/dashboard' ||
				location.pathname.startsWith('/group/') ||
				location.pathname.startsWith('/bot/') ||
				location.pathname === '/managed-bots'
			);
		}
		return location.pathname === path || location.pathname.startsWith(`${path}/`);
	};

	const tabs = () => [
		{ path: '/', icon: 'home', label: txt().navHome },
		{ path: '/dashboard', icon: 'groups', label: txt().navManage },
		{ path: '/airdrop', icon: 'menu_book', label: txt().navSlot },
		{ path: '/profile', icon: 'person', label: txt().navProfile },
	];

	return (
		<nav aria-label="Navigation" class="tg-bottom-bar" dir={isRtl() ? 'rtl' : 'ltr'}>
			<div class="max-w-md mx-auto grid grid-cols-4 items-center h-14 px-2">
				{tabs().map((tab) => {
					const active = () => isActive(tab.path);
					return (
						<A
							href={tab.path}
							onClick={() => {
								try {
									haptic.selection();
								} catch {}
							}}
							class={`flex flex-col items-center justify-center h-full min-h-[48px] transition-colors ${
								active()
									? 'text-[var(--tg-button)]'
									: 'text-[var(--tg-hint)] hover:text-[var(--tg-text)]'
							}`}
						>
							<span
								class="material-symbols-outlined text-[23px]"
								style={{ 'font-variation-settings': active() ? '"FILL" 1' : '"FILL" 0' }}
							>
								{tab.icon}
							</span>
							<span class="text-[10.5px] font-semibold tracking-tight mt-0.5 truncate max-w-full px-1">
								{tab.label}
							</span>
						</A>
					);
				})}
			</div>
		</nav>
	);
};

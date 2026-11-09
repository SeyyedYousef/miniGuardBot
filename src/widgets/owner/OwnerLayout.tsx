import { useNavigate } from '@solidjs/router';
import type { Component, JSX } from 'solid-js';
import { isRtl } from '@/shared/i18n/index.js';
import { colorScheme, toggleThemeScheme } from '@/shared/lib/tg-theme.js';
import { ImpersonationBanner } from './ImpersonationBanner.js';
import { type OwnerTabId, OwnerTabs } from './OwnerTabs.js';

interface OwnerLayoutProps {
	children: JSX.Element;
	activeTab: OwnerTabId;
	title?: string;
}

export const OwnerLayout: Component<OwnerLayoutProps> = (props) => {
	const navigate = useNavigate();

	return (
		<div class="tg-canvas min-h-screen font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			<ImpersonationBanner />

			<header class="tg-header px-4 h-13 flex items-center justify-between gap-3">
				<div class="flex items-center gap-2.5 min-w-0">
					<button
						onClick={() => navigate('/profile')}
						class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)]"
					>
						<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
					</button>
					<div class="w-8 h-8 rounded-[9px] bg-[var(--tg-button)] flex items-center justify-center text-white shrink-0">
						<span class="material-symbols-outlined text-[18px]">shield_person</span>
					</div>
					<div class="flex flex-col min-w-0">
						<h1 class="text-[15px] font-bold text-[var(--tg-text)] truncate">
							{props.title || 'Owner Console'}
						</h1>
						<span class="text-[11px] text-[var(--tg-hint)] truncate">
							MiniGuard (@MiniGuardBot)
						</span>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						onClick={() => toggleThemeScheme()}
						class="w-8 h-8 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[var(--tg-link)] flex items-center justify-center"
					>
						<span class="material-symbols-outlined text-[18px]">
							{colorScheme() === 'dark' ? 'light_mode' : 'dark_mode'}
						</span>
					</button>

					<button
						onClick={() => {
							sessionStorage.removeItem('owner_token');
							sessionStorage.removeItem('owner_telegram_id');
							localStorage.removeItem('owner_token');
							localStorage.removeItem('owner_telegram_id');
							navigate('/profile');
						}}
						class="h-8 px-3 rounded-lg bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)] text-[12px] font-semibold flex items-center gap-1"
					>
						<span class="material-symbols-outlined text-[15px]">logout</span>
						<span>خروج</span>
					</button>
				</div>
			</header>

			<OwnerTabs active={props.activeTab} />

			<main class="p-4 max-w-5xl mx-auto pb-24">{props.children}</main>
		</div>
	);
};

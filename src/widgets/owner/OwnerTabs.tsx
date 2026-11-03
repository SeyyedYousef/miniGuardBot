import { useNavigate } from '@solidjs/router';
import { type Component, For, onMount } from 'solid-js';
import { haptic } from '@/shared/lib/haptic.js';

export type OwnerTabId =
	| 'dashboard'
	| 'entities'
	| 'users'
	| 'audit-logs'
	| 'settings'
	| 'broadcast'
	| 'finance'
	| 'health';

interface TabConfig {
	id: OwnerTabId;
	label: string;
	icon: string;
	path: string;
}

const TABS: TabConfig[] = [
	{ id: 'dashboard', label: 'داشبورد', icon: 'dashboard', path: '/owner/dashboard' },
	{ id: 'entities', label: 'گروه‌ها و بات‌ها', icon: 'groups', path: '/owner/entities' },
	{ id: 'users', label: 'مدیران گروه', icon: 'group', path: '/owner/users' },
	{ id: 'finance', label: 'اشتراک و استارز ⭐', icon: 'stars', path: '/owner/finance' },
	{ id: 'audit-logs', label: 'لاگ‌های امنیتی', icon: 'receipt_long', path: '/owner/audit-logs' },
	{ id: 'broadcast', label: 'ارسال همگانی', icon: 'campaign', path: '/owner/broadcast' },
	{ id: 'settings', label: 'تنظیمات پلتفرم', icon: 'settings', path: '/owner/settings' },
	{ id: 'health', label: 'سلامت سرور', icon: 'monitor_heart', path: '/owner/health' },
];

interface OwnerTabsProps {
	active: OwnerTabId;
}

export const OwnerTabs: Component<OwnerTabsProps> = (props) => {
	const navigate = useNavigate();
	let activeBtnRef: HTMLButtonElement | undefined;

	onMount(() => {
		if (activeBtnRef?.scrollIntoView) {
			activeBtnRef.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
		}
	});

	const handleNav = (path: string) => {
		try {
			haptic.impact('light');
		} catch {}
		navigate(path);
	};

	return (
		<nav
			aria-label="Owner Navigation"
			class="px-4 py-2.5 flex gap-1.5 overflow-x-auto border-b border-[var(--tg-separator)] bg-[var(--tg-header-bg)] backdrop-blur-xl select-none no-scrollbar"
		>
			<For each={TABS}>
				{(tab) => {
					const isActive = () => props.active === tab.id;
					return (
						<button
							ref={(el) => {
								if (isActive()) activeBtnRef = el;
							}}
							onClick={() => handleNav(tab.path)}
							class={`h-8 px-3 text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
								isActive()
									? 'bg-[var(--tg-button)] text-white'
									: 'bg-[var(--tg-section-bg)] text-[var(--tg-hint)] hover:text-[var(--tg-text)] border border-[var(--tg-separator)]'
							}`}
						>
							<span class="material-symbols-outlined text-[16px]">{tab.icon}</span>
							<span>{tab.label}</span>
						</button>
					);
				}}
			</For>
		</nav>
	);
};

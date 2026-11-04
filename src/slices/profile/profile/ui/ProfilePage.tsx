import { useNavigate } from '@solidjs/router';
import { backButton, initData } from '@tma.js/sdk-solid';
import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { useSecretTrigger } from '@/features/owner-gate/lib/useSecretTrigger.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import {
	getLanguageLabel,
	isRtl,
	locale,
	SUPPORTED_LANGUAGES,
	setLocale,
} from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { colorScheme, toggleThemeScheme } from '@/shared/lib/tg-theme.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';
import { OwnerGateModal } from '@/widgets/owner/OwnerGateModal.js';

export const ProfilePage: Component = () => {
	const secretTrigger = useSecretTrigger();
	const navigate = useNavigate();
	const txt = () => uiText();
	const [showLangMenu, setShowLangMenu] = createSignal(false);

	const tgUser = () => initData.user() as any;

	onMount(() => {
		try {
			backButton.hide();
		} catch {}
	});

	const handleNavigate = (path: string) => {
		try {
			haptic.impact('light');
		} catch {}
		navigate(path);
	};

	const displayName = () => {
		const u = tgUser();
		if (u?.first_name || u?.firstName) {
			return `${u.first_name || u.firstName} ${u.last_name || u.lastName || ''}`.trim();
		}
		return 'Telegram Admin';
	};

	const displayUsername = () => {
		const u = tgUser();
		return u?.username || 'admin';
	};

	const currentLanguageLabel = () => getLanguageLabel(locale());

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between">
					<h1 class="text-[17px] font-bold text-[var(--tg-text)]">{txt().profileTitle}</h1>
					<span
						dir="ltr"
						class="text-[12px] font-mono font-semibold text-[var(--tg-link)] bg-[var(--tg-accent-soft)] px-2.5 py-1 rounded-lg"
					>
						{txt().masterBotUsername}
					</span>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				{/* Native Telegram User Profile Card (with Secret Owner Trigger) */}
				<div
					onTouchStart={secretTrigger.onLogoPressStart}
					onTouchEnd={secretTrigger.onLogoPressEnd}
					onTouchCancel={secretTrigger.onLogoPressEnd}
					onMouseDown={secretTrigger.onLogoPressStart}
					onMouseUp={secretTrigger.onLogoPressEnd}
					onMouseLeave={secretTrigger.onLogoPressEnd}
					class="tg-section p-4 flex items-center gap-3.5 cursor-pointer"
				>
					<div class="w-14 h-14 rounded-full bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[22px] shrink-0">
						{displayName().charAt(0).toUpperCase()}
					</div>
					<div class="flex flex-col min-w-0">
						<h2 class="text-[17px] font-bold text-[var(--tg-text)] truncate">{displayName()}</h2>
						<span
							dir="ltr"
							class="text-[13px] text-[var(--tg-hint)] font-mono truncate text-start rtl:text-right"
						>
							@{displayUsername()}
						</span>
					</div>
				</div>

				{/* Telegram Settings Grouped List */}
				<div class="tg-section">
					{/* Dedicated Bots */}
					<button onClick={() => handleNavigate('/managed-bots')} class="tg-cell w-full text-start">
						<div class="tg-icon-box" style={{ 'background-color': '#007AFF' }}>
							<span class="material-symbols-outlined text-[18px]">smart_toy</span>
						</div>
						<span class="flex-1 text-[15px] font-medium text-[var(--tg-text)]">
							{txt().myBotsTitle}
						</span>
						<span class="material-symbols-outlined text-[var(--tg-hint)] rtl:rotate-180 text-[20px]">
							chevron_right
						</span>
					</button>

					{/* Theme Mode (Light / Dark) */}
					<button
						onClick={() => {
							haptic.impact('light');
							toggleThemeScheme();
						}}
						class="tg-cell w-full text-start"
					>
						<div class="tg-icon-box" style={{ 'background-color': '#5856D6' }}>
							<span class="material-symbols-outlined text-[18px]">
								{colorScheme() === 'dark' ? 'dark_mode' : 'light_mode'}
							</span>
						</div>
						<span class="flex-1 text-[15px] font-medium text-[var(--tg-text)]">
							{txt().themeTitle}
						</span>
						<span class="text-[14px] text-[var(--tg-link)] font-medium">
							{colorScheme() === 'dark' ? txt().themeDark : txt().themeLight}
						</span>
						<span class="material-symbols-outlined text-[var(--tg-hint)] rtl:rotate-180 text-[20px]">
							chevron_right
						</span>
					</button>

					{/* 17-Language Selector */}
					<button onClick={() => setShowLangMenu(true)} class="tg-cell w-full text-start">
						<div class="tg-icon-box" style={{ 'background-color': '#FF9500' }}>
							<span class="material-symbols-outlined text-[18px]">language</span>
						</div>
						<span class="flex-1 text-[15px] font-medium text-[var(--tg-text)]">
							{txt().langTitle}
						</span>
						<span class="text-[14px] text-[var(--tg-link)] font-medium">
							{currentLanguageLabel()}
						</span>
						<span class="material-symbols-outlined text-[var(--tg-hint)] rtl:rotate-180 text-[20px]">
							chevron_right
						</span>
					</button>

					{/* Settings */}
					<button
						onClick={() => handleNavigate('/profile/settings')}
						class="tg-cell w-full text-start"
					>
						<div class="tg-icon-box" style={{ 'background-color': '#8E8E93' }}>
							<span class="material-symbols-outlined text-[18px]">settings</span>
						</div>
						<span class="flex-1 text-[15px] font-medium text-[var(--tg-text)]">
							{txt().settingsTitle}
						</span>
						<span class="material-symbols-outlined text-[var(--tg-hint)] rtl:rotate-180 text-[20px]">
							chevron_right
						</span>
					</button>

					{/* Security */}
					<button
						onClick={() => handleNavigate('/profile/security')}
						class="tg-cell w-full text-start"
					>
						<div class="tg-icon-box" style={{ 'background-color': '#34C759' }}>
							<span class="material-symbols-outlined text-[18px]">security</span>
						</div>
						<span class="flex-1 text-[15px] font-medium text-[var(--tg-text)]">
							{txt().securityTitle}
						</span>
						<span class="material-symbols-outlined text-[var(--tg-hint)] rtl:rotate-180 text-[20px]">
							chevron_right
						</span>
					</button>
				</div>

				{/* Version Footer (Secret Owner Panel Trigger) */}
				<div class="mt-auto pt-3 pb-2 text-center">
					<span
						onClick={secretTrigger.onVersionTap}
						class="text-[12px] text-[var(--tg-hint)] cursor-pointer"
					>
						MiniGuard Platform v2.6 (@MiniGuardBot • Telegram Native)
					</span>
				</div>
			</main>

			<BottomNav />

			<OwnerGateModal
				isOpen={secretTrigger.showGate()}
				onClose={() => secretTrigger.setShowGate(false)}
			/>

			{/* 17-Language Selection Sheet */}
			<Show when={showLangMenu()}>
				<div
					class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-end justify-center"
					onClick={() => setShowLangMenu(false)}
				>
					<div
						class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-2 shadow-2xl border-t border-[var(--tg-separator)] max-h-[82dvh] overflow-y-auto"
						onClick={(e: Event) => e.stopPropagation()}
					>
						<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1 mb-2 shrink-0" />
						<h3 class="text-[16px] font-bold text-[var(--tg-text)] px-1 mb-1">{txt().langTitle}</h3>
						<div class="tg-section !bg-[var(--tg-secondary-bg)]">
							<For each={SUPPORTED_LANGUAGES}>
								{(lang) => (
									<button
										onClick={() => {
											setLocale(lang.code);
											try {
												haptic.selection();
											} catch {}
											setShowLangMenu(false);
										}}
										class="tg-cell w-full text-start justify-between"
									>
										<div class="flex items-center gap-3">
											<span class="text-[20px]">{lang.flag}</span>
											<div class="flex flex-col">
												<span class="text-[15px] font-medium text-[var(--tg-text)]">
													{lang.native}
												</span>
												<span class="text-[12px] text-[var(--tg-hint)]">{lang.label}</span>
											</div>
										</div>
										<Show when={locale() === lang.code}>
											<span class="material-symbols-outlined text-[var(--tg-button)] text-[22px]">
												check
											</span>
										</Show>
									</button>
								)}
							</For>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
};

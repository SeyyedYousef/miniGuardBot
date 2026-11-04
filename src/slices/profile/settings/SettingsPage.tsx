import { useNavigate } from '@solidjs/router';
import { type Component, For, Show } from 'solid-js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl, locale, SUPPORTED_LANGUAGES, setLocale, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { colorScheme, toggleThemeScheme } from '@/shared/lib/tg-theme.js';
import { useTelegramBackButton } from '@/shared/lib/useTelegramBackButton.js';
import { profileSettings, updateNotification, updateSetting } from '@/shared/store/profile.js';
import { ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

export const SettingsPage: Component = () => {
	const navigate = useNavigate();
	const txt = () => uiText();
	useTelegramBackButton(-1);

	const handleToggleHaptic = (checked: boolean) => {
		updateSetting('hapticEnabled', checked);
		if (checked) {
			try {
				haptic.impact('medium');
			} catch {}
		}
	};

	const handleToggleSound = (checked: boolean) => {
		updateSetting('soundEnabled', checked);
	};

	const handleToggleAnimations = (checked: boolean) => {
		updateSetting('autoPlayAnimations', checked);
	};

	const handleToggleCommunityAlerts = (checked: boolean) => {
		updateNotification('community', checked);
	};

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			<header class="tg-header px-4 h-13 flex items-center justify-between gap-2">
				<div class="max-w-md mx-auto w-full flex items-center gap-2 min-w-0">
					<button
						onClick={() => {
							haptic.impact('light');
							navigate('/profile');
						}}
						class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
					>
						<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
					</button>
					<h1 class="text-[16px] font-bold text-[var(--tg-text)] truncate">
						{txt().settingsTitle}
					</h1>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				{/* Smart PM Notifications & Daily Group Analytics */}
				<div>
					<div class="tg-section-header">{txt().notifSectionTitle}</div>
					<div class="tg-section">
						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3 min-w-0">
								<div class="tg-icon-box" style={{ 'background-color': '#007AFF' }}>
									<span class="material-symbols-outlined text-[18px]">monitoring</span>
								</div>
								<div class="flex flex-col min-w-0">
									<span class="text-[14.5px] font-semibold text-[var(--tg-text)] truncate">
										{txt().dailyPmReportTitle}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)] truncate">
										{txt().dailyPmReportSub}
									</span>
								</div>
							</div>
							<ToggleSwitch
								checked={profileSettings().dailyPmReportEnabled}
								onChange={(v) => {
									haptic.selection();
									updateSetting('dailyPmReportEnabled', v);
								}}
							/>
						</div>

						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3 min-w-0">
								<div class="tg-icon-box" style={{ 'background-color': '#FF3B30' }}>
									<span class="material-symbols-outlined text-[18px]">gpp_maybe</span>
								</div>
								<div class="flex flex-col min-w-0">
									<span class="text-[14.5px] font-semibold text-[var(--tg-text)] truncate">
										{txt().threatAlertsTitle}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)] truncate">
										{txt().threatAlertsSub}
									</span>
								</div>
							</div>
							<ToggleSwitch
								checked={profileSettings().threatAlertsEnabled}
								onChange={(v) => {
									haptic.selection();
									updateSetting('threatAlertsEnabled', v);
								}}
							/>
						</div>

						<button
							onClick={() => {
								haptic.notify('success');
								showToast(txt().testPmSentToast, 'success');
							}}
							class="tg-cell w-full text-start justify-center !text-[var(--tg-link)] font-semibold text-[13.5px]"
						>
							<span class="material-symbols-outlined text-[18px]">send</span>
							<span>{txt().sendTestPmBtn}</span>
						</button>
					</div>
				</div>

				{/* Theme & Interface */}
				<div>
					<div class="tg-section-header">{t('settings.general')}</div>
					<div class="tg-section">
						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3">
								<div class="tg-icon-box" style={{ 'background-color': '#5856D6' }}>
									<span class="material-symbols-outlined text-[18px]">
										{colorScheme() === 'dark' ? 'dark_mode' : 'light_mode'}
									</span>
								</div>
								<span class="text-[15px] font-medium text-[var(--tg-text)]">
									{txt().themeTitle} (
									{colorScheme() === 'dark' ? txt().themeDark : txt().themeLight})
								</span>
							</div>
							<ToggleSwitch
								checked={colorScheme() === 'dark'}
								onChange={() => {
									haptic.impact('light');
									toggleThemeScheme();
								}}
							/>
						</div>

						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3">
								<div class="tg-icon-box" style={{ 'background-color': '#007AFF' }}>
									<span class="material-symbols-outlined text-[18px]">vibration</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[15px] font-medium text-[var(--tg-text)]">
										{t('settings.hapticFeedback')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)]">{t('settings.hapticDesc')}</span>
								</div>
							</div>
							<ToggleSwitch
								checked={profileSettings().hapticEnabled}
								onChange={handleToggleHaptic}
							/>
						</div>

						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3">
								<div class="tg-icon-box" style={{ 'background-color': '#FF9500' }}>
									<span class="material-symbols-outlined text-[18px]">volume_up</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[15px] font-medium text-[var(--tg-text)]">
										{t('settings.soundEffects')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)]">{t('settings.soundDesc')}</span>
								</div>
							</div>
							<ToggleSwitch checked={profileSettings().soundEnabled} onChange={handleToggleSound} />
						</div>

						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3">
								<div class="tg-icon-box" style={{ 'background-color': '#34C759' }}>
									<span class="material-symbols-outlined text-[18px]">notifications</span>
								</div>
								<span class="text-[15px] font-medium text-[var(--tg-text)]">
									{t('settings.pushCommunity')}
								</span>
							</div>
							<ToggleSwitch
								checked={profileSettings().notifications.community}
								onChange={handleToggleCommunityAlerts}
							/>
						</div>

						<div class="tg-cell justify-between">
							<div class="flex items-center gap-3">
								<div class="tg-icon-box" style={{ 'background-color': '#AF52DE' }}>
									<span class="material-symbols-outlined text-[18px]">animation</span>
								</div>
								<span class="text-[15px] font-medium text-[var(--tg-text)]">
									{t('settings.animations')}
								</span>
							</div>
							<ToggleSwitch
								checked={profileSettings().autoPlayAnimations}
								onChange={handleToggleAnimations}
							/>
						</div>
					</div>
				</div>

				{/* 17-Language Selection */}
				<div>
					<div class="tg-section-header">{txt().langTitle}</div>
					<div class="tg-section">
						<For each={SUPPORTED_LANGUAGES}>
							{(lang) => (
								<button
									onClick={() => {
										haptic.selection();
										setLocale(lang.code);
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
			</main>
		</div>
	);
};

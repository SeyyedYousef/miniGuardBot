import { useNavigate } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { deleteAccountGDPR } from '@/shared/api/profile.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import {
	biometric,
	disableClosingConfirmation,
	showAlert,
	showConfirm,
} from '@/shared/lib/telegram-native.js';
import { profileSettings, updateSetting } from '@/shared/store/profile.js';
import { ToggleSwitch } from '@/shared/ui/settings-controls.js';

export const SecurityPage: Component = () => {
	const navigate = useNavigate();
	const txt = () => uiText();
	const [biometricsAvailable, setBiometricsAvailable] = createSignal(false);

	onMount(async () => {
		try {
			backButton.show();
			const off = backButton.onClick(() => {
				haptic.impact('light');
				navigate('/profile');
			});
			onCleanup(() => {
				off();
				try {
					backButton.hide();
					disableClosingConfirmation();
				} catch {}
			});

			const initResult = await biometric.init();
			if (initResult) {
				setBiometricsAvailable(biometric.isAvailable());
			}
		} catch {}
	});

	const handleToggleBiometrics = async () => {
		haptic.impact('medium');
		if (!biometricsAvailable()) {
			await showAlert(t('security.biometricNotSupported'));
			return;
		}

		const currentVal = profileSettings().biometricEnabled;
		if (!currentVal) {
			const accessGranted = await biometric.requestAccess(
				'Enable biometric lock for Group Management settings',
			);
			updateSetting('biometricEnabled', !!accessGranted);
		} else {
			updateSetting('biometricEnabled', false);
		}
	};

	const handleDeleteAccount = async () => {
		haptic.notify('warning');
		const confirmed = await showConfirm(t('security.deleteConfirm'));
		if (!confirmed) return;

		try {
			await deleteAccountGDPR();
			haptic.notify('success');
			localStorage.clear();
			await showAlert(t('security.deleteSuccess'));
			window.location.reload();
		} catch (e: any) {
			haptic.notify('error');
			await showAlert(t('security.deleteFailed', { error: e?.message || 'Error' }));
		}
	};

	return (
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			<header class="tg-header px-4 h-13 flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					<button
						onClick={() => {
							haptic.impact('light');
							navigate('/profile');
						}}
						class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
					>
						<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
					</button>
					<h1 class="text-[16px] font-bold text-[var(--tg-text)] truncate">{txt().securityTitle}</h1>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				{/* Biometric Protection */}
				<div>
					<div class="tg-section-header">{t('security.biometricTitle')}</div>
					<div class="tg-section p-4 flex flex-col gap-3">
						<div class="flex items-center justify-between gap-3">
							<div class="flex items-center gap-3 min-w-0">
								<div class="tg-icon-box" style={{ 'background-color': '#34C759' }}>
									<span class="material-symbols-outlined text-[18px]">fingerprint</span>
								</div>
								<div class="flex flex-col min-w-0">
									<span class="text-[15px] font-semibold text-[var(--tg-text)]">
										{t('security.biometricLock')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] mt-0.5">
										{t('security.biometricDesc')}
									</span>
								</div>
							</div>
							<ToggleSwitch
								checked={profileSettings().biometricEnabled}
								onChange={handleToggleBiometrics}
							/>
						</div>

						<Show when={!biometricsAvailable()}>
							<div class="text-[12px] text-[#FF9500] bg-[#FF9500]/10 rounded-lg px-3 py-2 font-medium">
								{t('security.biometricNotSupported')}
							</div>
						</Show>
					</div>
				</div>

				{/* Danger Zone (GDPR Data Wipe) */}
				<div>
					<div class="tg-section-header !text-[var(--tg-destructive)]">
						{t('security.dangerZone')}
					</div>
					<div class="tg-section p-4 flex flex-col gap-3.5">
						<div class="flex items-start gap-3">
							<div class="tg-icon-box" style={{ 'background-color': '#FF3B30' }}>
								<span class="material-symbols-outlined text-[18px]">delete_forever</span>
							</div>
							<div class="flex flex-col">
								<span class="text-[15px] font-semibold text-[var(--tg-destructive)]">
									{t('security.deleteAccount')}
								</span>
								<span class="text-[12px] text-[var(--tg-hint)] mt-0.5 leading-relaxed">
									{t('security.deleteDesc')}
								</span>
							</div>
						</div>

						<button
							onClick={handleDeleteAccount}
							class="w-full h-11 rounded-[10px] bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)] font-semibold text-[14px] flex items-center justify-center gap-1.5 active:opacity-75 transition-opacity"
						>
							<span class="material-symbols-outlined text-[19px]">warning</span>
							<span>{t('security.deleteAccount')}</span>
						</button>
					</div>
				</div>
			</main>
		</div>
	);
};

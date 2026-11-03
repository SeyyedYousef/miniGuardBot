import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { groupApi } from '@/shared/api/bot-management.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { NumberInputField } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

interface LimitsConfig {
	minMessageLength: number;
	maxMessageLength: number;
	floodMessages: number;
	floodWindow: number;
	duplicateCount: number;
	duplicateWindow: number;
}

const defaultConfig: LimitsConfig = {
	minMessageLength: 0,
	maxMessageLength: 1500,
	floodMessages: 5,
	floodWindow: 5,
	duplicateCount: 2,
	duplicateWindow: 10,
};

export const LimitsPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();

	const [isSaving, setIsSaving] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);

	const [limits, setLimits] = createStore<LimitsConfig>({ ...defaultConfig });

	createResource(
		() => params.id,
		async (groupId) => {
			const data = await groupApi.getSettings(groupId);
			setSettingsVersion(data.version);
			const remoteLimits = (data.limits || {}) as any;
			setLimits(
				reconcile({
					minMessageLength: remoteLimits.minMessageLength ?? 0,
					maxMessageLength: remoteLimits.maxMessageLength ?? 1500,
					floodMessages: remoteLimits.floodMessages ?? 5,
					floodWindow: remoteLimits.floodWindow ?? 5,
					duplicateCount: remoteLimits.duplicateCount ?? 2,
					duplicateWindow: remoteLimits.duplicateWindow ?? 10,
				}),
			);
			setIsDirty(false);
			return data;
		},
	);

	onMount(() => {
		try {
			backButton.show();
			const off = backButton.onClick(() => {
				haptic.impact('light');
				navigate(`/group/${params.id}`);
			});
			onCleanup(() => off());
		} catch {}
	});

	const updateField = (key: keyof LimitsConfig, value: number) => {
		setLimits(key, value);
		setIsDirty(true);
	};

	const handleSave = async () => {
		if (!isDirty()) return;
		haptic.notify('success');
		setIsSaving(true);
		try {
			const result = await groupApi.updateSettings(
				params.id,
				'limits',
				{ ...limits },
				settingsVersion(),
			);
			setSettingsVersion(result.version);
			setIsDirty(false);
			showToast(t('common.settingsSaved'), 'success');
			navigate(`/group/${params.id}`);
		} catch {
			showToast(t('common.errorUpdateFailed'), 'error');
			haptic.notify('error');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			<header class="tg-header px-4 h-13 flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					<button
						onClick={() => {
							haptic.impact('light');
							navigate(`/group/${params.id}`);
						}}
						class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
					>
						<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
					</button>
					<h1 class="text-[16px] font-bold text-[var(--tg-text)] truncate">
						{t('limitsSettings.title')}
					</h1>
				</div>

				<Show when={isDirty()}>
					<button
						onClick={handleSave}
						disabled={isSaving()}
						class="h-8 px-3.5 rounded-lg bg-[var(--tg-button)] text-white text-[13px] font-semibold"
					>
						{t('common.save')}
					</button>
				</Show>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				<div>
					<div class="tg-section-header">{t('limitsSettings.messageLength')}</div>
					<div class="tg-section p-4 flex flex-col gap-4">
						<NumberInputField
							label={t('limitsSettings.minLen')}
							description={t('limitsSettings.minLenDesc')}
							value={limits.minMessageLength}
							onChange={(v) => updateField('minMessageLength', v)}
							placeholder="0"
						/>
						<NumberInputField
							label={t('limitsSettings.maxLen')}
							description={t('limitsSettings.maxLenDesc')}
							value={limits.maxMessageLength}
							onChange={(v) => updateField('maxMessageLength', v)}
							placeholder="1500"
						/>
					</div>
				</div>

				<div>
					<div class="tg-section-header">{t('limitsSettings.floodControl')}</div>
					<div class="tg-section p-4 flex flex-col gap-4">
						<NumberInputField
							label={t('limitsSettings.floodMsgs')}
							description={t('limitsSettings.floodMsgsDesc')}
							value={limits.floodMessages}
							onChange={(v) => updateField('floodMessages', v)}
							placeholder="5"
						/>
						<NumberInputField
							label={t('limitsSettings.floodWin')}
							description={t('limitsSettings.floodWinDesc')}
							value={limits.floodWindow}
							onChange={(v) => updateField('floodWindow', v)}
							placeholder="5"
						/>
					</div>
				</div>

				<div>
					<div class="tg-section-header">{t('limitsSettings.duplicateProtection')}</div>
					<div class="tg-section p-4 flex flex-col gap-4">
						<NumberInputField
							label={t('limitsSettings.dupCount')}
							description={t('limitsSettings.dupCountDesc')}
							value={limits.duplicateCount}
							onChange={(v) => updateField('duplicateCount', v)}
							placeholder="2"
						/>
						<NumberInputField
							label={t('limitsSettings.dupWin')}
							description={t('limitsSettings.dupWinDesc')}
							value={limits.duplicateWindow}
							onChange={(v) => updateField('duplicateWindow', v)}
							placeholder="10"
						/>
					</div>
				</div>
			</main>

			<Show when={isDirty()}>
				<div class="fixed bottom-0 inset-x-0 p-4 bg-[var(--tg-header-bg)] backdrop-blur-xl border-t border-[var(--tg-separator)] z-40">
					<div class="max-w-md mx-auto">
						<button
							onClick={handleSave}
							disabled={isSaving()}
							class="tg-btn-primary w-full h-11 text-[15px] flex items-center justify-center gap-2"
						>
							<span class="material-symbols-outlined text-[20px]">check</span>
							<span>{t('generalSettings.saveSettings')}</span>
						</button>
					</div>
				</div>
			</Show>
		</div>
	);
};

import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { groupApi } from '@/shared/api/bot-management.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { NumberInputField, StringListField, ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

export const MandatoryPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();

	const [cfg, setCfg] = createStore({
		forcedAddEnabled: false,
		forcedAddCount: 0,
		forceJoinEnabled: false,
		requiredChannels: [] as string[],
		verificationEnabled: false,
		excludedUsers: [] as string[],
	});

	const [isDirty, setIsDirty] = createSignal(false);
	const [isSaving, setIsSaving] = createSignal(false);

	const [settingsData, { refetch }] = createResource(
		() => params.id,
		async (groupId) => {
			const res = await groupApi.getSettings(groupId);
			const mm = (res.mandatory_membership || {}) as any;
			setCfg(
				reconcile({
					forcedAddEnabled: mm.forced_add_enabled ?? false,
					forcedAddCount: mm.forced_add_count ?? 0,
					forceJoinEnabled: mm.force_join_enabled ?? false,
					requiredChannels: mm.required_channels ?? [],
					verificationEnabled: mm.verification_enabled ?? false,
					excludedUsers: mm.exemptions ?? [],
				}),
			);
			setIsDirty(false);
			return res;
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

	const updateCfg = (key: keyof typeof cfg, value: any) => {
		setCfg(key, value);
		setIsDirty(true);
	};

	const handleSave = async () => {
		if (!isDirty() || !settingsData()) return;
		haptic.notify('success');
		setIsSaving(true);
		try {
			await groupApi.updateSettings(
				params.id,
				'mandatory_membership',
				{
					forced_add_enabled: cfg.forcedAddEnabled,
					forced_add_count: cfg.forcedAddCount,
					force_join_enabled: cfg.forceJoinEnabled,
					required_channels: cfg.requiredChannels,
					verification_enabled: cfg.verificationEnabled,
					exemptions: cfg.excludedUsers,
				},
				settingsData()!.version,
			);
			setIsDirty(false);
			refetch();
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
						{t('mandatorySettings.title')}
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
				{/* Forced Member Invite */}
				<div class="tg-section p-4 flex flex-col gap-4">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<div class="tg-icon-box" style={{ 'background-color': '#007AFF' }}>
								<span class="material-symbols-outlined text-[18px]">person_add</span>
							</div>
							<span class="text-[15px] font-semibold text-[var(--tg-text)]">
								{t('mandatorySettings.forcedAdd')}
							</span>
						</div>
						<ToggleSwitch
							checked={cfg.forcedAddEnabled}
							onChange={(v) => updateCfg('forcedAddEnabled', v)}
						/>
					</div>

					<Show when={cfg.forcedAddEnabled}>
						<div class="pt-3 border-t border-[var(--tg-separator)]">
							<NumberInputField
								label={t('mandatorySettings.forcedAddCount')}
								description={t('mandatorySettings.forcedAddCountDesc')}
								value={cfg.forcedAddCount}
								onChange={(v) => updateCfg('forcedAddCount', v)}
								min={0}
								max={50}
							/>
						</div>
					</Show>
				</div>

				{/* Force Join Required Chats */}
				<div class="tg-section p-4 flex flex-col gap-4">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<div class="tg-icon-box" style={{ 'background-color': '#FF9500' }}>
								<span class="material-symbols-outlined text-[18px]">how_to_reg</span>
							</div>
							<span class="text-[15px] font-semibold text-[var(--tg-text)]">
								{t('mandatorySettings.forceJoin')}
							</span>
						</div>
						<ToggleSwitch
							checked={cfg.forceJoinEnabled}
							onChange={(v) => updateCfg('forceJoinEnabled', v)}
						/>
					</div>

					<Show when={cfg.forceJoinEnabled}>
						<div class="pt-3 border-t border-[var(--tg-separator)]">
							<StringListField
								label={t('mandatorySettings.reqChannels')}
								description={t('mandatorySettings.reqChannelsDesc')}
								placeholder="@username"
								items={cfg.requiredChannels}
								onAdd={(item) => updateCfg('requiredChannels', [...cfg.requiredChannels, item])}
								onRemove={(item) =>
									updateCfg(
										'requiredChannels',
										cfg.requiredChannels.filter((c) => c !== item),
									)
								}
							/>
						</div>
					</Show>
				</div>

				{/* Captcha Verification */}
				<div class="tg-section p-4 flex items-center justify-between gap-3">
					<div class="flex items-center gap-3 min-w-0">
						<div class="tg-icon-box" style={{ 'background-color': '#34C759' }}>
							<span class="material-symbols-outlined text-[18px]">verified_user</span>
						</div>
						<div class="flex flex-col min-w-0">
							<span class="text-[15px] font-semibold text-[var(--tg-text)]">
								{t('mandatorySettings.verification')}
							</span>
							<span class="text-[12px] text-[var(--tg-hint)] mt-0.5">
								{t('mandatorySettings.verificationDesc')}
							</span>
						</div>
					</div>
					<ToggleSwitch
						checked={cfg.verificationEnabled}
						onChange={(v) => updateCfg('verificationEnabled', v)}
					/>
				</div>

				{/* Exempt Users */}
				<div class="tg-section p-4 flex flex-col gap-3">
					<StringListField
						label={t('mandatorySettings.excludedUsers')}
						description={t('mandatorySettings.excludedUsersDesc')}
						placeholder="@username or User ID"
						items={cfg.excludedUsers}
						onAdd={(item) => updateCfg('excludedUsers', [...cfg.excludedUsers, item])}
						onRemove={(item) =>
							updateCfg(
								'excludedUsers',
								cfg.excludedUsers.filter((e) => e !== item),
							)
						}
					/>
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

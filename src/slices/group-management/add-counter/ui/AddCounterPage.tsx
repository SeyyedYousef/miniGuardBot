import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import {
	type Component,
	createResource,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import {
	type AddCounterConfig,
	type AddCounterLeaderboardEntry,
	groupApi,
} from '@/shared/api/bot-management.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { NumberInputField, StringListField, ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

const defaultAddCounterConfig: AddCounterConfig = {
	enabled: false,
	sendProgressMessage: true,
	sendCompletionMessage: true,
	requireTargetToChat: false,
	requiredCount: 0,
	preventDuplicateReadd: true,
	ignoreBots: true,
	countAdmins: true,
	countInviteLinks: false,
	autoDeleteSec: 45,
	resetPeriodDays: 0,
	leaderboardEnabled: true,
	exemptions: [],
};

export const AddCounterPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();

	const [isSaving, setIsSaving] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);
	const [isMutatingBoard, setIsMutatingBoard] = createSignal(false);
	const [manualUserId, setManualUserId] = createSignal('');
	const [manualCount, setManualCount] = createSignal('1');

	const [cfg, setCfg] = createStore<AddCounterConfig>({ ...defaultAddCounterConfig });
	const [stats, setStats] = createStore<{
		total_group_adds: number;
		tracked_users_count: number;
		completed_users_count: number;
		leaderboard: AddCounterLeaderboardEntry[];
	}>({
		total_group_adds: 0,
		tracked_users_count: 0,
		completed_users_count: 0,
		leaderboard: [],
	});

	const loadAll = async (groupId: string) => {
		const [settings, liveStats] = await Promise.all([
			groupApi.getSettings(groupId),
			groupApi.getAddCounterStats(groupId).catch(() => null),
		]);
		setSettingsVersion(settings.version || 1);
		const ac = ((settings as any).add_counter || {}) as Partial<AddCounterConfig>;
		const mm = (settings.mandatory_membership || {}) as Record<string, any>;
		setCfg(
			reconcile({
				enabled: Boolean(ac.enabled),
				sendProgressMessage: ac.sendProgressMessage !== false,
				sendCompletionMessage: ac.sendCompletionMessage !== false,
				requireTargetToChat:
					ac.requireTargetToChat !== undefined
						? Boolean(ac.requireTargetToChat)
						: Boolean(mm.forced_add_enabled),
				requiredCount: Number(ac.requiredCount ?? mm.forced_add_count ?? 0) || 0,
				preventDuplicateReadd: ac.preventDuplicateReadd !== false,
				ignoreBots: ac.ignoreBots !== false,
				countAdmins: ac.countAdmins !== false,
				countInviteLinks: Boolean(ac.countInviteLinks),
				autoDeleteSec: Math.max(0, Number(ac.autoDeleteSec ?? 45) || 0),
				resetPeriodDays: Math.max(0, Number(ac.resetPeriodDays ?? 0) || 0),
				leaderboardEnabled: ac.leaderboardEnabled !== false,
				exemptions: Array.isArray(ac.exemptions)
					? ac.exemptions
					: Array.isArray(mm.exemptions)
						? mm.exemptions
						: [],
			}),
		);
		if (liveStats) {
			setStats(
				reconcile({
					total_group_adds: liveStats.total_group_adds || 0,
					tracked_users_count: liveStats.tracked_users_count || 0,
					completed_users_count: liveStats.completed_users_count || 0,
					leaderboard: liveStats.leaderboard || [],
				}),
			);
		}
		setIsDirty(false);
		return settings;
	};

	const [resourceData, { refetch }] = createResource(() => params.id, loadAll);

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

	const updateCfg = <K extends keyof AddCounterConfig>(key: K, val: AddCounterConfig[K]) => {
		setCfg(key, val);
		setIsDirty(true);
	};

	const handleSave = async () => {
		if (!isDirty() || isSaving()) return;
		haptic.notify('success');
		setIsSaving(true);
		try {
			const res = await groupApi.updateSettings(
				params.id,
				'add_counter',
				{ ...cfg },
				settingsVersion(),
			);
			setSettingsVersion(res.version);
			setIsDirty(false);
			showToast(t('common.settingsSaved'), 'success');
			await refetch();
		} catch {
			showToast(t('common.errorUpdateFailed'), 'error');
			haptic.notify('error');
		} finally {
			setIsSaving(false);
		}
	};

	const syncBoardMetrics = (nextBoard: AddCounterLeaderboardEntry[]) => {
		setStats('leaderboard', nextBoard);
		setStats('tracked_users_count', nextBoard.length);
		setStats('completed_users_count', nextBoard.filter((u) => u.targetCompleted).length);
	};

	const handleResetAll = async () => {
		if (isMutatingBoard()) return;
		haptic.impact('medium');
		setIsMutatingBoard(true);
		try {
			const res = await groupApi.resetAddCounter(params.id);
			syncBoardMetrics(res.leaderboard || []);
			setStats('total_group_adds', res.total_group_adds || 0);
			showToast(t('common.settingsSaved'), 'success');
		} catch {
			showToast(t('common.errorUpdateFailed'), 'error');
		} finally {
			setIsMutatingBoard(false);
		}
	};

	const handleResetUser = async (userId: number) => {
		if (isMutatingBoard()) return;
		haptic.impact('light');
		setIsMutatingBoard(true);
		try {
			const res = await groupApi.resetAddCounter(params.id, userId);
			syncBoardMetrics(res.leaderboard || []);
			setStats('total_group_adds', res.total_group_adds || 0);
			showToast(t('common.settingsSaved'), 'success');
		} catch {
			showToast(t('common.errorUpdateFailed'), 'error');
		} finally {
			setIsMutatingBoard(false);
		}
	};

	const handleAdjustDelta = async (entry: AddCounterLeaderboardEntry, delta: number) => {
		if (isMutatingBoard()) return;
		haptic.impact('light');
		setIsMutatingBoard(true);
		try {
			const res = await groupApi.adjustAddCounter(params.id, {
				userId: entry.userId,
				delta,
				name: entry.name,
				username: entry.username,
			});
			syncBoardMetrics(res.leaderboard || []);
			if (delta > 0) {
				setStats('total_group_adds', (stats.total_group_adds || 0) + delta);
			}
		} catch {
			showToast(t('common.errorUpdateFailed'), 'error');
		} finally {
			setIsMutatingBoard(false);
		}
	};

	const handleManualApply = async () => {
		const uid = Number(manualUserId().trim());
		const countVal = Math.max(0, Number(manualCount().trim()) || 0);
		if (!Number.isFinite(uid) || uid <= 0 || isMutatingBoard()) {
			haptic.notify('error');
			return;
		}
		haptic.impact('medium');
		setIsMutatingBoard(true);
		try {
			const res = await groupApi.adjustAddCounter(params.id, {
				userId: uid,
				count: countVal,
			});
			syncBoardMetrics(res.leaderboard || []);
			setManualUserId('');
			showToast(t('common.settingsSaved'), 'success');
		} catch {
			showToast(t('common.errorUpdateFailed'), 'error');
		} finally {
			setIsMutatingBoard(false);
		}
	};

	return (
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			<header class="tg-header px-4 h-13 flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					<button
						type="button"
						onClick={() => {
							haptic.impact('light');
							navigate(`/group/${params.id}`);
						}}
						class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
					>
						<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
					</button>
					<h1 class="text-[16px] font-bold text-[var(--tg-text)] truncate">
						{t('addCounterSettings.title')}
					</h1>
				</div>

				<Show when={isDirty()}>
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving()}
						class="h-8 px-3.5 rounded-lg bg-[var(--tg-button)] text-white text-[13px] font-semibold"
					>
						{isSaving() ? '...' : t('common.save')}
					</button>
				</Show>
			</header>

			<Show
				when={!resourceData.loading}
				fallback={
					<div class="w-full max-w-md mx-auto p-4 flex flex-col gap-3">
						<div class="h-20 tg-section animate-pulse" />
						<div class="h-48 tg-section animate-pulse" />
					</div>
				}
			>
				<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
					{/* Summary Telemetry Strip */}
					<div class="grid grid-cols-3 gap-2.5">
						<div class="tg-section p-3 flex flex-col items-center justify-center text-center gap-0.5">
							<span class="text-[19px] font-extrabold text-[var(--tg-button)] tabular-nums">
								{stats.total_group_adds}
							</span>
							<span class="text-[11px] text-[var(--tg-hint)] font-medium">
								{t('addCounterSettings.statsTotalAdds')}
							</span>
						</div>
						<div class="tg-section p-3 flex flex-col items-center justify-center text-center gap-0.5">
							<span class="text-[19px] font-extrabold text-[var(--tg-text)] tabular-nums">
								{stats.tracked_users_count}
							</span>
							<span class="text-[11px] text-[var(--tg-hint)] font-medium">
								{t('addCounterSettings.statsTrackedUsers')}
							</span>
						</div>
						<div class="tg-section p-3 flex flex-col items-center justify-center text-center gap-0.5">
							<span class="text-[19px] font-extrabold text-emerald-500 tabular-nums">
								{stats.completed_users_count}
							</span>
							<span class="text-[11px] text-[var(--tg-hint)] font-medium">
								{t('addCounterSettings.statsCompletedUsers')}
							</span>
						</div>
					</div>

					{/* Section 1: Core Add-Counter Behavior */}
					<div>
						<div class="tg-section-header">{t('addCounterSettings.enableSection')}</div>
						<div class="tg-section flex flex-col divide-y divide-[var(--tg-separator)]">
							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14.5px] font-semibold text-[var(--tg-text)]">
										{t('addCounterSettings.enabled')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.enabledDesc')}
									</span>
								</div>
								<ToggleSwitch checked={cfg.enabled} onChange={(v) => updateCfg('enabled', v)} />
							</div>

							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.sendProgressMessage')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.sendProgressMessageDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.sendProgressMessage}
									onChange={(v) => updateCfg('sendProgressMessage', v)}
								/>
							</div>

							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.sendCompletionMessage')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.sendCompletionMessageDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.sendCompletionMessage}
									onChange={(v) => updateCfg('sendCompletionMessage', v)}
								/>
							</div>

							<div class="p-4 flex flex-col gap-3">
								<NumberInputField
									label={t('addCounterSettings.requiredCount')}
									description={t('addCounterSettings.requiredCountDesc')}
									value={cfg.requiredCount}
									onChange={(v) => updateCfg('requiredCount', Math.max(0, v))}
									min={0}
									max={500}
								/>
								<div class="flex flex-wrap items-center gap-1.5">
									<span class="text-[11px] text-[var(--tg-hint)] font-medium me-1">
										{t('addCounterSettings.quickPresets')}:
									</span>
									<For each={[0, 3, 5, 10, 20]}>
										{(preset) => (
											<button
												type="button"
												onClick={() => {
													haptic.impact('light');
													updateCfg('requiredCount', preset);
												}}
												class={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-colors ${
													cfg.requiredCount === preset
														? 'bg-[var(--tg-button)] text-white'
														: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] border border-[var(--tg-separator)]'
												}`}
											>
												{preset === 0 ? t('addCounterSettings.unlimitedMode') : preset}
											</button>
										)}
									</For>
								</div>
							</div>

							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.requireTargetToChat')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.requireTargetToChatDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.requireTargetToChat}
									onChange={(v) => updateCfg('requireTargetToChat', v)}
								/>
							</div>

							{/* Link to Custom Texts & Variable Editor */}
							<button
								type="button"
								onClick={() => {
									haptic.impact('light');
									navigate(`/group/${params.id}/settings/custom-texts`);
								}}
								class="tg-cell justify-between gap-3 py-3 text-start hover:bg-[var(--tg-secondary-bg)]/50 transition-colors"
							>
								<div class="flex items-center gap-2.5 min-w-0">
									<span class="material-symbols-outlined text-[20px] text-[var(--tg-button)] shrink-0">
										edit_note
									</span>
									<div class="flex flex-col min-w-0">
										<span class="text-[14px] font-semibold text-[var(--tg-link)]">
											{t('addCounterSettings.editTemplatesBtn')}
										</span>
										<span class="text-[11.5px] text-[var(--tg-hint)] leading-snug">
											{t('addCounterSettings.editTemplatesBtnDesc')}
										</span>
									</div>
								</div>
								<span class="material-symbols-outlined text-[18px] text-[var(--tg-hint)] rtl:rotate-180 shrink-0">
									chevron_right
								</span>
							</button>
						</div>
					</div>

					{/* Section 2: Accuracy, Anti-Cheat & Filtering */}
					<div>
						<div class="tg-section-header">{t('addCounterSettings.antiCheatSection')}</div>
						<div class="tg-section flex flex-col divide-y divide-[var(--tg-separator)]">
							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.preventDuplicateReadd')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.preventDuplicateReaddDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.preventDuplicateReadd}
									onChange={(v) => updateCfg('preventDuplicateReadd', v)}
								/>
							</div>

							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.ignoreBots')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.ignoreBotsDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.ignoreBots}
									onChange={(v) => updateCfg('ignoreBots', v)}
								/>
							</div>

							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.countAdmins')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.countAdminsDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.countAdmins}
									onChange={(v) => updateCfg('countAdmins', v)}
								/>
							</div>

							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.countInviteLinks')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.countInviteLinksDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.countInviteLinks}
									onChange={(v) => updateCfg('countInviteLinks', v)}
								/>
							</div>

							<div class="tg-cell justify-between gap-3 py-3">
								<div class="flex flex-col flex-1 min-w-0">
									<span class="text-[14px] font-medium text-[var(--tg-text)]">
										{t('addCounterSettings.leaderboardEnabled')}
									</span>
									<span class="text-[12px] text-[var(--tg-hint)] leading-snug mt-0.5">
										{t('addCounterSettings.leaderboardEnabledDesc')}
									</span>
								</div>
								<ToggleSwitch
									checked={cfg.leaderboardEnabled}
									onChange={(v) => updateCfg('leaderboardEnabled', v)}
								/>
							</div>

							<div class="p-4 flex flex-col gap-3">
								<NumberInputField
									label={t('addCounterSettings.autoDeleteSec')}
									description={t('addCounterSettings.autoDeleteSecDesc')}
									value={cfg.autoDeleteSec}
									onChange={(v) => updateCfg('autoDeleteSec', Math.max(0, v))}
									min={0}
									max={600}
								/>
								<div class="flex flex-wrap gap-1.5">
									<For each={[0, 15, 45, 60, 120]}>
										{(sec) => (
											<button
												type="button"
												onClick={() => {
													haptic.impact('light');
													updateCfg('autoDeleteSec', sec);
												}}
												class={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold ${
													cfg.autoDeleteSec === sec
														? 'bg-[var(--tg-button)] text-white'
														: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] border border-[var(--tg-separator)]'
												}`}
											>
												{sec === 0 ? t('addCounterSettings.keepForever') : `${sec}s`}
											</button>
										)}
									</For>
								</div>
							</div>

							<div class="p-4 flex flex-col gap-3">
								<NumberInputField
									label={t('addCounterSettings.resetPeriodDays')}
									description={t('addCounterSettings.resetPeriodDaysDesc')}
									value={cfg.resetPeriodDays}
									onChange={(v) => updateCfg('resetPeriodDays', Math.max(0, v))}
									min={0}
									max={365}
								/>
								<div class="flex flex-wrap gap-1.5">
									<For each={[0, 7, 30]}>
										{(days) => (
											<button
												type="button"
												onClick={() => {
													haptic.impact('light');
													updateCfg('resetPeriodDays', days);
												}}
												class={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold ${
													cfg.resetPeriodDays === days
														? 'bg-[var(--tg-button)] text-white'
														: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] border border-[var(--tg-separator)]'
												}`}
											>
												{days === 0 ? t('addCounterSettings.neverReset') : `${days}d`}
											</button>
										)}
									</For>
								</div>
							</div>

							<div class="p-4">
								<StringListField
									label={t('addCounterSettings.exemptions')}
									description={t('addCounterSettings.exemptionsDesc')}
									items={cfg.exemptions}
									onAdd={(item) => updateCfg('exemptions', [...cfg.exemptions, item])}
									onRemove={(item) =>
										updateCfg(
											'exemptions',
											cfg.exemptions.filter((x) => x !== item),
										)
									}
									placeholder="@username"
								/>
							</div>
						</div>
					</div>

					{/* Chat Commands Guide */}
					<div class="tg-section p-3.5 bg-[var(--tg-accent-soft)]/50 border border-[var(--tg-button)]/20 flex flex-col gap-1">
						<span class="text-[12.5px] font-bold text-[var(--tg-button)] flex items-center gap-1.5">
							<span class="material-symbols-outlined text-[16px]">terminal</span>
							{t('addCounterSettings.commandsHintTitle')}
						</span>
						<span class="text-[11.5px] text-[var(--tg-text)] leading-relaxed">
							{t('addCounterSettings.commandsHintBody')}
						</span>
					</div>

					{/* Section 3: Leaderboard & Manual Control */}
					<div>
						<div class="flex items-center justify-between px-1 mb-1.5">
							<span class="tg-section-header !mb-0">
								{t('addCounterSettings.leaderboardTitle')}
							</span>
							<Show when={stats.leaderboard.length > 0}>
								<button
									type="button"
									onClick={handleResetAll}
									disabled={isMutatingBoard()}
									class="text-[11.5px] font-semibold text-red-500 active:opacity-70"
								>
									{t('addCounterSettings.resetAllBtn')}
								</button>
							</Show>
						</div>

						<div class="tg-section p-4 flex flex-col gap-3">
							<span class="text-[11.5px] text-[var(--tg-hint)]">
								{t('addCounterSettings.leaderboardSub')}
							</span>

							<Show
								when={stats.leaderboard.length > 0}
								fallback={
									<div class="py-5 text-center text-[12.5px] text-[var(--tg-hint)]">
										{t('addCounterSettings.leaderboardEmpty')}
									</div>
								}
							>
								<div class="flex flex-col divide-y divide-[var(--tg-separator)]">
									<For each={stats.leaderboard}>
										{(entry) => (
											<div class="py-2.5 flex items-center justify-between gap-2">
												<div class="flex items-center gap-2.5 min-w-0 flex-1">
													<span class="w-6 text-center text-[13px] font-bold shrink-0">
														{entry.rank === 1
															? '🥇'
															: entry.rank === 2
																? '🥈'
																: entry.rank === 3
																	? '🥉'
																	: `#${entry.rank}`}
													</span>
													<div class="flex flex-col min-w-0">
														<div class="flex items-center gap-1.5">
															<span class="text-[13.5px] font-semibold text-[var(--tg-text)] truncate">
																{entry.name}
															</span>
															<Show when={entry.targetCompleted}>
																<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">
																	{t('addCounterSettings.targetCompletedBadge')}
																</span>
															</Show>
														</div>
														<span class="text-[11px] text-[var(--tg-hint)]">
															{entry.username ? `@${entry.username}` : `ID: ${entry.userId}`} •{' '}
															{t('addCounterSettings.lifetimeLabel')}: {entry.lifetimeCount}
														</span>
													</div>
												</div>

												<div class="flex items-center gap-1.5 shrink-0">
													<span class="text-[13px] font-extrabold text-[var(--tg-button)] tabular-nums min-w-[36px] text-center">
														{cfg.requiredCount > 0
															? `${entry.count}/${cfg.requiredCount}`
															: `${entry.count}`}
													</span>
													<button
														type="button"
														onClick={() => handleAdjustDelta(entry, -1)}
														disabled={isMutatingBoard()}
														class="w-7 h-7 rounded-lg bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[12px] font-bold text-[var(--tg-text)]"
													>
														-
													</button>
													<button
														type="button"
														onClick={() => handleAdjustDelta(entry, 1)}
														disabled={isMutatingBoard()}
														class="w-7 h-7 rounded-lg bg-[var(--tg-accent-soft)] text-[12px] font-bold text-[var(--tg-button)]"
													>
														+
													</button>
													<button
														type="button"
														onClick={() => handleResetUser(entry.userId)}
														disabled={isMutatingBoard()}
														class="h-7 px-2 rounded-lg text-[11px] font-semibold text-red-500 bg-red-500/10"
													>
														{t('addCounterSettings.resetUserBtn')}
													</button>
												</div>
											</div>
										)}
									</For>
								</div>
							</Show>

							{/* Manual Adjust / Add User Counter */}
							<div class="pt-3 border-t border-[var(--tg-separator)] flex flex-col gap-2">
								<span class="text-[12px] font-semibold text-[var(--tg-text)]">
									{t('addCounterSettings.manualAddUserTitle')}
								</span>
								<div class="flex items-center gap-2">
									<input
										type="number"
										value={manualUserId()}
										onInput={(e) => setManualUserId(e.currentTarget.value)}
										placeholder={t('addCounterSettings.manualUserIdPlaceholder')}
										dir="ltr"
										class="flex-1 h-9 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[12.5px] rounded-lg px-2.5 focus:outline-none focus:border-[var(--tg-button)]"
									/>
									<input
										type="number"
										value={manualCount()}
										onInput={(e) => setManualCount(e.currentTarget.value)}
										placeholder={t('addCounterSettings.manualCountPlaceholder')}
										dir="ltr"
										class="w-16 h-9 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[12.5px] rounded-lg px-2 text-center focus:outline-none focus:border-[var(--tg-button)]"
									/>
									<button
										type="button"
										onClick={handleManualApply}
										disabled={isMutatingBoard()}
										class="h-9 px-3 rounded-lg bg-[var(--tg-button)] text-white text-[12px] font-semibold shrink-0"
									>
										{t('addCounterSettings.manualApplyBtn')}
									</button>
								</div>
							</div>
						</div>
					</div>
				</main>
			</Show>

			{/* Floating Bottom Save Bar */}
			<Show when={isDirty()}>
				<div class="fixed bottom-0 inset-x-0 z-30 p-4 bg-[var(--tg-section-bg)] border-t border-[var(--tg-separator)]">
					<div class="max-w-md mx-auto">
						<button
							type="button"
							onClick={handleSave}
							disabled={isSaving()}
							class="w-full h-11 rounded-xl bg-[var(--tg-button)] text-white text-[14.5px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform"
						>
							<Show when={isSaving()} fallback={<span>{t('common.save')}</span>}>
								<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							</Show>
						</button>
					</div>
				</div>
			</Show>
		</div>
	);
};

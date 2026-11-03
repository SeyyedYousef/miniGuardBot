import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { groupApi } from '@/shared/api/bot-management.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { SettingsSection } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

interface QuietPeriod {
	id: string;
	start: string;
	end: string;
}
interface QuietHoursConfig {
	emergencyLock: boolean;
	adminOverride: boolean;
	sendNotifications: boolean;
	periods: QuietPeriod[];
}

const defaultConfig: QuietHoursConfig = {
	emergencyLock: false,
	adminOverride: true,
	sendNotifications: true,
	periods: [],
};

export const QuietHoursPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();

	const [isSaving, setIsSaving] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);
	const [overlapWarning, setOverlapWarning] = createSignal('');

	const [config, setConfig] = createStore<QuietHoursConfig>({ ...defaultConfig });

	createResource(
		() => params.id,
		async (groupId) => {
			const data = await groupApi.getSettings(groupId);
			setSettingsVersion(data.version);
			const qh = (data.quiet_hours || {}) as Partial<QuietHoursConfig>;
			setConfig(reconcile({ ...defaultConfig, ...qh }));
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

	const isTimeInPeriod = (time: string, start: string, end: string) => {
		if (start < end) return time >= start && time <= end;
		return time >= start || time <= end;
	};

	const checkOverlaps = (periods: QuietPeriod[]) => {
		const getMinutes = (timeStr: string): number => {
			const [h, m] = timeStr.split(':').map(Number);
			return h * 60 + m;
		};

		const getIntervals = (startStr: string, endStr: string): { start: number; end: number }[] => {
			const start = getMinutes(startStr);
			const end = getMinutes(endStr);
			if (start < end) return [{ start, end }];
			else if (start > end)
				return [
					{ start, end: 1440 },
					{ start: 0, end },
				];
			else return [{ start: 0, end: 1440 }];
		};

		const isOverlap = (
			i1: { start: number; end: number },
			i2: { start: number; end: number },
		): boolean => {
			return i1.start < i2.end && i2.start < i1.end;
		};

		for (let i = 0; i < periods.length; i++) {
			const intervalsA = getIntervals(periods[i].start, periods[i].end);
			for (let j = i + 1; j < periods.length; j++) {
				const intervalsB = getIntervals(periods[j].start, periods[j].end);
				for (const intA of intervalsA) {
					for (const intB of intervalsB) {
						if (isOverlap(intA, intB)) {
							setOverlapWarning(t('quietHoursSettings.periodOverlap'));
							return;
						}
					}
				}
			}
		}
		setOverlapWarning('');
	};

	const isCurrentlyQuiet = () => {
		if (config.emergencyLock) return true;
		const now = new Date();
		const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
		return config.periods.some((p) => isTimeInPeriod(currentTime, p.start, p.end));
	};

	const addPeriod = () => {
		haptic.impact('medium');
		const newPeriod: QuietPeriod = { id: crypto.randomUUID(), start: '23:00', end: '07:00' };
		const updated = [...config.periods, newPeriod];
		setConfig('periods', updated);
		setIsDirty(true);
		checkOverlaps(updated);
	};

	const removePeriod = (id: string) => {
		haptic.impact('light');
		const updated = config.periods.filter((p) => p.id !== id);
		setConfig('periods', updated);
		setIsDirty(true);
		checkOverlaps(updated);
	};

	const updatePeriod = (id: string, field: 'start' | 'end', value: string) => {
		const updated = config.periods.map((p) => (p.id === id ? { ...p, [field]: value } : p));
		setConfig('periods', updated);
		setIsDirty(true);
		checkOverlaps(updated);
	};

	const handleSave = async () => {
		if (overlapWarning() || !isDirty()) return;
		haptic.notify('success');
		setIsSaving(true);
		try {
			const result = await groupApi.updateSettings(
				params.id,
				'quiet_hours',
				config as any,
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
						{t('quietHoursSettings.title')}
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
				{/* Status Card */}
				<div class="tg-section p-4 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div
							class="tg-icon-box"
							style={{
								'background-color': isCurrentlyQuiet() ? '#FF3B30' : '#34C759',
							}}
						>
							<span class="material-symbols-outlined text-[18px]">
								{isCurrentlyQuiet() ? 'lock' : 'lock_open'}
							</span>
						</div>
						<div class="flex flex-col">
							<span class="text-[15px] font-semibold text-[var(--tg-text)]">
								{isCurrentlyQuiet()
									? t('quietHoursSettings.groupLocked')
									: t('quietHoursSettings.groupActive')}
							</span>
							<span class="text-[12px] text-[var(--tg-hint)] font-mono">
								{t('quietHoursSettings.serverTime')}:{' '}
								{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</span>
						</div>
					</div>
				</div>

				{/* Emergency Lock & Notifications */}
				<div class="tg-section p-4 flex flex-col gap-3">
					<SettingsSection
						title={t('quietHoursSettings.emergencyLock')}
						description={t('quietHoursSettings.emergencyLockDesc')}
						enabled={config.emergencyLock}
						onToggle={(val) => {
							setConfig('emergencyLock', val);
							setIsDirty(true);
						}}
					/>

					<SettingsSection
						title={t('quietHoursSettings.sendMessages')}
						description={t('quietHoursSettings.sendMessagesDesc')}
						enabled={config.sendNotifications}
						onToggle={(val) => {
							setConfig('sendNotifications', val);
							setIsDirty(true);
						}}
						hasEditText={true}
						onEditText={() => navigate(`/group/${params.id}/settings/custom-texts`)}
					/>
				</div>

				{/* Scheduled Quiet Periods */}
				<div>
					<div class="tg-section-header">{t('quietHoursSettings.quietPeriods')}</div>
					<div class="flex flex-col gap-2.5">
						<For each={config.periods}>
							{(period) => (
								<div class="tg-section p-3.5 flex items-center justify-between gap-2">
									<div class="flex items-center gap-2.5">
										<div class="flex flex-col gap-1">
											<span class="text-[11px] text-[var(--tg-hint)]">
												{t('quietHoursSettings.start')}
											</span>
											<input
												type="time"
												value={period.start}
												onChange={(e) => updatePeriod(period.id, 'start', e.currentTarget.value)}
												class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-lg px-2.5 py-1.5 text-[14px] text-[var(--tg-text)] font-mono"
												dir="ltr"
											/>
										</div>
										<span class="material-symbols-outlined text-[var(--tg-hint)] mt-4 text-[18px]">
											arrow_forward
										</span>
										<div class="flex flex-col gap-1">
											<span class="text-[11px] text-[var(--tg-hint)]">
												{t('quietHoursSettings.end')}
											</span>
											<input
												type="time"
												value={period.end}
												onChange={(e) => updatePeriod(period.id, 'end', e.currentTarget.value)}
												class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-lg px-2.5 py-1.5 text-[14px] text-[var(--tg-text)] font-mono"
												dir="ltr"
											/>
										</div>
									</div>

									<button
										onClick={() => removePeriod(period.id)}
										class="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--tg-destructive)]/10 text-[var(--tg-destructive)] mt-4"
									>
										<span class="material-symbols-outlined text-[19px]">delete</span>
									</button>
								</div>
							)}
						</For>

						<button
							onClick={addPeriod}
							class="tg-btn-secondary w-full h-11 text-[14px] flex items-center justify-center gap-1.5"
						>
							<span class="material-symbols-outlined text-[19px]">add_circle</span>
							<span>{t('quietHoursSettings.addPeriod')}</span>
						</button>

						<Show when={overlapWarning()}>
							<div class="text-[12px] text-[var(--tg-destructive)] bg-[var(--tg-destructive)]/10 rounded-xl px-3.5 py-2.5">
								{overlapWarning()}
							</div>
						</Show>
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

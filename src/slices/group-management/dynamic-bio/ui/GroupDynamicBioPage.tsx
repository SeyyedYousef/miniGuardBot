import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';
import { groupApi } from '@/shared/api/bot-management.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { SelectField, ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

export const GroupDynamicBioPage: Component = () => {
	const params = useParams();
	const navigate = useNavigate();

	const [bioTemplate, setBioTemplate] = createSignal('');
	const [nameTemplate, setNameTemplate] = createSignal('');
	const [interval, setIntervalVal] = createSignal('10m');
	const [enabled, setEnabled] = createSignal(false);
	const [displayInName, setDisplayInName] = createSignal(false);
	const [isSaving, setIsSaving] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);

	const [settings, { mutate }] = createResource(
		() => params.id,
		async (id) => {
			const s = await groupApi.getSettings(id);
			setSettingsVersion(s.version);
			return s;
		},
	);

	createEffect(() => {
		const data = settings();
		if (data) {
			try {
				let dbio = data.dynamic_bio;
				if (typeof dbio === 'string') dbio = JSON.parse(dbio);
				if (dbio && typeof dbio === 'object') {
					const obj = dbio as Record<string, any>;
					if ('enabled' in obj) setEnabled(!!obj.enabled);
					if ('bioTemplate' in obj) setBioTemplate(String(obj.bioTemplate || ''));
					if ('displayInName' in obj) setDisplayInName(!!obj.displayInName);
					if ('nameTemplate' in obj) setNameTemplate(String(obj.nameTemplate || ''));
					if ('interval' in obj) setIntervalVal(String(obj.interval || '10m'));
				}
			} catch {}
		}
	});

	const variables = () => [
		{ tag: '$members', desc: t('channelDynamicBio.varMembers') },
		{ tag: '$time', desc: t('channelDynamicBio.varTime') },
		{ tag: '$date', desc: t('channelDynamicBio.varDate') },
		{ tag: '$day_name', desc: t('channelDynamicBio.varDayName') },
	];

	const handleSave = async () => {
		haptic.impact('medium');
		setIsSaving(true);
		const payload = {
			enabled: enabled(),
			bioTemplate: bioTemplate(),
			displayInName: displayInName(),
			nameTemplate: nameTemplate(),
			interval: interval(),
		};

		try {
			const res = await groupApi.updateSettings(
				params.id,
				'dynamic_bio',
				payload,
				settingsVersion(),
			);
			if (res?.version) setSettingsVersion(res.version);
			mutate((prev: any) => (prev ? { ...prev, dynamic_bio: payload } : { dynamic_bio: payload }));
			haptic.notify('success');
			showToast(t('common.settingsSaved'), 'success');
			navigate(`/group/${params.id}`);
		} catch {
			haptic.notify('error');
			showToast(t('common.saveFailed'), 'error');
		} finally {
			setIsSaving(false);
		}
	};

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
						{t('channelDynamicBio.title')}
					</h1>
				</div>

				<button
					onClick={handleSave}
					disabled={isSaving()}
					class="h-8 px-3.5 rounded-lg bg-[var(--tg-button)] text-white text-[13px] font-semibold"
				>
					{t('common.save')}
				</button>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-4">
				<div class="tg-section p-4 flex flex-col gap-4">
					<div class="flex items-center justify-between gap-3">
						<div class="flex flex-col">
							<span class="text-[15px] font-semibold text-[var(--tg-text)]">
								{t('channelDynamicBio.title')}
							</span>
							<span class="text-[12px] text-[var(--tg-hint)] mt-0.5">
								{t('channelDynamicBio.subtitle2')}
							</span>
						</div>
						<ToggleSwitch
							checked={enabled()}
							onChange={(v) => {
								haptic.impact('light');
								setEnabled(v);
							}}
						/>
					</div>

					<Show when={enabled()}>
						<div class="flex flex-col gap-2 pt-3 border-t border-[var(--tg-separator)]">
							<label class="text-[13px] font-semibold text-[var(--tg-text)] flex justify-between">
								<span>{t('channelDynamicBio.currentBio')}</span>
								<span class="text-[11px] font-mono text-[var(--tg-hint)]">
									{bioTemplate().length}/255
								</span>
							</label>
							<textarea
								value={bioTemplate()}
								onInput={(e) => setBioTemplate(e.currentTarget.value)}
								class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 w-full min-h-[84px] focus:outline-none focus:border-[var(--tg-button)] resize-none"
								placeholder="Official Group | Members: $members"
								maxLength={255}
							/>
						</div>

						<div class="flex flex-wrap gap-1.5">
							<For each={variables()}>
								{(v) => (
									<button
										onClick={() => {
											haptic.impact('light');
											if (bioTemplate().length + v.tag.length <= 255) {
												setBioTemplate(`${bioTemplate()} ${v.tag}`.trim());
											}
										}}
										class="bg-[var(--tg-accent-soft)] text-[var(--tg-link)] px-2.5 py-1 rounded-lg text-[12px] font-mono font-semibold"
									>
										{v.tag}
									</button>
								)}
							</For>
						</div>

						<div class="pt-2 border-t border-[var(--tg-separator)] flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-[14px] font-medium text-[var(--tg-text)]">
									{t('channelDynamicBio.displayInName')}
								</span>
								<ToggleSwitch checked={displayInName()} onChange={setDisplayInName} />
							</div>

							<Show when={displayInName()}>
								<input
									type="text"
									value={nameTemplate()}
									onInput={(e) => setNameTemplate(e.currentTarget.value)}
									placeholder="Group Name $time"
									class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-lg px-3 focus:outline-none focus:border-[var(--tg-button)]"
									maxLength={128}
								/>
							</Show>
						</div>

						<SelectField
							label={t('channelDynamicBio.updateInterval')}
							value={interval()}
							onChange={setIntervalVal}
							options={[
								{ value: '10m', label: t('channelDynamicBio.interval10m') },
								{ value: '30m', label: t('channelDynamicBio.interval30m') },
								{ value: '1h', label: t('channelDynamicBio.interval1h') },
								{ value: '24h', label: t('channelDynamicBio.interval24h') },
							]}
						/>
					</Show>
				</div>
			</main>

			<div class="fixed bottom-0 inset-x-0 p-4 bg-[var(--tg-header-bg)] backdrop-blur-xl border-t border-[var(--tg-separator)] z-40">
				<div class="max-w-md mx-auto">
					<button
						onClick={handleSave}
						disabled={isSaving()}
						class="tg-btn-primary w-full h-11 text-[15px] flex items-center justify-center gap-2"
					>
						<span class="material-symbols-outlined text-[20px]">check</span>
						<span>{t('common.save')}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

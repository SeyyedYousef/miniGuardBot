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

	const [currentTitle, setCurrentTitle] = createSignal('');
	const [currentDescription, setCurrentDescription] = createSignal('');
	const [membersCount, setMembersCount] = createSignal(1);
	const [bioTemplate, setBioTemplate] = createSignal('');
	const [nameTemplate, setNameTemplate] = createSignal('');
	const [interval, setIntervalVal] = createSignal('10m');
	const [enabled, setEnabled] = createSignal(false);
	const [displayInName, setDisplayInName] = createSignal(false);
	const [isSaving, setIsSaving] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);

	const [profileData, { refetch: refetchProfile }] = createResource(
		() => params.id,
		async (id) => {
			try {
				return await groupApi.getGroupProfile(id);
			} catch {
				const g = await groupApi.getGroup(id).catch(() => null);
				return {
					group_id: id,
					current_title: g?.chat_title || 'گروه تلگرام',
					current_description: '',
					members_count: g?.members_count || 1,
					dynamic_bio: {
						enabled: false,
						title_template: g?.chat_title || '',
						bio_template: '',
					},
				};
			}
		},
	);

	const [settings, { mutate }] = createResource(
		() => params.id,
		async (id) => {
			const s = await groupApi.getSettings(id);
			setSettingsVersion(s.version);
			return s;
		},
	);

	createEffect(() => {
		const prof = profileData();
		if (prof) {
			if (prof.current_title) {
				setCurrentTitle(prof.current_title);
				if (!nameTemplate()) setNameTemplate(prof.current_title);
			}
			if (typeof prof.current_description === 'string') {
				setCurrentDescription(prof.current_description);
				if (!bioTemplate()) setBioTemplate(prof.current_description);
			}
			if (prof.members_count) {
				setMembersCount(prof.members_count);
			}
			if (prof.dynamic_bio) {
				setEnabled(Boolean(prof.dynamic_bio.enabled));
				if (prof.dynamic_bio.title_template) {
					setNameTemplate(prof.dynamic_bio.title_template);
				}
				if (prof.dynamic_bio.bio_template) {
					setBioTemplate(prof.dynamic_bio.bio_template);
				}
			}
		}
	});

	createEffect(() => {
		const data = settings();
		if (data) {
			try {
				let dbio = data.dynamic_bio;
				if (typeof dbio === 'string') dbio = JSON.parse(dbio);
				if (dbio && typeof dbio === 'object') {
					const obj = dbio as Record<string, any>;
					if ('enabled' in obj) setEnabled(!!obj.enabled);
					if (obj.bioTemplate || obj.bio_template) {
						setBioTemplate(String(obj.bioTemplate || obj.bio_template || ''));
					}
					if ('displayInName' in obj) setDisplayInName(!!obj.displayInName);
					if (obj.nameTemplate || obj.title_template) {
						setNameTemplate(String(obj.nameTemplate || obj.title_template || ''));
					}
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

	const renderPreviewText = (raw: string) => {
		if (!raw) return '—';
		const now = new Date();
		const timeStr = new Intl.DateTimeFormat('fa-IR', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		}).format(now);
		const dateStr = new Intl.DateTimeFormat('fa-IR', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(now);
		const dayStr = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(now);
		return raw
			.replace(/\$members/g, membersCount().toLocaleString('fa-IR'))
			.replace(/\$time/g, timeStr)
			.replace(/\$date/g, dateStr)
			.replace(/\$day_name/g, dayStr);
	};

	const handleSave = async () => {
		haptic.impact('medium');
		setIsSaving(true);
		const finalTitle =
			enabled() && displayInName() && nameTemplate().trim()
				? nameTemplate().trim()
				: currentTitle().trim();
		const finalBio =
			enabled() && bioTemplate().trim() ? bioTemplate().trim() : currentDescription().trim();

		const payload = {
			enabled: enabled(),
			bioTemplate: finalBio,
			bio_template: finalBio,
			displayInName: displayInName(),
			nameTemplate: finalTitle,
			title_template: finalTitle,
			interval: interval(),
		};

		try {
			const profRes = await groupApi.updateGroupProfile(params.id, {
				current_title: finalTitle,
				current_description: finalBio,
				dynamic_bio: {
					enabled: enabled(),
					title_template: finalTitle,
					bio_template: finalBio,
					append_time_to_title: displayInName(),
				},
			});

			const res = await groupApi.updateSettings(
				params.id,
				'dynamic_bio',
				payload,
				settingsVersion(),
			);
			if (res?.version) setSettingsVersion(res.version);
			mutate((prev: any) => (prev ? { ...prev, dynamic_bio: payload } : { dynamic_bio: payload }));
			await refetchProfile();
			haptic.notify('success');
			if (profRes?.warning) {
				showToast(profRes.warning, 'info');
			} else {
				showToast('نام و بیوگرافی گروه با موفقیت ذخیره و در تلگرام بروزرسانی شد ✅', 'success');
			}
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
				{/* 1. Direct Current Telegram Group Title & Bio Editor */}
				<div class="tg-section p-4 flex flex-col gap-3.5">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[20px] text-[var(--tg-link)]">
								edit_note
							</span>
							<div class="flex flex-col">
								<span class="text-[14px] font-bold text-[var(--tg-text)]">
									نام و بیوگرافی فعلی گروه در تلگرام
								</span>
								<span class="text-[11px] text-[var(--tg-hint)] mt-0.5">
									اطلاعات فعلی گروه شما از تلگرام خوانده شده و مستقیماً از همین‌جا قابل ویرایش است
								</span>
							</div>
						</div>
						<Show when={!profileData.loading}>
							<span class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
								{membersCount().toLocaleString('fa-IR')} عضو
							</span>
						</Show>
					</div>

					{/* Current Group Name */}
					<div class="flex flex-col gap-1.5 pt-2 border-t border-[var(--tg-separator)]">
						<label class="text-[12px] font-semibold text-[var(--tg-text)] flex items-center justify-between">
							<span>نام فعلی گروه (Group Title)</span>
							<span class="text-[10px] font-mono text-[var(--tg-hint)]">
								{currentTitle().length}/128
							</span>
						</label>
						<input
							type="text"
							value={currentTitle()}
							onInput={(e) => {
								setCurrentTitle(e.currentTarget.value);
								if (!displayInName()) setNameTemplate(e.currentTarget.value);
							}}
							placeholder="نام گروه در تلگرام..."
							class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] font-medium rounded-xl px-3 focus:outline-none focus:border-[var(--tg-button)]"
							maxLength={128}
						/>
					</div>

					{/* Current Group Bio / Description */}
					<div class="flex flex-col gap-1.5">
						<label class="text-[12px] font-semibold text-[var(--tg-text)] flex items-center justify-between">
							<span>بیوگرافی / توضیحات فعلی گروه (Bio / Description)</span>
							<span class="text-[10px] font-mono text-[var(--tg-hint)]">
								{currentDescription().length}/255
							</span>
						</label>
						<textarea
							value={currentDescription()}
							onInput={(e) => {
								setCurrentDescription(e.currentTarget.value);
								if (!enabled()) setBioTemplate(e.currentTarget.value);
							}}
							class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 w-full min-h-[84px] focus:outline-none focus:border-[var(--tg-button)] resize-none leading-relaxed"
							placeholder="توضیحات یا قوانین کوتاه بیوگرافی گروه را وارد کنید..."
							maxLength={255}
						/>
					</div>

					<p class="text-[11px] text-[var(--tg-hint)] leading-relaxed">
						💡 برای اعمال مستقیم نام و بیوگرافی در تلگرام، ربات اختصاصی باید در گروه دسترسی{' '}
						<span class="font-semibold text-[var(--tg-text)]">Change Group Info</span> داشته باشد.
					</p>
				</div>

				{/* 2. Dynamic Bio & Name Variables Engine */}
				<div class="tg-section p-4 flex flex-col gap-4">
					<div class="flex items-center justify-between gap-3">
						<div class="flex flex-col">
							<span class="text-[14px] font-bold text-[var(--tg-text)]">
								{t('channelDynamicBio.title')}
							</span>
							<span class="text-[11px] text-[var(--tg-hint)] mt-0.5">
								{t('channelDynamicBio.subtitle2')}
							</span>
						</div>
						<ToggleSwitch
							checked={enabled()}
							onChange={(v) => {
								haptic.impact('light');
								setEnabled(v);
								if (v && !bioTemplate().trim() && currentDescription().trim()) {
									setBioTemplate(currentDescription());
								}
							}}
						/>
					</div>

					<Show when={enabled()}>
						<div class="flex flex-col gap-2 pt-3 border-t border-[var(--tg-separator)]">
							<label class="text-[13px] font-semibold text-[var(--tg-text)] flex justify-between">
								<span>قالب داینامیک بیوگرافی گروه</span>
								<span class="text-[11px] font-mono text-[var(--tg-hint)]">
									{bioTemplate().length}/255
								</span>
							</label>
							<textarea
								value={bioTemplate()}
								onInput={(e) => {
									setBioTemplate(e.currentTarget.value);
									setCurrentDescription(e.currentTarget.value);
								}}
								class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 w-full min-h-[84px] focus:outline-none focus:border-[var(--tg-button)] resize-none"
								placeholder="مثلاً: گروه رسمی | اعضای فعال: $members | بروزرسانی: $time"
								maxLength={255}
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<span class="text-[11px] text-[var(--tg-hint)]">افزودن متغیر هوشمند با یک لمس:</span>
							<div class="flex flex-wrap gap-1.5">
								<For each={variables()}>
									{(v) => (
										<button
											type="button"
											onClick={() => {
												haptic.impact('light');
												if (bioTemplate().length + v.tag.length <= 255) {
													const next = `${bioTemplate()} ${v.tag}`.trim();
													setBioTemplate(next);
													setCurrentDescription(next);
												}
											}}
											class="bg-[var(--tg-accent-soft)] text-[var(--tg-link)] px-2.5 py-1 rounded-lg text-[12px] font-mono font-semibold active:opacity-70"
										>
											{v.tag}
										</button>
									)}
								</For>
							</div>
						</div>

						<div class="pt-2 border-t border-[var(--tg-separator)] flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-[13px] font-medium text-[var(--tg-text)]">
									{t('channelDynamicBio.displayInName')}
								</span>
								<ToggleSwitch
									checked={displayInName()}
									onChange={(v) => {
										setDisplayInName(v);
										if (v && !nameTemplate().trim() && currentTitle().trim()) {
											setNameTemplate(`${currentTitle()} | $time`);
										}
									}}
								/>
							</div>

							<Show when={displayInName()}>
								<input
									type="text"
									value={nameTemplate()}
									onInput={(e) => {
										setNameTemplate(e.currentTarget.value);
										setCurrentTitle(e.currentTarget.value);
									}}
									placeholder="نام گروه | 🕒 $time"
									class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-lg px-3 focus:outline-none focus:border-[var(--tg-button)]"
									maxLength={128}
								/>
							</Show>
						</div>

						{/* Live Resolved Preview */}
						<div class="p-3 rounded-xl bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] flex flex-col gap-1.5">
							<span class="text-[11px] font-bold text-[var(--tg-link)]">
								پیش‌نمایش زنده در تلگرام:
							</span>
							<div class="text-[13px] font-bold text-[var(--tg-text)]">
								{renderPreviewText(
									displayInName() && nameTemplate() ? nameTemplate() : currentTitle(),
								)}
							</div>
							<div class="text-[12px] text-[var(--tg-hint)] whitespace-pre-wrap leading-relaxed">
								{renderPreviewText(bioTemplate() || currentDescription())}
							</div>
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

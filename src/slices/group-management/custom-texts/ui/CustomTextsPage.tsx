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
import { groupApi } from '@/shared/api/bot-management.js';
import { getMinimalCustomTexts, uiText } from '@/shared/i18n/group-ui.js';
import { isRtl, locale, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { InlineButtonField } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

interface CustomTextsConfig {
	welcomeText: string;
	warningText: string;
	silenceStartText: string;
	silenceEndText: string;
	rulesText: string;
	forceJoinText: string;
	forceAddText: string;
	addCounterText: string;
	addCounterCompleteText: string;
	inlineButtons: { id: string; title: string; url: string }[];
}

type TextFieldKey = keyof Omit<CustomTextsConfig, 'inlineButtons'>;

function formatCustomTextPreview(template: string, groupTitle: string): string {
	const raw = String(template || '');
	return raw
		.replace(/\{user\}|\{name\}|\{mention\}/gi, 'علی رضایی')
		.replace(/\{username\}/gi, '@ali_rezaei')
		.replace(/\{id\}/gi, '5076130392')
		.replace(/\{group\}/gi, groupTitle || 'گروه نمونه')
		.replace(/\{time\}/gi, '14:30')
		.replace(/\{date\}/gi, '1405/08/23')
		.replace(/\{added\}/gi, '3')
		.replace(/\{lifetime_added\}/gi, '7')
		.replace(/\{remain\}|\{remainadd\}/gi, '2')
		.replace(/\{target\}|\{number\}/gi, '5')
		.replace(/\{just_added\}/gi, '1')
		.replace(/\{added_users\}/gi, 'سارا احمدی')
		.replace(/\{percent\}/gi, '60')
		.replace(/\{progress_bar\}/gi, '🟩🟩🟩🟩🟩⬜⬜⬜')
		.replace(/\{rank\}/gi, '2')
		.replace(/\{total_group_adds\}/gi, '29')
		.replace(/\{count\}/gi, '1')
		.replace(/\{threshold\}/gi, '3')
		.replace(/\{reason\}|\{rule\}/gi, 'ارسال لینک')
		.replace(/\{channel_names\}/gi, '@MiniGuardChannel');
}

const LEGACY_DEFAULT_STRINGS = new Set([
	'👋 Welcome {user}',
	'⚠️ {user} | Warning {count}/{threshold} ▫️ {reason}',
	'🔒 Quiet mode activated',
	'🔓 Quiet mode deactivated',
	'📜 Rules: Respect others • No spam or links',
	'📢 {user}, join required channels to chat:\n{channel_names}',
	'👥 {user}, invite {remainadd} member(s) to chat ({added}/{number})',
]);

export const CustomTextsPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();
	const txt = () => uiText();
	const minDefaults = () => getMinimalCustomTexts(locale());

	const [isSaving, setIsSaving] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);

	const [cfg, setCfg] = createStore<CustomTextsConfig>({
		welcomeText: minDefaults().welcomeText,
		warningText: minDefaults().warningText,
		silenceStartText: minDefaults().silenceStartText,
		silenceEndText: minDefaults().silenceEndText,
		rulesText: minDefaults().rulesText,
		forceJoinText: minDefaults().forceJoinText,
		forceAddText: minDefaults().forceAddText,
		addCounterText: minDefaults().addCounterText,
		addCounterCompleteText: minDefaults().addCounterCompleteText,
		inlineButtons: [],
	});

	createResource(
		() => params.id,
		async (groupId) => {
			const data = await groupApi.getSettings(groupId);
			setSettingsVersion(data.version);
			const groupLang = (data.general as any)?.language || locale();
			const localizedDefaults = getMinimalCustomTexts(groupLang);
			const ct = (data.custom_texts || {}) as Partial<CustomTextsConfig>;

			const resolveField = (saved: string | undefined, fallback: string) => {
				if (!saved?.trim() || LEGACY_DEFAULT_STRINGS.has(saved.trim())) {
					return fallback;
				}
				return saved;
			};

			// Filter out legacy platform promo button if it was auto-populated in user settings
			const cleanButtons = (ct.inlineButtons || []).filter(
				(b) => !b.url?.includes('t.me/MiniGuardBot') && !b.title?.includes('@MiniGuardBot'),
			);

			setCfg(
				reconcile({
					welcomeText: resolveField(ct.welcomeText, localizedDefaults.welcomeText),
					warningText: resolveField(ct.warningText, localizedDefaults.warningText),
					silenceStartText: resolveField(ct.silenceStartText, localizedDefaults.silenceStartText),
					silenceEndText: resolveField(ct.silenceEndText, localizedDefaults.silenceEndText),
					rulesText: resolveField(ct.rulesText, localizedDefaults.rulesText),
					forceJoinText: resolveField(ct.forceJoinText, localizedDefaults.forceJoinText),
					forceAddText: resolveField(ct.forceAddText, localizedDefaults.forceAddText),
					addCounterText: resolveField(ct.addCounterText, localizedDefaults.addCounterText),
					addCounterCompleteText: resolveField(
						ct.addCounterCompleteText,
						localizedDefaults.addCounterCompleteText,
					),
					inlineButtons: cleanButtons,
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

	const [activeField, setActiveField] = createSignal<TextFieldKey>('addCounterText');
	const groupTitle = () => 'گروه نمونه';
	const fieldRefs: Partial<Record<TextFieldKey, HTMLTextAreaElement>> = {};

	const update = (key: keyof CustomTextsConfig, val: any) => {
		setCfg(key, val);
		setIsDirty(true);
	};

	const insertPlaceholder = (tag: string) => {
		haptic.impact('light');
		const field = activeField();
		const el = fieldRefs[field];
		const currentVal = String(cfg[field] || '');
		if (el && typeof el.selectionStart === 'number') {
			const start = el.selectionStart;
			const end = el.selectionEnd ?? start;
			const nextVal = `${currentVal.slice(0, start)}${tag}${currentVal.slice(end)}`;
			update(field, nextVal);
			requestAnimationFrame(() => {
				el.focus();
				const cursor = start + tag.length;
				el.setSelectionRange(cursor, cursor);
			});
			return;
		}
		const needsSpace = currentVal.length > 0 && !/\s$/.test(currentVal);
		update(field, `${currentVal}${needsSpace ? ' ' : ''}${tag}`);
	};

	const resetToMinimalDefaults = () => {
		haptic.impact('medium');
		const d = minDefaults();
		setCfg(
			reconcile({
				welcomeText: d.welcomeText,
				warningText: d.warningText,
				silenceStartText: d.silenceStartText,
				silenceEndText: d.silenceEndText,
				rulesText: d.rulesText,
				forceJoinText: d.forceJoinText,
				forceAddText: d.forceAddText,
				addCounterText: d.addCounterText,
				addCounterCompleteText: d.addCounterCompleteText,
				inlineButtons: cfg.inlineButtons,
			}),
		);
		setIsDirty(true);
	};

	const handleSave = async () => {
		if (!isDirty()) return;
		haptic.notify('success');
		setIsSaving(true);
		try {
			const result = await groupApi.updateSettings(
				params.id,
				'custom_texts',
				cfg as any,
				settingsVersion(),
			);
			setSettingsVersion(result.version);
			setIsDirty(false);
			showToast(t('common.settingsSaved'), 'success');
			navigate(`/group/${params.id}`);
		} catch {
			showToast(t('error.title'), 'error');
			haptic.notify('error');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			<header class="tg-header px-4 h-13 flex items-center justify-between gap-2">
				<div class="max-w-md mx-auto w-full flex items-center justify-between gap-2">
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
							{txt().modTextsTitle}
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
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-4">
				{/* Interactive Variables Reference + Minimal Reset */}
				<div class="tg-section p-3.5 flex flex-col gap-3">
					<div class="flex items-center justify-between gap-2">
						<div class="flex flex-col">
							<span class="text-[12.5px] font-bold text-[var(--tg-text)]">
								{t('customTextsSettings.placeholders')}
							</span>
							<span class="text-[11px] text-[var(--tg-hint)]">
								{t('customTextsSettings.tapToInsert')}
							</span>
						</div>
						<button
							type="button"
							onClick={resetToMinimalDefaults}
							class="text-[11.5px] font-semibold text-[var(--tg-link)] flex items-center gap-1 active:opacity-70 shrink-0"
						>
							<span class="material-symbols-outlined text-[15px]">restart_alt</span>
							<span>{minDefaults().resetToDefaultLabel}</span>
						</button>
					</div>

					{/* Add-Counter Variables */}
					<div class="flex flex-col gap-1.5">
						<span class="text-[11px] font-bold text-[var(--tg-button)]">
							{t('customTextsSettings.addCounterVarsGroup')}
						</span>
						<div class="flex flex-wrap gap-1.5">
							<For
								each={[
									{ tag: '{added}', title: t('customTextsSettings.phAdded') },
									{ tag: '{remain}', title: t('customTextsSettings.phRemain') },
									{ tag: '{target}', title: t('customTextsSettings.phTarget') },
									{ tag: '{just_added}', title: t('customTextsSettings.phJustAdded') },
									{ tag: '{added_users}', title: t('customTextsSettings.phAddedUsers') },
									{ tag: '{percent}', title: t('customTextsSettings.phPercent') },
									{ tag: '{progress_bar}', title: t('customTextsSettings.phProgressBar') },
									{ tag: '{rank}', title: t('customTextsSettings.phRank') },
									{ tag: '{total_group_adds}', title: t('customTextsSettings.phTotalGroupAdds') },
									{ tag: '{lifetime_added}', title: t('customTextsSettings.phLifetimeAdded') },
									{ tag: '{remainadd}', title: t('customTextsSettings.phRemainAdd') },
									{ tag: '{number}', title: t('customTextsSettings.phNumber') },
								]}
							>
								{(item) => (
									<button
										type="button"
										title={item.title}
										onClick={() => insertPlaceholder(item.tag)}
										class="inline-flex items-center gap-1 bg-[var(--tg-accent-soft)] hover:opacity-90 active:scale-95 transition-transform px-2 py-1 rounded-lg border border-[var(--tg-button)]/20"
									>
										<code class="text-[var(--tg-link)] font-mono text-[11px] font-bold" dir="ltr">
											{item.tag}
										</code>
										<span class="text-[10px] text-[var(--tg-hint)] max-w-[130px] truncate">
											{item.title.replace(/\s*\([^)]*\)/, '')}
										</span>
									</button>
								)}
							</For>
						</div>
					</div>

					{/* General Variables */}
					<div class="flex flex-col gap-1.5 pt-1 border-t border-[var(--tg-separator)]">
						<span class="text-[11px] font-semibold text-[var(--tg-hint)]">
							{t('customTextsSettings.generalVarsGroup')}
						</span>
						<div class="flex flex-wrap gap-1.5" dir="ltr">
							<For
								each={[
									{ tag: '{user}', title: t('customTextsSettings.phUser') },
									{ tag: '{mention}', title: t('customTextsSettings.phMention') },
									{ tag: '{username}', title: t('customTextsSettings.phUsername') },
									{ tag: '{id}', title: t('customTextsSettings.phId') },
									{ tag: '{group}', title: t('customTextsSettings.phGroup') },
									{ tag: '{time}', title: t('customTextsSettings.phTime') },
									{ tag: '{date}', title: t('customTextsSettings.phDate') },
									{ tag: '{reason}', title: t('customTextsSettings.phReason') },
									{ tag: '{count}', title: t('customTextsSettings.phCount') },
									{ tag: '{threshold}', title: t('customTextsSettings.phThreshold') },
									{ tag: '{channel_names}', title: t('customTextsSettings.phChannelNames') },
								]}
							>
								{(item) => (
									<button
										type="button"
										title={item.title}
										onClick={() => insertPlaceholder(item.tag)}
										class="bg-[var(--tg-secondary-bg)] hover:opacity-90 active:scale-95 transition-transform px-2 py-0.5 rounded-md border border-[var(--tg-separator)]"
									>
										<code class="text-[var(--tg-link)] font-mono text-[11px] font-semibold">
											{item.tag}
										</code>
									</button>
								)}
							</For>
						</div>
					</div>
				</div>

				{/* Add-Counter Custom Texts + Live Telegram Preview */}
				<div class="tg-section p-4 flex flex-col gap-3.5 border border-[var(--tg-button)]/25">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-[20px] text-[var(--tg-button)]">
								group_add
							</span>
							<span class="text-[14px] font-bold text-[var(--tg-text)]">
								{t('addCounterSettings.title')}
							</span>
						</div>
						<button
							type="button"
							onClick={() => navigate(`/group/${params.id}/add-counter`)}
							class="text-[11.5px] font-semibold text-[var(--tg-link)] bg-[var(--tg-accent-soft)] px-2.5 py-1 rounded-lg active:scale-95 transition-transform"
						>
							{t('addCounterSettings.enableSection')}
						</button>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.addCounterText')}
						</label>
						<span class="text-[11px] text-[var(--tg-hint)]">
							{t('customTextsSettings.addCounterTextDesc')}
						</span>
						<textarea
							ref={(el) => {
								fieldRefs.addCounterText = el;
							}}
							onFocus={() => setActiveField('addCounterText')}
							value={cfg.addCounterText}
							onInput={(e) => update('addCounterText', e.currentTarget.value)}
							rows={3}
							class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[var(--tg-button)] resize-y"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.addCounterCompleteText')}
						</label>
						<span class="text-[11px] text-[var(--tg-hint)]">
							{t('customTextsSettings.addCounterCompleteTextDesc')}
						</span>
						<textarea
							ref={(el) => {
								fieldRefs.addCounterCompleteText = el;
							}}
							onFocus={() => setActiveField('addCounterCompleteText')}
							value={cfg.addCounterCompleteText}
							onInput={(e) => update('addCounterCompleteText', e.currentTarget.value)}
							rows={2}
							class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[var(--tg-button)] resize-y"
						/>
					</div>

					{/* Live Sample Preview Box */}
					<div class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl p-3 flex flex-col gap-1.5">
						<div class="flex items-center justify-between text-[11px]">
							<span class="font-bold text-[var(--tg-text)] flex items-center gap-1">
								<span class="material-symbols-outlined text-[14px] text-[var(--tg-button)]">
									visibility
								</span>
								{t('customTextsSettings.livePreview')}
							</span>
							<span class="text-[var(--tg-hint)]">{t('customTextsSettings.livePreviewSub')}</span>
						</div>
						<div class="text-[12.5px] leading-relaxed text-[var(--tg-text)] whitespace-pre-line bg-[var(--tg-section-bg)] rounded-lg px-3 py-2 border border-[var(--tg-separator)]">
							{formatCustomTextPreview(
								activeField() === 'addCounterCompleteText'
									? cfg.addCounterCompleteText
									: cfg.addCounterText,
								groupTitle(),
							)}
						</div>
					</div>
				</div>

				{/* Minimal Localized Group Message Templates */}
				<div class="tg-section p-4 flex flex-col gap-3.5">
					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.welcomeText')}
						</label>
						<textarea
							ref={(el) => {
								fieldRefs.welcomeText = el;
							}}
							onFocus={() => setActiveField('welcomeText')}
							value={cfg.welcomeText}
							onInput={(e) => update('welcomeText', e.currentTarget.value)}
							rows={2}
							class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.warningText')}
						</label>
						<textarea
							ref={(el) => {
								fieldRefs.warningText = el;
							}}
							onFocus={() => setActiveField('warningText')}
							value={cfg.warningText}
							onInput={(e) => update('warningText', e.currentTarget.value)}
							rows={2}
							class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.rulesText')}
						</label>
						<textarea
							ref={(el) => {
								fieldRefs.rulesText = el;
							}}
							onFocus={() => setActiveField('rulesText')}
							value={cfg.rulesText}
							onInput={(e) => update('rulesText', e.currentTarget.value)}
							rows={2}
							class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{minDefaults().forceJoinLabel}
						</label>
						<textarea
							ref={(el) => {
								fieldRefs.forceJoinText = el;
							}}
							onFocus={() => setActiveField('forceJoinText')}
							value={cfg.forceJoinText}
							onInput={(e) => update('forceJoinText', e.currentTarget.value)}
							rows={2}
							class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{minDefaults().forceAddLabel}
						</label>
						<textarea
							ref={(el) => {
								fieldRefs.forceAddText = el;
							}}
							onFocus={() => setActiveField('forceAddText')}
							value={cfg.forceAddText}
							onInput={(e) => update('forceAddText', e.currentTarget.value)}
							rows={2}
							class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div class="flex flex-col gap-1">
							<label class="text-[13px] font-semibold text-[var(--tg-text)]">
								{t('customTextsSettings.silenceStartText')}
							</label>
							<input
								type="text"
								onFocus={() => setActiveField('silenceStartText')}
								value={cfg.silenceStartText}
								onInput={(e) => update('silenceStartText', e.currentTarget.value)}
								class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl px-3 focus:outline-none focus:border-[var(--tg-button)]"
							/>
						</div>

						<div class="flex flex-col gap-1">
							<label class="text-[13px] font-semibold text-[var(--tg-text)]">
								{t('customTextsSettings.silenceEndText')}
							</label>
							<input
								type="text"
								onFocus={() => setActiveField('silenceEndText')}
								value={cfg.silenceEndText}
								onInput={(e) => update('silenceEndText', e.currentTarget.value)}
								class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl px-3 focus:outline-none focus:border-[var(--tg-button)]"
							/>
						</div>
					</div>
				</div>

				{/* Optional Welcome Inline Buttons */}
				<div class="tg-section p-4 flex flex-col">
					<InlineButtonField
						label={t('customTextsSettings.inlineButtons')}
						description={t('customTextsSettings.inlineButtonsDesc')}
						buttons={cfg.inlineButtons}
						onAdd={(btn) => update('inlineButtons', [...cfg.inlineButtons, btn])}
						onRemove={(id) =>
							update(
								'inlineButtons',
								cfg.inlineButtons.filter((b) => b.id !== id),
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

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
	inlineButtons: { id: string; title: string; url: string }[];
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
				if (!saved || !saved.trim() || LEGACY_DEFAULT_STRINGS.has(saved.trim())) {
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

	const update = (key: keyof CustomTextsConfig, val: any) => {
		setCfg(key, val);
		setIsDirty(true);
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
				{/* Dynamic Variables Reference + Minimal Reset */}
				<div class="tg-section p-3.5 flex flex-col gap-2.5">
					<div class="flex items-center justify-between gap-2">
						<span class="text-[12.5px] font-bold text-[var(--tg-text)]">
							{t('customTextsSettings.placeholders')}
						</span>
						<button
							type="button"
							onClick={resetToMinimalDefaults}
							class="text-[11.5px] font-semibold text-[var(--tg-link)] flex items-center gap-1 active:opacity-70"
						>
							<span class="material-symbols-outlined text-[15px]">restart_alt</span>
							<span>{minDefaults().resetToDefaultLabel}</span>
						</button>
					</div>
					<div class="flex flex-wrap gap-1.5" dir="ltr">
						<For
							each={[
								'{user}',
								'{id}',
								'{group}',
								'{time}',
								'{reason}',
								'{count}',
								'{threshold}',
								'{channel_names}',
								'{remainadd}',
								'{added}',
								'{number}',
							]}
						>
							{(tag) => (
								<code class="text-[var(--tg-link)] font-mono text-[11px] font-semibold bg-[var(--tg-accent-soft)] px-2 py-0.5 rounded-md">
									{tag}
								</code>
							)}
						</For>
					</div>
				</div>

				{/* Minimal Localized Group Message Templates */}
				<div class="tg-section p-4 flex flex-col gap-3.5">
					<div class="flex flex-col gap-1">
						<label class="text-[13.5px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.welcomeText')}
						</label>
						<textarea
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

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
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl, t } from '@/shared/i18n/index.js';
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
	botStartText: string;
	inlineButtons: { id: string; title: string; url: string }[];
}

const defaults: CustomTextsConfig = {
	welcomeText: '👋 Welcome {user}',
	warningText: '⚠️ {user} | Warning {count}/{threshold} ▫️ {reason}',
	silenceStartText: '🔒 Quiet mode activated',
	silenceEndText: '🔓 Quiet mode deactivated',
	rulesText: '📜 Rules: Respect others • No spam or links',
	forceJoinText: '📢 {user}, join required channels to chat:\n{channel_names}',
	forceAddText: '👥 {user}, invite {remainadd} member(s) to chat ({added}/{number})',
	botStartText:
		'🛡️ سلام {user} عزیز!\nمن ربات اختصاصی مدیریت گروه «{group}» هستم.\n\n⚡ این ربات توسط @MiniGuardBot ساخته شده است! اگر می‌خواهید یک ربات مدیریت گروه با نام دلخواه و بیش از ۱۰۰ قابلیت پیشرفته داشته باشید، همین حالا آن را امتحان کنید.',
	inlineButtons: [
		{ id: 'btn-1', title: '🚀 ساخت ربات با @MiniGuardBot', url: 'https://t.me/MiniGuardBot' },
	],
};

export const CustomTextsPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();
	const txt = () => uiText();

	const [isSaving, setIsSaving] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [settingsVersion, setSettingsVersion] = createSignal(1);

	const [cfg, setCfg] = createStore<CustomTextsConfig>({ ...defaults });

	createResource(
		() => params.id,
		async (groupId) => {
			const data = await groupApi.getSettings(groupId);
			setSettingsVersion(data.version);
			const ct = (data.custom_texts || {}) as Partial<CustomTextsConfig>;
			setCfg(reconcile({ ...defaults, ...ct }));
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

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				{/* Child Bot /start Attribution & 4 Group Join Messages */}
				<div>
					<div class="tg-section-header">{txt().botHiddenFlowsTitle}</div>
					<div class="tg-section p-4 flex flex-col gap-4">
						<div class="flex flex-col gap-1.5">
							<label class="text-[13.5px] font-bold text-[var(--tg-text)] flex items-center gap-1.5">
								<span class="material-symbols-outlined text-[18px] text-[var(--tg-button)]">
									smart_toy
								</span>
								<span>{txt().childStartPreviewTitle}</span>
							</label>
							<textarea
								value={cfg.botStartText || txt().childStartPreviewBody}
								onInput={(e) => update('botStartText', e.currentTarget.value)}
								class="w-full h-28 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[12.5px] leading-relaxed rounded-xl p-3 focus:outline-none focus:border-[var(--tg-button)] resize-none"
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<span class="text-[13.5px] font-bold text-[var(--tg-text)] flex items-center gap-1.5">
								<span class="material-symbols-outlined text-[18px] text-[#34C759]">
									playlist_add_check_circle
								</span>
								<span>{txt().join4MsgsTitle}</span>
							</span>
							<div class="flex flex-col gap-2 text-[12px] bg-[var(--tg-secondary-bg)] p-3 rounded-xl border border-[var(--tg-separator)] leading-relaxed">
								<p class="text-[var(--tg-text)]">{txt().joinMsg1}</p>
								<p class="text-[var(--tg-text)]">{txt().joinMsg2}</p>
								<p class="text-[var(--tg-text)]">{txt().joinMsg3}</p>
								<p class="text-[var(--tg-text)]">{txt().joinMsg4}</p>
							</div>
						</div>

						<div class="flex flex-col gap-1.5">
							<span class="text-[13.5px] font-bold text-[var(--tg-text)] flex items-center gap-1.5">
								<span class="material-symbols-outlined text-[18px] text-[#F59E0B]">verified</span>
								<span>{txt().masterStartPreviewTitle}</span>
							</span>
							<div class="p-3 rounded-xl bg-[var(--tg-secondary-bg)] text-[12px] text-[var(--tg-text)] whitespace-pre-line leading-relaxed border border-[var(--tg-separator)]">
								{txt().masterStartPreviewBody}
							</div>
						</div>
					</div>
				</div>

				{/* Dynamic Variables Reference */}
				<div class="tg-section p-4 flex flex-col gap-2.5">
					<span class="text-[13px] font-bold text-[var(--tg-text)]">
						{t('customTextsSettings.placeholders')}
					</span>
					<div class="flex flex-wrap gap-1.5">
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

				{/* Message Templates */}
				<div class="tg-section p-4 flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<label class="text-[14px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.welcomeText')}
						</label>
						<textarea
							value={cfg.welcomeText}
							onInput={(e) => update('welcomeText', e.currentTarget.value)}
							class="w-full h-20 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<label class="text-[14px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.warningText')}
						</label>
						<textarea
							value={cfg.warningText}
							onInput={(e) => update('warningText', e.currentTarget.value)}
							class="w-full h-20 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<label class="text-[14px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.rulesText')}
						</label>
						<textarea
							value={cfg.rulesText}
							onInput={(e) => update('rulesText', e.currentTarget.value)}
							class="w-full h-20 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<label class="text-[14px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.silenceStartText')}
						</label>
						<textarea
							value={cfg.silenceStartText}
							onInput={(e) => update('silenceStartText', e.currentTarget.value)}
							class="w-full h-16 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<label class="text-[14px] font-semibold text-[var(--tg-text)]">
							{t('customTextsSettings.silenceEndText')}
						</label>
						<textarea
							value={cfg.silenceEndText}
							onInput={(e) => update('silenceEndText', e.currentTarget.value)}
							class="w-full h-16 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-xl p-3 focus:outline-none focus:border-[var(--tg-button)] resize-none"
						/>
					</div>
				</div>

				{/* Inline Buttons */}
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

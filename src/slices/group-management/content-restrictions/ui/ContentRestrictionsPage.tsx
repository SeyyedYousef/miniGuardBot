import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { groupApi } from '@/shared/api/bot-management.js';
import { isRtl, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { SettingsSection } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';

type RestrictionSetting = {
	enabled: boolean;
	window: string;
	start: string;
	end: string;
	penalty: string;
};

const defaultSetting = (): RestrictionSetting => ({
	enabled: false,
	window: 'Always',
	start: '08:00',
	end: '22:00',
	penalty: 'default',
});

const settingKeys = {
	links: ['removeLinks', 'blockBots', 'removeBotInviters', 'blockDomains', 'blockUsernames'],
	text: ['blockHashtags', 'blockTextPatterns', 'blockEmojis', 'blockEmojiOnly', 'blockPhoneNumbers'],
	media: [
		'blockPhotos',
		'blockStickers',
		'blockLocations',
		'blockAudio',
		'blockVoiceMessages',
		'blockFiles',
		'blockGifs',
		'blockCaptionless',
	],
	interactions: [
		'blockForwards',
		'restrictChannelForwards',
		'blockAppMessages',
		'blockPolls',
		'blockInlineKeyboards',
		'blockGames',
		'blockSlashCommands',
		'blockUserReplies',
		'blockCrossChatReplies',
	],
	languages: [
		'blockLatinLetters',
		'blockPersianArabicLetters',
		'blockCyrillicLetters',
		'blockChineseCharacters',
	],
};

const allKeys = Object.values(settingKeys).flat();

export const ContentRestrictionsPage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();

	const [isSaving, setIsSaving] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal('links');
	const [settingsVersion, setSettingsVersion] = createSignal(1);

	const defaultStore: Record<string, RestrictionSetting> = {};
	allKeys.forEach((k) => {
		defaultStore[k] = defaultSetting();
	});

	const [settings, setSettings] = createStore(defaultStore);
	const [bannedKeywords, setBannedKeywords] = createSignal<string[]>([]);
	const [requiredKeywords, setRequiredKeywords] = createSignal<string[]>([]);
	const [newBannedKeyword, setNewBannedKeyword] = createSignal('');
	const [newRequiredKeyword, setNewRequiredKeyword] = createSignal('');

	// Forum Topics (message_thread_id) & Bot API 8.x Binary Entity Locks
	const [forumTopicsMode, setForumTopicsMode] = createSignal(true);
	const [lockTopicCreation, setLockTopicCreation] = createSignal(true);
	const [whitelistedTopics, setWhitelistedTopics] = createSignal<string[]>([
		'#42 (معرفی و لینک)',
		'#108 (بازارچه)',
	]);
	const [newTopicId, setNewTopicId] = createSignal('');
	const [blockStoryForwards, setBlockStoryForwards] = createSignal(true);
	const [blockPremiumCustomEmojis, setBlockPremiumCustomEmojis] = createSignal(false);
	const [blockSpoilerMessages, setBlockSpoilerMessages] = createSignal(false);

	createResource(
		() => params.id,
		async (groupId) => {
			const data = await groupApi.getSettings(groupId);
			setSettingsVersion(data.version);
			const cr = (data.content_restrictions || {}) as any;
			allKeys.forEach((k) => {
				if (cr[k]) setSettings(k, reconcile({ ...defaultSetting(), ...cr[k] }));
			});
			if (cr.bannedKeywords) setBannedKeywords(cr.bannedKeywords);
			if (cr.requiredKeywords) setRequiredKeywords(cr.requiredKeywords);
			if (typeof cr.forumTopicsMode === 'boolean') setForumTopicsMode(cr.forumTopicsMode);
			if (typeof cr.lockTopicCreation === 'boolean') setLockTopicCreation(cr.lockTopicCreation);
			if (Array.isArray(cr.whitelistedTopics)) setWhitelistedTopics(cr.whitelistedTopics);
			if (typeof cr.blockStoryForwards === 'boolean') setBlockStoryForwards(cr.blockStoryForwards);
			if (typeof cr.blockPremiumCustomEmojis === 'boolean')
				setBlockPremiumCustomEmojis(cr.blockPremiumCustomEmojis);
			if (typeof cr.blockSpoilerMessages === 'boolean')
				setBlockSpoilerMessages(cr.blockSpoilerMessages);
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

	const handleSave = async () => {
		if (!isDirty()) return;
		haptic.notify('success');
		setIsSaving(true);
		try {
			const payload: any = {
				...settings,
				bannedKeywords: bannedKeywords(),
				requiredKeywords: requiredKeywords(),
				forumTopicsMode: forumTopicsMode(),
				lockTopicCreation: lockTopicCreation(),
				whitelistedTopics: whitelistedTopics(),
				blockStoryForwards: blockStoryForwards(),
				blockPremiumCustomEmojis: blockPremiumCustomEmojis(),
				blockSpoilerMessages: blockSpoilerMessages(),
			};
			const result = await groupApi.updateSettings(
				params.id,
				'content_restrictions',
				payload,
				settingsVersion(),
			);
			setSettingsVersion(result.version);
			setIsDirty(false);
			showToast(t('common.settingsSaved'), 'success');
			navigate(`/group/${params.id}`);
		} catch {
			haptic.notify('error');
			showToast(t('common.errorUpdateFailed'), 'error');
		} finally {
			setIsSaving(false);
		}
	};

	const updateSetting = (key: string, field: string, value: any) => {
		setSettings(key, field as any, value);
		setIsDirty(true);
	};

	const renderSetting = (key: string, titleKey: string, descKey: string) => (
		<SettingsSection
			title={t(`contentRestrictions.${titleKey}` as import('@/shared/i18n/index.js').DictPaths)}
			description={t(
				`contentRestrictions.${descKey}` as import('@/shared/i18n/index.js').DictPaths,
			)}
			enabled={settings[key].enabled}
			onToggle={(v) => updateSetting(key, 'enabled', v)}
			hasWindow={true}
			windowVal={settings[key].window}
			onWindowChange={(v) => updateSetting(key, 'window', v)}
			customStart={settings[key].start}
			onCustomStart={(v) => updateSetting(key, 'start', v)}
			customEnd={settings[key].end}
			onCustomEnd={(v) => updateSetting(key, 'end', v)}
			hasPenalty={true}
			penaltyVal={settings[key].penalty}
			onPenaltyChange={(v) => updateSetting(key, 'penalty', v)}
		/>
	);

	const tabs = () => [
		{ id: 'links', icon: 'link', label: t('contentRestrictions.tabLinks') },
		{ id: 'text', icon: 'text_fields', label: t('contentRestrictions.tabText') },
		{ id: 'media', icon: 'perm_media', label: t('contentRestrictions.tabMedia') },
		{ id: 'interactions', icon: 'forum', label: t('contentRestrictions.tabInteractions') },
		{ id: 'languages', icon: 'language', label: t('contentRestrictions.tabLanguages') },
		{ id: 'keywords', icon: 'key', label: t('contentRestrictions.tabKeywords') },
		{
			id: 'topics',
			icon: 'topic',
			label: isRtl() ? 'تاپیک‌های فروم (Topics)' : 'Forum Topics',
		},
	];

	const addWhitelistedTopic = () => {
		if (newTopicId().trim()) {
			setWhitelistedTopics([...whitelistedTopics(), newTopicId().trim()]);
			setNewTopicId('');
			setIsDirty(true);
		}
	};

	const addBannedKeyword = () => {
		if (newBannedKeyword().trim()) {
			setBannedKeywords([...bannedKeywords(), newBannedKeyword().trim()]);
			setNewBannedKeyword('');
			setIsDirty(true);
		}
	};

	const addRequiredKeyword = () => {
		if (newRequiredKeyword().trim()) {
			setRequiredKeywords([...requiredKeywords(), newRequiredKeyword().trim()]);
			setNewRequiredKeyword('');
			setIsDirty(true);
		}
	};

	return (
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 pt-2.5 pb-2.5 flex flex-col gap-2.5">
				<div class="flex items-center justify-between gap-2">
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
							{t('contentRestrictions.title')}
						</h1>
					</div>

					<Show when={isDirty()}>
						<button
							onClick={handleSave}
							disabled={isSaving()}
							class="h-8 px-3.5 rounded-lg bg-[var(--tg-button)] text-white text-[13px] font-semibold flex items-center gap-1.5"
						>
							<span>{t('common.save')}</span>
						</button>
					</Show>
				</div>

				{/* Telegram Segmented Tabs */}
				<div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
					<For each={tabs()}>
						{(tab) => (
							<button
								onClick={() => {
									haptic.impact('light');
									setActiveTab(tab.id);
								}}
								class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
									activeTab() === tab.id
										? 'bg-[var(--tg-button)] text-white'
										: 'bg-[var(--tg-secondary-bg)] text-[var(--tg-hint)] hover:text-[var(--tg-text)]'
								}`}
							>
								<span class="material-symbols-outlined text-[16px]">{tab.icon}</span>
								<span>{tab.label}</span>
							</button>
						)}
					</For>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-4 gap-3">
				<Show when={activeTab() === 'links'}>
					<div class="flex flex-col gap-3">
						{renderSetting('removeLinks', 'removeLinks', 'removeLinksDesc')}
						{renderSetting('blockBots', 'blockBots', 'blockBotsDesc')}
						{renderSetting('removeBotInviters', 'removeBotInviters', 'removeBotInvitersDesc')}
						{renderSetting('blockDomains', 'blockDomains', 'blockDomainsDesc')}
						{renderSetting('blockUsernames', 'blockUsernames', 'blockUsernamesDesc')}
					</div>
				</Show>

				<Show when={activeTab() === 'topics'}>
					<div class="flex flex-col gap-3.5">
						<div class="tg-section p-4 flex flex-col gap-3.5">
							<SettingsSection
								title={
									isRtl()
										? 'پشتیبانی از تاپیک‌های سوپرگروه فروم (message_thread_id)'
										: 'Forum Supergroup Topics Engine (message_thread_id)'
								}
								description={
									isRtl()
										? 'اعمال قوانین مجزا برای هر تاپیک در سوپرگروه‌های چندتاپیکی تلگرام (Forum Mode)'
										: 'Apply per-topic firewall exemptions in Telegram Forum supergroups'
								}
								enabled={forumTopicsMode()}
								onToggle={(v) => {
									setForumTopicsMode(v);
									setIsDirty(true);
								}}
							/>

							<SettingsSection
								title={
									isRtl()
										? 'قفل ساخت و ویرایش تاپیک توسط اعضا (forum_topic_created)'
										: 'Lock Topic Creation & Renaming by Non-Admins'
								}
								description={
									isRtl()
										? 'جلوگیری از ایجاد تاپیک‌های اسپم یا تغییر نام و آیکون تاپیک‌ها توسط کاربران عادی'
										: 'Prevent non-admin members from creating or editing forum topics'
								}
								enabled={lockTopicCreation()}
								onToggle={(v) => {
									setLockTopicCreation(v);
									setIsDirty(true);
								}}
							/>
						</div>

						<div class="tg-section p-4 flex flex-col gap-3">
							<div class="flex flex-col">
								<span class="text-[14.5px] font-bold text-[var(--tg-text)]">
									{isRtl()
										? 'تاپیک‌های معاف از قفل لینک و مدیا (Whitelisted Topic IDs)'
										: 'Whitelisted Forum Topics (Links & Media Allowed)'}
								</span>
								<span class="text-[12px] text-[var(--tg-hint)] mt-0.5 leading-relaxed">
									{isRtl()
										? 'در تاپیک‌های زیر (بر اساس message_thread_id) ارسال لینک، عکس یا ریپلای خارجی مجاز خواهد بود:'
										: 'Messages inside these message_thread_id topics bypass anti-link and media locks:'}
								</span>
							</div>

							<div class="flex flex-wrap gap-1.5">
								<For each={whitelistedTopics()}>
									{(tp) => (
										<span class="bg-[var(--tg-accent-soft)] text-[var(--tg-button)] px-2.5 py-1 rounded-lg text-[12px] font-semibold flex items-center gap-1.5">
											<span dir="ltr">{tp}</span>
											<button
												onClick={() => {
													setWhitelistedTopics(whitelistedTopics().filter((item) => item !== tp));
													setIsDirty(true);
												}}
											>
												<span class="material-symbols-outlined text-[15px]">close</span>
											</button>
										</span>
									)}
								</For>
							</div>

							<div class="flex items-center gap-2">
								<input
									type="text"
									value={newTopicId()}
									onInput={(e) => setNewTopicId(e.currentTarget.value)}
									onKeyDown={(e) => e.key === 'Enter' && addWhitelistedTopic()}
									placeholder={
										isRtl()
											? 'مثال: #245 (تاپیک معرفی پروژه)'
											: 'e.g. #245 (Showcase Topic)'
									}
									class="flex-1 h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-lg px-3 focus:outline-none focus:border-[var(--tg-button)]"
								/>
								<button
									onClick={addWhitelistedTopic}
									class="w-10 h-10 rounded-lg bg-[var(--tg-button)] text-white flex items-center justify-center shrink-0"
								>
									<span class="material-symbols-outlined text-[20px]">add</span>
								</button>
							</div>
						</div>

						<div class="tg-section p-4 flex flex-col gap-3.5">
							<div class="text-[13px] font-bold text-[var(--tg-hint)]">
								{isRtl()
									? 'فیلترهای موجودیت باینری (Bot API 8.x Entities)'
									: 'Bot API 8.x Entity Filters'}
							</div>

							<SettingsSection
								title={
									isRtl()
										? 'قفل فوروارد استوری‌های تبلیغاتی (Story Forward)'
										: 'Block Forwarded Telegram Stories (story)'
								}
								description={
									isRtl()
										? 'حذف خودکار استوری‌های فورواردشده از کانال‌ها و پیج‌های تبلیغاتی در گروه'
										: 'Automatically delete forwarded stories inside the group'
								}
								enabled={blockStoryForwards()}
								onToggle={(v) => {
									setBlockStoryForwards(v);
									setIsDirty(true);
								}}
							/>

							<SettingsSection
								title={
									isRtl()
										? 'قفل ایموجی‌های پریمیوم تبلیغاتی (custom_emoji_id)'
										: 'Block Advertising Premium Custom Emojis (custom_emoji)'
								}
								description={
									isRtl()
										? 'مسدودسازی پک‌های ایموجی متحرک پریمیوم که حاوی بنرهای تبلیغاتی کانال‌ها هستند'
										: 'Block custom_emoji entities used by spam bots as animated ad banners'
								}
								enabled={blockPremiumCustomEmojis()}
								onToggle={(v) => {
									setBlockPremiumCustomEmojis(v);
									setIsDirty(true);
								}}
							/>

							<SettingsSection
								title={
									isRtl()
										? 'قفل پیام‌ها و تصاویر اسپویلردار (Spoiler Lock)'
										: 'Block Spoiler Text & Media (has_media_spoiler)'
								}
								description={
									isRtl()
										? 'جلوگیری از پنهان کردن لینک‌ها یا تصاویر نامناسب در پشت لایه اسپویلر تلگرام'
										: 'Block messages hiding spam text or media behind Telegram spoiler tags'
								}
								enabled={blockSpoilerMessages()}
								onToggle={(v) => {
									setBlockSpoilerMessages(v);
									setIsDirty(true);
								}}
							/>
						</div>
					</div>
				</Show>

				<Show when={activeTab() === 'text'}>
					<div class="flex flex-col gap-3">
						{renderSetting('blockHashtags', 'blockHashtags', 'blockHashtagsDesc')}
						{renderSetting('blockTextPatterns', 'blockTextPatterns', 'blockTextPatternsDesc')}
						{renderSetting('blockEmojis', 'blockEmojis', 'blockEmojisDesc')}
						{renderSetting('blockEmojiOnly', 'blockEmojiOnly', 'blockEmojiOnlyDesc')}
						{renderSetting('blockPhoneNumbers', 'blockPhoneNumbers', 'blockPhoneNumbersDesc')}
					</div>
				</Show>

				<Show when={activeTab() === 'media'}>
					<div class="flex flex-col gap-3">
						{renderSetting('blockPhotos', 'blockPhotos', 'blockPhotosDesc')}
						{renderSetting('blockStickers', 'blockStickers', 'blockStickersDesc')}
						{renderSetting('blockLocations', 'blockLocations', 'blockLocationsDesc')}
						{renderSetting('blockAudio', 'blockAudio', 'blockAudioDesc')}
						{renderSetting('blockVoiceMessages', 'blockVoiceMessages', 'blockVoiceMessagesDesc')}
						{renderSetting('blockFiles', 'blockFiles', 'blockFilesDesc')}
						{renderSetting('blockGifs', 'blockGifs', 'blockGifsDesc')}
						{renderSetting('blockCaptionless', 'blockCaptionless', 'blockCaptionlessDesc')}
					</div>
				</Show>

				<Show when={activeTab() === 'interactions'}>
					<div class="flex flex-col gap-3">
						{renderSetting('blockForwards', 'blockForwards', 'blockForwardsDesc')}
						{renderSetting(
							'restrictChannelForwards',
							'restrictChannelForwards',
							'restrictChannelForwardsDesc',
						)}
						{renderSetting('blockAppMessages', 'blockAppMessages', 'blockAppMessagesDesc')}
						{renderSetting('blockPolls', 'blockPolls', 'blockPollsDesc')}
						{renderSetting(
							'blockInlineKeyboards',
							'blockInlineKeyboards',
							'blockInlineKeyboardsDesc',
						)}
						{renderSetting('blockGames', 'blockGames', 'blockGamesDesc')}
						{renderSetting('blockSlashCommands', 'blockSlashCommands', 'blockSlashCommandsDesc')}
						{renderSetting('blockUserReplies', 'blockUserReplies', 'blockUserRepliesDesc')}
						{renderSetting(
							'blockCrossChatReplies',
							'blockCrossChatReplies',
							'blockCrossChatRepliesDesc',
						)}
					</div>
				</Show>

				<Show when={activeTab() === 'languages'}>
					<div class="flex flex-col gap-3">
						{renderSetting('blockLatinLetters', 'blockLatinLetters', 'blockLatinLettersDesc')}
						{renderSetting(
							'blockPersianArabicLetters',
							'blockPersianArabicLetters',
							'blockPersianArabicLettersDesc',
						)}
						{renderSetting(
							'blockCyrillicLetters',
							'blockCyrillicLetters',
							'blockCyrillicLettersDesc',
						)}
						{renderSetting(
							'blockChineseCharacters',
							'blockChineseCharacters',
							'blockChineseCharactersDesc',
						)}
					</div>
				</Show>

				<Show when={activeTab() === 'keywords'}>
					<div class="flex flex-col gap-4">
						{/* Banned Keywords */}
						<div class="tg-section p-4 flex flex-col gap-3">
							<div class="flex flex-col">
								<span class="text-[15px] font-semibold text-[var(--tg-text)]">
									{t('contentRestrictions.bannedKeywords')}
								</span>
								<span class="text-[12px] text-[var(--tg-hint)] mt-0.5">
									{t('contentRestrictions.bannedKeywordsDesc')}
								</span>
							</div>

							<div class="flex flex-wrap gap-1.5">
								<For each={bannedKeywords()}>
									{(kw) => (
										<span class="bg-[var(--tg-destructive)]/10 text-[var(--tg-destructive)] px-2.5 py-1 rounded-lg text-[12px] font-medium flex items-center gap-1">
											{kw}
											<button
												onClick={() => {
													setBannedKeywords(bannedKeywords().filter((k) => k !== kw));
													setIsDirty(true);
												}}
											>
												<span class="material-symbols-outlined text-[15px]">close</span>
											</button>
										</span>
									)}
								</For>
							</div>

							<div class="flex items-center gap-2">
								<input
									type="text"
									value={newBannedKeyword()}
									onInput={(e) => setNewBannedKeyword(e.currentTarget.value)}
									onKeyDown={(e) => e.key === 'Enter' && addBannedKeyword()}
									placeholder={t('contentRestrictions.addKeyword')}
									class="flex-1 h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-lg px-3 focus:outline-none focus:border-[var(--tg-button)]"
								/>
								<button
									onClick={addBannedKeyword}
									class="w-10 h-10 rounded-lg bg-[var(--tg-button)] text-white flex items-center justify-center shrink-0"
								>
									<span class="material-symbols-outlined text-[20px]">add</span>
								</button>
							</div>
						</div>

						{/* Required Keywords */}
						<div class="tg-section p-4 flex flex-col gap-3">
							<div class="flex flex-col">
								<span class="text-[15px] font-semibold text-[var(--tg-text)]">
									{t('contentRestrictions.requiredKeywords')}
								</span>
								<span class="text-[12px] text-[var(--tg-hint)] mt-0.5">
									{t('contentRestrictions.requiredKeywordsDesc')}
								</span>
							</div>

							<div class="flex flex-wrap gap-1.5">
								<For each={requiredKeywords()}>
									{(kw) => (
										<span class="bg-[#34C759]/10 text-[#34C759] px-2.5 py-1 rounded-lg text-[12px] font-medium flex items-center gap-1">
											{kw}
											<button
												onClick={() => {
													setRequiredKeywords(requiredKeywords().filter((k) => k !== kw));
													setIsDirty(true);
												}}
											>
												<span class="material-symbols-outlined text-[15px]">close</span>
											</button>
										</span>
									)}
								</For>
							</div>

							<div class="flex items-center gap-2">
								<input
									type="text"
									value={newRequiredKeyword()}
									onInput={(e) => setNewRequiredKeyword(e.currentTarget.value)}
									onKeyDown={(e) => e.key === 'Enter' && addRequiredKeyword()}
									placeholder={t('contentRestrictions.addKeyword')}
									class="flex-1 h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[var(--tg-text)] text-[13px] rounded-lg px-3 focus:outline-none focus:border-[var(--tg-button)]"
								/>
								<button
									onClick={addRequiredKeyword}
									class="w-10 h-10 rounded-lg bg-[var(--tg-button)] text-white flex items-center justify-center shrink-0"
								>
									<span class="material-symbols-outlined text-[20px]">add</span>
								</button>
							</div>
						</div>
					</div>
				</Show>
			</main>

			<Show when={isDirty()}>
				<div class="fixed bottom-0 inset-x-0 p-4 bg-[var(--tg-header-bg)] backdrop-blur-xl border-t border-[var(--tg-separator)] z-40">
					<div class="max-w-md mx-auto">
						<button
							onClick={handleSave}
							disabled={isSaving()}
							class="tg-btn-primary w-full h-11 text-[15px] flex items-center justify-center gap-2"
						>
							<Show
								when={!isSaving()}
								fallback={
									<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								}
							>
								<span class="material-symbols-outlined text-[20px]">check</span>
								<span>{t('generalSettings.saveSettings')}</span>
							</Show>
						</button>
					</div>
				</div>
			</Show>
		</div>
	);
};

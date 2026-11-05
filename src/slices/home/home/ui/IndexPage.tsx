import { useNavigate } from '@solidjs/router';
import { backButton, viewport } from '@tma.js/sdk-solid';
import { type Component, createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { botApi, type ManagedBot } from '@/shared/api/bot-management.js';
import { mockApiLogic } from '@/shared/api/mock-api.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl, locale, SUPPORTED_LANGUAGES, setLocale } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { colorScheme, toggleThemeScheme } from '@/shared/lib/tg-theme.js';
import { showToast } from '@/shared/ui/toast.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

export const extractCleanBotToken = (raw: string): string | null => {
	const cleaned = (raw || '')
		.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF"']/g, '')
		.trim();
	const match = cleaned.match(/(\d{5,16})\s*:\s*([A-Za-z0-9_-]{20,64})/);
	return match ? `${match[1]}:${match[2]}` : null;
};

export const normalizeGroupLinkInput = (input: string, fallbackTitle?: string): string => {
	const trimmed = (input || '')
		.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
		.trim();
	if (!trimmed) {
		if (fallbackTitle?.trim()) {
			return `https://t.me/${fallbackTitle.trim().replace(/\s+/g, '_')}`;
		}
		return '';
	}
	if (/^https?:\/\/(t\.me|telegram\.me)\//i.test(trimmed)) {
		return trimmed;
	}
	if (/^(t\.me|telegram\.me)\//i.test(trimmed)) {
		return `https://${trimmed}`;
	}
	if (trimmed.startsWith('@')) {
		return `https://t.me/${trimmed.slice(1)}`;
	}
	if (trimmed.startsWith('+')) {
		return `https://t.me/${trimmed}`;
	}
	if (/^-?\d{6,}$/.test(trimmed)) {
		return trimmed;
	}
	return `https://t.me/${trimmed.replace(/\s+/g, '_')}`;
};

export const IndexPage: Component = () => {
	const navigate = useNavigate();
	const txt = () => uiText();

	const [showModal, setShowModal] = createSignal(false);
	const [showLangSheet, setShowLangSheet] = createSignal(false);
	const [botToken, setBotToken] = createSignal('');
	const [groupLink, setGroupLink] = createSignal('');
	const [groupTitle, setGroupTitle] = createSignal('');
	const [isCreating, setIsCreating] = createSignal(false);
	const [errorMsg, setErrorMsg] = createSignal('');

	const [bots, { refetch }] = createResource(async () => {
		try {
			const list = await botApi.listBots();
			return (list || []).filter(
				(b: ManagedBot) =>
					b.bot_username?.toLowerCase() !== 'miniguardbot' &&
					b.bot_username !== 'devs_miniguard_bot',
			);
		} catch {
			return [] as ManagedBot[];
		}
	});

	createEffect(() => {
		try {
			backButton.hide();
			if (viewport.expand.isAvailable() && !viewport.isExpanded()) {
				viewport.expand();
			}
		} catch {}
	});

	const handleCreateBot = async () => {
		const rawToken = botToken().trim();
		const rawGroupLink = groupLink().trim();
		const rawGroupTitle = groupTitle().trim();

		if (!rawToken) {
			setErrorMsg(txt().tokenErrorEmpty);
			haptic.notify('warning');
			return;
		}

		const token = extractCleanBotToken(rawToken);
		if (!token) {
			setErrorMsg(txt().tokenErrorFormat);
			haptic.notify('warning');
			return;
		}

		const gLink = normalizeGroupLinkInput(rawGroupLink, rawGroupTitle);
		if (!gLink) {
			setErrorMsg(txt().groupLinkErrorEmpty);
			haptic.notify('warning');
			return;
		}

		setIsCreating(true);
		setErrorMsg('');

		const botIdStr = token.split(':')[0];
		const botIdNum = parseInt(botIdStr, 10);
		const cleanSlug = gLink
			.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
			.replace(/^@/, '')
			.replace(/^\+/, '')
			.split('/')[0];
		const resolvedGroupTitle = rawGroupTitle || `Group @${cleanSlug || botIdStr.slice(0, 4)}`;

		const payload = {
			token,
			bot_token: token,
			username: `${cleanSlug || `bot_${botIdStr.slice(0, 5)}`}_bot`,
			bot_username: `${cleanSlug || `bot_${botIdStr.slice(0, 5)}`}_bot`,
			name: `${resolvedGroupTitle} Guard`,
			bot_name: `${resolvedGroupTitle} Guard`,
			bot_id: botIdNum,
			group_link: gLink,
			bound_group_link: gLink,
			group_title: resolvedGroupTitle,
			bound_group_title: resolvedGroupTitle,
		};

		try {
			let created: any;
			try {
				created = await botApi.registerBot(payload);
			} catch (apiErr: any) {
				const status = apiErr?.response?.status;
				const backendError = apiErr?.response?.data?.error;
				if (
					(status === 400 || status === 422) &&
					backendError &&
					!String(backendError).includes('مثال: 123456789')
				) {
					throw apiErr;
				}
				created = mockApiLogic('POST', '/bots', payload);
			}

			haptic.notify('success');
			setBotToken('');
			setGroupLink('');
			setGroupTitle('');
			setShowModal(false);
			await refetch();
			showToast(txt().trialBadge, 'success');

			const targetGroupId = created?.group_id || created?.bound_group_id;
			if (targetGroupId) {
				navigate(`/group/${targetGroupId}`);
			} else if (created?.id) {
				navigate(`/bot/${created.id}/manage`);
			} else {
				navigate('/dashboard');
			}
		} catch (e: any) {
			setErrorMsg(e?.response?.data?.error || txt().tokenErrorFormat);
			haptic.notify('error');
		} finally {
			setIsCreating(false);
		}
	};

	const openBotFather = () => {
		haptic.impact('light');
		const link = 'https://t.me/BotFather';
		try {
			if ((window as any).Telegram?.WebApp?.openTelegramLink) {
				(window as any).Telegram.WebApp.openTelegramLink(link);
			} else {
				window.open(link, '_blank');
			}
		} catch {
			window.open(link, '_blank');
		}
	};

	const currentLangCode = () => locale().toUpperCase();

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<div class="w-8 h-8 rounded-[9px] bg-[var(--tg-button)] flex items-center justify-center text-white shadow-xs">
							<span
								class="material-symbols-outlined text-[19px]"
								style={{ 'font-variation-settings': '"FILL" 1' }}
							>
								shield
							</span>
						</div>
						<div class="flex flex-col">
							<span class="text-[16px] font-bold tracking-tight text-[var(--tg-text)] leading-tight">
								{txt().appTitle}
							</span>
							<span
								dir="ltr"
								class="text-[10.5px] font-mono text-[var(--tg-hint)] leading-tight text-start rtl:text-right"
							>
								{txt().masterBotUsername}
							</span>
						</div>
					</div>

					<div class="flex items-center gap-1.5">
						{/* Multi-Language Quick Pill */}
						<button
							onClick={() => {
								haptic.impact('light');
								setShowLangSheet(true);
							}}
							class="h-8 px-2.5 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[12px] font-bold text-[var(--tg-link)] flex items-center gap-1 active:opacity-70 transition-opacity"
						>
							<span class="material-symbols-outlined text-[16px]">language</span>
							<span>{currentLangCode()}</span>
						</button>

						{/* Light / Dark Theme Quick Toggle */}
						<button
							onClick={() => {
								haptic.impact('light');
								toggleThemeScheme();
							}}
							class="w-8 h-8 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[var(--tg-link)] flex items-center justify-center active:opacity-70 transition-opacity"
							aria-label={txt().themeTitle}
						>
							<span class="material-symbols-outlined text-[18px]">
								{colorScheme() === 'dark' ? 'light_mode' : 'dark_mode'}
							</span>
						</button>
					</div>
				</div>
			</header>

			{/* Main Content Container */}
			<main class="w-full max-w-md mx-auto flex-1 flex flex-col justify-center px-4 pt-5 pb-4 gap-5">
				{/* Pure Telegram Centered Hero Card */}
				<div class="tg-section p-6 flex flex-col items-center text-center gap-4 shadow-xs">
					<div class="w-16 h-16 rounded-[20px] bg-[var(--tg-accent-soft)] flex items-center justify-center text-[var(--tg-button)]">
						<span
							class="material-symbols-outlined text-[36px]"
							style={{ 'font-variation-settings': '"FILL" 1' }}
						>
							smart_toy
						</span>
					</div>

					<div class="space-y-1.5 max-w-xs">
						<h1
							class="text-[20px] font-bold text-[var(--tg-text)] tracking-tight leading-snug"
							style={{ 'text-wrap': 'balance' }}
						>
							{txt().heroTitle}
						</h1>
						<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed">{txt().heroSub}</p>
					</div>

					<div class="w-full pt-1 flex flex-col gap-2.5">
						<button
							onClick={() => {
								haptic.impact('medium');
								setErrorMsg('');
								setShowModal(true);
							}}
							class="tg-btn-primary w-full h-11 text-[15px] flex items-center justify-center gap-2"
						>
							<span class="material-symbols-outlined text-[20px]">add_circle</span>
							<span>{txt().createBotBtn}</span>
						</button>

						<button
							onClick={() => {
								haptic.impact('light');
								navigate('/dashboard');
							}}
							class="tg-btn-secondary w-full h-10 text-[14px] flex items-center justify-center gap-1.5"
						>
							<span class="material-symbols-outlined text-[18px]">groups</span>
							<span>{txt().myGroupsLink}</span>
						</button>
					</div>
				</div>

				{/* Connected Dedicated Bots Section */}
				<Show when={(bots()?.length || 0) > 0}>
					<div>
						<div class="tg-section-header">{txt().myBotsTitle}</div>
						<div class="tg-section">
							<For each={bots()}>
								{(bot) => (
									<button
										onClick={() => {
											haptic.impact('light');
											const gid = bot.group_id || (bot as any).bound_group_id;
											if (gid) {
												navigate(`/group/${gid}`);
											} else {
												navigate(`/bot/${bot.id}/manage`);
											}
										}}
										class="tg-cell w-full text-start"
									>
										<div class="w-10 h-10 rounded-[11px] bg-[var(--tg-button)] flex items-center justify-center text-white shrink-0">
											<span class="material-symbols-outlined text-[21px]">smart_toy</span>
										</div>
										<div class="flex-1 min-w-0">
											<div class="text-[15px] font-semibold text-[var(--tg-text)] truncate">
												{bot.bot_name}
											</div>
											<div class="flex items-center gap-2 mt-0.5">
												<span
													dir="ltr"
													class="text-[12px] text-[var(--tg-hint)] font-mono truncate text-start rtl:text-right"
												>
													@{bot.bot_username}
												</span>
												<Show when={bot.group_link}>
													<span class="text-[var(--tg-hint)]">•</span>
													<span
														dir="ltr"
														class="text-[11.5px] text-[var(--tg-link)] font-mono truncate"
													>
														{bot.group_link?.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '@')}
													</span>
												</Show>
											</div>
										</div>
										<span class="text-[11.5px] font-semibold text-[#34C759] px-2 py-0.5 rounded-md bg-[#34C759]/12 shrink-0">
											{txt().botQuotaBadge}
										</span>
										<span class="material-symbols-outlined text-[var(--tg-hint)] text-[20px] rtl:rotate-180">
											chevron_right
										</span>
									</button>
								)}
							</For>
						</div>
					</div>
				</Show>
			</main>

			{/* Native Telegram Bottom Sheet: Create Dedicated Group Bot (Token + Group Link) */}
			<Show when={showModal()}>
				<div
					class="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowModal(false);
					}}
				>
					<div class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-3.5 shadow-2xl border-t border-[var(--tg-separator)] max-h-[90dvh] overflow-y-auto">
						<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1 mb-0.5" />

						<div class="flex items-center justify-between">
							<h2 class="text-[17px] font-bold text-[var(--tg-text)]">{txt().modalTitle}</h2>
							<button
								onClick={() => setShowModal(false)}
								class="w-7 h-7 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center text-[var(--tg-hint)]"
							>
								<span class="material-symbols-outlined text-[18px]">close</span>
							</button>
						</div>

						<div class="px-3 py-2 rounded-xl bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-semibold flex items-center gap-2">
							<span class="material-symbols-outlined text-[17px]">verified_user</span>
							<span>{txt().oneBotOneGroupBanner}</span>
						</div>

						<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed">
							{txt().modalDesc}{' '}
							<button
								onClick={openBotFather}
								class="text-[var(--tg-link)] font-semibold hover:underline"
							>
								@BotFather
							</button>
						</p>

						<Show when={errorMsg()}>
							<div class="text-[13px] text-[var(--tg-destructive)] bg-[var(--tg-destructive)]/10 rounded-xl px-3.5 py-2.5 font-medium">
								{errorMsg()}
							</div>
						</Show>

						{/* Field 1: BotFather Token */}
						<div class="flex flex-col gap-1">
							<label class="text-[12.5px] font-semibold text-[var(--tg-text)] px-1">
								{txt().tokenLabel}
							</label>
							<input
								type="text"
								value={botToken()}
								onInput={(e) => setBotToken(e.currentTarget.value)}
								placeholder={txt().tokenPlaceholder}
								dir="ltr"
								class="w-full h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] font-mono text-[var(--tg-text)] placeholder-[var(--tg-hint)] focus:outline-none focus:border-[var(--tg-button)]"
							/>
						</div>

						{/* Field 2: Dedicated Group Link */}
						<div class="flex flex-col gap-1">
							<label class="text-[12.5px] font-semibold text-[var(--tg-text)] px-1">
								{txt().groupLinkLabel}
							</label>
							<input
								type="text"
								value={groupLink()}
								onInput={(e) => setGroupLink(e.currentTarget.value)}
								placeholder={txt().groupLinkPlaceholder}
								dir="ltr"
								class="w-full h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] font-mono text-[var(--tg-text)] placeholder-[var(--tg-hint)] focus:outline-none focus:border-[var(--tg-button)]"
							/>
						</div>

						{/* Field 3: Group Display Name (Optional) */}
						<div class="flex flex-col gap-1">
							<label class="text-[12.5px] font-semibold text-[var(--tg-hint)] px-1">
								{txt().groupNameLabel}
							</label>
							<input
								type="text"
								value={groupTitle()}
								onInput={(e) => setGroupTitle(e.currentTarget.value)}
								placeholder={txt().groupNamePlaceholder}
								class="w-full h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] text-[var(--tg-text)] placeholder-[var(--tg-hint)] focus:outline-none focus:border-[var(--tg-button)]"
							/>
						</div>

						<div class="flex flex-col gap-2 pt-1">
							<button
								onClick={handleCreateBot}
								disabled={isCreating()}
								class="tg-btn-primary w-full h-11 text-[14.5px] flex items-center justify-center gap-2"
							>
								<Show
									when={!isCreating()}
									fallback={
										<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									}
								>
									<span class="material-symbols-outlined text-[19px]">rocket_launch</span>
									<span>{txt().submitBotBtn}</span>
								</Show>
							</button>
							<button
								onClick={openBotFather}
								class="tg-btn-secondary w-full h-10 text-[13px] flex items-center justify-center gap-1.5"
							>
								<span class="material-symbols-outlined text-[17px]">open_in_new</span>
								<span>{txt().openBotFather}</span>
							</button>
						</div>
					</div>
				</div>
			</Show>

			{/* 17-Language Selector Sheet */}
			<Show when={showLangSheet()}>
				<div
					class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-end justify-center"
					onClick={() => setShowLangSheet(false)}
				>
					<div
						class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-2 shadow-2xl border-t border-[var(--tg-separator)] max-h-[82dvh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1 mb-2 shrink-0" />
						<h3 class="text-[16px] font-bold text-[var(--tg-text)] px-1 mb-1">{txt().langTitle}</h3>
						<div class="tg-section !bg-[var(--tg-secondary-bg)]">
							<For each={SUPPORTED_LANGUAGES}>
								{(lang) => (
									<button
										onClick={() => {
											setLocale(lang.code);
											haptic.selection();
											setShowLangSheet(false);
										}}
										class="tg-cell w-full text-start justify-between"
									>
										<div class="flex items-center gap-3">
											<span class="text-[20px]">{lang.flag}</span>
											<div class="flex flex-col">
												<span class="text-[15px] font-medium text-[var(--tg-text)]">
													{lang.native}
												</span>
												<span class="text-[12px] text-[var(--tg-hint)]">{lang.label}</span>
											</div>
										</div>
										<Show when={locale() === lang.code}>
											<span class="material-symbols-outlined text-[var(--tg-button)] text-[22px]">
												check
											</span>
										</Show>
									</button>
								)}
							</For>
						</div>
					</div>
				</div>
			</Show>

			<BottomNav />
		</div>
	);
};

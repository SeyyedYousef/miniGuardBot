import { useNavigate } from '@solidjs/router';
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
import type { ManagedBot, VerifiedBotTokenInfo } from '@/shared/api/bot-management.js';
import { botApi } from '@/shared/api/bot-management.js';
import { mockApiLogic } from '@/shared/api/mock-api.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { showToast } from '@/shared/ui/toast.js';
import {
	extractCleanBotToken,
	normalizeGroupLinkInput,
	openTelegramExternalLink,
} from '@/slices/home/home/ui/IndexPage.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

export const ManagedBotsPage: Component = () => {
	const navigate = useNavigate();
	const txt = () => uiText();

	const [showCreateModal, setShowCreateModal] = createSignal(false);
	const [botToken, setBotToken] = createSignal('');
	const [groupLink, setGroupLink] = createSignal('');
	const [groupTitle, setGroupTitle] = createSignal('');
	const [verifiedBot, setVerifiedBot] = createSignal<VerifiedBotTokenInfo | null>(null);
	const [isVerifyingToken, setIsVerifyingToken] = createSignal(false);
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

	onMount(() => {
		try {
			backButton.show();
			const off = backButton.onClick(() => {
				haptic.impact('light');
				if (showCreateModal()) setShowCreateModal(false);
				else navigate('/dashboard');
			});
			onCleanup(() => {
				off();
				backButton.hide();
			});
		} catch {}
	});

	const handleVerifyToken = async (rawInput?: string) => {
		const raw = (rawInput ?? botToken()).trim();
		const clean = extractCleanBotToken(raw);
		if (!clean) {
			setVerifiedBot(null);
			return;
		}
		setIsVerifyingToken(true);
		setErrorMsg('');
		try {
			const info = await botApi.verifyToken(clean);
			setVerifiedBot(info);
			haptic.notify('success');
		} catch (err: any) {
			const msg = err?.response?.data?.error;
			if (msg) {
				setErrorMsg(msg);
				setVerifiedBot(null);
				haptic.notify('error');
			}
		} finally {
			setIsVerifyingToken(false);
		}
	};

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
		const resolvedTitle = rawGroupTitle || '';

		const payload = {
			token,
			bot_token: token,
			username: verifiedBot()?.bot_username || `${cleanSlug || `bot_${botIdStr.slice(0, 5)}`}_bot`,
			bot_username:
				verifiedBot()?.bot_username || `${cleanSlug || `bot_${botIdStr.slice(0, 5)}`}_bot`,
			name: verifiedBot()?.bot_name || `${resolvedTitle || cleanSlug} Guard`,
			bot_name: verifiedBot()?.bot_name || `${resolvedTitle || cleanSlug} Guard`,
			bot_id: verifiedBot()?.bot_id || botIdNum,
			group_link: gLink,
			bound_group_link: gLink,
			group_title: resolvedTitle,
			bound_group_title: resolvedTitle,
		};

		try {
			const created: any = await botApi.registerBot(payload);

			haptic.notify('success');
			setBotToken('');
			setGroupLink('');
			setGroupTitle('');
			setVerifiedBot(null);
			setShowCreateModal(false);
			await refetch();
			showToast(txt().trialBadge, 'success');
			const targetGroupId = created?.group_id || created?.bound_group_id;
			if (targetGroupId) {
				navigate(`/group/${targetGroupId}`);
			} else if (created?.id) {
				navigate(`/bot/${created.id}/manage`);
			}
		} catch (e: any) {
			const errData = e?.response?.data;
			if (errData?.bot_username && errData?.admin_deep_link && !verifiedBot()) {
				setVerifiedBot({
					ok: true,
					bot_id: errData.bot_id || botIdNum,
					bot_username: errData.bot_username,
					bot_name: errData.bot_name || errData.bot_username,
					admin_deep_link: errData.admin_deep_link,
				});
			}
			setErrorMsg(errData?.error || txt().tokenErrorFormat);
			haptic.notify('error');
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteBot = async (bot: ManagedBot, e: Event) => {
		e.stopPropagation();
		haptic.impact('medium');
		try {
			await botApi.revokeBot(bot.id);
			haptic.notify('success');
			refetch();
		} catch {
			mockApiLogic('DELETE', `/bots/${bot.id}`);
			refetch();
		}
	};

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between">
					<div class="flex items-center gap-2">
						<button
							onClick={() => {
								haptic.impact('light');
								navigate('/dashboard');
							}}
							class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70"
						>
							<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
						</button>
						<h1 class="text-[17px] font-bold text-[var(--tg-text)]">{txt().myBotsTitle}</h1>
					</div>

					<button
						onClick={() => {
							haptic.impact('light');
							setErrorMsg('');
							setShowCreateModal(true);
						}}
						class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[13px] font-semibold flex items-center gap-1"
					>
						<span class="material-symbols-outlined text-[17px]">add</span>
						<span>{txt().createBotBtn}</span>
					</button>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				<Show
					when={(bots()?.length || 0) > 0}
					fallback={
						<div class="tg-section p-7 my-auto flex flex-col items-center text-center gap-4">
							<div class="w-15 h-15 rounded-[18px] bg-[var(--tg-accent-soft)] flex items-center justify-center text-[var(--tg-button)]">
								<span class="material-symbols-outlined text-[32px]">smart_toy</span>
							</div>
							<div class="space-y-1 max-w-xs">
								<p class="text-[16px] font-bold text-[var(--tg-text)]">{txt().modalTitle}</p>
								<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed">{txt().heroSub}</p>
							</div>
							<button
								onClick={() => {
									haptic.impact('medium');
									setShowCreateModal(true);
								}}
								class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-1.5"
							>
								<span class="material-symbols-outlined text-[19px]">add_circle</span>
								<span>{txt().createBotBtn}</span>
							</button>
						</div>
					}
				>
					<div>
						<div class="tg-section-header">{txt().myBotsTitle}</div>
						<div class="tg-section">
							<For each={bots() || []}>
								{(bot) => (
									<div
										onClick={() => {
											haptic.impact('light');
											navigate(`/bot/${bot.id}/manage`);
										}}
										class="tg-cell cursor-pointer"
									>
										<div class="w-10 h-10 rounded-[12px] bg-[var(--tg-button)] flex items-center justify-center text-white shrink-0">
											<span class="material-symbols-outlined text-[22px]">smart_toy</span>
										</div>

										<div class="flex-1 min-w-0">
											<div class="text-[15px] font-semibold text-[var(--tg-text)] truncate">
												{bot.bot_name}
											</div>
											<div
												dir="ltr"
												class="text-[12px] text-[var(--tg-hint)] font-mono truncate text-start rtl:text-right"
											>
												@{bot.bot_username}
											</div>
											<Show when={bot.group_link}>
												<div
													dir="ltr"
													class="text-[11px] text-[var(--tg-link)] font-mono truncate text-start rtl:text-right mt-0.5"
												>
													{bot.group_link}
												</div>
											</Show>
										</div>

										<button
											onClick={(e) => handleDeleteBot(bot, e)}
											class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-destructive)] hover:bg-[var(--tg-destructive)]/10"
										>
											<span class="material-symbols-outlined text-[19px]">delete</span>
										</button>

										<span class="material-symbols-outlined text-[var(--tg-hint)] text-[20px] rtl:rotate-180">
											chevron_right
										</span>
									</div>
								)}
							</For>
						</div>
					</div>
				</Show>
			</main>

			{/* Create Bot Sheet (Token + Group Link) */}
			<Show when={showCreateModal()}>
				<div
					class="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowCreateModal(false);
					}}
				>
					<div class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-3.5 shadow-2xl border-t border-[var(--tg-separator)]">
						<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1 mb-0.5" />
						<div class="flex items-center justify-between">
							<h2 class="text-[17px] font-bold text-[var(--tg-text)]">{txt().modalTitle}</h2>
							<button
								onClick={() => setShowCreateModal(false)}
								class="w-7 h-7 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center text-[var(--tg-hint)]"
							>
								<span class="material-symbols-outlined text-[18px]">close</span>
							</button>
						</div>

						<div class="px-3 py-2 rounded-xl bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-semibold flex items-center gap-2">
							<span class="material-symbols-outlined text-[17px]">verified_user</span>
							<span>{txt().oneBotOneGroupBanner}</span>
						</div>

						<Show when={errorMsg()}>
							<div class="text-[13px] text-[var(--tg-destructive)] bg-[var(--tg-destructive)]/10 rounded-xl px-3.5 py-2.5">
								{errorMsg()}
							</div>
						</Show>

						<div class="flex flex-col gap-1.5">
							<label class="text-[12.5px] font-bold text-[var(--tg-text)] px-1">
								۱. {txt().tokenLabel}
							</label>
							<div class="flex gap-2">
								<input
									type="text"
									value={botToken()}
									onInput={(e) => {
										const val = e.currentTarget.value;
										setBotToken(val);
										if (extractCleanBotToken(val)) {
											handleVerifyToken(val);
										} else {
											setVerifiedBot(null);
										}
									}}
									placeholder={txt().tokenPlaceholder}
									dir="ltr"
									class="flex-1 h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] font-mono text-[var(--tg-text)] placeholder-[var(--tg-hint)] focus:outline-none focus:border-[var(--tg-button)]"
								/>
								<button
									type="button"
									onClick={() => handleVerifyToken()}
									disabled={isVerifyingToken()}
									class="h-11 px-3 rounded-[10px] bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12.5px] font-bold shrink-0"
								>
									{isVerifyingToken() ? '...' : 'بررسی'}
								</button>
							</div>
						</div>

						<Show when={verifiedBot()}>
							{(vBot) => (
								<div class="p-3 rounded-xl bg-[#34C759]/10 border border-[#34C759]/30 flex flex-col gap-2">
									<div class="text-[12px] text-[var(--tg-text)] leading-relaxed">
										<b>۲. گام الزامی:</b> ابتدا ربات <b dir="ltr">@{vBot().bot_username}</b> را در
										گروه خود ادمین کنید:
									</div>
									<button
										type="button"
										onClick={() => openTelegramExternalLink(vBot().admin_deep_link)}
										class="w-full h-10 rounded-[10px] bg-[#34C759] text-white font-bold text-[12.5px] flex items-center justify-center gap-1.5"
									>
										<span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
										<span>افزودن @{vBot().bot_username} به گروه و ادمین کردن</span>
									</button>
								</div>
							)}
						</Show>

						<div class="flex flex-col gap-1">
							<label class="text-[12.5px] font-bold text-[var(--tg-text)] px-1">
								۳. {txt().groupLinkLabel} (پس از ادمین کردن ربات)
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

						<button
							onClick={handleCreateBot}
							disabled={isCreating()}
							class="tg-btn-primary w-full h-11 text-[14.5px] flex items-center justify-center gap-2 mt-1"
						>
							<Show
								when={!isCreating()}
								fallback={
									<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								}
							>
								<span>{txt().submitBotBtn}</span>
							</Show>
						</button>
					</div>
				</div>
			</Show>

			<BottomNav />
		</div>
	);
};

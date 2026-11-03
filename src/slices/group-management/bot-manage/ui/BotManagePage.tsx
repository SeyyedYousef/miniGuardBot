import { useNavigate, useParams } from '@solidjs/router';
import { backButton, openTelegramLink } from '@tma.js/sdk-solid';
import { type Component, createResource, For, onCleanup, onMount, Show } from 'solid-js';
import type { ManagedGroup } from '@/shared/api/bot-management.js';
import { botApi } from '@/shared/api/bot-management.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

export const BotManagePage: Component = () => {
	const navigate = useNavigate();
	const params = useParams();
	const botId = params.botId;
	const txt = () => uiText();

	const [bot] = createResource(
		() => botId,
		(id) => botApi.getBot(id),
	);
	const [groups] = createResource(
		() => botId,
		(id) => botApi.listGroups(id),
	);

	onMount(() => {
		try {
			backButton.show();
			const off = backButton.onClick(() => {
				haptic.impact('light');
				navigate('/managed-bots');
			});
			onCleanup(() => {
				off();
				backButton.hide();
			});
		} catch {}
	});

	const handleInviteToGroup = () => {
		if (!bot()) return;
		haptic.impact('medium');
		const url = `https://t.me/${bot()!.bot_username.replace('@', '')}?startgroup=start&admin=restrict_members+delete_messages+ban_users+invite_users+pin_messages`;
		try {
			openTelegramLink(url);
		} catch {
			window.open(url, '_blank');
		}
	};

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between">
					<div class="flex items-center gap-2 min-w-0">
						<button
							onClick={() => {
								haptic.impact('light');
								navigate('/managed-bots');
							}}
							class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70"
						>
							<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
						</button>
						<div class="flex flex-col min-w-0">
							<h1 class="text-[16px] font-bold text-[var(--tg-text)] truncate">
								{bot()?.bot_name || 'MiniGuard Bot'}
							</h1>
							<span
								dir="ltr"
								class="text-[11px] text-[var(--tg-hint)] font-mono truncate text-start rtl:text-right"
							>
								@{bot()?.bot_username || 'bot'}
							</span>
						</div>
					</div>

					<span class="text-[12px] font-semibold text-[#34C759] px-2.5 py-1 rounded-lg bg-[#34C759]/10">
						{txt().botActive}
					</span>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-5">
				{/* Dedicated 1-to-1 Group Invite Card */}
				<div class="tg-section p-5 flex flex-col items-center text-center gap-3.5">
					<div class="w-14 h-14 rounded-[18px] bg-[var(--tg-accent-soft)] flex items-center justify-center text-[var(--tg-button)]">
						<span class="material-symbols-outlined text-[30px]">group_add</span>
					</div>

					<div class="space-y-1 max-w-xs">
						<h2 class="text-[16px] font-bold text-[var(--tg-text)]">{txt().heroTitle}</h2>
						<p class="text-[12.5px] text-[var(--tg-hint)] leading-relaxed">
							{txt().oneBotOneGroupBanner}
						</p>
					</div>

					<Show when={bot()?.group_link}>
						<div class="w-full px-3.5 py-2 rounded-xl bg-[var(--tg-secondary-bg)] flex items-center justify-between text-[12px]">
							<span class="text-[var(--tg-hint)]">{txt().groupLinkAttachedLabel}</span>
							<span dir="ltr" class="font-mono font-semibold text-[var(--tg-link)] truncate">
								{bot()?.group_link}
							</span>
						</div>
					</Show>

					<button
						onClick={handleInviteToGroup}
						class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-2"
					>
						<span class="material-symbols-outlined text-[19px]">person_add</span>
						<span>{txt().addGroupBtn} (Telegram)</span>
					</button>
				</div>

				{/* Connected Group for this Bot */}
				<div>
					<div class="tg-section-header">{txt().groupsHeader}</div>
					<div class="tg-section">
						<Show
							when={(groups()?.length || 0) > 0}
							fallback={
								<div class="p-5 text-center text-[13px] text-[var(--tg-hint)]">
									{txt().noGroupsTitle}
								</div>
							}
						>
							<For each={groups() || []}>
								{(group: ManagedGroup) => (
									<button
										onClick={() => {
											haptic.impact('light');
											navigate(`/group/${group.id}`);
										}}
										class="tg-cell w-full text-start"
									>
										<div class="w-10 h-10 rounded-full bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[15px] shrink-0">
											{group.chat_title?.trim()?.[0]?.toUpperCase() || 'G'}
										</div>

										<div class="flex-1 min-w-0">
											<div class="text-[15px] font-semibold text-[var(--tg-text)] truncate">
												{group.chat_title}
											</div>
											<div class="text-[12px] text-[var(--tg-hint)] font-mono">
												{group.members_count.toLocaleString()} {txt().membersLabel}
											</div>
										</div>

										<span class="material-symbols-outlined text-[var(--tg-hint)] text-[20px] rtl:rotate-180">
											chevron_right
										</span>
									</button>
								)}
							</For>
						</Show>
					</div>
				</div>

				{/* Default Bot /start & 4 Group Join Onboarding Messages Preview */}
				<div>
					<div class="tg-section-header">{txt().botHiddenFlowsTitle}</div>
					<div class="tg-section p-4 flex flex-col gap-3.5">
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center gap-2 text-[13.5px] font-bold text-[var(--tg-text)]">
								<span class="material-symbols-outlined text-[18px] text-[var(--tg-button)]">
									smart_toy
								</span>
								<span>{txt().childStartPreviewTitle}</span>
							</div>
							<div class="p-3 rounded-xl bg-[var(--tg-secondary-bg)] text-[12.5px] text-[var(--tg-text)] whitespace-pre-line leading-relaxed border border-[var(--tg-separator)]">
								{txt().childStartPreviewBody}
							</div>
						</div>

						<div class="flex flex-col gap-1.5 pt-1">
							<div class="flex items-center gap-2 text-[13.5px] font-bold text-[var(--tg-text)]">
								<span class="material-symbols-outlined text-[18px] text-[#34C759]">
									playlist_add_check_circle
								</span>
								<span>{txt().join4MsgsTitle}</span>
							</div>
							<div class="flex flex-col gap-2 text-[12px] text-[var(--tg-hint)] bg-[var(--tg-secondary-bg)] p-3 rounded-xl border border-[var(--tg-separator)]">
								<p class="text-[var(--tg-text)]">{txt().joinMsg1}</p>
								<p class="text-[var(--tg-text)]">{txt().joinMsg2}</p>
								<p class="text-[var(--tg-text)]">{txt().joinMsg3}</p>
								<p class="text-[var(--tg-text)]">{txt().joinMsg4}</p>
							</div>
						</div>
					</div>
				</div>
			</main>

			<BottomNav />
		</div>
	);
};

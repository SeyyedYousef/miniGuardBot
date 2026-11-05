import { useNavigate } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, For, onMount, Show } from 'solid-js';
import type { ManagedBot, ManagedGroup } from '@/shared/api/bot-management.js';
import { botApi } from '@/shared/api/bot-management.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { colorScheme, toggleThemeScheme } from '@/shared/lib/tg-theme.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

export const DashboardPage: Component = () => {
	const navigate = useNavigate();
	const txt = () => uiText();

	onMount(() => {
		try {
			backButton.hide();
		} catch {}
	});

	const [groups, { refetch }] = createResource(async () => {
		try {
			const allBots = await botApi.listBots();
			const bots = (allBots || []).filter(
				(b: ManagedBot) =>
					b.bot_username?.toLowerCase() !== 'miniguardbot' &&
					b.bot_username !== 'devs_miniguard_bot',
			);
			const mockGroups = ((window as any).__mockGroups || []) as ManagedGroup[];
			if (!bots || bots.length === 0) return mockGroups;
			const lists = await Promise.all(
				bots.map((b: ManagedBot) => botApi.listGroups(b.id).catch(() => [] as ManagedGroup[])),
			);
			const combined = [...lists.flat(), ...mockGroups];
			const seen = new Set<string>();
			return combined.filter((g) => {
				if (!g?.id || g.id === 'g1' || seen.has(g.id)) return false;
				seen.add(g.id);
				return true;
			});
		} catch {
			return ((window as any).__mockGroups || []) as ManagedGroup[];
		}
	});

	const handleOpenDemoGroup = async () => {
		haptic.impact('medium');
		const win = window as any;
		if (!win.__mockGroups) win.__mockGroups = [];
		const exists = win.__mockGroups.some((g: any) => g.id === 'demo-group');
		if (!exists) {
			win.__mockGroups.unshift({
				id: 'demo-group',
				bot_id: 'mock-bot-1',
				bot_username: 'devs_miniguard_bot',
				group_link: 'https://t.me/TelegramDevelopers',
				telegram_chat_id: -100192837465,
				chat_title: 'Telegram Developers Community',
				chat_type: 'supergroup',
				members_count: 14820,
				photo_url: '',
				subscription_status: 'trial',
				trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
				paid_until: '',
				is_active: true,
			});
		}
		await refetch();
		navigate('/group/demo-group');
	};

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between">
					<h1 class="text-[17px] font-bold text-[var(--tg-text)] tracking-tight">
						{txt().groupsHeader}
					</h1>

					<div class="flex items-center gap-2">
						<button
							onClick={() => {
								haptic.impact('light');
								toggleThemeScheme();
							}}
							class="w-8 h-8 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[var(--tg-link)] flex items-center justify-center active:opacity-70"
							aria-label={txt().themeTitle}
						>
							<span class="material-symbols-outlined text-[18px]">
								{colorScheme() === 'dark' ? 'light_mode' : 'dark_mode'}
							</span>
						</button>

						<button
							onClick={() => {
								haptic.impact('light');
								navigate('/managed-bots');
							}}
							class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[13px] font-semibold flex items-center gap-1 active:opacity-70 transition-opacity"
						>
							<span class="material-symbols-outlined text-[17px]">add</span>
							<span>{txt().addGroupBtn}</span>
						</button>
					</div>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-5 gap-4">
				<Show
					when={!groups.loading}
					fallback={
						<div class="flex-1 flex items-center justify-center py-20">
							<div class="w-6 h-6 border-2 border-[var(--tg-button)] border-t-transparent rounded-full animate-spin" />
						</div>
					}
				>
					<Show
						when={(groups()?.length || 0) > 0}
						fallback={
							<div class="tg-section p-7 my-auto flex flex-col items-center text-center gap-4">
								<div class="w-15 h-15 rounded-[18px] bg-[var(--tg-accent-soft)] flex items-center justify-center text-[var(--tg-button)]">
									<span class="material-symbols-outlined text-[32px]">group_off</span>
								</div>

								<div class="space-y-1 max-w-xs">
									<p class="text-[16px] font-bold text-[var(--tg-text)]">{txt().noGroupsTitle}</p>
									<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed">
										{txt().noGroupsDesc}
									</p>
								</div>

								<div class="w-full flex flex-col gap-2.5 pt-2">
									<button
										onClick={() => {
											haptic.impact('medium');
											navigate('/');
										}}
										class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-1.5"
									>
										<span class="material-symbols-outlined text-[19px]">add_circle</span>
										<span>{txt().createBotBtn}</span>
									</button>

									<button
										onClick={handleOpenDemoGroup}
										class="tg-btn-secondary w-full h-10 text-[13px] flex items-center justify-center gap-1.5"
									>
										<span class="material-symbols-outlined text-[18px]">science</span>
										<span>{txt().tryDemoGroup}</span>
									</button>
								</div>
							</div>
						}
					>
						<div>
							<div class="tg-section-header">{txt().groupsHeader}</div>
							<div class="tg-section">
								<For each={groups()}>
									{(group) => {
										const isTrial = () => (group.subscription_status || 'trial') === 'trial';
										const title = () => group.chat_title || (group as any).title || 'Group';
										const count = () =>
											Number(
												group.members_count ?? (group as any).member_count ?? 1,
											).toLocaleString();
										return (
											<button
												onClick={() => {
													haptic.impact('light');
													navigate(`/group/${group.id}`);
												}}
												class="tg-cell w-full text-start"
											>
												<div class="w-11 h-11 rounded-full bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[16px] shrink-0">
													{title().trim()?.[0]?.toUpperCase() || 'G'}
												</div>

												<div class="flex-1 min-w-0">
													<div class="text-[15px] font-semibold text-[var(--tg-text)] truncate">
														{title()}
													</div>
													<div class="text-[12px] text-[var(--tg-hint)] flex items-center gap-1.5 mt-0.5 flex-wrap">
														<span class="font-mono tabular-nums">
															{count()} {txt().membersLabel}
														</span>
														<span>•</span>
														<span
															class={
																isTrial()
																	? 'text-[#F59E0B] font-semibold'
																	: 'text-[#34C759] font-semibold'
															}
														>
															{isTrial() ? txt().trialBadge : txt().paidBadge}
														</span>
													</div>
													<Show when={group.group_link}>
														<div
															dir="ltr"
															class="text-[11px] font-mono text-[var(--tg-link)] truncate mt-0.5 text-start rtl:text-right"
														>
															{group.group_link}
														</div>
													</Show>
												</div>

												<span class="material-symbols-outlined text-[var(--tg-hint)] rtl:rotate-180 text-[20px]">
													chevron_right
												</span>
											</button>
										);
									}}
								</For>
							</div>
						</div>
					</Show>
				</Show>
			</main>

			<BottomNav />
		</div>
	);
};

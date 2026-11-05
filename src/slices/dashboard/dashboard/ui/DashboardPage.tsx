import { useNavigate } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createResource, createSignal, For, onMount, Show } from 'solid-js';
import type { ManagedBot, ManagedGroup } from '@/shared/api/bot-management.js';
import { botApi, groupApi } from '@/shared/api/bot-management.js';
import { mockApiLogic } from '@/shared/api/mock-api.js';
import { uiText } from '@/shared/i18n/group-ui.js';
import { isRtl } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { colorScheme, toggleThemeScheme } from '@/shared/lib/tg-theme.js';
import { showToast } from '@/shared/ui/toast.js';
import {
	normalizeGroupLinkInput,
	openTelegramExternalLink,
} from '@/slices/home/home/ui/IndexPage.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

export const DashboardPage: Component = () => {
	const navigate = useNavigate();
	const txt = () => uiText();

	const [editingGroup, setEditingGroup] = createSignal<ManagedGroup | null>(null);
	const [editGroupLink, setEditGroupLink] = createSignal('');
	const [editGroupTitle, setEditGroupTitle] = createSignal('');
	const [editErrorMsg, setEditErrorMsg] = createSignal('');
	const [isSavingEdit, setIsSavingEdit] = createSignal(false);

	const [deletingGroup, setDeletingGroup] = createSignal<ManagedGroup | null>(null);
	const [isDeleting, setIsDeleting] = createSignal(false);

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

	const openEditGroupModal = (group: ManagedGroup, e: Event) => {
		e.stopPropagation();
		haptic.impact('light');
		setEditingGroup(group);
		setEditGroupLink(group.group_link?.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '@') || '');
		setEditGroupTitle(group.chat_title || (group as any).title || '');
		setEditErrorMsg('');
	};

	const handleSaveEditGroup = async () => {
		const g = editingGroup();
		if (!g) return;
		const gLink = normalizeGroupLinkInput(editGroupLink(), editGroupTitle());
		if (!gLink) {
			setEditErrorMsg('لطفاً آیدی یا لینک گروه را وارد کنید (مثال: @islamicBazaar).');
			haptic.notify('warning');
			return;
		}
		setIsSavingEdit(true);
		setEditErrorMsg('');
		try {
			await groupApi.updateGroup(g.id, {
				group_link: gLink,
				chat_title: editGroupTitle().trim(),
				group_title: editGroupTitle().trim(),
			});
			haptic.notify('success');
			showToast('اطلاعات گروه با موفقیت اعتبارسنجی و ذخیره شد ✅', 'success');
			setEditingGroup(null);
			await refetch();
		} catch (err: any) {
			setEditErrorMsg(
				err?.response?.data?.error ||
					'خطا در بروزرسانی گروه. لطفاً مطمئن شوید ربات در گروه ادمین است.',
			);
			haptic.notify('error');
		} finally {
			setIsSavingEdit(false);
		}
	};

	const handleConfirmDeleteGroup = async () => {
		const g = deletingGroup();
		if (!g) return;
		setIsDeleting(true);
		try {
			await groupApi.revokeGroup(g.id);
			if (g.bot_id) {
				await botApi.revokeBot(g.bot_id).catch(() => {});
			}
		} catch {
			mockApiLogic('DELETE', `/groups/${g.id}`);
		} finally {
			const win = window as any;
			if (Array.isArray(win.__mockGroups)) {
				win.__mockGroups = win.__mockGroups.filter((item: any) => item.id !== g.id);
			}
			setIsDeleting(false);
			setDeletingGroup(null);
			haptic.notify('success');
			showToast('گروه و ربات متصل با موفقیت حذف شدند 🗑️', 'success');
			await refetch();
		}
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
											<div
												onClick={() => {
													haptic.impact('light');
													navigate(`/group/${group.id}`);
												}}
												class="tg-cell w-full text-start cursor-pointer"
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

												<div class="flex items-center gap-1 shrink-0">
													<button
														onClick={(e) => openEditGroupModal(group, e)}
														title="ویرایش آیدی یا نام گروه"
														class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] bg-[var(--tg-accent-soft)] active:opacity-70"
													>
														<span class="material-symbols-outlined text-[17px]">edit</span>
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															haptic.impact('medium');
															setDeletingGroup(group);
														}}
														title="حذف گروه"
														class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-destructive)] bg-[var(--tg-destructive)]/10 active:opacity-70"
													>
														<span class="material-symbols-outlined text-[18px]">delete</span>
													</button>
												</div>

												<span class="material-symbols-outlined text-[var(--tg-hint)] rtl:rotate-180 text-[20px]">
													chevron_right
												</span>
											</div>
										);
									}}
								</For>
							</div>
						</div>
					</Show>
				</Show>
			</main>

			{/* Edit Group Modal */}
			<Show when={editingGroup()}>
				{(g) => (
					<div
						class="fixed inset-0 z-[105] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
						onClick={(e) => {
							if (e.target === e.currentTarget) setEditingGroup(null);
						}}
					>
						<div class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-3.5 shadow-2xl border-t border-[var(--tg-separator)]">
							<div class="w-9 h-1 rounded-full bg-[var(--tg-hint)]/30 mx-auto -mt-1 mb-0.5" />
							<div class="flex items-center justify-between">
								<h3 class="text-[16px] font-bold text-[var(--tg-text)]">
									ویرایش اطلاعات گروه «{g().chat_title || (g() as any).title}»
								</h3>
								<button
									onClick={() => setEditingGroup(null)}
									class="w-7 h-7 rounded-full bg-[var(--tg-secondary-bg)] flex items-center justify-center text-[var(--tg-hint)]"
								>
									<span class="material-symbols-outlined text-[18px]">close</span>
								</button>
							</div>

							<Show when={g().bot_username}>
								<button
									type="button"
									onClick={() =>
										openTelegramExternalLink(
											`https://t.me/${g().bot_username!.replace('@', '')}?startgroup=start&admin=restrict_members+delete_messages+ban_users+invite_users+pin_messages+manage_chat`,
										)
									}
									class="w-full h-10 rounded-[10px] bg-[#34C759]/15 text-[#34C759] font-bold text-[12.5px] flex items-center justify-center gap-1.5 border border-[#34C759]/30"
								>
									<span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
									<span>افزودن @{g().bot_username} به گروه و ادمین کردن در تلگرام</span>
								</button>
							</Show>

							<Show when={editErrorMsg()}>
								<div class="text-[12.5px] text-[var(--tg-destructive)] bg-[var(--tg-destructive)]/10 rounded-xl px-3.5 py-2.5 leading-relaxed">
									{editErrorMsg()}
								</div>
							</Show>

							<div class="flex flex-col gap-1">
								<label class="text-[12.5px] font-bold text-[var(--tg-text)] px-1">
									یوزرنیم یا لینک صحیح گروه (مثال: @islamicBazaar)
								</label>
								<input
									type="text"
									value={editGroupLink()}
									onInput={(e) => setEditGroupLink(e.currentTarget.value)}
									dir="ltr"
									placeholder="@islamicBazaar"
									class="w-full h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] font-mono text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-button)]"
								/>
							</div>

							<div class="flex flex-col gap-1">
								<label class="text-[12.5px] font-semibold text-[var(--tg-hint)] px-1">
									نام نمایشی گروه (اختیاری)
								</label>
								<input
									type="text"
									value={editGroupTitle()}
									onInput={(e) => setEditGroupTitle(e.currentTarget.value)}
									placeholder="مثلاً: بازار اسلامی"
									class="w-full h-11 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-[10px] px-3.5 text-[14px] text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-button)]"
								/>
							</div>

							<button
								onClick={handleSaveEditGroup}
								disabled={isSavingEdit()}
								class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-1.5 mt-1"
							>
								<Show
									when={!isSavingEdit()}
									fallback={
										<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									}
								>
									<span class="material-symbols-outlined text-[18px]">check</span>
									<span>بررسی ادمین و ذخیره تغییرات</span>
								</Show>
							</button>
						</div>
					</div>
				)}
			</Show>

			{/* Delete Confirmation Modal */}
			<Show when={deletingGroup()}>
				{(g) => (
					<div
						class="fixed inset-0 z-[110] bg-black/55 backdrop-blur-[2px] flex items-end justify-center"
						onClick={(e) => {
							if (e.target === e.currentTarget) setDeletingGroup(null);
						}}
					>
						<div class="w-full max-w-md bg-[var(--tg-section-bg)] rounded-t-[20px] p-5 pb-8 flex flex-col gap-4 shadow-2xl border-t border-[var(--tg-separator)] text-center">
							<div class="w-12 h-12 rounded-full bg-[var(--tg-destructive)]/15 text-[var(--tg-destructive)] flex items-center justify-center mx-auto">
								<span class="material-symbols-outlined text-[26px]">delete_forever</span>
							</div>
							<div class="space-y-1">
								<h3 class="text-[16px] font-bold text-[var(--tg-text)]">
									حذف گروه «{g().chat_title || (g() as any).title}»؟
								</h3>
								<p class="text-[13px] text-[var(--tg-hint)] leading-relaxed">
									آیا از حذف کامل این گروه و ربات متصل به آن از لیست خود مطمئن هستید؟
								</p>
							</div>
							<div class="flex gap-2.5">
								<button
									onClick={() => setDeletingGroup(null)}
									class="tg-btn-secondary flex-1 h-11 text-[14px]"
								>
									انصراف
								</button>
								<button
									onClick={handleConfirmDeleteGroup}
									disabled={isDeleting()}
									class="flex-1 h-11 rounded-[11px] bg-[var(--tg-destructive)] text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:opacity-80"
								>
									<span class="material-symbols-outlined text-[18px]">delete</span>
									<span>{isDeleting() ? 'در حال حذف...' : 'بله، حذف شود'}</span>
								</button>
							</div>
						</div>
					</div>
				)}
			</Show>

			<BottomNav />
		</div>
	);
};

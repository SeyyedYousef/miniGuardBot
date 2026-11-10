import { useNavigate } from '@solidjs/router';
import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { type OwnerEntityItem, ownerApi } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';

export const OwnerEntities: Component = () => {
	const navigate = useNavigate();
	const [groups, setGroups] = createSignal<OwnerEntityItem[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal('');
	const [successMsg, setSuccessMsg] = createSignal('');
	const [busyId, setBusyId] = createSignal<string>('');

	// Which group card has its credit editor open
	const [expandedCreditId, setExpandedCreditId] = createSignal<string | null>(null);
	const [customDaysInput, setCustomDaysInput] = createSignal<number>(30);

	const fetchData = async () => {
		setLoading(true);
		setError('');
		try {
			const allEntities = await ownerApi.listEntities();
			setGroups(allEntities.filter((e) => e.type === 'group') || []);
		} catch (e: any) {
			setError(e.response?.data?.error || 'خطا در دریافت لیست گروه‌ها و بات‌ها');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		fetchData();
	});

	const showFlash = (msg: string) => {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 4000);
	};

	const handleCreditAction = async (
		entity: OwnerEntityItem,
		days: number,
		hours: number,
		mode: 'add' | 'set',
	) => {
		haptic.impact('medium');
		setBusyId(String(entity.id));
		setError('');
		try {
			const res = await ownerApi.addEntityCredit(
				entity.id,
				days,
				mode === 'set' ? `تنظیم دقیق اعتبار روی ${days} روز` : `افزودن ${days} روز اعتبار`,
				hours,
				mode,
			);
			haptic.notify('success');
			showFlash(
				`✅ اعتبار گروه «${entity.title}» بروزرسانی شد: ${res.remaining_label || `${days} روز`}`,
			);
			await fetchData();
		} catch (e: any) {
			haptic.notify('error');
			setError(e.response?.data?.error || 'خطا در بروزرسانی اعتبار گروه');
		} finally {
			setBusyId('');
		}
	};

	const handleToggleStatus = async (entity: OwnerEntityItem) => {
		haptic.impact('medium');
		setBusyId(String(entity.id));
		setError('');
		const nextActive = entity.status !== 'active';
		try {
			await ownerApi.toggleEntityStatus(entity.id, nextActive);
			haptic.notify('success');
			showFlash(
				nextActive
					? `✅ ربات و فایروال گروه «${entity.title}» فعال شد.`
					: `⏸ ربات گروه «${entity.title}» موقتاً متوقف شد.`,
			);
			await fetchData();
		} catch {
			haptic.notify('error');
			setError('خطا در تغییر وضعیت گروه');
		} finally {
			setBusyId('');
		}
	};

	const totalMembers = () =>
		groups().reduce((sum, g) => sum + (Number(g.members_count) || 0), 0);

	const activeBotsCount = () =>
		groups().filter((g) => g.status === 'active').length;

	const formatJalaliDate = (iso?: string) => {
		if (!iso) return '---';
		try {
			return new Date(iso).toLocaleDateString('fa-IR', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
		} catch {
			return '---';
		}
	};

	return (
		<div class="space-y-4">
			{/* Top Summary Cards */}
			<div class="grid grid-cols-3 gap-2.5">
				<div class="tg-section p-3.5 flex flex-col items-center justify-center text-center">
					<span class="text-[11px] text-[var(--tg-hint)] font-medium">کل گروه‌ها</span>
					<span class="text-[20px] font-bold text-[var(--tg-text)] font-mono mt-0.5">
						{groups().length}
					</span>
				</div>
				<div class="tg-section p-3.5 flex flex-col items-center justify-center text-center">
					<span class="text-[11px] text-[var(--tg-hint)] font-medium">بات‌های فعال</span>
					<span class="text-[20px] font-bold text-[#34C759] font-mono mt-0.5">
						{activeBotsCount()}
					</span>
				</div>
				<div class="tg-section p-3.5 flex flex-col items-center justify-center text-center">
					<span class="text-[11px] text-[var(--tg-hint)] font-medium">کل اعضا</span>
					<span class="text-[20px] font-bold text-[var(--tg-link)] font-mono mt-0.5">
						{totalMembers().toLocaleString('fa-IR')}
					</span>
				</div>
			</div>

			{/* Section Title & Refresh */}
			<div class="flex items-center justify-between px-1">
				<span class="text-[13px] font-bold text-[var(--tg-hint)]">
					لیست گروه‌ها و ربات‌های اختصاصی متصل
				</span>
				<button
					onClick={() => {
						haptic.impact('light');
						fetchData();
					}}
					disabled={loading()}
					class="text-[12px] font-semibold text-[var(--tg-link)] flex items-center gap-1"
				>
					<span class={`material-symbols-outlined text-[15px] ${loading() ? 'animate-spin' : ''}`}>
						refresh
					</span>
					<span>بروزرسانی</span>
				</button>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)] font-medium">
					{error()}
				</div>
			</Show>

			<Show when={successMsg()}>
				<div class="p-3.5 bg-[#34C759]/12 rounded-xl text-[13px] text-[#34C759] font-semibold">
					{successMsg()}
				</div>
			</Show>

			<Show
				when={!loading()}
				fallback={
					<div class="tg-section p-8 flex flex-col items-center justify-center gap-2">
						<div class="w-6 h-6 border-2 border-[var(--tg-button)] border-t-transparent rounded-full animate-spin" />
						<span class="text-[12.5px] text-[var(--tg-hint)]">در حال دریافت اطلاعات گروه‌ها...</span>
					</div>
				}
			>
				<div class="space-y-3.5">
					<For
						each={groups()}
						fallback={
							<div class="tg-section p-8 text-center text-[13px] text-[var(--tg-hint)]">
								هیچ گروه یا ربات اختصاصی ثبت نشده است.
							</div>
						}
					>
						{(gr) => {
							const isExpanded = () => expandedCreditId() === String(gr.id);
							const isBusy = () => busyId() === String(gr.id);

							return (
								<div class="tg-section p-4 space-y-3.5">
									{/* 1. Card Header: Group Title & Status Badge */}
									<div class="flex items-start justify-between gap-3">
										<div class="flex items-center gap-3 min-w-0">
											<div class="w-11 h-11 rounded-2xl bg-[var(--tg-button)] flex items-center justify-center text-white font-bold text-[16px] shrink-0 shadow-xs">
												<span class="material-symbols-outlined text-[22px]">groups</span>
											</div>
											<div class="flex flex-col min-w-0">
												<h3 class="text-[15px] font-bold text-[var(--tg-text)] truncate">
													{gr.title}
												</h3>
												<span dir="ltr" class="text-[11.5px] text-[var(--tg-hint)] font-mono truncate text-start">
													ID: {gr.telegram_id}
												</span>
											</div>
										</div>

										<span
											class={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
												gr.status === 'active'
													? gr.subscription_status === 'paid'
														? 'bg-[#34C759]/12 text-[#34C759]'
														: 'bg-[#FF9500]/12 text-[#FF9500]'
													: 'bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)]'
											}`}
										>
											{gr.status === 'active'
												? gr.subscription_status === 'paid'
													? '🟢 اشتراک ویژه'
													: '🟡 تست آزمایشی'
												: '🔴 متوقف / منقضی'}
										</span>
									</div>

									{/* 2. Clean 2x2 Info Grid */}
									<div class="grid grid-cols-2 gap-2">
										<div class="p-2.5 rounded-xl bg-[var(--tg-secondary-bg)] flex flex-col gap-0.5">
											<span class="text-[10.5px] text-[var(--tg-hint)]">ربات اختصاصی گروه</span>
											<span dir="ltr" class="text-[12.5px] font-bold text-[var(--tg-link)] font-mono truncate text-start">
												@{gr.bot_username || 'MiniGuardBot'}
											</span>
											<Show when={gr.bot_name}>
												<span class="text-[11px] text-[var(--tg-text)] truncate">{gr.bot_name}</span>
											</Show>
										</div>

										<div class="p-2.5 rounded-xl bg-[var(--tg-secondary-bg)] flex flex-col gap-0.5">
											<span class="text-[10.5px] text-[var(--tg-hint)]">مالک و ادمین</span>
											<span class="text-[12.5px] font-bold text-[var(--tg-text)] truncate">
												{gr.owner_name || 'مدیر گروه'}
											</span>
											<span dir="ltr" class="text-[11px] text-[var(--tg-hint)] font-mono truncate text-start">
												#{gr.owner_id} {gr.owner_username ? `(@${gr.owner_username})` : ''}
											</span>
										</div>

										<div class="p-2.5 rounded-xl bg-[var(--tg-secondary-bg)] flex items-center justify-between">
											<span class="text-[11px] text-[var(--tg-hint)]">تعداد اعضا</span>
											<span class="text-[13px] font-bold text-[var(--tg-text)] font-mono">
												{(gr.members_count || 1).toLocaleString('fa-IR')} نفر
											</span>
										</div>

										<div class="p-2.5 rounded-xl bg-[var(--tg-secondary-bg)] flex items-center justify-between">
											<span class="text-[11px] text-[var(--tg-hint)]">اسپم مسدودشده</span>
											<span class="text-[13px] font-bold text-[#34C759] font-mono">
												{(gr.spam_blocked || 0).toLocaleString('fa-IR')} مورد
											</span>
										</div>
									</div>

									{/* 3. Remaining Credit Status Banner */}
									<div class="p-3 rounded-xl bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] flex items-center justify-between gap-2">
										<div class="flex items-center gap-2">
											<span class="material-symbols-outlined text-[19px] text-[#FF9500]">
												schedule
											</span>
											<div class="flex flex-col">
												<span class="text-[11px] text-[var(--tg-hint)]">اعتبار باقی‌مانده</span>
												<span class="text-[13.5px] font-bold text-[var(--tg-text)]">
													{gr.remaining_label || `${gr.credit_balance} روز مانده`}
												</span>
											</div>
										</div>
										<div class="text-end">
											<span class="text-[10.5px] text-[var(--tg-hint)] block">تاریخ انقضا</span>
											<span class="text-[12px] font-semibold text-[var(--tg-text)]">
												{formatJalaliDate(gr.expires_at)}
											</span>
										</div>
									</div>

									{/* 4. Primary Action Buttons */}
									<div class="grid grid-cols-3 gap-2 pt-0.5">
										<button
											type="button"
											onClick={() => {
												haptic.impact('light');
												if (isExpanded()) {
													setExpandedCreditId(null);
												} else {
													setCustomDaysInput(gr.credit_balance || 30);
													setExpandedCreditId(String(gr.id));
												}
											}}
											class={`h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-colors ${
												isExpanded()
													? 'bg-[var(--tg-button)] text-white'
													: 'bg-[var(--tg-accent-soft)] text-[var(--tg-link)]'
											}`}
										>
											<span class="material-symbols-outlined text-[16px]">add_card</span>
											<span>مدیریت اعتبار</span>
										</button>

										<button
											type="button"
											onClick={() => {
												haptic.impact('light');
												navigate(`/group/${gr.id}`);
											}}
											class="h-9 rounded-xl bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] text-[12px] font-semibold flex items-center justify-center gap-1 border border-[var(--tg-separator)]"
										>
											<span class="material-symbols-outlined text-[16px]">settings</span>
											<span>پنل گروه</span>
										</button>

										<button
											type="button"
											disabled={isBusy()}
											onClick={() => handleToggleStatus(gr)}
											class={`h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 ${
												gr.status === 'active'
													? 'bg-[var(--tg-destructive)]/12 text-[var(--tg-destructive)]'
													: 'bg-[#34C759]/12 text-[#34C759]'
											}`}
										>
											<span class="material-symbols-outlined text-[16px]">
												{gr.status === 'active' ? 'pause_circle' : 'play_circle'}
											</span>
											<span>{gr.status === 'active' ? 'تعلیق ربات' : 'فعال‌سازی'}</span>
										</button>
									</div>

									{/* 5. Expandable Credit Management Drawer */}
									<Show when={isExpanded()}>
										<div class="p-3.5 rounded-xl bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] space-y-3">
											<div class="flex items-center justify-between">
												<span class="text-[12.5px] font-bold text-[var(--tg-text)]">
													تغییر سریع اعتبار «{gr.title}»
												</span>
												<button
													type="button"
													onClick={() => setExpandedCreditId(null)}
													class="text-[11px] text-[var(--tg-hint)]"
												>
													بستن ✕
												</button>
											</div>

											{/* Quick One-Tap Buttons */}
											<div class="grid grid-cols-4 gap-1.5">
												<button
													type="button"
													disabled={isBusy()}
													onClick={() => handleCreditAction(gr, 0, 24, 'set')}
													class="h-8 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[11.5px] font-semibold text-[var(--tg-text)]"
												>
													تست ۲۴ساعته
												</button>
												<button
													type="button"
													disabled={isBusy()}
													onClick={() => handleCreditAction(gr, 7, 0, 'add')}
													class="h-8 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[11.5px] font-semibold text-[var(--tg-link)]"
												>
													+۷ روز
												</button>
												<button
													type="button"
													disabled={isBusy()}
													onClick={() => handleCreditAction(gr, 30, 0, 'add')}
													class="h-8 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[11.5px] font-bold text-[#34C759]"
												>
													+۳۰ روز
												</button>
												<button
													type="button"
													disabled={isBusy()}
													onClick={() => handleCreditAction(gr, 0, 0, 'set')}
													class="h-8 rounded-lg bg-[var(--tg-destructive)]/12 text-[11.5px] font-semibold text-[var(--tg-destructive)]"
												>
													صفر کردن
												</button>
											</div>

											{/* Exact Custom Days Input */}
											<div class="pt-1 border-t border-[var(--tg-separator)] space-y-2">
												<label class="block text-[11px] text-[var(--tg-hint)]">
													تعداد روز دلخواه را وارد کنید:
												</label>
												<div class="flex items-center gap-2">
													<input
														type="number"
														dir="ltr"
														min="0"
														max="3650"
														value={customDaysInput()}
														onInput={(e) => setCustomDaysInput(Number(e.currentTarget.value) || 0)}
														class="h-9 w-24 px-3 rounded-lg bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] text-[13px] font-mono font-bold text-[var(--tg-text)] text-center outline-none"
													/>
													<button
														type="button"
														disabled={isBusy()}
														onClick={() => handleCreditAction(gr, customDaysInput(), 0, 'set')}
														class="flex-1 h-9 px-3 rounded-lg bg-[var(--tg-button)] text-white text-[12px] font-bold"
													>
														تنظیم دقیق روی {customDaysInput()} روز
													</button>
													<button
														type="button"
														disabled={isBusy()}
														onClick={() => handleCreditAction(gr, customDaysInput(), 0, 'add')}
														class="h-9 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-bold"
													>
														+{customDaysInput()} روز
													</button>
												</div>
											</div>
										</div>
									</Show>
								</div>
							);
						}}
					</For>
				</div>
			</Show>
		</div>
	);
};
export const OwnerEntitiesPage = OwnerEntities;

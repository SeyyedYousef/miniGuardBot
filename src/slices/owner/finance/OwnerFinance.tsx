import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { type FinanceOrder, type OwnerEntityItem, ownerApi } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';

export const OwnerFinance: Component = () => {
	const [orders, setOrders] = createSignal<FinanceOrder[]>([]);
	const [subscriptions, setSubscriptions] = createSignal<OwnerEntityItem[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal('');

	const fetchData = async () => {
		setLoading(true);
		setError('');
		try {
			const [ordersData, entitiesData] = await Promise.all([
				ownerApi.getFinanceOrders().catch(() => []),
				ownerApi.listEntities().catch(() => []),
			]);
			setOrders(ordersData || []);
			setSubscriptions(entitiesData?.filter((e) => e.status === 'active') || []);
		} catch (e: any) {
			setError(e.response?.data?.error || 'خطا در دریافت اطلاعات اشتراک‌های استارز');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		fetchData();
	});

	const realStarsOrders = () =>
		orders().filter((o) => Number(o.amount_stars) > 0);

	const manualCreditLogs = () =>
		orders().filter((o) => Number(o.amount_stars) === 0);

	const totalRevenueStars = () =>
		realStarsOrders()
			.filter((o) => o.status === 'paid')
			.reduce((sum, o) => sum + (Number(o.amount_stars) || 0), 0);

	const formatTime = (iso?: string) => {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleString('fa-IR', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return '';
		}
	};

	return (
		<div class="space-y-4">
			<div class="tg-section p-4 flex items-center justify-between">
				<div>
					<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
						امور مالی و اشتراک‌های استارز (Telegram Stars ⭐)
					</h2>
					<p class="text-[12px] text-[var(--tg-hint)] mt-0.5">
						گزارش پرداخت‌های واقعی XTR و وضعیت اعتبار گروه‌های فعال
					</p>
				</div>
				<button
					onClick={() => {
						haptic.impact('light');
						fetchData();
					}}
					class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-semibold flex items-center gap-1"
				>
					<span class="material-symbols-outlined text-[16px]">refresh</span>
					<span>بروزرسانی</span>
				</button>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)]">
					{error()}
				</div>
			</Show>

			<Show
				when={!loading()}
				fallback={
					<div class="tg-section p-8 flex flex-col items-center justify-center gap-2">
						<div class="w-6 h-6 border-2 border-[var(--tg-button)] border-t-transparent rounded-full animate-spin" />
						<span class="text-[12.5px] text-[var(--tg-hint)]">در حال دریافت گزارش مالی...</span>
					</div>
				}
			>
				{/* KPI Summary */}
				<div class="grid grid-cols-3 gap-2.5">
					<div class="tg-section p-3.5 text-center space-y-1">
						<span class="text-[11px] text-[var(--tg-hint)] font-medium block">
							درآمد کل استارز
						</span>
						<div class="text-[20px] font-bold text-[#FF9500] font-mono tabular-nums">
							{totalRevenueStars().toLocaleString('fa-IR')} ⭐
						</div>
					</div>

					<div class="tg-section p-3.5 text-center space-y-1">
						<span class="text-[11px] text-[var(--tg-hint)] font-medium block">
							پرداخت‌های استارز
						</span>
						<div class="text-[20px] font-bold text-[var(--tg-text)] font-mono tabular-nums">
							{realStarsOrders().length.toLocaleString('fa-IR')}
						</div>
					</div>

					<div class="tg-section p-3.5 text-center space-y-1">
						<span class="text-[11px] text-[var(--tg-hint)] font-medium block">
							گروه‌های فعال
						</span>
						<div class="text-[20px] font-bold text-[#34C759] font-mono tabular-nums">
							{subscriptions().length.toLocaleString('fa-IR')} گروه
						</div>
					</div>
				</div>

				{/* Active Group Subscriptions */}
				<div>
					<div class="tg-section-header">گروه‌های دارای اشتراک فعال</div>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For
							each={subscriptions()}
							fallback={
								<div class="p-6 text-center text-[13px] text-[var(--tg-hint)]">
									هیچ گروه فعالی ثبت نشده است.
								</div>
							}
						>
							{(sub) => (
								<div class="p-3.5 flex items-center justify-between gap-3">
									<div class="flex flex-col min-w-0 gap-0.5">
										<span class="text-[14px] font-bold text-[var(--tg-text)] truncate">
											{sub.title}
										</span>
										<span dir="ltr" class="text-[11.5px] font-mono text-[var(--tg-hint)] truncate text-start">
											@{sub.bot_username || 'MiniGuardBot'} • Owner: #{sub.owner_id}
										</span>
									</div>
									<span class="text-[11.5px] font-bold text-[#34C759] px-2.5 py-1 rounded-lg bg-[#34C759]/12 shrink-0">
										⏳ {sub.remaining_label || `${sub.credit_balance || 30} روز مانده`}
									</span>
								</div>
							)}
						</For>
					</div>
				</div>

				{/* Real Stars Transactions History */}
				<div>
					<div class="tg-section-header">تراکنش‌های پرداخت‌شده با Telegram Stars (XTR)</div>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For
							each={realStarsOrders()}
							fallback={
								<div class="p-6 text-center text-[13px] text-[var(--tg-hint)]">
									هنوز پرداختی از طریق درگاه استارز تلگرام ثبت نشده است.
								</div>
							}
						>
							{(order) => (
								<div class="p-3.5 flex items-center justify-between gap-3">
									<div class="flex items-center gap-3 min-w-0">
										<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#34C759]/12 text-[#34C759] shrink-0">
											پرداخت موفق
										</span>
										<div class="flex flex-col min-w-0">
											<span class="text-[13px] font-semibold text-[var(--tg-text)] truncate">
												{order.item_type || 'تمدید ماهانه ربات گروه'}
											</span>
											<span class="text-[11px] text-[var(--tg-hint)]">
												کاربر #{order.user_id} • {formatTime(order.created_at)}
											</span>
										</div>
									</div>
									<span class="text-[14px] font-bold font-mono text-[#FF9500] shrink-0">
										{order.amount_stars} ⭐
									</span>
								</div>
							)}
						</For>
					</div>
				</div>

				{/* Manual Credit Adjustments History */}
				<Show when={manualCreditLogs().length > 0}>
					<div>
						<div class="tg-section-header">تاریخچه شارژها و تغییرات دستی اعتبار توسط مالک</div>
						<div class="tg-section divide-y divide-[var(--tg-separator)]">
							<For each={manualCreditLogs().slice(0, 10)}>
								{(log) => (
									<div class="p-3.5 flex items-center justify-between gap-3">
										<div class="flex flex-col min-w-0">
											<span class="text-[12.5px] font-semibold text-[var(--tg-text)] truncate">
												{log.item_type}
											</span>
											<span class="text-[11px] text-[var(--tg-hint)]">
												{formatTime(log.created_at)}
											</span>
										</div>
										<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--tg-accent-soft)] text-[var(--tg-link)] shrink-0">
											شارژ مدیریت
										</span>
									</div>
								)}
							</For>
						</div>
					</div>
				</Show>
			</Show>
		</div>
	);
};
export const OwnerFinancePage = OwnerFinance;

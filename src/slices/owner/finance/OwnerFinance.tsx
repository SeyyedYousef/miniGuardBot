import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { type FinanceOrder, type OwnerEntityItem, ownerApi } from '@/shared/api/owner.js';

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

	const totalRevenueStars = () =>
		orders()
			.filter((o) => o.status === 'paid')
			.reduce((sum, o) => sum + (o.amount_stars || 0), 0);

	return (
		<div class="space-y-4">
			<div class="tg-section p-4">
				<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
					امور مالی و اشتراک‌های استارز گروه‌ها (۱۰۰ ⭐ ماهانه)
				</h2>
				<p class="text-[12px] text-[var(--tg-hint)] mt-0.5">
					گزارش پرداخت‌های Telegram Stars (XTR) جهت تمدید ماهانه ربات‌های مدیریت گروه
				</p>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)]">
					{error()}
				</div>
			</Show>

			<Show when={!loading()}>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div class="tg-section p-4 space-y-1">
						<span class="text-[12px] text-[var(--tg-hint)] font-medium block">
							کل درآمد استارز (Telegram Stars)
						</span>
						<div class="text-[24px] font-bold text-[#FF9500] font-mono tabular-nums">
							{totalRevenueStars().toLocaleString()} ⭐
						</div>
					</div>

					<div class="tg-section p-4 space-y-1">
						<span class="text-[12px] text-[var(--tg-hint)] font-medium block">
							تعداد تراکنش‌های تمدید
						</span>
						<div class="text-[24px] font-bold text-[var(--tg-text)] font-mono tabular-nums">
							{orders().length.toLocaleString()}
						</div>
					</div>

					<div class="tg-section p-4 space-y-1">
						<span class="text-[12px] text-[var(--tg-hint)] font-medium block">
							گروه‌های دارای اشتراک فعال
						</span>
						<div class="text-[24px] font-bold text-[#34C759] font-mono tabular-nums">
							{subscriptions().length.toLocaleString()} گروه
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
									هیچ اشتراک فعالی ثبت نشده است.
								</div>
							}
						>
							{(sub) => (
								<div class="tg-cell justify-between">
									<div class="flex flex-col min-w-0">
										<span class="text-[14px] font-bold text-[var(--tg-text)] truncate">
											{sub.title}
										</span>
										<span dir="ltr" class="text-[11.5px] font-mono text-[var(--tg-hint)] truncate">
											Chat ID: {sub.telegram_id} • Owner: @{sub.owner_username || sub.owner_id}
										</span>
									</div>
									<span class="text-[12px] font-bold text-[#34C759] px-2.5 py-1 rounded-lg bg-[#34C759]/12 shrink-0">
										{sub.remaining_label || `اشتراک فعال (${sub.credit_balance || 30} روز)`}
									</span>
								</div>
							)}
						</For>
					</div>
				</div>

				{/* Stars Transactions History */}
				<div>
					<div class="tg-section-header">آخرین تراکنش‌های درگاه Telegram Stars (XTR)</div>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For
							each={orders()}
							fallback={
								<div class="p-6 text-center text-[13px] text-[var(--tg-hint)]">
									هیچ تراکنشی ثبت نشده است.
								</div>
							}
						>
							{(order) => (
								<div class="tg-cell justify-between">
									<div class="flex items-center gap-3 min-w-0">
										<span
											class={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
												order.status === 'paid'
													? 'bg-[#34C759]/12 text-[#34C759]'
													: 'bg-[#FF9500]/12 text-[#FF9500]'
											}`}
										>
											{order.status === 'paid' ? 'پرداخت موفق' : order.status}
										</span>
										<div class="flex flex-col min-w-0">
											<span class="text-[13.5px] font-semibold text-[var(--tg-text)] truncate">
												{order.item_type || 'تمدید ماهانه ربات گروه'}
											</span>
											<span dir="ltr" class="text-[11px] font-mono text-[var(--tg-hint)]">
												User #{order.user_id}
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
			</Show>
		</div>
	);
};
export const OwnerFinancePage = OwnerFinance;

import { useNavigate } from '@solidjs/router';
import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { apiClient } from '@/shared/api/axios.js';
import { haptic } from '@/shared/lib/haptic.js';

interface DashboardStats {
	dau: number;
	mau: number;
	total_users: number;
	active_groups_count?: number;
	active_bots_count?: number;
	total_members_protected?: number;
	total_messages_processed?: number;
	total_spam_blocked?: number;
	stars_volume: number;
	recent_activity: Array<{
		id: string;
		owner_id: number;
		action: string;
		target_user_id?: number;
		ip_address?: string;
		created_at: string;
	}>;
}

export const OwnerDashboard: Component = () => {
	const navigate = useNavigate();
	const [stats, setStats] = createSignal<DashboardStats | null>(null);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal('');

	const fetchStats = async () => {
		setLoading(true);
		setError('');
		try {
			const resp = await apiClient.get('/owner/dashboard/stats', {
				headers: { 'Cache-Control': 'no-cache' },
			});
			setStats(resp.data);
		} catch (err: any) {
			setError(err.response?.data?.error || 'خطا در دریافت آمارهای داشبورد');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		fetchStats();
	});

	const formatTime = (iso?: string) => {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleString('fa-IR', {
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
			{/* Top Header */}
			<div class="tg-section p-4 flex items-center justify-between">
				<div class="flex flex-col">
					<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
						پیشخوان مدیریت کل پلتفرم MiniGuard
					</h2>
					<span class="text-[12px] text-[var(--tg-hint)]">
						آمار زنده سرور، بات‌های اختصاصی و گروه‌های متصل
					</span>
				</div>
				<button
					onClick={() => {
						haptic.impact('light');
						fetchStats();
					}}
					disabled={loading()}
					class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-semibold flex items-center gap-1"
				>
					<span class={`material-symbols-outlined text-[16px] ${loading() ? 'animate-spin' : ''}`}>
						sync
					</span>
					<span>بروزرسانی</span>
				</button>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)]">
					{error()}
				</div>
			</Show>

			<Show
				when={!loading() && stats()}
				fallback={
					<div class="tg-section p-8 flex flex-col items-center justify-center gap-2">
						<div class="w-6 h-6 border-2 border-[var(--tg-button)] border-t-transparent rounded-full animate-spin" />
						<span class="text-[12.5px] text-[var(--tg-hint)]">در حال بارگذاری آمار پلتفرم...</span>
					</div>
				}
			>
				{/* Real-Time KPI Grid */}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div class="tg-section p-4 flex flex-col gap-1">
						<span class="text-[11.5px] text-[var(--tg-hint)] font-medium">
							گروه‌ها و بات‌های فعال
						</span>
						<span class="text-[20px] font-bold text-[#34C759] font-mono tabular-nums">
							{stats()?.active_groups_count ?? 0} گروه ({stats()?.active_bots_count ?? 0} بات)
						</span>
					</div>

					<div class="tg-section p-4 flex flex-col gap-1">
						<span class="text-[11.5px] text-[var(--tg-hint)] font-medium">
							کل اعضای تحت حفاظت
						</span>
						<span class="text-[20px] font-bold text-[var(--tg-link)] font-mono tabular-nums">
							{(stats()?.total_members_protected ?? 0).toLocaleString('fa-IR')} نفر
						</span>
					</div>

					<div class="tg-section p-4 flex flex-col gap-1">
						<span class="text-[11.5px] text-[var(--tg-hint)] font-medium">
							اسپم و تخلف مسدودشده
						</span>
						<span class="text-[20px] font-bold text-[var(--tg-text)] font-mono tabular-nums">
							{(stats()?.total_spam_blocked ?? 0).toLocaleString('fa-IR')} مورد
						</span>
					</div>

					<div class="tg-section p-4 flex flex-col gap-1">
						<span class="text-[11.5px] text-[var(--tg-hint)] font-medium">
							درآمد اشتراک (Stars)
						</span>
						<span class="text-[20px] font-bold text-[#FF9500] font-mono tabular-nums">
							{Number(stats()?.stars_volume ?? 0).toLocaleString('fa-IR')} ⭐
						</span>
					</div>
				</div>

				{/* Quick Navigation Grid */}
				<div>
					<div class="tg-section-header">دسترسی سریع به بخش‌های مدیریتی</div>
					<div class="grid grid-cols-2 gap-2.5">
						<button
							onClick={() => navigate('/owner/entities')}
							class="tg-section p-3.5 flex items-center gap-3 text-start"
						>
							<div class="w-10 h-10 rounded-xl bg-[#007AFF]/12 text-[#007AFF] flex items-center justify-center shrink-0">
								<span class="material-symbols-outlined text-[20px]">groups</span>
							</div>
							<div class="flex flex-col min-w-0">
								<span class="text-[13.5px] font-bold text-[var(--tg-text)] truncate">
									گروه‌ها و شارژ اعتبار
								</span>
								<span class="text-[11px] text-[var(--tg-hint)] truncate">
									مدیریت بات‌ها و تمدید دستی
								</span>
							</div>
						</button>

						<button
							onClick={() => navigate('/owner/users')}
							class="tg-section p-3.5 flex items-center gap-3 text-start"
						>
							<div class="w-10 h-10 rounded-xl bg-[#34C759]/12 text-[#34C759] flex items-center justify-center shrink-0">
								<span class="material-symbols-outlined text-[20px]">manage_accounts</span>
							</div>
							<div class="flex flex-col min-w-0">
								<span class="text-[13.5px] font-bold text-[var(--tg-text)] truncate">
									مدیران گروه
								</span>
								<span class="text-[11px] text-[var(--tg-hint)] truncate">
									مشاهده و مدیریت کاربران
								</span>
							</div>
						</button>

						<button
							onClick={() => navigate('/owner/settings')}
							class="tg-section p-3.5 flex items-center gap-3 text-start"
						>
							<div class="w-10 h-10 rounded-xl bg-[#FF9500]/12 text-[#FF9500] flex items-center justify-center shrink-0">
								<span class="material-symbols-outlined text-[20px]">settings</span>
							</div>
							<div class="flex flex-col min-w-0">
								<span class="text-[13.5px] font-bold text-[var(--tg-text)] truncate">
									تنظیمات و متون بات
								</span>
								<span class="text-[11px] text-[var(--tg-hint)] truncate">
									تعرفه، استارت و پیام‌های ورود
								</span>
							</div>
						</button>

						<button
							onClick={() => navigate('/owner/broadcast')}
							class="tg-section p-3.5 flex items-center gap-3 text-start"
						>
							<div class="w-10 h-10 rounded-xl bg-[#5856D6]/12 text-[#5856D6] flex items-center justify-center shrink-0">
								<span class="material-symbols-outlined text-[20px]">campaign</span>
							</div>
							<div class="flex flex-col min-w-0">
								<span class="text-[13.5px] font-bold text-[var(--tg-text)] truncate">
									ارسال پیام همگانی
								</span>
								<span class="text-[11px] text-[var(--tg-hint)] truncate">
									اطلاع‌رسانی به مدیران و گروه‌ها
								</span>
							</div>
						</button>
					</div>
				</div>

				{/* Recent Activity Logs */}
				<div>
					<div class="tg-section-header flex items-center justify-between">
						<span>آخرین رویدادهای پلتفرم</span>
						<button
							onClick={() => navigate('/owner/audit-logs')}
							class="text-[var(--tg-link)] font-semibold text-[12px]"
						>
							مشاهده همه
						</button>
					</div>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For
							each={stats()?.recent_activity ?? []}
							fallback={
								<div class="p-6 text-center text-[13px] text-[var(--tg-hint)]">
									هنوز رویدادی ثبت نشده است.
								</div>
							}
						>
							{(log) => (
								<div class="p-3.5 flex items-center justify-between gap-3">
									<div class="flex items-center gap-2.5 min-w-0">
										<span class="material-symbols-outlined text-[18px] text-[var(--tg-link)] shrink-0">
											verified_user
										</span>
										<div class="flex flex-col min-w-0">
											<span class="text-[13px] font-semibold text-[var(--tg-text)] truncate">
												{log.action}
											</span>
											<span class="text-[11px] text-[var(--tg-hint)]">
												{formatTime(log.created_at)}
											</span>
										</div>
									</div>
									<span
										dir="ltr"
										class="text-[11px] text-[var(--tg-hint)] font-mono bg-[var(--tg-secondary-bg)] px-2 py-0.5 rounded-md shrink-0"
									>
										{log.ip_address || '127.0.0.1'}
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

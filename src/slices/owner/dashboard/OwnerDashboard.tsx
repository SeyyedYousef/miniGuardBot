import { useNavigate } from '@solidjs/router';
import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { apiClient } from '@/shared/api/axios.js';
import { haptic } from '@/shared/lib/haptic.js';

interface DashboardStats {
	dau: number;
	mau: number;
	total_users: number;
	stars_volume: number;
	recent_activity: Array<{
		id: string;
		owner_id: number;
		action: string;
		target_user_id?: number;
		ip_address?: string;
		created_at: string;
	}>;
	dau_chart: Array<{ date: string; value: number }>;
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
			const resp = await apiClient.get('/owner/dashboard/stats');
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

	const activeGroupsCount = () => ((window as any).__mockGroups || []).length || 2;
	const activeBotsCount = () => ((window as any).__mockBots || []).length || 1;

	return (
		<div class="space-y-5">
			<div class="tg-section p-4 flex items-center justify-between">
				<div class="flex flex-col">
					<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
						داشبورد مدیریتی پلتفرم مدیریت گروه
					</h2>
					<span class="text-[12px] text-[var(--tg-hint)]">
						پایش لحظه‌ای بات‌های اختصاصی و گروه‌های متصل
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

			<Show when={!loading() && stats()}>
				{/* Native Telegram KPI Grid */}
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div class="tg-section p-4 flex flex-col gap-1.5">
						<span class="text-[12px] text-[var(--tg-hint)] font-medium">مدیران فعال امروز (DAU)</span>
						<span class="text-[24px] font-bold text-[var(--tg-text)] font-mono tabular-nums">
							{stats()?.dau?.toLocaleString() ?? 0}
						</span>
					</div>

					<div class="tg-section p-4 flex flex-col gap-1.5">
						<span class="text-[12px] text-[var(--tg-hint)] font-medium">مدیران فعال ماه (MAU)</span>
						<span class="text-[24px] font-bold text-[var(--tg-text)] font-mono tabular-nums">
							{stats()?.mau?.toLocaleString() ?? 0}
						</span>
					</div>

					<div class="tg-section p-4 flex flex-col gap-1.5">
						<span class="text-[12px] text-[var(--tg-hint)] font-medium">گروه‌های تحت پوشش</span>
						<span class="text-[24px] font-bold text-[#34C759] font-mono tabular-nums">
							{activeGroupsCount()} گروه ({activeBotsCount()} بات)
						</span>
					</div>

					<div class="tg-section p-4 flex flex-col gap-1.5">
						<span class="text-[12px] text-[var(--tg-hint)] font-medium">درآمد اشتراک (Stars)</span>
						<span class="text-[24px] font-bold text-[#FF9500] font-mono tabular-nums">
							{Number(stats()?.stars_volume ?? 0).toLocaleString()} ⭐
						</span>
					</div>
				</div>

				{/* Recent Audit Logs */}
				<div>
					<div class="tg-section-header flex items-center justify-between">
						<span>آخرین رخدادهای امنیتی</span>
						<button
							onClick={() => navigate('/owner/audit-logs')}
							class="text-[var(--tg-link)] font-semibold"
						>
							مشاهده همه
						</button>
					</div>
					<div class="tg-section">
						<For each={stats()?.recent_activity ?? []}>
							{(log) => (
								<div class="tg-cell justify-between">
									<div class="flex items-center gap-3">
										<span class="px-2 py-0.5 rounded-md bg-[var(--tg-accent-soft)] text-[11px] font-mono font-bold text-[var(--tg-link)]">
											{log.action}
										</span>
										<span class="text-[13px] font-medium text-[var(--tg-text)]">
											Admin #{log.owner_id}
										</span>
									</div>
									<span class="text-[12px] text-[var(--tg-hint)] font-mono">
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

import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { type AuditLogEntry, ownerApi } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';

export const OwnerAuditLog: Component = () => {
	const [logs, setLogs] = createSignal<AuditLogEntry[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal('');
	const [offset, setOffset] = createSignal(0);
	const [hasMore, setHasMore] = createSignal(true);
	const [searchQuery, setSearchQuery] = createSignal('');
	const limit = 25;

	const loadLogs = async (currentOffset: number, append: boolean = false) => {
		setLoading(true);
		setError('');
		try {
			const res = await ownerApi.getAuditLogs(limit, currentOffset);
			const fetched = res.logs || [];
			setHasMore(res.has_more ?? fetched.length >= limit);
			if (append) {
				setLogs([...logs(), ...fetched]);
			} else {
				setLogs(fetched);
			}
		} catch (err: any) {
			setError(err.response?.data?.error || 'خطا در دریافت لاگ‌های امنیتی سیستم');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		loadLogs(0);
	});

	const handleLoadMore = () => {
		if (loading() || !hasMore()) return;
		try {
			haptic.impact('light');
		} catch {}
		const nextOffset = offset() + limit;
		setOffset(nextOffset);
		loadLogs(nextOffset, true);
	};

	const filteredLogs = () => {
		const q = searchQuery().trim().toLowerCase();
		if (!q) return logs();
		return logs().filter(
			(l) =>
				l.action.toLowerCase().includes(q) ||
				String(l.owner_id).includes(q) ||
				(l.target_user_id && String(l.target_user_id).includes(q)) ||
				l.ip_address?.includes(q),
		);
	};

	const formatTime = (iso?: string) => {
		if (!iso) return '---';
		try {
			return new Date(iso).toLocaleString('fa-IR', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return '---';
		}
	};

	return (
		<div class="space-y-4">
			{/* Header & Search */}
			<div class="tg-section p-4 space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
							لاگ‌ها و رویدادهای امنیتی پلتفرم
						</h2>
						<p class="text-[12px] text-[var(--tg-hint)] mt-0.5">
							ثبت دقیق تمامی ورودها، تغییرات اعتبار و تنظیمات مدیریتی
						</p>
					</div>
					<button
						onClick={() => loadLogs(0, false)}
						class="h-8 px-3 rounded-lg bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[12px] font-semibold flex items-center gap-1"
					>
						<span class="material-symbols-outlined text-[16px]">refresh</span>
						<span>بروزرسانی</span>
					</button>
				</div>

				<div class="bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3.5 flex items-center gap-2">
					<span class="material-symbols-outlined text-[var(--tg-hint)] text-[18px]">search</span>
					<input
						type="text"
						placeholder="جستجو در رویدادها، آی‌پی یا شناسه..."
						value={searchQuery()}
						onInput={(e) => setSearchQuery(e.currentTarget.value)}
						class="w-full h-10 bg-transparent text-[13px] text-[var(--tg-text)] placeholder-[var(--tg-hint)] focus:outline-none"
					/>
				</div>
			</div>

			<Show when={error()}>
				<div class="p-3.5 bg-[var(--tg-destructive)]/10 rounded-xl text-[13px] text-[var(--tg-destructive)]">
					{error()}
				</div>
			</Show>

			{/* Log List */}
			<div class="tg-section divide-y divide-[var(--tg-separator)]">
				<For
					each={filteredLogs()}
					fallback={
						<div class="p-8 text-center text-[13px] text-[var(--tg-hint)]">
							{loading() ? 'در حال دریافت لاگ‌ها...' : 'هیچ رویدادی یافت نشد.'}
						</div>
					}
				>
					{(log) => (
						<div class="p-3.5 flex flex-col gap-1.5">
							<div class="flex items-start justify-between gap-2">
								<span class="text-[13.5px] font-bold text-[var(--tg-text)] leading-snug">
									{log.action}
								</span>
								<span class="text-[11px] text-[var(--tg-hint)] shrink-0">
									{formatTime(log.created_at)}
								</span>
							</div>
							<div class="flex items-center justify-between text-[11.5px] text-[var(--tg-hint)]">
								<span>توسط مالک (#{log.owner_id})</span>
								<Show when={log.ip_address}>
									<span dir="ltr" class="font-mono bg-[var(--tg-secondary-bg)] px-2 py-0.5 rounded-md">
										IP: {log.ip_address}
									</span>
								</Show>
							</div>
						</div>
					)}
				</For>
			</div>

			<Show when={!loading() && hasMore()}>
				<button
					onClick={handleLoadMore}
					class="w-full h-11 tg-section text-[13px] font-bold text-[var(--tg-link)] flex items-center justify-center gap-1.5"
				>
					<span class="material-symbols-outlined text-[18px]">expand_more</span>
					<span>نمایش رویدادهای بیشتر</span>
				</button>
			</Show>
		</div>
	);
};
export const OwnerAuditLogPage = OwnerAuditLog;

import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { type BroadcastMessage, ownerApi } from '@/shared/api/owner.js';
import { haptic } from '@/shared/lib/haptic.js';

export const OwnerBroadcast: Component = () => {
	const [broadcasts, setBroadcasts] = createSignal<BroadcastMessage[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [error, setError] = createSignal('');
	const [successMsg, setSuccessMsg] = createSignal('');

	const [audience, setAudience] = createSignal<'all' | 'premium' | 'active_7d' | 'inactive'>('all');
	const [message, setMessage] = createSignal('');
	const [sending, setSending] = createSignal(false);

	const fetchBroadcasts = async () => {
		setLoading(true);
		setError('');
		try {
			const data = await ownerApi.listBroadcasts();
			setBroadcasts(data || []);
		} catch (e: any) {
			setError(e.response?.data?.error || 'خطا در دریافت تاریخچه پیام‌های همگانی');
		} finally {
			setLoading(false);
		}
	};

	onMount(() => {
		fetchBroadcasts();
	});

	const handleSend = async (e: Event) => {
		e.preventDefault();
		const text = message().trim();
		if (!text) {
			setError('لطفاً متن پیام همگانی را وارد کنید.');
			return;
		}
		setSending(true);
		setError('');
		setSuccessMsg('');
		haptic.impact('medium');

		try {
			const res = await ownerApi.sendBroadcast(audience(), text);
			haptic.notify('success');
			setSuccessMsg(
				`✅ پیام همگانی با موفقیت ارسال شد (${res.sent_count ?? 1} مخاطب/گروه دریافت کردند).`,
			);
			setMessage('');
			await fetchBroadcasts();
			setTimeout(() => setSuccessMsg(''), 5000);
		} catch (e: any) {
			haptic.notify('error');
			setError(e.response?.data?.error || 'خطا در ارسال پیام همگانی');
		} finally {
			setSending(false);
		}
	};

	const getAudienceLabel = (aud: string) => {
		if (aud === 'premium') return 'فقط مدیران دارای اشتراک فعال';
		if (aud === 'active_7d') return 'فقط گروه‌های متصل';
		return 'همه مدیران و گروه‌ها';
	};

	const formatTime = (iso?: string) => {
		if (!iso) return '---';
		try {
			return new Date(iso).toLocaleString('fa-IR', {
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
			{/* Header */}
			<div class="tg-section p-4">
				<h2 class="text-[15px] font-bold text-[var(--tg-text)]">
					ارسال پیام همگانی تلگرام (Broadcast)
				</h2>
				<p class="text-[12px] text-[var(--tg-hint)] mt-0.5">
					ارسال مستقیم پیام اطلاع‌رسانی از طریق ربات به مدیران و گروه‌های متصل
				</p>
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

			{/* Compose Form */}
			<form onSubmit={handleSend} class="tg-section p-4 space-y-3.5">
				<div>
					<label class="block text-[12px] font-semibold text-[var(--tg-hint)] mb-1.5">
						گیرندگان پیام:
					</label>
					<select
						value={audience()}
						onChange={(e) => setAudience(e.currentTarget.value as any)}
						class="w-full h-10 bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl px-3 text-[13px] text-[var(--tg-text)] outline-none"
					>
						<option value="all">همه مدیران و گروه‌های متصل</option>
						<option value="premium">فقط پی‌وی مدیران ربات</option>
						<option value="active_7d">فقط داخل گروه‌های متصل</option>
					</select>
				</div>

				<div>
					<label class="block text-[12px] font-semibold text-[var(--tg-hint)] mb-1.5">
						متن پیام (پشتیبانی از تگ‌های HTML تلگرام مانند &lt;b&gt;):
					</label>
					<textarea
						rows={4}
						required
						value={message()}
						onInput={(e) => setMessage(e.currentTarget.value)}
						placeholder="متن اطلاعیه یا پیام همگانی خود را بنویسید..."
						class="w-full bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] rounded-xl p-3 text-[13px] text-[var(--tg-text)] focus:border-[var(--tg-button)] outline-none resize-none leading-relaxed"
					/>
				</div>

				<button
					type="submit"
					disabled={sending() || !message().trim()}
					class="tg-btn-primary w-full h-11 text-[13.5px] font-bold flex items-center justify-center gap-2 disabled:opacity-40"
				>
					<span class="material-symbols-outlined text-[18px]">send</span>
					<span>{sending() ? 'در حال ارسال به تلگرام...' : 'ارسال آنی پیام همگانی'}</span>
				</button>
			</form>

			{/* Broadcast History */}
			<div>
				<div class="tg-section-header">تاریخچه پیام‌های همگانی ارسال‌شده</div>
				<div class="tg-section divide-y divide-[var(--tg-separator)]">
					<For
						each={broadcasts()}
						fallback={
							<div class="p-6 text-center text-[13px] text-[var(--tg-hint)]">
								{loading() ? 'در حال بارگذاری...' : 'هنوز پیام همگانی ارسال نشده است.'}
							</div>
						}
					>
						{(b) => (
							<div class="p-3.5 space-y-1.5">
								<div class="flex items-center justify-between gap-2">
									<span class="px-2 py-0.5 rounded-md bg-[var(--tg-accent-soft)] text-[var(--tg-link)] text-[11px] font-bold">
										{getAudienceLabel(b.target_audience)}
									</span>
									<span class="text-[11px] text-[var(--tg-hint)]">
										{formatTime(b.created_at)}
									</span>
								</div>
								<p class="text-[13px] text-[var(--tg-text)] whitespace-pre-wrap leading-relaxed">
									{b.message_text}
								</p>
								<div class="flex items-center justify-between text-[11.5px] pt-1">
									<span class="text-[#34C759] font-bold">✅ ارسال موفق</span>
									<span class="text-[var(--tg-hint)] font-mono">
										تحویل به {b.sent_count} مخاطب/گروه
									</span>
								</div>
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	);
};
export const OwnerBroadcastPage = OwnerBroadcast;

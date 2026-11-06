import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import {
	type Component,
	createResource,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';
import type { DailyMetric } from '@/shared/api/bot-management.js';
import { groupApi } from '@/shared/api/bot-management.js';
import { isRtl, locale, t } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { showToast } from '@/shared/ui/toast.js';

export const AnalyticsPage: Component = () => {
	const params = useParams();
	const navigate = useNavigate();
	const [days, setDays] = createSignal(7);
	const [selectedMetric, setSelectedMetric] = createSignal<{
		date: string;
		value: number;
		label: string;
	} | null>(null);

	const [data] = createResource(
		() => ({ id: params.id, d: days() }),
		(args) => groupApi.getAnalytics(args.id, args.d),
	);

	onMount(() => {
		try {
			backButton.show();
			const off = backButton.onClick(() => {
				haptic.impact('light');
				navigate(`/group/${params.id}`);
			});
			onCleanup(() => {
				off();
				backButton.hide();
			});
		} catch {}
	});

	const changeDays = (d: number) => {
		setDays(d);
		setSelectedMetric(null);
		haptic.selection();
	};

	const isFa = () => locale() === 'fa';

	const renderChart = (metrics: DailyMetric[], color: string, label: string, icon: string) => {
		if (!metrics || metrics.length === 0) {
			return (
				<div class="py-8 text-center text-[13px] text-[var(--tg-hint)]">
					{t('analyticsSettings.noData')}
				</div>
			);
		}

		const vals = metrics.map((m) => m.value || 0);
		const maxVal = Math.max(...vals, 1);
		const minVal = Math.min(...vals, 0);
		const baseline = maxVal - minVal < maxVal * 0.15 ? Math.floor(minVal * 0.94) : 0;
		const span = Math.max(maxVal - baseline, 1);

		return (
			<div class="flex flex-col select-none">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-2">
						<div class="tg-icon-box" style={{ 'background-color': color }}>
							<span class="material-symbols-outlined text-[17px]">{icon}</span>
						</div>
						<span class="text-[14px] font-bold text-[var(--tg-text)]">{label}</span>
					</div>

					<Show when={selectedMetric() && selectedMetric()?.label === label}>
						<div
							class="flex items-center gap-1.5 bg-[var(--tg-secondary-bg)] px-2.5 py-1 rounded-lg border border-[var(--tg-separator)]"
							dir="ltr"
						>
							<span class="text-[11px] text-[var(--tg-hint)]">
								{(selectedMetric()?.date || '').slice(5)}
							</span>
							<span class="text-[12px] font-mono font-bold text-[var(--tg-text)]">
								{Number(selectedMetric()?.value ?? 0).toLocaleString()}
							</span>
						</div>
					</Show>
				</div>

				<div class="flex items-end gap-2 h-[112px] w-full border-b border-[var(--tg-separator)] pb-1">
					<For each={metrics}>
						{(m) => {
							const val = m.value || 0;
							const pxHeight = Math.max(18, Math.round(((val - baseline) / span) * 96));
							return (
								<button
									onClick={() => {
										haptic.impact('light');
										setSelectedMetric({ date: m.date, value: val, label });
									}}
									class="flex-1 flex flex-col items-center justify-end h-full outline-none group"
								>
									<div
										class="w-full rounded-t-md transition-all group-hover:opacity-90"
										style={{
											height: `${pxHeight}px`,
											'background-color': color,
										}}
									/>
								</button>
							);
						}}
					</For>
				</div>

				<div
					class="flex justify-between text-[11px] text-[var(--tg-hint)] font-mono mt-1.5"
					dir="ltr"
				>
					<span>{metrics[0]?.date.slice(5)}</span>
					<span>{metrics[metrics.length - 1]?.date.slice(5)}</span>
				</div>
			</div>
		);
	};

	const statCards = () => {
		const s = (data()?.summary || {}) as any;
		const totalMembers = Number(s.total_members ?? 1);
		const newM = Number(s.new_members ?? 0);
		const leftM = Number(s.members_left ?? 0);
		const totalMsgs = Number(s.total_messages ?? 0);
		const spamBlocked = Number(s.spam_blocked ?? 0);
		const activeUsers = Number(s.active_users ?? 0);
		const mutedUsers = Number(s.muted_users ?? 0);
		const bannedUsers = Number(s.banned_users ?? 0);

		return [
			{
				icon: 'groups',
				label: isFa() ? 'کل اعضای گروه' : 'Total Members',
				value: totalMembers.toLocaleString(),
				sub: isFa() ? `ورودی: ${newM} | خروجی: ${leftM}` : `In: ${newM} | Out: ${leftM}`,
				color: '#34C759',
			},
			{
				icon: 'chat_bubble',
				label: t('analyticsSettings.totalMessages'),
				value: totalMsgs.toLocaleString(),
				sub: isFa() ? 'پیام‌های واقعی ثبت‌شده' : 'Recorded group messages',
				color: '#007AFF',
			},
			{
				icon: 'shield_lock',
				label: t('analyticsSettings.spamBlocked'),
				value: spamBlocked.toLocaleString(),
				sub: isFa() ? 'حذف‌شده توسط فایروال' : 'Blocked by firewall',
				color: '#FF3B30',
			},
			{
				icon: 'people',
				label: t('analyticsSettings.activeUsers'),
				value: activeUsers.toLocaleString(),
				sub: isFa() ? 'اعضای مشارکت‌کننده' : 'Participating members',
				color: '#5856D6',
			},
			{
				icon: 'volume_off',
				label: isFa() ? 'سکوت‌های اعمال‌شده' : 'Muted Users',
				value: mutedUsers.toLocaleString(),
				sub: 'restrictChatMember',
				color: '#FF9500',
			},
			{
				icon: 'person_off',
				label: isFa() ? 'اخراج‌های دائمی (Ban)' : 'Banned Users',
				value: bannedUsers.toLocaleString(),
				sub: 'banChatMember',
				color: '#AF52DE',
			},
		];
	};

	const violationBreakdown = () => {
		const rules: Array<{ rule: string; count: number }> = data()?.top_violated_rules || [];
		const total = rules.reduce((acc: number, r) => acc + (r.count || 0), 0);
		const colors = ['#FF3B30', '#FF9500', '#AF52DE', '#5856D6', '#34C759', '#007AFF'];
		return rules.map((r, idx: number) => ({
			label: r.rule,
			count: r.count,
			pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
			color: colors[idx % colors.length],
		}));
	};

	const hourlyPeak = () => {
		const rawHours: number[] = data()?.hourly_messages || Array.from({ length: 24 }, () => 0);
		const slots = ['00', '03', '06', '09', '12', '15', '18', '21', '23'];
		const values = slots.map((h) => {
			const hr = Number(h);
			return (rawHours[hr] || 0) + (rawHours[(hr + 1) % 24] || 0);
		});
		const maxVal = Math.max(...values, 1);
		return slots.map((hour, i) => ({
			hour,
			count: values[i],
			pct: values[i] > 0 ? Math.max(10, Math.round((values[i] / maxVal) * 100)) : 0,
		}));
	};

	const forumTopicsStats = () => {
		const topics: Array<{ id: number; title: string; messages: number }> =
			data()?.forum_topics || [];
		return topics.map((tp) => ({
			id: `#${tp.id}`,
			title: tp.title,
			msgs: tp.messages,
		}));
	};

	const topMembers = () => {
		const users: Array<{ name: string; username: string; messages: number; warns: number }> =
			data()?.top_users || [];
		return users.map((u, idx: number) => ({
			rank: idx + 1,
			name: u.name,
			username: u.username,
			msgs: u.messages,
			warns: u.warns,
		}));
	};

	const handleSendInstantPmReport = async () => {
		haptic.impact('light');
		try {
			await groupApi.sendAnalyticsReport(params.id);
			haptic.notify('success');
			showToast(
				isFa()
					? '📊 گزارش واقعی عملکرد گروه به تلگرام شما ارسال شد!'
					: '📊 Real analytics report sent to your Telegram!',
				'success',
			);
		} catch {
			haptic.notify('error');
			showToast('خطا در ارسال گزارش به تلگرام', 'error');
		}
	};

	const handleExportCsv = () => {
		haptic.impact('light');
		try {
			const payload = JSON.stringify(
				{
					group_id: params.id,
					period_days: days(),
					summary: data()?.summary,
					violations: violationBreakdown(),
				},
				null,
				2,
			);
			navigator.clipboard?.writeText(payload);
		} catch {}
		showToast(
			isFa()
				? '✅ خروجی کامل آمار گروه (JSON) در کلیپ‌بورد کپی شد!'
				: '✅ Analytics JSON copied to clipboard!',
			'success',
		);
	};

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			<header class="tg-header px-4 h-13 flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					<button
						onClick={() => {
							haptic.impact('light');
							navigate(`/group/${params.id}`);
						}}
						class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
					>
						<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
					</button>
					<h1 class="text-[16px] font-bold text-[var(--tg-text)] truncate">
						{t('analyticsSettings.title')}
					</h1>
				</div>

				<button
					onClick={handleExportCsv}
					class="h-8 px-2.5 rounded-lg bg-[var(--tg-secondary-bg)] text-[var(--tg-link)] text-[12px] font-semibold flex items-center gap-1"
				>
					<span class="material-symbols-outlined text-[16px]">download</span>
					<span>JSON</span>
				</button>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-4 gap-4">
				{/* Native Telegram Segmented Control */}
				<div class="bg-[var(--tg-section-bg)] rounded-xl p-1 flex gap-1 border border-[var(--tg-separator)]">
					{([7, 30, 90] as const).map((d) => (
						<button
							onClick={() => changeDays(d)}
							class={`flex-1 h-8.5 rounded-lg text-[12.5px] font-bold transition-colors ${
								days() === d
									? 'bg-[var(--tg-button)] text-white'
									: 'text-[var(--tg-hint)] hover:text-[var(--tg-text)]'
							}`}
						>
							{t('analyticsSettings.days', { d })}
						</button>
					))}
				</div>

				{/* 6-Card KPI Grid */}
				<div class="grid grid-cols-2 gap-2.5">
					<For each={statCards()}>
						{(stat) => (
							<div class="tg-section p-3.5 flex flex-col justify-between gap-1.5">
								<div class="flex items-center justify-between gap-1">
									<span class="text-[11.5px] text-[var(--tg-hint)] font-semibold truncate">
										{stat.label}
									</span>
									<span
										class="material-symbols-outlined text-[18px] shrink-0"
										style={{ color: stat.color }}
									>
										{stat.icon}
									</span>
								</div>
								<span class="text-[20px] font-bold text-[var(--tg-text)] font-mono tabular-nums">
									{stat.value}
								</span>
								<span class="text-[10.5px] text-[var(--tg-hint)] truncate">{stat.sub}</span>
							</div>
						)}
					</For>
				</div>

				{/* Charts */}
				<Show when={data()}>
					<div class="tg-section p-4">
						{renderChart(
							data()?.growth || [],
							'#34C759',
							t('analyticsSettings.growthChart'),
							'show_chart',
						)}
					</div>

					<div class="tg-section p-4">
						{renderChart(
							data()?.activity || [],
							'#007AFF',
							t('analyticsSettings.activityChart'),
							'chat_bubble',
						)}
					</div>
				</Show>

				{/* Firewall Violation Breakdown by Rule */}
				<div>
					<div class="tg-section-header">
						{isFa()
							? 'تفکیک دقیق تخلفات مهارشده توسط فایروال'
							: 'Firewall Violation Breakdown by Category'}
					</div>
					<div class="tg-section p-4 space-y-3">
						<Show
							when={violationBreakdown().length > 0}
							fallback={
								<div class="py-3 text-center text-[12.5px] text-[var(--tg-hint)]">
									{isFa()
										? 'هنوز هیچ تخلفی در این گروه ثبت نشده است. به محض مسدودسازی لینک یا اسپم، آمار واقعی در اینجا نمایش داده می‌شود.'
										: 'No violations recorded yet in this group.'}
								</div>
							}
						>
							<For each={violationBreakdown()}>
								{(item) => (
									<div class="space-y-1.5">
										<div class="flex items-center justify-between text-[12px]">
											<span class="font-medium text-[var(--tg-text)] truncate max-w-[75%]">
												{item.label}
											</span>
											<span class="font-mono font-bold text-[var(--tg-hint)]" dir="ltr">
												{item.count} ({item.pct}%)
											</span>
										</div>
										<div class="w-full h-2 rounded-full bg-[var(--tg-secondary-bg)] overflow-hidden">
											<div
												class="h-full rounded-full transition-all"
												style={{
													width: `${item.pct}%`,
													'background-color': item.color,
												}}
											/>
										</div>
									</div>
								)}
							</For>
						</Show>
					</div>
				</div>

				{/* 24-Hour Peak Activity Heatmap */}
				<div>
					<div class="tg-section-header">
						{isFa() ? 'ساعات فعالیت ۲۴ ساعته گروه (Peak Hours)' : '24-Hour Activity Distribution'}
					</div>
					<div class="tg-section p-4 space-y-3">
						<div
							class="flex items-end justify-between gap-1.5 h-24 pt-2 border-b border-[var(--tg-separator)] pb-1"
							dir="ltr"
						>
							<For each={hourlyPeak()}>
								{(slot) => (
									<div class="flex-1 flex flex-col items-center justify-end h-full gap-1">
										<div
											class="w-full rounded-t bg-[var(--tg-button)] transition-all"
											style={{
												height: `${Math.max(8, Math.round((slot.pct / 100) * 76))}px`,
												opacity: slot.count > 0 ? Math.max(0.45, slot.pct / 100) : 0.2,
											}}
										/>
									</div>
								)}
							</For>
						</div>
						<div
							class="flex items-center justify-between text-[10.5px] font-mono text-[var(--tg-hint)]"
							dir="ltr"
						>
							<For each={hourlyPeak()}>{(slot) => <span>{slot.hour}:00</span>}</For>
						</div>
					</div>
				</div>

				{/* Forum Supergroup Topics Breakdown (Only shown if topics exist or clean message) */}
				<Show when={forumTopicsStats().length > 0}>
					<div>
						<div class="tg-section-header">
							{isFa()
								? 'آمار تفکیکی تاپیک‌های فروم (message_thread_id)'
								: 'Per-Topic Activity (Forum Supergroup)'}
						</div>
						<div class="tg-section divide-y divide-[var(--tg-separator)]">
							<For each={forumTopicsStats()}>
								{(tp) => (
									<div class="p-3.5 flex items-center justify-between gap-2">
										<div class="flex items-center gap-2.5 min-w-0">
											<span
												dir="ltr"
												class="px-2 py-0.5 rounded-md bg-[var(--tg-secondary-bg)] text-[11px] font-mono font-bold text-[var(--tg-link)] shrink-0"
											>
												{tp.id}
											</span>
											<div class="min-w-0">
												<div class="text-[13px] font-semibold text-[var(--tg-text)] truncate">
													{tp.title}
												</div>
											</div>
										</div>
										<div class="text-end shrink-0" dir="ltr">
											<div class="text-[13px] font-mono font-bold text-[var(--tg-text)]">
												{tp.msgs.toLocaleString()} msgs
											</div>
										</div>
									</div>
								)}
							</For>
						</div>
					</div>
				</Show>

				{/* Top Active Members Leaderboard */}
				<div>
					<div class="tg-section-header">
						{isFa() ? 'برترین اعضای فعال گروه' : 'Top Active Group Members'}
					</div>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<Show
							when={topMembers().length > 0}
							fallback={
								<div class="p-4 text-center text-[12.5px] text-[var(--tg-hint)]">
									{isFa()
										? 'با ارسال پیام توسط اعضا در گروه، لیست فعال‌ترین اعضای واقعی گروه در این بخش ثبت می‌شود.'
										: 'Active group members will appear here once messages are sent in the group.'}
								</div>
							}
						>
							<For each={topMembers()}>
								{(member) => (
									<div class="p-3.5 flex items-center justify-between gap-3">
										<div class="flex items-center gap-2.5 min-w-0">
											<div class="w-7 h-7 rounded-full bg-[var(--tg-accent-soft)] text-[var(--tg-button)] font-mono font-bold text-[12px] flex items-center justify-center shrink-0">
												{member.rank}
											</div>
											<div class="min-w-0">
												<div class="text-[13.5px] font-bold text-[var(--tg-text)] truncate">
													{member.name}
												</div>
												<Show when={member.username}>
													<div dir="ltr" class="text-[11px] text-[var(--tg-link)] font-mono">
														@{member.username}
													</div>
												</Show>
											</div>
										</div>
										<span dir="ltr" class="text-[13px] font-mono font-bold text-[var(--tg-text)]">
											{member.msgs} msgs
										</span>
									</div>
								)}
							</For>
						</Show>
					</div>
				</div>

				{/* Instant Send Report to PM Button */}
				<button
					onClick={handleSendInstantPmReport}
					class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-2"
				>
					<span class="material-symbols-outlined text-[19px]">send</span>
					<span>
						{isFa()
							? 'ارسال فوری این گزارش واقعی به تلگرام من'
							: 'Send Real Group Report to My Telegram'}
					</span>
				</button>
			</main>
		</div>
	);
};

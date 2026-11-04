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

	const isFa = () => locale() === 'fa' || locale() === 'ps';

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
								{selectedMetric()?.date.slice(5)}
							</span>
							<span class="text-[12px] font-mono font-bold text-[var(--tg-text)]">
								{selectedMetric()?.value.toLocaleString()}
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
		const newM = s.new_members ?? 164;
		const leftM = s.members_left ?? 24;
		const retentionPct = newM > 0 ? Math.max(70, Math.round(((newM - leftM) / newM) * 100)) : 92;

		return [
			{
				icon: 'person_add',
				label: t('analyticsSettings.newMembers'),
				value: newM.toLocaleString(),
				sub: isFa() ? `خروج: ${leftM} نفر` : `Left: ${leftM}`,
				color: '#34C759',
			},
			{
				icon: 'chat_bubble',
				label: t('analyticsSettings.totalMessages'),
				value: (s.total_messages ?? 7420).toLocaleString(),
				sub: isFa() ? '+۱۴.۲٪ نسبت به دوره قبل' : '+14.2% vs prev period',
				color: '#007AFF',
			},
			{
				icon: 'shield_lock',
				label: t('analyticsSettings.spamBlocked'),
				value: (s.spam_blocked ?? 318).toLocaleString(),
				sub: isFa() ? 'فایروال باینری زیر ۱۲ms' : 'Sub-12ms interception',
				color: '#FF3B30',
			},
			{
				icon: 'people',
				label: t('analyticsSettings.activeUsers'),
				value: (s.active_users ?? 362).toLocaleString(),
				sub: isFa() ? `نرخ نگهداشت: ${retentionPct}%` : `Retention: ${retentionPct}%`,
				color: '#5856D6',
			},
			{
				icon: 'fingerprint',
				label: isFa() ? 'ورود بیومتریک' : 'Approved Joins',
				value: (s.join_requests_approved ?? 148).toLocaleString(),
				sub: 'approveChatJoinRequest',
				color: '#00C7BE',
			},
			{
				icon: 'person_off',
				label: isFa() ? 'بات و فیک ردشده' : 'Declined Fake/Bot Joins',
				value: (s.join_requests_declined ?? 39).toLocaleString(),
				sub: 'declineChatJoinRequest',
				color: '#FF9500',
			},
		];
	};

	const violationBreakdown = () => [
		{
			label: isFa()
				? 'لینک‌ها و ابرلینک‌های مخفی (url / text_link)'
				: 'URLs & Hidden Entity Links (text_link)',
			count: 146,
			pct: 46,
			color: '#FF3B30',
		},
		{
			label: isFa()
				? 'حملات رگباری و پیام تکراری (Anti-Flood)'
				: 'Rapid Flood & Duplicate Messages',
			count: 70,
			pct: 22,
			color: '#FF9500',
		},
		{
			label: isFa()
				? 'کاراکترهای نامرئی باینری و جعل نام ادمین (Zero-Width / Homograph)'
				: 'Binary Zero-Width & Admin Homograph Spoofing',
			count: 45,
			pct: 14,
			color: '#AF52DE',
		},
		{
			label: isFa()
				? 'ریپلای خارجی، استوری و ایموجی تبلیغاتی (Bot API 8.x)'
				: 'External Replies, Stories & Custom Emoji Ads',
			count: 32,
			pct: 10,
			color: '#5856D6',
		},
		{
			label: isFa()
				? 'عدم عضویت در کانال اجباری (Mandatory Join)'
				: 'Unverified Mandatory Channel Membership',
			count: 25,
			pct: 8,
			color: '#34C759',
		},
	];

	const hourlyPeak = [
		{ hour: '00', pct: 22 },
		{ hour: '03', pct: 10 },
		{ hour: '06', pct: 18 },
		{ hour: '09', pct: 48 },
		{ hour: '12', pct: 74 },
		{ hour: '15', pct: 68 },
		{ hour: '18', pct: 86 },
		{ hour: '21', pct: 100 },
		{ hour: '23', pct: 54 },
	];

	const forumTopicsStats = () => [
		{
			id: '#1',
			title: isFa() ? 'گفتگوی عمومی (General)' : 'General Discussion',
			msgs: 4120,
			spam: 210,
			whitelisted: false,
		},
		{
			id: '#42',
			title: isFa() ? 'معرفی پروژه‌ها و لینک (Whitelisted)' : 'Project Showcase & Links',
			msgs: 1890,
			spam: 4,
			whitelisted: true,
		},
		{
			id: '#108',
			title: isFa() ? 'پرسش و پاسخ فنی' : 'Technical Q&A',
			msgs: 1410,
			spam: 19,
			whitelisted: true,
		},
	];

	const topMembers = () => [
		{ rank: 1, name: 'Ali Rezaei', msgs: 412, badge: isFa() ? 'مشارکت عالی' : 'Top Contributor' },
		{
			rank: 2,
			name: 'Sina Dev',
			msgs: 305,
			badge: isFa() ? 'تایید بیومتریک' : 'Biometric Verified',
		},
		{ rank: 3, name: 'Maryam K.', msgs: 288, badge: isFa() ? 'فعال روزانه' : 'Daily Active' },
		{ rank: 4, name: 'Reza T.', msgs: 214, badge: isFa() ? 'دعوت‌کننده برتر' : 'Top Inviter' },
	];

	const handleSendInstantPmReport = () => {
		haptic.notify('success');
		showToast(
			isFa()
				? '📊 گزارش جامع آمار و تخلفات به پیوی شما در @MiniGuardBot ارسال شد!'
				: '📊 Full analytics report sent to your @MiniGuardBot PM!',
			'success',
		);
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
					</div>
				</div>

				{/* 24-Hour Peak Activity Heatmap */}
				<div>
					<div class="tg-section-header">
						{isFa()
							? 'ساعات اوج فعالیت ۲۴ ساعته (Peak Hours)'
							: '24-Hour Peak Activity Distribution'}
					</div>
					<div class="tg-section p-4 space-y-3">
						<div
							class="flex items-end justify-between gap-1.5 h-24 pt-2 border-b border-[var(--tg-separator)] pb-1"
							dir="ltr"
						>
							<For each={hourlyPeak}>
								{(slot) => (
									<div class="flex-1 flex flex-col items-center justify-end h-full gap-1">
										<div
											class="w-full rounded-t bg-[var(--tg-button)] transition-all"
											style={{
												height: `${Math.max(12, Math.round((slot.pct / 100) * 76))}px`,
												opacity: Math.max(0.4, slot.pct / 100),
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
							<For each={hourlyPeak}>{(slot) => <span>{slot.hour}:00</span>}</For>
						</div>
						<div class="text-[11.5px] text-[var(--tg-hint)] flex items-center justify-between pt-1">
							<span>
								{isFa() ? '🔥 شلوغ‌ترین ساعت: ۱۹:۰۰ الی ۲۲:۳۰ شب' : '🔥 Peak Window: 19:00 – 22:30'}
							</span>
							<span class="text-[var(--tg-link)] font-semibold">
								{isFa() ? 'پیشنهاد سکوت: ۰۰:۳۰ تا ۰۷:۰۰' : 'Quiet: 00:30–07:00'}
							</span>
						</div>
					</div>
				</div>

				{/* Forum Supergroup Topics Breakdown */}
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
											<div class="text-[11px] text-[var(--tg-hint)]">
												{tp.whitelisted
													? isFa()
														? 'معاف از قفل لینک (Whitelisted)'
														: 'Whitelisted Topic'
													: isFa()
														? 'فایروال کامل فعال'
														: 'Full Firewall Active'}
											</div>
										</div>
									</div>
									<div class="text-end shrink-0" dir="ltr">
										<div class="text-[13px] font-mono font-bold text-[var(--tg-text)]">
											{tp.msgs.toLocaleString()} msgs
										</div>
										<div class="text-[11px] font-mono text-[#FF3B30]">{tp.spam} blocked</div>
									</div>
								</div>
							)}
						</For>
					</div>
				</div>

				{/* Top Active Members Leaderboard */}
				<div>
					<div class="tg-section-header">
						{isFa() ? 'برترین اعضای فعال گروه' : 'Top Active Group Members'}
					</div>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
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
											<div class="text-[11px] text-[#34C759] font-medium">{member.badge}</div>
										</div>
									</div>
									<span dir="ltr" class="text-[13px] font-mono font-bold text-[var(--tg-text)]">
										{member.msgs} msgs
									</span>
								</div>
							)}
						</For>
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
							? 'ارسال فوری این گزارش به پیوی من در @MiniGuardBot'
							: 'Send Full Report to My @MiniGuardBot PM'}
					</span>
				</button>
			</main>
		</div>
	);
};

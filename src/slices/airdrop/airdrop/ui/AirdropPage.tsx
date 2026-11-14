import { useNavigate } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { isRtl, locale } from '@/shared/i18n/index.js';
import {
	BOT_COMMANDS_CATALOG,
	type CommandCategory,
	getLocalizedBotCommand,
} from '@/shared/lib/bot-commands-engine.js';
import { haptic } from '@/shared/lib/haptic.js';
import { showToast } from '@/shared/ui/toast.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

type GuideTab = 'setup' | 'commands' | 'faq';

export const AirdropPage: Component = () => {
	const navigate = useNavigate();
	const pick = (fa: string, ps: string, en: string) =>
		locale() === 'ps' ? ps : locale() === 'fa' ? fa : en;

	const [activeTab, setActiveTab] = createSignal<GuideTab>('setup');
	const [selectedCmdCategory, setSelectedCmdCategory] = createSignal<CommandCategory | 'all'>(
		'all',
	);
	const [openFaqId, setOpenFaqId] = createSignal<string>('faq-1');

	onMount(() => {
		try {
			backButton.hide();
		} catch {}
	});

	const openBotFather = () => {
		haptic.impact('light');
		const link = 'https://t.me/BotFather';
		try {
			if ((window as any).Telegram?.WebApp?.openTelegramLink) {
				(window as any).Telegram.WebApp.openTelegramLink(link);
			} else {
				window.open(link, '_blank');
			}
		} catch {
			window.open(link, '_blank');
		}
	};

	const copyText = (text: string) => {
		haptic.notify('success');
		try {
			navigator.clipboard?.writeText(text);
		} catch {}
		showToast(pick(`«${text}» کپی شد`, `«${text}» کاپي شو`, `Copied "${text}"`), 'success');
	};

	const setupSteps = () => [
		{
			num: '1',
			color: '#007AFF',
			icon: 'smart_toy',
			title: pick(
				'دریافت توکن از @BotFather',
				'له @BotFather څخه د ټوکن اخیستل',
				'1. Get Token from @BotFather',
			),
			desc: pick(
				'در ربات @BotFather دستور /newbot را بفرستید و توکن ربات اختصاصی خود را کپی کنید.',
				'په @BotFather بوټ کې /newbot ولېږئ او د خپل ځانګړي بوټ ټوکن کاپي کړئ.',
				'Send /newbot in @BotFather and copy your HTTP API token.',
			),
			actionLabel: '/newbot',
			onAction: () => copyText('/newbot'),
		},
		{
			num: '2',
			color: '#34C759',
			icon: 'add_link',
			title: pick(
				'ثبت توکن و لینک گروه (۱ بات = ۱ گروه)',
				'د ټوکن او ګروپ لینک ثبتول (۱ بوټ = ۱ ګروپ)',
				'2. Bind Token & Group Link',
			),
			desc: pick(
				'در صفحه «خانه» توکن ربات و لینک گروه خود را وارد کنید تا ربات منحصراً به گروه شما قفل شود.',
				'په «کور» پاڼه کې د بوټ ټوکن او د خپل ګروپ لینک دننه کړئ ترڅو بوټ یوازې له ستاسو ګروپ سره وتړل شي.',
				'On the Home tab, enter your bot token and group link to lock 1 Bot to 1 Group.',
			),
		},
		{
			num: '3',
			color: '#FF9500',
			icon: 'admin_panel_settings',
			title: pick(
				'ادمین کردن ربات در گروه',
				'په ګروپ کې د بوټ اډمین کول',
				'3. Promote Bot to Admin',
			),
			desc: pick(
				'ربات را به گروه اضافه کرده و دسترسی Delete Messages و Ban Users را فعال کنید.',
				'بوټ ګروپ ته ورزیات کړئ او د Delete Messages او Ban Users واکونه فعال کړئ.',
				'Add the bot to your supergroup and enable Delete Messages & Ban Users.',
			),
		},
		{
			num: '4',
			color: '#AF52DE',
			icon: 'verified',
			title: pick(
				'شروع ۲۴ ساعت تست رایگان',
				'د ۲۴ ساعته وړیا آزموینې پیل',
				'4. 24h Free Trial Activated',
			),
			desc: pick(
				'ربات ۴ پیام تایید را در گروه ارسال کرده و ۲۴ ساعت رایگان فعال می‌شود (سپس ۱۰۰ ⭐ ماهانه).',
				'بوټ به په ګروپ کې د تایید ۴ پیغامونه ولېږي او ۲۴ ساعته وړیا موده به فعال شي (بیا میاشتنی ۱۰۰ ⭐).',
				'Your bot sends 4 confirmation messages and starts a 24h free trial (then 100 ⭐/mo).',
			),
		},
	];

	const commandCategories: Array<{
		key: CommandCategory | 'all';
		labelFa: string;
		labelPs: string;
		labelEn: string;
	}> = [
		{
			key: 'all',
			labelFa: `همه (${BOT_COMMANDS_CATALOG.length})`,
			labelPs: `ټول (${BOT_COMMANDS_CATALOG.length})`,
			labelEn: 'All',
		},
		{
			key: 'punishment',
			labelFa: 'برخورد و جریمه',
			labelPs: 'سزا او بندیز',
			labelEn: 'Moderation',
		},
		{ key: 'cleanup', labelFa: 'پاکسازی چت', labelPs: 'د چټ پاکول', labelEn: 'Cleanup' },
		{ key: 'locks', labelFa: 'قفل‌های سریع', labelPs: 'چټک قلفونه', labelEn: 'Quick Locks' },
		{
			key: 'users',
			labelFa: 'کاربران و گزارش',
			labelPs: 'غړي او راپور',
			labelEn: 'Users & Report',
		},
		{ key: 'panel', labelFa: 'پنل شیشه‌ای', labelPs: 'شیشه‌يي پینل', labelEn: 'Inline Panel' },
	];

	const filteredCommands = () => {
		const cat = selectedCmdCategory();
		if (cat === 'all') return BOT_COMMANDS_CATALOG;
		return BOT_COMMANDS_CATALOG.filter((c) => c.category === cat);
	};

	const faqs = () => [
		{
			id: 'faq-1',
			q: pick(
				'چرا هر ربات فقط برای یک گروه کار می‌کند؟',
				'ولې هر بوټ یوازې د یوه ګروپ لپاره کار کوي؟',
				'Why does each bot work for only 1 group?',
			),
			a: pick(
				'برای اینکه نام و عکس ربات کاملاً اختصاصی گروه شما باشد و ۱۰۰٪ سرعت و ظرفیت تلگرام بدون تاخیر در اختیار گروه شما قرار بگیرد.',
				'ترڅو د بوټ نوم او انځور په بشپړ ډول ستاسو د ګروپ ځانګړی وي او د ټیلیګرام ۱۰۰٪ چټکتیا او ظرفیت پرته له ځنډه ستاسو ګروپ ته ورکړل شي.',
				'So your bot has your custom branding and 100% dedicated Telegram rate limits.',
			),
		},
		{
			id: 'faq-2',
			q: pick(
				'اگر اعتبار ۲۴ ساعت رایگان یا اشتراک ماهانه تمام شود، اطلاعات تا چه زمانی نگه داشته می‌شود؟',
				'که د ۲۴ ساعته وړیا آزموینې یا میاشتني ګډون اعتبار پای ته ورسېږي، مالومات تر کومه وخته ساتل کېږي؟',
				'How long is group data retained if the subscription expires?',
			),
			a: pick(
				'پس از پایان اعتبار یک گروه، اطلاعات، تنظیمات و آمار آن تنها به مدت ۱ هفته (۷ روز) در سیستم ذخیره و نگهداری می‌شود و ربات در این مدت در حالت تعلیق ایمن می‌ماند. اگر ظرف این ۱ هفته اشتراک را تمدید کنید، ربات بلافاصله با همان تنظیمات قبلی روشن می‌شود؛ اما در صورت عدم تمدید پس از ۱ هفته، اطلاعات گروه به صورت خودکار از دیتابیس پاکسازی خواهد شد.',
				'د ګروپ د اعتبار له پای ته رسېدو وروسته، د هغه مالومات، تنظیمات او احصایې یوازې د ۱ اوونۍ (۷ ورځو) لپاره په سیستم کې ساتل کېږي او بوټ په دې موده کې په خوندي تعلیق حالت کې پاتې کېږي. که په دې ۱ اوونۍ کې ګډون تمدید کړئ، بوټ سملاسي له پخوانیو تنظیماتو سره بېرته فعالېږي؛ خو که تر ۱ اوونۍ وروسته تمدید نه شي، د ګروپ مالومات به په اتومات ډول له ډیټابیس څخه پاک شي.',
				'When a group subscription expires, its settings and data are retained for 1 week (7 days) only. If not renewed within 7 days, the data is automatically purged from our database.',
			),
		},
		{
			id: 'faq-3',
			q: pick(
				'چرا ربات لینک‌ها یا پیام‌ها را پاک نمی‌کند؟',
				'ولې بوټ لینکونه یا پیغامونه نه حذفوي؟',
				'Why is the bot not deleting links?',
			),
			a: pick(
				'مطمئن شوید فرستنده پیام ادمین گروه نیست (ادمین‌ها معاف هستند) و تیک Delete Messages و Ban Users در تنظیمات ادمین ربات روشن است.',
				'ډاډ ترلاسه کړئ چې د پیغام لېږونکی د ګروپ اډمین نه دی (اډمینان معاف دي) او د بوټ په اډمین تنظیماتو کې د Delete Messages او Ban Users اختیارونه فعال دي.',
				'Ensure the sender is not a group admin and the bot has Delete Messages & Ban Users permissions.',
			),
		},
		{
			id: 'faq-4',
			q: pick(
				'چگونه بدون باز کردن مینی‌اپ، ربات را در چت کنترل کنم؟',
				'څنګه د مینی‌اپ له پرانیستلو پرته بوټ په چټ کې کنټرول کړم؟',
				'How can I control the bot directly in chat?',
			),
			a: pick(
				'کافیست در گروه کلمه «پنل» یا دستور /panel را بفرستید تا دکمه‌های شیشه‌ای مدیریت قفل‌ها برایتان باز شود.',
				'بس دی چې په ګروپ کې «پینل» یا د /panel کمانډ ولېږئ ترڅو د قلفونو د مدیریت شیشه‌يي تڼۍ درته پرانیستل شي.',
				'Send /panel in your group to open the interactive inline keyboard.',
			),
		},
	];

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Minimal Native Telegram Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between">
					<h1 class="text-[17px] font-bold text-[var(--tg-text)]">
						{pick('آموزش و راهنما', 'زده‌کړه او لارښود', 'Guide & Help')}
					</h1>
					<span
						dir="ltr"
						class="text-[12px] font-mono font-semibold text-[var(--tg-link)] bg-[var(--tg-accent-soft)] px-2.5 py-1 rounded-lg"
					>
						@MiniGuardBot
					</span>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-4 gap-4">
				{/* Clean 3-Tab Segmented Switcher */}
				<div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--tg-section-bg)] border border-[var(--tg-separator)]">
					<button
						type="button"
						onClick={() => {
							haptic.selection();
							setActiveTab('setup');
						}}
						class={`h-9 rounded-lg text-[12.5px] font-bold transition-all ${
							activeTab() === 'setup'
								? 'bg-[var(--tg-button)] text-white shadow-xs'
								: 'text-[var(--tg-hint)]'
						}`}
					>
						{pick('راه‌اندازی', 'تنظیمول', 'Setup')}
					</button>
					<button
						type="button"
						onClick={() => {
							haptic.selection();
							setActiveTab('commands');
						}}
						class={`h-9 rounded-lg text-[12.5px] font-bold transition-all ${
							activeTab() === 'commands'
								? 'bg-[var(--tg-button)] text-white shadow-xs'
								: 'text-[var(--tg-hint)]'
						}`}
					>
						{pick('دستورات چت', 'د چټ کمانډونه', 'Commands')}
					</button>
					<button
						type="button"
						onClick={() => {
							haptic.selection();
							setActiveTab('faq');
						}}
						class={`h-9 rounded-lg text-[12.5px] font-bold transition-all ${
							activeTab() === 'faq'
								? 'bg-[var(--tg-button)] text-white shadow-xs'
								: 'text-[var(--tg-hint)]'
						}`}
					>
						{pick('سوالات متداول', 'عامې پوښتنې', 'FAQ')}
					</button>
				</div>

				{/* TAB 1: MINIMAL 4-STEP SETUP */}
				<Show when={activeTab() === 'setup'}>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For each={setupSteps()}>
							{(step) => (
								<div class="p-3.5 flex items-start gap-3">
									<div
										class="tg-icon-box mt-0.5 shrink-0"
										style={{ 'background-color': step.color }}
									>
										<span class="material-symbols-outlined text-[18px]">{step.icon}</span>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between gap-2">
											<h2 class="text-[14.5px] font-bold text-[var(--tg-text)]">{step.title}</h2>
											<Show when={step.actionLabel}>
												<button
													type="button"
													onClick={step.onAction}
													dir="ltr"
													class="px-2 py-0.5 rounded-md bg-[var(--tg-accent-soft)] text-[var(--tg-link)] font-mono text-[11.5px] font-bold shrink-0"
												>
													{step.actionLabel}
												</button>
											</Show>
										</div>
										<p class="text-[12.5px] text-[var(--tg-hint)] leading-relaxed mt-1">
											{step.desc}
										</p>
									</div>
								</div>
							)}
						</For>
					</div>

					<div class="flex flex-col gap-2">
						<button
							type="button"
							onClick={() => {
								haptic.impact('light');
								navigate('/');
							}}
							class="tg-btn-primary w-full h-11 text-[14.5px] flex items-center justify-center gap-2"
						>
							<span class="material-symbols-outlined text-[19px]">add_circle</span>
							<span>
								{pick(
									'ساخت ربات اختصاصی گروه',
									'د ګروپ ځانګړی بوټ جوړول',
									'Create Dedicated Group Bot',
								)}
							</span>
						</button>

						<button
							type="button"
							onClick={openBotFather}
							class="tg-btn-secondary w-full h-10 text-[13.5px] flex items-center justify-center gap-1.5"
						>
							<span class="material-symbols-outlined text-[18px]">open_in_new</span>
							<span>{pick('باز کردن @BotFather', '@BotFather پرانیستل', 'Open @BotFather')}</span>
						</button>
					</div>
				</Show>

				{/* TAB 2: COMPLETE CHAT COMMANDS GUIDE (Native Guide Style) */}
				<Show when={activeTab() === 'commands'}>
					{/* Category Filter Pills */}
					<div class="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
						<For each={commandCategories}>
							{(cat) => (
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSelectedCmdCategory(cat.key);
									}}
									class={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all ${
										selectedCmdCategory() === cat.key
											? 'bg-[var(--tg-button)] text-white shadow-xs'
											: 'bg-[var(--tg-section-bg)] text-[var(--tg-hint)] border border-[var(--tg-separator)]'
									}`}
								>
									{pick(cat.labelFa, cat.labelPs, cat.labelEn)}
								</button>
							)}
						</For>
					</div>

					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For each={filteredCommands()}>
							{(cmd) => {
								const localized = () => getLocalizedBotCommand(cmd, locale());
								return (
									<div class="p-3.5 flex flex-col gap-2">
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0">
												<div class="text-[14px] font-bold text-[var(--tg-text)]">
													{localized().title}
												</div>
												<p class="text-[12px] text-[var(--tg-hint)] leading-relaxed mt-0.5">
													{localized().desc}
												</p>
											</div>

											<button
												type="button"
												onClick={() => copyText(localized().triggers[0] || cmd.slashTriggers[0])}
												class="h-7 px-2.5 rounded-lg bg-[var(--tg-secondary-bg)] text-[var(--tg-link)] text-[11.5px] font-semibold shrink-0 active:scale-95 transition-transform"
											>
												{pick('کپی', 'کاپي', 'Copy')}
											</button>
										</div>

										{/* Localized & Slash Triggers */}
										<div class="flex flex-wrap gap-1.5">
											<For each={localized().triggers}>
												{(pt) => (
													<button
														type="button"
														onClick={() => copyText(pt)}
														class="px-2 py-0.5 rounded-md bg-[#34C759]/12 text-[#34C759] text-[11.5px] font-bold"
													>
														{pt}
													</button>
												)}
											</For>
											<For each={cmd.slashTriggers}>
												{(st) => (
													<button
														type="button"
														onClick={() => copyText(st)}
														dir="ltr"
														class="px-2 py-0.5 rounded-md bg-[var(--tg-secondary-bg)] text-[var(--tg-link)] font-mono text-[11.5px] font-semibold"
													>
														{st}
													</button>
												)}
											</For>
										</div>

										<div class="text-[11px] text-[var(--tg-hint)] bg-[var(--tg-secondary-bg)]/60 rounded-lg px-2.5 py-1.5">
											<b class="text-[var(--tg-text)]">
												{pick('نحوه استفاده:', 'د کارولو طریقه:', 'Example:')}
											</b>{' '}
											{localized().example}
										</div>
									</div>
								);
							}}
						</For>
					</div>
				</Show>

				{/* TAB 3: MINIMAL ACCORDION FAQ */}
				<Show when={activeTab() === 'faq'}>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For each={faqs()}>
							{(item) => {
								const isOpen = () => openFaqId() === item.id;
								return (
									<div class="p-3.5">
										<button
											type="button"
											onClick={() => {
												haptic.selection();
												setOpenFaqId(isOpen() ? '' : item.id);
											}}
											class="w-full flex items-center justify-between gap-2 text-start"
										>
											<span class="text-[14px] font-bold text-[var(--tg-text)] leading-snug">
												{item.q}
											</span>
											<span
												class={`material-symbols-outlined text-[20px] text-[var(--tg-hint)] transition-transform shrink-0 ${
													isOpen() ? 'rotate-180' : ''
												}`}
											>
												expand_more
											</span>
										</button>
										<Show when={isOpen()}>
											<p class="text-[12.5px] text-[var(--tg-hint)] leading-relaxed mt-2 pt-2 border-t border-[var(--tg-separator)]">
												{item.a}
											</p>
										</Show>
									</div>
								);
							}}
						</For>
					</div>
				</Show>
			</main>

			<BottomNav />
		</div>
	);
};

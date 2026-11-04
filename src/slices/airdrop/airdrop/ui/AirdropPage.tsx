import { useNavigate } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { isRtl, locale } from '@/shared/i18n/index.js';
import { haptic } from '@/shared/lib/haptic.js';
import { showToast } from '@/shared/ui/toast.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

type GuideTab = 'setup' | 'commands' | 'faq';

export const AirdropPage: Component = () => {
	const navigate = useNavigate();
	const isFa = () => locale() === 'fa' || locale() === 'ps';

	const [activeTab, setActiveTab] = createSignal<GuideTab>('setup');
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
		showToast(isFa() ? `«${text}» کپی شد` : `Copied "${text}"`, 'success');
	};

	const setupSteps = () => [
		{
			num: '1',
			color: '#007AFF',
			icon: 'smart_toy',
			title: isFa() ? 'دریافت توکن از @BotFather' : '1. Get Token from @BotFather',
			desc: isFa()
				? 'در ربات @BotFather دستور /newbot را بفرستید و توکن ربات اختصاصی خود را کپی کنید.'
				: 'Send /newbot in @BotFather and copy your HTTP API token.',
			actionLabel: '/newbot',
			onAction: () => copyText('/newbot'),
		},
		{
			num: '2',
			color: '#34C759',
			icon: 'add_link',
			title: isFa() ? 'ثبت توکن و لینک گروه (۱ بات = ۱ گروه)' : '2. Bind Token & Group Link',
			desc: isFa()
				? 'در صفحه «خانه» توکن ربات و لینک گروه خود را وارد کنید تا ربات منحصراً به گروه شما قفل شود.'
				: 'On the Home tab, enter your bot token and group link to lock 1 Bot to 1 Group.',
		},
		{
			num: '3',
			color: '#FF9500',
			icon: 'admin_panel_settings',
			title: isFa() ? 'ادمین کردن ربات در گروه' : '3. Promote Bot to Admin',
			desc: isFa()
				? 'ربات را به گروه اضافه کرده و دسترسی Delete Messages و Ban Users را فعال کنید.'
				: 'Add the bot to your supergroup and enable Delete Messages & Ban Users.',
		},
		{
			num: '4',
			color: '#AF52DE',
			icon: 'verified',
			title: isFa() ? 'شروع ۲۴ ساعت تست رایگان' : '4. 24h Free Trial Activated',
			desc: isFa()
				? 'ربات ۴ پیام تایید را در گروه ارسال کرده و ۲۴ ساعت رایگان فعال می‌شود (سپس ۱۰۰ ⭐ ماهانه).'
				: 'Your bot sends 4 confirmation messages and starts a 24h free trial (then 100 ⭐/mo).',
		},
	];

	const quickCommands = () => [
		{
			fa: 'بن',
			slash: '/ban',
			title: isFa() ? 'اخراج دائم کاربر (با ریپلای)' : 'Permanent Ban (Reply)',
		},
		{
			fa: 'سکوت ۲ ساعت',
			slash: '/mute 2h',
			title: isFa() ? 'سکوت زمان‌دار کاربر (با ریپلای)' : 'Timed Mute (Reply)',
		},
		{
			fa: 'حذف سکوت',
			slash: '/unmute',
			title: isFa() ? 'باز کردن صدای کاربر' : 'Unmute User',
		},
		{
			fa: 'اخطار',
			slash: '/warn',
			title: isFa() ? 'ثبت اخطار پلکانی با دکمه بخشش' : 'Issue Warning',
		},
		{
			fa: 'پاکسازی ۵۰',
			slash: '/purge 50',
			title: isFa() ? 'حذف دسته‌جمعی پیام‌های اخیر' : 'Batch Delete Messages',
		},
		{
			fa: 'معاف',
			slash: '/vip',
			title: isFa() ? 'معاف کردن عضو از تمام قفل‌ها' : 'Whitelist VIP Member',
		},
		{
			fa: 'پنل',
			slash: '/panel',
			title: isFa() ? 'باز کردن پنل شیشه‌ای داخل چت' : 'Open In-Chat Inline Panel',
		},
	];

	const faqs = () => [
		{
			id: 'faq-1',
			q: isFa()
				? 'چرا هر ربات فقط برای یک گروه کار می‌کند؟'
				: 'Why does each bot work for only 1 group?',
			a: isFa()
				? 'برای اینکه نام و عکس ربات کاملاً اختصاصی گروه شما باشد و ۱۰۰٪ سرعت و ظرفیت تلگرام بدون تاخیر در اختیار گروه شما قرار بگیرد.'
				: 'So your bot has your custom branding and 100% dedicated Telegram rate limits.',
		},
		{
			id: 'faq-2',
			q: isFa()
				? 'اگر مهلت ۲۴ ساعت رایگان تمام شود و پرداخت نکنم چه می‌شود؟'
				: 'What happens if the 24h trial expires without payment?',
			a: isFa()
				? 'هیچ‌کدام از تنظیمات، قفل‌ها و آمار گروه شما پاک نمی‌شود. ربات از گروه خارج نمی‌شود و در حالت خواب ایمن می‌ماند تا هر زمان با ۱۰۰ استارز (⭐) تمدید کردید، در لحظه روشن شود.'
				: 'Zero data is lost. Your bot stays in Safe Hibernation Mode and resumes instantly whenever you renew for 100 ⭐.',
		},
		{
			id: 'faq-3',
			q: isFa() ? 'چرا ربات لینک‌ها یا پیام‌ها را پاک نمی‌کند؟' : 'Why is the bot not deleting links?',
			a: isFa()
				? 'مطمئن شوید فرستنده پیام ادمین گروه نیست (ادمین‌ها معاف هستند) و تیک Delete Messages و Ban Users در تنظیمات ادمین ربات روشن است.'
				: 'Ensure the sender is not a group admin and the bot has Delete Messages & Ban Users permissions.',
		},
		{
			id: 'faq-4',
			q: isFa()
				? 'چگونه بدون باز کردن مینی‌اپ، ربات را در چت کنترل کنم؟'
				: 'How can I control the bot directly in chat?',
			a: isFa()
				? 'کافیست در گروه کلمه «پنل» یا دستور /panel را بفرستید تا دکمه‌های شیشه‌ای مدیریت قفل‌ها برایتان باز شود.'
				: 'Send /panel in your group to open the interactive inline keyboard.',
		},
	];

	return (
		<div class="tg-canvas pb-24 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Minimal Native Telegram Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between">
					<h1 class="text-[17px] font-bold text-[var(--tg-text)]">
						{isFa() ? 'آموزش و راهنما' : 'Guide & Help'}
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
						{isFa() ? 'راه‌اندازی' : 'Setup'}
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
						{isFa() ? 'دستورات چت' : 'Commands'}
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
						{isFa() ? 'سوالات متداول' : 'FAQ'}
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
							<span>{isFa() ? 'ساخت ربات اختصاصی گروه' : 'Create Dedicated Group Bot'}</span>
						</button>

						<button
							type="button"
							onClick={openBotFather}
							class="tg-btn-secondary w-full h-10 text-[13.5px] flex items-center justify-center gap-1.5"
						>
							<span class="material-symbols-outlined text-[18px]">open_in_new</span>
							<span>{isFa() ? 'باز کردن @BotFather' : 'Open @BotFather'}</span>
						</button>
					</div>
				</Show>

				{/* TAB 2: MINIMAL CHAT COMMANDS CHEAT SHEET */}
				<Show when={activeTab() === 'commands'}>
					<div class="tg-section divide-y divide-[var(--tg-separator)]">
						<For each={quickCommands()}>
							{(cmd) => (
								<div class="p-3.5 flex items-center justify-between gap-3">
									<div class="min-w-0">
										<div class="text-[14px] font-bold text-[var(--tg-text)]">{cmd.title}</div>
										<div class="flex items-center gap-1.5 mt-1">
											<span class="px-2 py-0.5 rounded-md bg-[#34C759]/12 text-[#34C759] text-[11.5px] font-bold">
												{cmd.fa}
											</span>
											<span
												dir="ltr"
												class="px-2 py-0.5 rounded-md bg-[var(--tg-secondary-bg)] text-[var(--tg-link)] font-mono text-[11.5px] font-semibold"
											>
												{cmd.slash}
											</span>
										</div>
									</div>

									<button
										type="button"
										onClick={() => copyText(cmd.fa)}
										class="h-8 px-3 rounded-lg bg-[var(--tg-secondary-bg)] text-[var(--tg-link)] text-[12px] font-semibold shrink-0 active:scale-95 transition-transform"
									>
										{isFa() ? 'کپی' : 'Copy'}
									</button>
								</div>
							)}
						</For>
					</div>

					<button
						type="button"
						onClick={() => {
							haptic.impact('light');
							navigate('/group/demo-group/commands');
						}}
						class="tg-btn-primary w-full h-11 text-[14px] flex items-center justify-center gap-2"
					>
						<span class="material-symbols-outlined text-[19px]">terminal</span>
						<span>
							{isFa() ? 'تست زنده دستورات و پنل شیشه‌ای' : 'Open Live Commands & Inline Panel'}
						</span>
					</button>
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

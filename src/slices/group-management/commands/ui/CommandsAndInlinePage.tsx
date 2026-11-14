import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { isRtl, locale } from '@/shared/i18n/index.js';
import {
	BOT_COMMANDS_CATALOG,
	type CommandCategory,
	EDGE_CASE_RESOLUTIONS,
	type EdgeCaseScenarioId,
	evaluateCallbackQueryRbac,
	getLocalizedBotCommand,
	getLocalizedEdgeCase,
	type InlineKeyboardButton,
	parseGroupCommand,
} from '@/shared/lib/bot-commands-engine.js';
import { haptic } from '@/shared/lib/haptic.js';
import { ToggleSwitch } from '@/shared/ui/settings-controls.js';
import { showToast } from '@/shared/ui/toast.js';
import { BottomNav } from '@/widgets/bottom-nav/index.js';

type ActiveSection = 'commands' | 'inline-panel' | 'edge-cases';
type InlineMenuScreen = 'root' | 'locks' | 'flood' | 'quiet';

export const CommandsAndInlinePage: Component = () => {
	const params = useParams();
	const navigate = useNavigate();
	const pick = (fa: string, ps: string, en: string) =>
		locale() === 'ps' ? ps : locale() === 'fa' ? fa : en;

	const [activeSection, setActiveSection] = createSignal<ActiveSection>('commands');

	// ─── Tab 1: In-Chat Commands & Live Terminal State ─────────────────────────
	const [cmdInput, setCmdInput] = createSignal(
		pick(
			'سکوت ۲ ساعت ارسال لینک تبلیغاتی',
			'بې‌غږه ۲ ساعته د تبلیغاتي لینک لېږل',
			'/mute 2h Sending promotional link',
		),
	);
	const [targetName] = createSignal('Amir_Crypto');
	const [selectedCat, setSelectedCat] = createSignal<'all' | CommandCategory>('all');

	// Command Engine Settings
	const [enablePersianNatural, setEnablePersianNatural] = createSignal(true);
	const [autoDeleteAdminCmd, setAutoDeleteAdminCmd] = createSignal(true);
	const [allowPublicReport, setAllowPublicReport] = createSignal(true);
	const [attachInlineActions, setAttachInlineActions] = createSignal(true);

	const [simHistory, setSimHistory] = createSignal<
		Array<{
			id: string;
			adminText: string;
			targetUser: string;
			apiMethod: string;
			botReplyHtml: string;
			inlineKeyboard: InlineKeyboardButton[][];
			resolvedCallbackNote?: string;
		}>
	>([
		{
			id: 'init-1',
			adminText: pick(
				'سکوت ۲ ساعت ارسال لینک تبلیغاتی',
				'بې‌غږه ۲ ساعته د تبلیغاتي لینک لېږل',
				'/mute 2h Sending promotional link',
			),
			targetUser: 'Amir_Crypto',
			apiMethod: 'restrictChatMember (until_date: +7200s)',
			botReplyHtml: pick(
				'🔇 کاربر <b>Amir_Crypto</b> به مدت <b>2 ساعت</b> بی‌صدا (Mute) شد.\n📝 دلیل: ارسال لینک تبلیغاتی',
				'🔇 کاروونکی <b>Amir_Crypto</b> د <b>2 ساعته</b> لپاره بې‌غږه (Mute) شو.\n📝 لامل: د تبلیغاتي لینک لېږل',
				'🔇 User <b>Amir_Crypto</b> was muted for <b>2h</b>.\n📝 Reason: Sending promotional link',
			),
			inlineKeyboard: [
				[
					{
						text: pick('🔊 لغو سکوت (Unmute)', '🔊 چوپتیا لرې کول (Unmute)', '🔊 Unmute'),
						callback_data: 'mg:unmute:8849201',
					},
					{
						text: pick('🚫 اخراج کامل (Ban)', '🚫 دایمي شړل (Ban)', '🚫 Ban'),
						callback_data: 'mg:ban:8849201',
					},
				],
			],
		},
	]);

	const runSimulatedCommand = (rawText?: string) => {
		const input = (rawText ?? cmdInput()).trim();
		if (!input) return;
		haptic.impact('medium');
		if (rawText) setCmdInput(rawText);

		const parsed = parseGroupCommand({
			text: input,
			senderIsAdmin: true,
			repliedUserName: targetName(),
			repliedUserId: 8849201,
			lang: locale(),
		});

		const methodLabel = parsed.botApiMethod || 'sendMessage';
		setSimHistory((prev) => [
			{
				id: `sim-${Date.now()}`,
				adminText: input,
				targetUser: targetName(),
				apiMethod: methodLabel,
				botReplyHtml: parsed.responsePreviewFa,
				inlineKeyboard: attachInlineActions() ? parsed.inlineButtons || [] : [],
			},
			...prev.slice(0, 4),
		]);
		showToast(
			pick(
				`دستور اجرا شد: ${methodLabel}`,
				`کمانډ اجرا شو: ${methodLabel}`,
				`Executed: ${methodLabel}`,
			),
			'success',
		);
	};

	const handleSimMessageInlineClick = (msgId: string, btn: InlineKeyboardButton) => {
		haptic.selection();
		const cb = btn.callback_data || '';
		let resolutionNote = '';
		if (cb.includes('unmute')) {
			resolutionNote = pick(
				'✅ سکوت کاربر توسط ادمین با دکمه شیشه‌ای لغو شد (restrictChatMember: permissions=true).',
				'✅ د کاروونکي بې‌غږه‌کونه د اډمین له خوا پر شیشه‌يي تڼۍ لرې شوه (restrictChatMember: permissions=true).',
				'✅ User unmuted by admin via inline button (restrictChatMember: permissions=true).',
			);
		} else if (cb.includes('unban')) {
			resolutionNote = pick(
				'✅ مسدودیت کاربر رفع شد (unbanChatMember).',
				'✅ د کاروونکي بندیز لرې شو (unbanChatMember).',
				'✅ User unbanned (unbanChatMember).',
			);
		} else if (cb.includes('ban')) {
			resolutionNote = pick(
				'🚫 کاربر به صورت دائمی از گروه اخراج شد (banChatMember).',
				'🚫 کاروونکی په دایمي توګه له ګروپ څخه وشړل شو (banChatMember).',
				'🚫 User permanently banned from group (banChatMember).',
			);
		} else if (cb.includes('unwarn')) {
			resolutionNote = pick(
				'💚 ۱ اخطار کاربر بخشیده شد (اخطار فعلی: ۰/۳).',
				'💚 د کاروونکي ۱ خبرداری وبښل شو (اوسني خبرداري: ۰/۳).',
				'💚 1 warning forgiven (current warnings: 0/3).',
			);
		} else if (cb.includes('report_dismiss')) {
			resolutionNote = pick(
				'✅ گزارش بررسی و بسته شد.',
				'✅ راپور وڅېړل شو او وتړل شو.',
				'✅ Report reviewed and closed.',
			);
		} else if (cb.includes('panel:')) {
			setActiveSection('inline-panel');
			showToast(
				pick('پنل شیشه‌ای باز شد', 'شیشه‌يي پینل پرانیستل شو', 'Inline panel opened'),
				'success',
			);
			return;
		} else {
			resolutionNote = pick(
				`⚡ فراخوانی ${cb} با موفقیت انجام شد.`,
				`⚡ د ${cb} غوښتنه په بریالیتوب سره اجرا شوه.`,
				`⚡ Executed ${cb} successfully.`,
			);
		}

		setSimHistory((prev) =>
			prev.map((item) =>
				item.id === msgId ? { ...item, resolvedCallbackNote: resolutionNote } : item,
			),
		);
		showToast(btn.text, 'success');
	};

	const filteredCatalog = createMemo(() => {
		const cat = selectedCat();
		if (cat === 'all') return BOT_COMMANDS_CATALOG;
		return BOT_COMMANDS_CATALOG.filter((c) => c.category === cat);
	});

	// ─── Tab 2: Interactive In-Chat Inline Button Panel (/panel) ───────────────
	const [callerRole, setCallerRole] = createSignal<'admin' | 'member'>('admin');
	const [inlineScreen, setInlineScreen] = createSignal<InlineMenuScreen>('root');
	const [callbackAlertBanner, setCallbackAlertBanner] = createSignal<string | null>(null);
	const [lastCallbackData, setLastCallbackData] = createSignal<string>('panel:main');

	const [inlineLocks, setInlineLocks] = createSignal({
		links: true,
		forwards: true,
		usernames: false,
		stories: true,
		voice: false,
		inlineBots: true,
		emergencyLock: false,
		floodLimit: 5,
		quietHoursActive: true,
	});

	const handleInlinePanelButton = (callbackData: string, actionFn: () => void) => {
		setLastCallbackData(callbackData);
		const rbac = evaluateCallbackQueryRbac({
			callerUserId: callerRole() === 'admin' ? 1001 : 9999,
			adminUserIds: [1001, 1002],
			callbackData,
			lang: locale(),
		});

		if (!rbac.allowed) {
			haptic.notify('error');
			setCallbackAlertBanner(rbac.answerCallbackAlertText);
			showToast(rbac.answerCallbackAlertText, 'error');
			return;
		}

		haptic.impact('light');
		setCallbackAlertBanner(null);
		actionFn();
	};

	// ─── Tab 3: Edge-Cases & Subscription Expiry State ─────────────────────────
	const [selectedEdgeId, setSelectedEdgeId] = createSignal<EdgeCaseScenarioId>(
		'subscription_expired_unpaid',
	);
	const [subLifecycleStage, setSubLifecycleStage] = createSignal<
		'active_trial' | 'warning_2h' | 'expired_hibernated' | 'reactivated_stars'
	>('expired_hibernated');

	const edgeCaseList = createMemo(() =>
		Object.values(EDGE_CASE_RESOLUTIONS).map((edge) => getLocalizedEdgeCase(edge, locale())),
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

	return (
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir={isRtl() ? 'rtl' : 'ltr'}>
			{/* Native Telegram Sticky Header */}
			<header class="tg-header px-4 h-13 flex items-center justify-between">
				<div class="max-w-md mx-auto w-full flex items-center justify-between gap-2">
					<div class="flex items-center gap-2.5 min-w-0">
						<button
							type="button"
							onClick={() => {
								haptic.impact('light');
								navigate(`/group/${params.id}`);
							}}
							class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--tg-link)] active:opacity-70 shrink-0"
							aria-label={pick('بازگشت', 'بېرته', 'Back')}
						>
							<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
						</button>
						<div class="flex flex-col min-w-0">
							<h1 class="text-[15px] font-bold text-[var(--tg-text)] truncate">
								{pick(
									'دستورات چت، پنل شیشه‌ای و موارد لبه',
									'د چټ کمانډونه، شیشه‌يي پینل او ځانګړي حالات',
									'Chat Commands, Inline Panel & Edge Cases',
								)}
							</h1>
							<span class="text-[11px] text-[var(--tg-hint)] truncate">
								{pick(
									'مدیریت با یک دستور، کنترل Inline و پایداری ۱۰۰٪',
									'په یوه کمانډ مدیریت، Inline کنټرول او ۱۰۰٪ ثبات',
									'1-Command Moderation, Inline Control & 100% Resilience',
								)}
							</span>
						</div>
					</div>
					<span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--tg-button)]/12 text-[var(--tg-button)] shrink-0">
						Bot API 8.x
					</span>
				</div>
			</header>

			<main class="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-4 gap-4">
				{/* 3-Tab Segmented Control */}
				<div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--tg-section-bg)] border border-[var(--tg-separator)]">
					<button
						type="button"
						onClick={() => {
							haptic.selection();
							setActiveSection('commands');
						}}
						class={`h-9 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 transition-all ${
							activeSection() === 'commands'
								? 'bg-[var(--tg-button)] text-white shadow-xs'
								: 'text-[var(--tg-hint)]'
						}`}
					>
						<span class="material-symbols-outlined text-[15px]">terminal</span>
						<span>{pick('دستورات چت', 'د چټ کمانډونه', 'Commands')}</span>
					</button>
					<button
						type="button"
						onClick={() => {
							haptic.selection();
							setActiveSection('inline-panel');
						}}
						class={`h-9 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 transition-all ${
							activeSection() === 'inline-panel'
								? 'bg-[var(--tg-button)] text-white shadow-xs'
								: 'text-[var(--tg-hint)]'
						}`}
					>
						<span class="material-symbols-outlined text-[15px]">smart_button</span>
						<span>{pick('پنل شیشه‌ای', 'شیشه‌يي پینل', 'Inline Panel')}</span>
					</button>
					<button
						type="button"
						onClick={() => {
							haptic.selection();
							setActiveSection('edge-cases');
						}}
						class={`h-9 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 transition-all ${
							activeSection() === 'edge-cases'
								? 'bg-[var(--tg-button)] text-white shadow-xs'
								: 'text-[var(--tg-hint)]'
						}`}
					>
						<span class="material-symbols-outlined text-[15px]">verified_user</span>
						<span>{pick('موارد لبه (۱۰)', 'ځانګړي حالات (۱۰)', 'Edge Cases (10)')}</span>
					</button>
				</div>

				{/* =================================================================== */}
				{/* TAB 1: IN-CHAT BOT COMMANDS (PERSIAN NATURAL + SLASH + SIMULATOR)  */}
				{/* =================================================================== */}
				<Show when={activeSection() === 'commands'}>
					{/* Live In-Chat Command Simulator */}
					<div>
						<div class="tg-section-header">
							{pick(
								'شبیه‌ساز زنده دستورات داخل گروه (ریپلای ادمین)',
								'په ګروپ کې د کمانډونو ژوندی شبیه‌ساز (د اډمین ریپلای)',
								'Live In-Group Command Simulator (Admin Reply)',
							)}
						</div>
						<div class="tg-section p-3.5 flex flex-col gap-3">
							<div class="flex items-center justify-between text-[11.5px] text-[var(--tg-hint)]">
								<span>
									{pick(
										'ریپلای ادمین روی پیام کاربر:',
										'د کاروونکي پر پیغام د اډمین ریپلای:',
										'Admin reply to user message:',
									)}
								</span>
								<span class="font-mono font-bold text-[var(--tg-link)]" dir="ltr">
									@{targetName()} (ID: 8849201)
								</span>
							</div>

							{/* Quick Preset Command Chips */}
							<div class="flex flex-wrap gap-1.5">
								<For
									each={[
										{
											label: pick('🔇 سکوت ۲ ساعت', '🔇 بې‌غږه ۲ ساعته', '🔇 Mute 2h'),
											cmd: pick(
												'سکوت ۲ ساعت ارسال لینک تبلیغاتی',
												'بې‌غږه ۲ ساعته د تبلیغاتي لینک لېږل',
												'/mute 2h Sending promotional link',
											),
										},
										{
											label: pick('🚫 بن دائمی', '🚫 دایمي شړل', '🚫 Perm Ban'),
											cmd: pick('بن اسپمر رباتیک', 'شړل اسپم بوټ', '/ban Spam bot'),
										},
										{
											label: pick('⚠️ اخطار (۲/۳)', '⚠️ خبرداری (۲/۳)', '⚠️ Warn (2/3)'),
											cmd: pick(
												'اخطار رعایت نکردن قوانین گروه',
												'خبرداری د ګروپ قوانینو ته نه درناوی',
												'/warn Ignoring group rules',
											),
										},
										{
											label: pick('🧹 پاکسازی ۵۰', '🧹 پاکول ۵۰', '🧹 Purge 50'),
											cmd: pick('پاکسازی ۵۰', 'پاکول ۵۰', '/purge 50'),
										},
										{
											label: pick('💎 معاف (VIP)', '💎 معاف (VIP)', '💎 VIP Exempt'),
											cmd: pick('معاف', 'معاف', '/vip'),
										},
										{
											label: pick('🚨 گزارش به ادمین', '🚨 اډمین ته راپور', '🚨 Report Admin'),
											cmd: pick('گزارش', 'راپور', '/report'),
										},
										{
											label: pick('🎛 پنل شیشه‌ای', '🎛 شیشه‌يي پینل', '🎛 Inline Panel'),
											cmd: pick('پنل', 'پینل', '/panel'),
										},
									]}
								>
									{(preset) => (
										<button
											type="button"
											onClick={() => runSimulatedCommand(preset.cmd)}
											class="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] border border-[var(--tg-separator)] active:scale-95 transition-transform"
										>
											{preset.label}
										</button>
									)}
								</For>
							</div>

							{/* Custom Command Input */}
							<div class="flex items-center gap-2">
								<input
									type="text"
									value={cmdInput()}
									onInput={(e) => setCmdInput(e.currentTarget.value)}
									placeholder={pick(
										'مثلاً: سکوت ۳۰ دقیقه یا /ban یا پاکسازی ۱۰۰',
										'لکه: بې‌غږه ۳۰ دقیقې یا /ban یا پاکول ۱۰۰',
										'e.g. /mute 30m, /ban, /purge 100',
									)}
									aria-label={pick('متن دستور ادمین', 'د اډمین کمانډ متن', 'Admin command text')}
									class="flex-1 h-10 px-3 rounded-xl bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[13px] text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-button)]"
								/>
								<button
									type="button"
									onClick={() => runSimulatedCommand()}
									class="h-10 px-4 rounded-xl bg-[var(--tg-button)] text-white text-[13px] font-bold shrink-0 active:scale-95 transition-transform"
								>
									{pick('اجرا در چت', 'په چټ کې اجرا', 'Run')}
								</button>
							</div>

							{/* Simulated Telegram Chat Bubble Output + Interactive Inline Keyboard */}
							<div class="flex flex-col gap-2.5 pt-1">
								<For each={simHistory().slice(0, 2)}>
									{(msg) => (
										<div class="rounded-2xl bg-[var(--tg-secondary-bg)] p-3 border border-[var(--tg-separator)] flex flex-col gap-2">
											{/* Admin Reply Quote */}
											<div class="border-s-2 border-[var(--tg-button)] ps-2.5 text-[11.5px] flex items-center justify-between gap-2">
												<div class="min-w-0">
													<span class="font-bold text-[var(--tg-button)]">
														{pick('ادمین گروه', 'د ګروپ اډمین', 'Group Admin')}
													</span>
													<span class="text-[var(--tg-hint)] mx-1">
														{pick('⟵ ریپلای:', '⟵ ریپلای:', '⟵ Reply:')}
													</span>
													<span class="font-bold text-[var(--tg-text)]">«{msg.adminText}»</span>
												</div>
												<span
													dir="ltr"
													class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--tg-button)]/10 text-[var(--tg-button)] shrink-0"
												>
													{msg.apiMethod}
												</span>
											</div>

											{/* Bot Response Bubble */}
											<div
												class="text-[12.5px] text-[var(--tg-text)] leading-relaxed whitespace-pre-line bg-[var(--tg-section-bg)] p-2.5 rounded-xl border border-[var(--tg-separator)]"
												innerHTML={msg.botReplyHtml}
											/>

											{/* Inline Keyboard Attached to Bot Reply */}
											<Show when={msg.inlineKeyboard.length > 0}>
												<div class="flex flex-col gap-1">
													<For each={msg.inlineKeyboard}>
														{(row) => (
															<div
																class="grid gap-1"
																style={{
																	'grid-template-columns': `repeat(${row.length}, minmax(0, 1fr))`,
																}}
															>
																<For each={row}>
																	{(btn) => (
																		<button
																			type="button"
																			onClick={() => handleSimMessageInlineClick(msg.id, btn)}
																			class="h-8 rounded-lg bg-[var(--tg-button)]/14 hover:bg-[var(--tg-button)]/22 text-[var(--tg-link)] text-[11.5px] font-bold flex items-center justify-center gap-1 border border-[var(--tg-button)]/20 active:scale-98 transition-all px-2 truncate"
																		>
																			<span class="truncate">{btn.text}</span>
																		</button>
																	)}
																</For>
															</div>
														)}
													</For>
												</div>
											</Show>

											<Show when={msg.resolvedCallbackNote}>
												<div class="text-[11.5px] font-semibold text-[#34C759] bg-[#34C759]/10 px-2.5 py-1.5 rounded-lg">
													{msg.resolvedCallbackNote}
												</div>
											</Show>
										</div>
									)}
								</For>
							</div>
						</div>
					</div>

					{/* Command Engine Toggles */}
					<div>
						<div class="tg-section-header">
							{pick(
								'تنظیمات موتور دستورات داخل چت',
								'د چټ دننه د کمانډونو انجن تنظیمات',
								'In-Chat Command Engine Settings',
							)}
						</div>
						<div class="tg-section">
							<div class="tg-cell justify-between">
								<div class="flex flex-col min-w-0 pe-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										{pick(
											'دستورات فارسی بدون اسلش (Natural Triggers)',
											'پرته له سلش طبیعي کمانډونه (Natural Triggers)',
											'Natural Language Triggers (No Slash Required)',
										)}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										{pick(
											'تشخیص هوشمند «بن»، «سکوت ۲ ساعت»، «اخطار»، «معاف» با ریپلای',
											'د ریپلای پر مهال د «شړل»، «بې‌غږه ۲ ساعته»، «خبرداری»، «معاف» هوښیار پېژندنه',
											'Smart detection of natural moderation triggers on reply',
										)}
									</span>
								</div>
								<ToggleSwitch
									checked={enablePersianNatural()}
									onChange={(v) => {
										haptic.selection();
										setEnablePersianNatural(v);
									}}
								/>
							</div>

							<div class="tg-cell justify-between">
								<div class="flex flex-col min-w-0 pe-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										{pick(
											'حذف خودکار پیام دستور ادمین',
											'د اډمین د کمانډ پیغام اتومات حذفول',
											'Auto-Delete Admin Command Messages',
										)}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										{pick(
											'تمیز ماندن چت گروه پس از اجرای دستور بن یا سکوت',
											'د بن یا بې‌غږه کولو کمانډ له اجرا وروسته د ګروپ چټ پاک ساتل',
											'Keep group chat clean after executing moderation commands',
										)}
									</span>
								</div>
								<ToggleSwitch
									checked={autoDeleteAdminCmd()}
									onChange={(v) => {
										haptic.selection();
										setAutoDeleteAdminCmd(v);
									}}
								/>
							</div>

							<div class="tg-cell justify-between">
								<div class="flex flex-col min-w-0 pe-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										{pick(
											'دکمه‌های شیشه‌ای واکنش سریع زیر پیام‌های ربات',
											'د بوټ پیغامونو لاندې چټک غبرګون شیشه‌يي تڼۍ',
											'Quick-Action Inline Buttons Below Bot Replies',
										)}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										{pick(
											'افزودن دکمه «🔊 لغو سکوت» و «💚 بخشش اخطار» زیر اعلان ربات',
											'د بوټ خبرتیا لاندې د «🔊 چوپتیا لرې کول» او «💚 خبرداري بښل» تڼۍ ورزیاتول',
											'Attach 1-tap Unmute & Forgive Warn buttons below notices',
										)}
									</span>
								</div>
								<ToggleSwitch
									checked={attachInlineActions()}
									onChange={(v) => {
										haptic.selection();
										setAttachInlineActions(v);
									}}
								/>
							</div>

							<div class="tg-cell justify-between">
								<div class="flex flex-col min-w-0 pe-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										{pick(
											'دستور عمومی «گزارش» (/report) برای اعضا',
											'د غړو لپاره عام «راپور» (/report) کمانډ',
											'Public /report Command for Members',
										)}
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										{pick(
											'ارسال آنی گزارش تخلف به پی‌وی ادمین‌ها همراه با دکمه حذف و بن',
											'د اډمینانو شخصي پیغام ته د حذف او بن تڼۍ سره د سرغړونې سملاسي راپور لېږل',
											'Send instant violation alerts to admin PM with Ban/Delete actions',
										)}
									</span>
								</div>
								<ToggleSwitch
									checked={allowPublicReport()}
									onChange={(v) => {
										haptic.selection();
										setAllowPublicReport(v);
									}}
								/>
							</div>
						</div>
					</div>

					{/* Complete Categorized Catalog of 16+ Command Families */}
					<div>
						<div class="tg-section-header">
							{pick(
								'بانک کامل دستورات ربات (۴۰+ دستور فارسی و انگلیسی)',
								'د بوټ بشپړ کمانډونه (۴۰+ سیمه‌ییز او انګلیسي کمانډونه)',
								'Complete Bot Commands Catalog (40+ Triggers)',
							)}
						</div>
						<div class="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
							<For
								each={[
									{
										id: 'all',
										label: pick(
											`همه (${BOT_COMMANDS_CATALOG.length})`,
											`ټول (${BOT_COMMANDS_CATALOG.length})`,
											`All (${BOT_COMMANDS_CATALOG.length})`,
										),
									},
									{
										id: 'punishment',
										label: pick('برخورد و جریمه', 'سزا او بندیز', 'Moderation'),
									},
									{
										id: 'cleanup',
										label: pick('پاکسازی چت', 'د چټ پاکول', 'Cleanup'),
									},
									{
										id: 'locks',
										label: pick('قفل‌های سریع', 'چټک قلفونه', 'Quick Locks'),
									},
									{
										id: 'users',
										label: pick('معافیت و گزارش', 'معافیت او راپور', 'Users & Report'),
									},
									{
										id: 'panel',
										label: pick('پنل شیشه‌ای', 'شیشه‌يي پینل', 'Inline Panel'),
									},
								]}
							>
								{(tab) => (
									<button
										type="button"
										onClick={() => {
											haptic.selection();
											setSelectedCat(tab.id as any);
										}}
										class={`px-3 py-1 rounded-full text-[11.5px] font-bold shrink-0 transition-all ${
											selectedCat() === tab.id
												? 'bg-[var(--tg-button)] text-white'
												: 'bg-[var(--tg-section-bg)] text-[var(--tg-hint)] border border-[var(--tg-separator)]'
										}`}
									>
										{tab.label}
									</button>
								)}
							</For>
						</div>

						<div class="tg-section divide-y divide-[var(--tg-separator)]">
							<For each={filteredCatalog()}>
								{(cmd) => {
									const info = () => getLocalizedBotCommand(cmd, locale());
									return (
										<div class="p-3.5 flex flex-col gap-2">
											<div class="flex items-center justify-between gap-2">
												<div class="flex flex-col min-w-0">
													<span class="text-[13.5px] font-bold text-[var(--tg-text)]">
														{info().title}
													</span>
													<span class="text-[11.5px] text-[var(--tg-hint)]">{info().desc}</span>
												</div>
												<button
													type="button"
													onClick={() =>
														runSimulatedCommand(info().triggers[0] || cmd.slashTriggers[0])
													}
													class="px-2.5 py-1 rounded-lg bg-[var(--tg-button)]/12 text-[var(--tg-link)] text-[11px] font-bold shrink-0"
												>
													{pick('تست دستور ↰', 'کمانډ آزمویل ↰', 'Try ↰')}
												</button>
											</div>

											<div class="flex flex-wrap items-center gap-1.5">
												<For each={info().triggers}>
													{(trig) => (
														<span class="px-2 py-0.5 rounded-md bg-[#34C759]/12 text-[#34C759] text-[11px] font-bold">
															{trig}
														</span>
													)}
												</For>
												<For each={cmd.slashTriggers}>
													{(slash) => (
														<span
															dir="ltr"
															class="px-2 py-0.5 rounded-md bg-[var(--tg-secondary-bg)] text-[var(--tg-link)] font-mono text-[11px] font-semibold"
														>
															{slash}
														</span>
													)}
												</For>
											</div>

											<div class="flex items-center justify-between text-[11px] text-[var(--tg-hint)] pt-0.5">
												<span>{info().example}</span>
												<span dir="ltr" class="font-mono text-[10.5px]">
													API: {cmd.botApiMethod}
												</span>
											</div>
										</div>
									);
								}}
							</For>
						</div>
					</div>
				</Show>

				{/* =================================================================== */}
				{/* TAB 2: INTERACTIVE IN-CHAT INLINE KEYBOARD CONTROL PANEL (/panel)  */}
				{/* =================================================================== */}
				<Show when={activeSection() === 'inline-panel'}>
					{/* Role Simulator to test Admin-Only Callback Query Protection */}
					<div>
						<div class="tg-section-header">
							{pick(
								'تست امنیت دسترسی دکمه‌های شیشه‌ای (RBAC)',
								'د شیشه‌يي تڼیو د لاسرسي امنیت آزموینه (RBAC)',
								'Inline Button Access Security Test (RBAC)',
							)}
						</div>
						<div class="tg-section p-3.5 flex flex-col gap-2.5">
							<div class="text-[12px] text-[var(--tg-hint)] leading-relaxed">
								{pick(
									'در تلگرام، دکمه‌های شیشه‌ای داخل چت برای همه اعضای گروه قابل مشاهده هستند، اما هسته',
									'په ټیلیګرام کې، په چټ کې شیشه‌يي تڼۍ د ګروپ ټولو غړو ته ښکاري، خو د',
									'In Telegram, in-chat inline buttons are visible to all members, but',
								)}{' '}
								<b class="text-[var(--tg-text)]">@MiniGuardBot</b>{' '}
								{pick('در هر کلیک،', 'هسته په هر کلیک کې', 'verifies')}{' '}
								<code class="font-mono text-[var(--tg-link)]">callback_query.from.id</code>{' '}
								{pick(
									'را بررسی می‌کند. نقش کلیک‌کننده را تغییر دهید و روی دکمه‌های زیر کلیک کنید:',
									'معاینه کوي. د کلیک کوونکي رول بدل کړئ او لاندې تڼۍ وازمویئ:',
									'on every tap. Switch role and test the buttons below:',
								)}
							</div>

							<div class="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setCallerRole('admin');
										setCallbackAlertBanner(null);
									}}
									class={`h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 border ${
										callerRole() === 'admin'
											? 'bg-[#34C759]/15 border-[#34C759] text-[#34C759]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									<span>
										{pick(
											'👑 کلیک به عنوان ادمین گروه',
											'👑 د ګروپ اډمین په توګه کلیک',
											'👑 Tap as Group Admin',
										)}
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setCallerRole('member');
									}}
									class={`h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 border ${
										callerRole() === 'member'
											? 'bg-[#FF3B30]/15 border-[#FF3B30] text-[#FF3B30]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									<span>
										{pick(
											'👤 کلیک به عنوان کاربر عادی',
											'👤 د عادي غړي په توګه کلیک',
											'👤 Tap as Regular Member',
										)}
									</span>
								</button>
							</div>

							<Show when={callbackAlertBanner()}>
								<div class="p-3 rounded-xl bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF3B30] text-[12px] font-bold flex items-center justify-between gap-2">
									<span>{callbackAlertBanner()}</span>
									<span dir="ltr" class="font-mono text-[10px] opacity-80 shrink-0">
										show_alert: true
									</span>
								</div>
							</Show>
						</div>
					</div>

					{/* Interactive Telegram In-Chat /panel Mockup */}
					<div>
						<div class="tg-section-header">
							{pick(
								'پیش‌نمایش زنده دستور /panel یا «پنل» داخل چت گروه',
								'په ګروپ چټ کې د /panel یا «پینل» ژوندۍ مخکتنه',
								'Live In-Chat /panel Preview',
							)}
						</div>
						<div class="rounded-2xl bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] p-3.5 flex flex-col gap-3 shadow-xs">
							{/* Message Header */}
							<div class="flex items-center justify-between border-b border-[var(--tg-separator)] pb-2.5">
								<div class="flex items-center gap-2">
									<div class="w-8 h-8 rounded-full bg-[var(--tg-button)] text-white font-bold text-[13px] flex items-center justify-center">
										MG
									</div>
									<div class="flex flex-col">
										<span class="text-[13px] font-bold text-[var(--tg-text)]">
											{pick(
												'ربات محافظ گروه (@MiniGuardBot)',
												'د ګروپ ساتونکی بوټ (@MiniGuardBot)',
												'Group Guard Bot (@MiniGuardBot)',
											)}
										</span>
										<span dir="ltr" class="text-[10.5px] font-mono text-[var(--tg-hint)]">
											callback_data: {lastCallbackData()}
										</span>
									</div>
								</div>
								<span class="text-[11px] px-2 py-0.5 rounded-md bg-[#34C759]/15 text-[#34C759] font-bold">
									Inline Menu
								</span>
							</div>

							{/* Message Body changes dynamically per sub-menu */}
							<Show when={inlineScreen() === 'root'}>
								<div class="text-[13px] text-[var(--tg-text)] leading-relaxed bg-[var(--tg-secondary-bg)] p-3 rounded-xl">
									🎛{' '}
									<b>
										{pick(
											'پنل مدیریت سریع شیشه‌ای (In-Chat Control)',
											'د چټک شیشه‌يي مدیریت پینل (In-Chat Control)',
											'Quick Inline Control Panel',
										)}
									</b>
									<br />
									{pick(
										'ادمین گرامی، بدون خروج از چت گروه می‌توانید قفل‌ها، ضدفلود و وضعیت اضطراری را با دکمه‌های زیر تغییر دهید:',
										'ګرانه اډمینه، له ګروپ چټ څخه له وتلو پرته کولای شئ قلفونه، فلډ ضد او بېړنی حالت په لاندې تڼیو بدل کړئ:',
										'Dear admin, toggle content locks, anti-flood, and emergency lockdown without leaving the chat:',
									)}
									<br />
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										• {pick('وضعیت قفل اضطراری:', 'د بېړني قلف حالت:', 'Emergency Lock:')}{' '}
										<b>
											{inlineLocks().emergencyLock
												? pick('🔴 فعال (چت بسته)', '🔴 فعال (چټ تړلی)', '🔴 ON (Chat Locked)')
												: pick('🟢 غیرفعال (عادی)', '🟢 غیرفعال (عادي)', '🟢 OFF (Normal)')}
										</b>{' '}
										| {pick('حساسیت ضدفلود:', 'د فلډ ضد حساسیت:', 'Anti-Flood:')}{' '}
										<b>
											{inlineLocks().floodLimit} {pick('پیام', 'پیغامونه', 'msgs')}
										</b>
									</span>
								</div>

								{/* Root Inline Keyboard */}
								<div class="flex flex-col gap-1.5">
									<div class="grid grid-cols-2 gap-1.5">
										<button
											type="button"
											onClick={() =>
												handleInlinePanelButton('panel:locks', () => setInlineScreen('locks'))
											}
											class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12.5px] font-bold border border-[var(--tg-button)]/25 active:scale-98"
										>
											{pick('🛡️ قفل‌های محتوا', '🛡️ د محتوا قلفونه', '🛡️ Content Locks')}
										</button>
										<button
											type="button"
											onClick={() =>
												handleInlinePanelButton('panel:flood', () => setInlineScreen('flood'))
											}
											class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12.5px] font-bold border border-[var(--tg-button)]/25 active:scale-98"
										>
											{pick('⚡ تنظیم ضدفلود', '⚡ د فلډ ضد تنظیم', '⚡ Anti-Flood')}
										</button>
									</div>

									<div class="grid grid-cols-2 gap-1.5">
										<button
											type="button"
											onClick={() =>
												handleInlinePanelButton('panel:quiet', () => setInlineScreen('quiet'))
											}
											class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12.5px] font-bold border border-[var(--tg-button)]/25 active:scale-98"
										>
											{pick('🌙 ساعات سکوت', '🌙 د چوپتیا ساعتونه', '🌙 Quiet Hours')} (
											{inlineLocks().quietHoursActive
												? pick('فعال', 'فعال', 'ON')
												: pick('خاموش', 'بند', 'OFF')}
											)
										</button>
										<button
											type="button"
											onClick={() =>
												handleInlinePanelButton('panel:toggle:emergency', () =>
													setInlineLocks((p) => ({ ...p, emergencyLock: !p.emergencyLock })),
												)
											}
											class={`h-9 rounded-xl text-[12.5px] font-bold border active:scale-98 ${
												inlineLocks().emergencyLock
													? 'bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40'
													: 'bg-[var(--tg-button)]/14 text-[var(--tg-link)] border-[var(--tg-button)]/25'
											}`}
										>
											{inlineLocks().emergencyLock
												? pick('🔓 باز کردن قفل اضطراری', '🔓 بېړنی قلف خلاصول', '🔓 Unlock Chat')
												: pick('🔒 قفل اضطراری گروه', '🔒 د ګروپ بېړنی قلف', '🔒 Emergency Lock')}
										</button>
									</div>

									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('panel:webapp', () => navigate(`/group/${params.id}`))
										}
										class="h-9 rounded-xl bg-[var(--tg-button)] text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5"
									>
										<span>
											{pick(
												'📱 باز کردن مینی‌اپ کامل تنظیمات گروه',
												'📱 د ګروپ تنظیماتو بشپړ مینی‌اپ پرانیستل',
												'📱 Open Full Group Mini App',
											)}
										</span>
									</button>
								</div>
							</Show>

							{/* Sub-menu: Content Locks */}
							<Show when={inlineScreen() === 'locks'}>
								<div class="text-[13px] text-[var(--tg-text)] leading-relaxed bg-[var(--tg-secondary-bg)] p-3 rounded-xl">
									🛡️{' '}
									<b>
										{pick(
											'مدیریت زنده قفل‌های محتوا (editMessageReplyMarkup)',
											'د محتوا قلفونو ژوندی مدیریت (editMessageReplyMarkup)',
											'Live Content Locks (editMessageReplyMarkup)',
										)}
									</b>
									<br />
									{pick(
										'روی هر قفل کلیک کنید تا وضعیت آن در لحظه تغییر کند:',
										'پر هر قلف کلیک وکړئ ترڅو حالت یې سملاسي بدل شي:',
										'Tap any lock to toggle it immediately:',
									)}
								</div>

								<div class="grid grid-cols-2 gap-1.5">
									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('lock:toggle:links', () =>
												setInlineLocks((p) => ({ ...p, links: !p.links })),
											)
										}
										class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12px] font-bold border border-[var(--tg-button)]/25"
									>
										{pick('🔗 لینک‌ها:', '🔗 لینکونه:', '🔗 Links:')}{' '}
										{inlineLocks().links
											? pick('❌ قفل', '❌ قلف', '❌ Locked')
											: pick('✅ آزاد', '✅ ازاد', '✅ Open')}
									</button>
									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('lock:toggle:forwards', () =>
												setInlineLocks((p) => ({ ...p, forwards: !p.forwards })),
											)
										}
										class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12px] font-bold border border-[var(--tg-button)]/25"
									>
										{pick('↪️ فوروارد:', '↪️ فارورډ:', '↪️ Forwards:')}{' '}
										{inlineLocks().forwards
											? pick('❌ قفل', '❌ قلف', '❌ Locked')
											: pick('✅ آزاد', '✅ ازاد', '✅ Open')}
									</button>
									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('lock:toggle:usernames', () =>
												setInlineLocks((p) => ({ ...p, usernames: !p.usernames })),
											)
										}
										class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12px] font-bold border border-[var(--tg-button)]/25"
									>
										{pick('＠ منشن و آیدی:', '＠ مینشن او آیډي:', '＠ Mentions:')}{' '}
										{inlineLocks().usernames
											? pick('❌ قفل', '❌ قلف', '❌ Locked')
											: pick('✅ آزاد', '✅ ازاد', '✅ Open')}
									</button>
									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('lock:toggle:stories', () =>
												setInlineLocks((p) => ({ ...p, stories: !p.stories })),
											)
										}
										class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12px] font-bold border border-[var(--tg-button)]/25"
									>
										{pick('⭕ استوری تلگرام:', '⭕ ټیلیګرام سټوري:', '⭕ Stories:')}{' '}
										{inlineLocks().stories
											? pick('❌ قفل', '❌ قلف', '❌ Locked')
											: pick('✅ آزاد', '✅ ازاد', '✅ Open')}
									</button>
									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('lock:toggle:voice', () =>
												setInlineLocks((p) => ({ ...p, voice: !p.voice })),
											)
										}
										class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12px] font-bold border border-[var(--tg-button)]/25"
									>
										{pick('🎙️ ویس و ویدیو مسیج:', '🎙️ غږیز او ویډیو پیغام:', '🎙️ Voice/Video:')}{' '}
										{inlineLocks().voice
											? pick('❌ قفل', '❌ قلف', '❌ Locked')
											: pick('✅ آزاد', '✅ ازاد', '✅ Open')}
									</button>
									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('lock:toggle:inlineBots', () =>
												setInlineLocks((p) => ({ ...p, inlineBots: !p.inlineBots })),
											)
										}
										class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12px] font-bold border border-[var(--tg-button)]/25"
									>
										{pick('🤖 ربات‌های اینلاین:', '🤖 اینلاین بوټونه:', '🤖 Inline Bots:')}{' '}
										{inlineLocks().inlineBots
											? pick('❌ قفل', '❌ قلف', '❌ Locked')
											: pick('✅ آزاد', '✅ ازاد', '✅ Open')}
									</button>
								</div>

								<button
									type="button"
									onClick={() =>
										handleInlinePanelButton('panel:main', () => setInlineScreen('root'))
									}
									class="h-9 rounded-xl bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] text-[12.5px] font-bold border border-[var(--tg-separator)]"
								>
									{pick(
										'🔙 بازگشت به منوی اصلی پنل',
										'🔙 د پینل اصلي مینو ته بېرته تګ',
										'🔙 Back to Main Panel',
									)}
								</button>
							</Show>

							{/* Sub-menu: Anti-Flood */}
							<Show when={inlineScreen() === 'flood'}>
								<div class="text-[13px] text-[var(--tg-text)] leading-relaxed bg-[var(--tg-secondary-bg)] p-3 rounded-xl">
									⚡{' '}
									<b>
										{pick(
											'تنظیم حساسیت ضدفلود و رگباری',
											'د فلډ ضد او چټکو پیغامونو حساسیت تنظیم',
											'Anti-Flood Sensitivity',
										)}
									</b>
									<br />
									{pick(
										'حداکثر تعداد پیام مجاز پشت سر هم در ۵ ثانیه:',
										'په ۵ ثانیو کې پرله‌پسې د مجازو پیغامونو اعظمي شمېر:',
										'Max consecutive messages per 5 seconds:',
									)}{' '}
									<b>
										{inlineLocks().floodLimit} {pick('پیام', 'پیغامونه', 'msgs')}
									</b>
								</div>

								<div class="grid grid-cols-3 gap-1.5">
									<For each={[3, 5, 8]}>
										{(num) => (
											<button
												type="button"
												onClick={() =>
													handleInlinePanelButton(`flood:set:${num}`, () =>
														setInlineLocks((p) => ({ ...p, floodLimit: num })),
													)
												}
												class={`h-9 rounded-xl text-[12px] font-bold border ${
													inlineLocks().floodLimit === num
														? 'bg-[var(--tg-button)] text-white border-[var(--tg-button)]'
														: 'bg-[var(--tg-button)]/14 text-[var(--tg-link)] border-[var(--tg-button)]/25'
												}`}
											>
												{num} {pick('پیام / ۵ ثانیه', 'پیغامونه / ۵ ثانیې', 'msgs / 5s')}
											</button>
										)}
									</For>
								</div>

								<button
									type="button"
									onClick={() =>
										handleInlinePanelButton('panel:main', () => setInlineScreen('root'))
									}
									class="h-9 rounded-xl bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] text-[12.5px] font-bold border border-[var(--tg-separator)]"
								>
									{pick(
										'🔙 بازگشت به منوی اصلی پنل',
										'🔙 د پینل اصلي مینو ته بېرته تګ',
										'🔙 Back to Main Panel',
									)}
								</button>
							</Show>

							{/* Sub-menu: Quiet Hours */}
							<Show when={inlineScreen() === 'quiet'}>
								<div class="text-[13px] text-[var(--tg-text)] leading-relaxed bg-[var(--tg-secondary-bg)] p-3 rounded-xl">
									🌙{' '}
									<b>
										{pick(
											'مدیریت ساعات سکوت شبانه (۰۰:۰۰ تا ۰۷:۰۰)',
											'د شپې د چوپتیا ساعتونو مدیریت (۰۰:۰۰ تر ۰۷:۰۰)',
											'Quiet Hours Management (00:00 - 07:00)',
										)}
									</b>
									<br />
									{pick('وضعیت فعلی:', 'اوسنی حالت:', 'Current status:')}{' '}
									<b>
										{inlineLocks().quietHoursActive
											? pick(
													'🟢 فعال در برنامه شبانه',
													'🟢 د شپې په مهالوېش کې فعال',
													'🟢 Scheduled ON',
												)
											: pick('⚪ غیرفعال', '⚪ غیرفعال', '⚪ OFF')}
									</b>
								</div>

								<button
									type="button"
									onClick={() =>
										handleInlinePanelButton('quiet:toggle', () =>
											setInlineLocks((p) => ({ ...p, quietHoursActive: !p.quietHoursActive })),
										)
									}
									class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12.5px] font-bold border border-[var(--tg-button)]/25"
								>
									{inlineLocks().quietHoursActive
										? pick(
												'⏸ غیرفعال کردن ساعات سکوت',
												'⏸ د چوپتیا ساعتونه غیرفعالول',
												'⏸ Disable Quiet Hours',
											)
										: pick(
												'▶️ فعال‌سازی ساعات سکوت شبانه',
												'▶️ د شپې د چوپتیا ساعتونه فعالول',
												'▶️ Enable Quiet Hours',
											)}
								</button>

								<button
									type="button"
									onClick={() =>
										handleInlinePanelButton('panel:main', () => setInlineScreen('root'))
									}
									class="h-9 rounded-xl bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] text-[12.5px] font-bold border border-[var(--tg-separator)]"
								>
									{pick(
										'🔙 بازگشت به منوی اصلی پنل',
										'🔙 د پینل اصلي مینو ته بېرته تګ',
										'🔙 Back to Main Panel',
									)}
								</button>
							</Show>
						</div>
					</div>
				</Show>

				{/* =================================================================== */}
				{/* TAB 3: 100% EDGE CASES & SUBSCRIPTION EXPIRY HIBERNATION MATRIX     */}
				{/* =================================================================== */}
				<Show when={activeSection() === 'edge-cases'}>
					{/* Featured Simulator: What happens when 24h Trial / Monthly Stars Expires and User Doesn't Pay */}
					<div>
						<div class="tg-section-header">
							{pick(
								'چرخه حیات اشتراک: چه اتفاقی می‌افتد وقتی اعتبار تمام شود و کاربر پرداخت نکند؟',
								'د ګډون ژوندڅرخ: کله چې اعتبار پای ته ورسېږي او کاروونکی تادیه ونه کړي څه پېښېږي؟',
								'Subscription Lifecycle: What happens when trial/Stars expire unpaid?',
							)}
						</div>
						<div class="tg-section p-4 flex flex-col gap-3">
							{/* 4 Lifecycle Stage Buttons */}
							<div class="grid grid-cols-2 gap-1.5">
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSubLifecycleStage('active_trial');
									}}
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-start ${
										subLifecycleStage() === 'active_trial'
											? 'bg-[#34C759]/15 border-[#34C759] text-[#34C759]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									{pick(
										'۱. دوره ۲۴ ساعته رایگان فعال',
										'۱. ۲۴ ساعته وړیا دوره فعاله',
										'1. 24h Free Trial Active',
									)}
								</button>
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSubLifecycleStage('warning_2h');
									}}
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-start ${
										subLifecycleStage() === 'warning_2h'
											? 'bg-[#FF9500]/15 border-[#FF9500] text-[#FF9500]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									{pick(
										'۲. هشدار ۲ ساعت مانده به انقضا',
										'۲. تر پای ۲ ساعته مخکې خبرداری',
										'2. Expiry Warning (T-2h)',
									)}
								</button>
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSubLifecycleStage('expired_hibernated');
									}}
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-start ${
										subLifecycleStage() === 'expired_hibernated'
											? 'bg-[#FF3B30]/15 border-[#FF3B30] text-[#FF3B30]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									{pick(
										'۳. انقضا و عدم پرداخت (خواب ایمن)',
										'۳. پای او نه تادیه (خوندي خوب)',
										'3. Expired (Safe Hibernation)',
									)}
								</button>
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSubLifecycleStage('reactivated_stars');
									}}
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-start ${
										subLifecycleStage() === 'reactivated_stars'
											? 'bg-[#007AFF]/15 border-[#007AFF] text-[#007AFF]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									{pick(
										'۴. پرداخت ۱۰۰ ⭐ و بیداری آنی',
										'۴. ۱۰۰ ⭐ تادیه او سملاسي ویښېدل',
										'4. 100 ⭐ Payment & Instant Wake',
									)}
								</button>
							</div>

							{/* Dynamic Explanation of Selected Subscription Stage */}
							<div class="rounded-xl bg-[var(--tg-secondary-bg)] p-3.5 border border-[var(--tg-separator)] flex flex-col gap-2">
								<Show when={subLifecycleStage() === 'active_trial'}>
									<div class="text-[13px] font-bold text-[#34C759]">
										{pick(
											'🟢 مرحله ۱: تست رایگان ۲۴ ساعته با ۱۰۰٪ ظرفیت',
											'🟢 ۱ پړاو: ۲۴ ساعته وړیا آزموینه له ۱۰۰٪ ظرفیت سره',
											'🟢 Stage 1: 24h Free Trial at 100% Capacity',
										)}
									</div>
									<p class="text-[12px] text-[var(--tg-text)] leading-relaxed">
										{pick(
											'به محض افزودن ربات اختصاصی به گروه، تمام ماژول‌های فایروال، دستورات چت، کپچای بیومتریک و پنل شیشه‌ای به مدت ۲۴ ساعت کاملاً رایگان فعال می‌شوند.',
											'ګروپ ته د ځانګړي بوټ له ورزیاتولو سره سم، د فایروال ټول ماډیولونه، د چټ کمانډونه، بایومتریک کپچا او شیشه‌يي پینل د ۲۴ ساعتونو لپاره په بشپړه توګه وړیا فعالېږي.',
											'As soon as your dedicated bot is added to the group, all firewall modules, chat commands, captcha, and inline panel activate free for 24h.',
										)}
									</p>
								</Show>

								<Show when={subLifecycleStage() === 'warning_2h'}>
									<div class="text-[13px] font-bold text-[#FF9500]">
										{pick(
											'🟠 مرحله ۲: ارسال نوتیفیکیشن هوشمند در پی‌وی مالک (T-2h و T-30m)',
											'🟠 ۲ پړاو: د مالک په شخصي پیغام کې هوښیار خبرتیا (T-2h او T-30m)',
											'🟠 Stage 2: Smart Owner PM Alerts (T-2h & T-30m)',
										)}
									</div>
									<p class="text-[12px] text-[var(--tg-text)] leading-relaxed">
										{pick(
											'۲ ساعت قبل از اتمام اعتبار، ربات در پی‌وی مالک گروه پیام هشدار همراه با دکمه شیشه‌ای پرداخت',
											'د اعتبار له پای ته رسېدو ۲ ساعته مخکې، بوټ د ګروپ مالک ته په شخصي پیغام کې د تادیې شیشه‌يي تڼۍ',
											'2 hours before expiry, the bot sends an owner PM warning with a payment button',
										)}{' '}
										<code>sendInvoice (currency: &quot;XTR&quot;, amount: 100)</code>{' '}
										{pick(
											'ارسال می‌کند. در چت گروه هیچ پیام تبلیغاتی یا مزاحمی برای اعضا فرستاده نمی‌شود.',
											'سره خبرداری لېږي. په ګروپ چټ کې غړو ته هېڅ تبلیغاتي یا مزاحم پیغام نه لېږل کېږي.',
											'so group chat stays completely clean for members.',
										)}
									</p>
								</Show>

								<Show when={subLifecycleStage() === 'expired_hibernated'}>
									<div class="text-[13px] font-bold text-[#FF3B30]">
										{pick(
											'🔴 مرحله ۳: اتمام اعتبار و عدم پرداخت ⟵ ورود به «حالت خواب ایمن (Safe Hibernation)»',
											'🔴 ۳ پړاو: د اعتبار پای او نه تادیه ⟵ «خوندي خوب (Safe Hibernation)» حالت ته ننوتل',
											'🟠 Stage 3: Expired Unpaid ⟵ Safe Hibernation Mode',
										)}
									</div>
									<ul class="text-[12px] text-[var(--tg-text)] leading-relaxed list-disc ps-4 space-y-1">
										<li>
											<b>
												{pick(
													'حفظ ۱۰۰٪ تنظیمات (0% Data Loss):',
													'د ۱۰۰٪ تنظیماتو ساتنه (0% Data Loss):',
													'100% Settings Preserved (0% Data Loss):',
												)}
											</b>{' '}
											{pick(
												'هیچ‌کدام از قفل‌ها، لیست کلمات ممنوعه، اعضای معاف (VIP) و آمارهای گروه پاک نمی‌شوند.',
												'هېڅ یو قلف، د بندو کلمو لېست، معاف شوي غړي (VIP) او د ګروپ احصایې نه حذفېږي.',
												'No locks, banned words, VIP lists, or analytics are erased.',
											)}
										</li>
										<li>
											<b>{pick('عدم ترک گروه:', 'د ګروپ نه پرېښودل:', 'Never Leaves Group:')}</b>{' '}
											{pick(
												'ربات هرگز گروه را ترک نمی‌کند (leaveChat صدا زده نمی‌شود) تا دسترسی ادمین از بین نرود.',
												'بوټ هېڅکله ګروپ نه پرېږدي (leaveChat نه اجرا کېږي) ترڅو د اډمین واک له منځه لاړ نه شي.',
												'The bot never calls leaveChat, keeping its admin rights intact.',
											)}
										</li>
										<li>
											<b>
												{pick(
													'رفتار در برابر دستورات ادمین:',
													'د اډمین کمانډونو پروړاندې چلند:',
													'Admin Command Behavior:',
												)}
											</b>{' '}
											{pick(
												'اگر ادمین دستور پنل یا بن بفرستد، ربات با یک پیام محترمانه و دکمه شیشه‌ای',
												'که اډمین پینل یا بن کمانډ ولېږي، بوټ په یوه درناوي ډک پیغام او د',
												'If an admin sends /panel or /ban, the bot replies politely with',
											)}{' '}
											<b>
												{pick(
													'«⭐ تمدید آنی با ۱۰۰ استارز»',
													'«⭐ له ۱۰۰ سټارز سره سملاسي تمدید»',
													'"⭐ Instant Renew (100 Stars)"',
												)}
											</b>{' '}
											{pick('پاسخ می‌دهد.', 'شیشه‌يي تڼۍ سره ځواب ورکوي.', 'button.')}
										</li>
									</ul>
								</Show>

								<Show when={subLifecycleStage() === 'reactivated_stars'}>
									<div class="text-[13px] font-bold text-[#007AFF]">
										{pick(
											'⚡ مرحله ۴: پرداخت ۱۰۰ استارز و بازگشت در کمتر از ۱۰۰ میلی‌ثانیه',
											'⚡ ۴ پړاو: د ۱۰۰ سټارز تادیه او له ۱۰۰ ملي‌ثانیو کم وخت کې بېرته فعالېدل',
											'⚡ Stage 4: 100 Stars Paid & Restored in <100ms',
										)}
									</div>
									<p class="text-[12px] text-[var(--tg-text)] leading-relaxed">
										{pick(
											'به محض دریافت وب‌هوک successful_payment از تلگرام، وضعیت گروه به paid تغییر کرده و تمام قفل‌ها و دستورات دقیقاً با همان تنظیمات قبلی در کسری از ثانیه فعال می‌شوند.',
											'له ټیلیګرام څخه د successful_payment ویب‌هوک له ترلاسه کولو سره سم، د ګروپ حالت paid ته بدلېږي او ټول قلفونه او کمانډونه له هماغو پخوانیو تنظیماتو سره په یوه شېبه کې فعالېږي.',
											'Upon receiving successful_payment webhook, the group switches to paid and restores all locks immediately.',
										)}
									</p>
								</Show>
							</div>
						</div>
					</div>

					{/* Complete 10 Edge-Case Scenarios Explorer */}
					<div>
						<div class="tg-section-header">
							{pick(
								'ماتریس ۱۰ مورد لبه بحرانی تلگرام (Edge-Case Resilience)',
								'د ټیلیګرام د ۱۰ حیاتي ځانګړو حالاتو ماتریس (Edge-Case Resilience)',
								'Telegram 10 Critical Edge-Case Resilience Matrix',
							)}
						</div>
						<div class="tg-section divide-y divide-[var(--tg-separator)]">
							<For each={edgeCaseList()}>
								{(edge) => (
									<button
										type="button"
										onClick={() => {
											haptic.selection();
											setSelectedEdgeId(edge.scenarioId);
										}}
										class={`w-full p-3.5 text-start flex flex-col gap-1.5 transition-colors ${
											selectedEdgeId() === edge.scenarioId ? 'bg-[var(--tg-button)]/8' : ''
										}`}
									>
										<div class="flex items-center justify-between gap-2">
											<span class="text-[13.5px] font-bold text-[var(--tg-text)]">
												{edge.titleFa}
											</span>
											<span class="px-2 py-0.5 rounded-md bg-[#34C759]/15 text-[#34C759] text-[10.5px] font-bold shrink-0">
												0% Data Loss
											</span>
										</div>
										<div dir="ltr" class="text-[11px] font-mono text-[var(--tg-hint)] text-left">
											{edge.triggerConditionFa}
										</div>

										<Show when={selectedEdgeId() === edge.scenarioId}>
											<div class="mt-2 p-3 rounded-xl bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] flex flex-col gap-2">
												<div class="text-[12px] text-[var(--tg-text)] leading-relaxed">
													{edge.systemBehaviorFa}
												</div>
												<div
													class="text-[11.5px] bg-[var(--tg-section-bg)] p-2.5 rounded-lg border border-[var(--tg-separator)] text-[var(--tg-text)]"
													innerHTML={edge.simulatedBotMessageFa}
												/>
												<div class="flex items-center justify-between pt-1 border-t border-[var(--tg-separator)] text-[10.5px]">
													<span class="text-[var(--tg-link)] font-mono font-semibold" dir="ltr">
														{edge.botActionCode}
													</span>
													<span dir="ltr" class="font-mono text-[var(--tg-hint)]">
														{edge.scenarioId}
													</span>
												</div>
											</div>
										</Show>
									</button>
								)}
							</For>
						</div>
					</div>
				</Show>
			</main>

			<BottomNav />
		</div>
	);
};

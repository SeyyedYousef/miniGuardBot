import { useNavigate, useParams } from '@solidjs/router';
import { backButton } from '@tma.js/sdk-solid';
import { type Component, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import {
	BOT_COMMANDS_CATALOG,
	type CommandCategory,
	EDGE_CASE_RESOLUTIONS,
	type EdgeCaseScenarioId,
	evaluateCallbackQueryRbac,
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

	const [activeSection, setActiveSection] = createSignal<ActiveSection>('commands');

	// ─── Tab 1: In-Chat Commands & Live Terminal State ─────────────────────────
	const [cmdInput, setCmdInput] = createSignal('سکوت ۲ ساعت ارسال لینک تبلیغاتی');
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
			adminText: 'سکوت ۲ ساعت ارسال لینک تبلیغاتی',
			targetUser: 'Amir_Crypto',
			apiMethod: 'restrictChatMember (until_date: +7200s)',
			botReplyHtml:
				'🔇 کاربر <b>Amir_Crypto</b> به مدت <b>2 ساعت</b> بی‌صدا (Mute) شد.\n📝 دلیل: ارسال لینک تبلیغاتی',
			inlineKeyboard: [
				[
					{ text: '🔊 لغو سکوت (Unmute)', callback_data: 'mg:unmute:8849201' },
					{ text: '🚫 اخراج کامل (Ban)', callback_data: 'mg:ban:8849201' },
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
		showToast(`دستور اجرا شد: ${methodLabel}`, 'success');
	};

	const handleSimMessageInlineClick = (msgId: string, btn: InlineKeyboardButton) => {
		haptic.selection();
		const cb = btn.callback_data || '';
		let resolutionNote = '';
		if (cb.includes('unmute')) {
			resolutionNote =
				'✅ سکوت کاربر توسط ادمین با دکمه شیشه‌ای لغو شد (restrictChatMember: permissions=true).';
		} else if (cb.includes('unban')) {
			resolutionNote = '✅ مسدودیت کاربر رفع شد (unbanChatMember).';
		} else if (cb.includes('ban')) {
			resolutionNote = '🚫 کاربر به صورت دائمی از گروه اخراج شد (banChatMember).';
		} else if (cb.includes('unwarn')) {
			resolutionNote = '💚 ۱ اخطار کاربر بخشیده شد (اخطار فعلی: ۰/۳).';
		} else if (cb.includes('report_dismiss')) {
			resolutionNote = '✅ گزارش بررسی و بسته شد.';
		} else if (cb.includes('panel:')) {
			setActiveSection('inline-panel');
			showToast('پنل شیشه‌ای باز شد', 'success');
			return;
		} else {
			resolutionNote = `⚡ فراخوانی ${cb} با موفقیت انجام شد.`;
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

	const edgeCaseList = createMemo(() => Object.values(EDGE_CASE_RESOLUTIONS));

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
		<div class="tg-canvas pb-28 flex flex-col font-sans select-none" dir="rtl">
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
							aria-label="بازگشت"
						>
							<span class="material-symbols-outlined text-[22px] rtl:rotate-180">arrow_back</span>
						</button>
						<div class="flex flex-col min-w-0">
							<h1 class="text-[15px] font-bold text-[var(--tg-text)] truncate">
								دستورات چت، پنل شیشه‌ای و موارد لبه
							</h1>
							<span class="text-[11px] text-[var(--tg-hint)] truncate">
								مدیریت با یک دستور، کنترل Inline و پایداری ۱۰۰٪
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
						<span>دستورات چت</span>
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
						<span>پنل شیشه‌ای</span>
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
						<span>موارد لبه (۱۰)</span>
					</button>
				</div>

				{/* =================================================================== */}
				{/* TAB 1: IN-CHAT BOT COMMANDS (PERSIAN NATURAL + SLASH + SIMULATOR)  */}
				{/* =================================================================== */}
				<Show when={activeSection() === 'commands'}>
					{/* Live In-Chat Command Simulator */}
					<div>
						<div class="tg-section-header">شبیه‌ساز زنده دستورات داخل گروه (ریپلای ادمین)</div>
						<div class="tg-section p-3.5 flex flex-col gap-3">
							<div class="flex items-center justify-between text-[11.5px] text-[var(--tg-hint)]">
								<span>ریپلای ادمین روی پیام کاربر:</span>
								<span class="font-mono font-bold text-[var(--tg-link)]" dir="ltr">
									@{targetName()} (ID: 8849201)
								</span>
							</div>

							{/* Quick Preset Command Chips */}
							<div class="flex flex-wrap gap-1.5">
								<For
									each={[
										{ label: '🔇 سکوت ۲ ساعت', cmd: 'سکوت ۲ ساعت ارسال لینک تبلیغاتی' },
										{ label: '🚫 بن دائمی', cmd: 'بن اسپمر رباتیک' },
										{ label: '⚠️ اخطار (۲/۳)', cmd: 'اخطار رعایت نکردن قوانین گروه' },
										{ label: '🧹 پاکسازی ۵۰', cmd: 'پاکسازی ۵۰' },
										{ label: '💎 معاف (VIP)', cmd: 'معاف' },
										{ label: '🚨 گزارش به ادمین', cmd: 'گزارش' },
										{ label: '🎛 پنل شیشه‌ای', cmd: 'پنل' },
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
									placeholder="مثلاً: سکوت ۳۰ دقیقه یا /ban یا پاکسازی ۱۰۰"
									aria-label="متن دستور ادمین"
									class="flex-1 h-10 px-3 rounded-xl bg-[var(--tg-secondary-bg)] border border-[var(--tg-separator)] text-[13px] text-[var(--tg-text)] focus:outline-none focus:border-[var(--tg-button)]"
								/>
								<button
									type="button"
									onClick={() => runSimulatedCommand()}
									class="h-10 px-4 rounded-xl bg-[var(--tg-button)] text-white text-[13px] font-bold shrink-0 active:scale-95 transition-transform"
								>
									اجرا در چت
								</button>
							</div>

							{/* Simulated Telegram Chat Bubble Output + Interactive Inline Keyboard */}
							<div class="flex flex-col gap-2.5 pt-1">
								<For each={simHistory().slice(0, 2)}>
									{(msg) => (
										<div class="rounded-2xl bg-[var(--tg-secondary-bg)] p-3 border border-[var(--tg-separator)] flex flex-col gap-2">
											{/* Admin Reply Quote */}
											<div class="border-r-2 border-[var(--tg-button)] pr-2.5 text-[11.5px] flex items-center justify-between gap-2">
												<div class="min-w-0">
													<span class="font-bold text-[var(--tg-button)]">ادمین گروه</span>
													<span class="text-[var(--tg-hint)] mx-1">⟵ ریپلای:</span>
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
						<div class="tg-section-header">تنظیمات موتور دستورات داخل چت</div>
						<div class="tg-section">
							<div class="tg-cell justify-between">
								<div class="flex flex-col min-w-0 pr-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										دستورات فارسی بدون اسلش (Natural Triggers)
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										تشخیص هوشمند «بن»، «سکوت ۲ ساعت»، «اخطار»، «معاف» با ریپلای
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
								<div class="flex flex-col min-w-0 pr-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										حذف خودکار پیام دستور ادمین
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										تمیز ماندن چت گروه پس از اجرای دستور بن یا سکوت
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
								<div class="flex flex-col min-w-0 pr-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										دکمه‌های شیشه‌ای واکنش سریع زیر پیام‌های ربات
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										افزودن دکمه «🔊 لغو سکوت» و «💚 بخشش اخطار» زیر اعلان ربات
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
								<div class="flex flex-col min-w-0 pr-1">
									<span class="text-[14px] font-semibold text-[var(--tg-text)]">
										دستور عمومی «گزارش» (/report) برای اعضا
									</span>
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										ارسال آنی گزارش تخلف به پی‌وی ادمین‌ها همراه با دکمه حذف و بن
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
						<div class="tg-section-header">بانک کامل دستورات ربات (۴۰+ دستور فارسی و انگلیسی)</div>
						<div class="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
							<For
								each={[
									{ id: 'all', label: `همه (${BOT_COMMANDS_CATALOG.length})` },
									{ id: 'punishment', label: 'برخورد و جریمه' },
									{ id: 'cleanup', label: 'پاکسازی چت' },
									{ id: 'locks', label: 'قفل‌های سریع' },
									{ id: 'users', label: 'معافیت و گزارش' },
									{ id: 'panel', label: 'پنل شیشه‌ای' },
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
								{(cmd) => (
									<div class="p-3.5 flex flex-col gap-2">
										<div class="flex items-center justify-between gap-2">
											<div class="flex flex-col min-w-0">
												<span class="text-[13.5px] font-bold text-[var(--tg-text)]">
													{cmd.titleFa}
												</span>
												<span class="text-[11.5px] text-[var(--tg-hint)]">{cmd.descFa}</span>
											</div>
											<button
												type="button"
												onClick={() =>
													runSimulatedCommand(cmd.persianTriggers[0] || cmd.slashTriggers[0])
												}
												class="px-2.5 py-1 rounded-lg bg-[var(--tg-button)]/12 text-[var(--tg-link)] text-[11px] font-bold shrink-0"
											>
												تست دستور ↰
											</button>
										</div>

										<div class="flex flex-wrap items-center gap-1.5">
											<For each={cmd.persianTriggers}>
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
											<span>{cmd.exampleFa}</span>
											<span dir="ltr" class="font-mono text-[10.5px]">
												API: {cmd.botApiMethod}
											</span>
										</div>
									</div>
								)}
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
						<div class="tg-section-header">تست امنیت دسترسی دکمه‌های شیشه‌ای (RBAC)</div>
						<div class="tg-section p-3.5 flex flex-col gap-2.5">
							<div class="text-[12px] text-[var(--tg-hint)] leading-relaxed">
								در تلگرام، دکمه‌های شیشه‌ای داخل چت برای همه اعضای گروه قابل مشاهده هستند، اما هسته{' '}
								<b class="text-[var(--tg-text)]">@MiniGuardBot</b> در هر کلیک،{' '}
								<code class="font-mono text-[var(--tg-link)]">callback_query.from.id</code> را بررسی
								می‌کند. نقش کلیک‌کننده را تغییر دهید و روی دکمه‌های زیر کلیک کنید:
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
									<span>👑 کلیک به عنوان ادمین گروه</span>
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
									<span>👤 کلیک به عنوان کاربر عادی</span>
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
						<div class="tg-section-header">پیش‌نمایش زنده دستور /panel یا «پنل» داخل چت گروه</div>
						<div class="rounded-2xl bg-[var(--tg-section-bg)] border border-[var(--tg-separator)] p-3.5 flex flex-col gap-3 shadow-xs">
							{/* Message Header */}
							<div class="flex items-center justify-between border-b border-[var(--tg-separator)] pb-2.5">
								<div class="flex items-center gap-2">
									<div class="w-8 h-8 rounded-full bg-[var(--tg-button)] text-white font-bold text-[13px] flex items-center justify-center">
										MG
									</div>
									<div class="flex flex-col">
										<span class="text-[13px] font-bold text-[var(--tg-text)]">
											ربات محافظ گروه (@MiniGuardBot)
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
									🎛 <b>پنل مدیریت سریع شیشه‌ای (In-Chat Control)</b>
									<br />
									ادمین گرامی، بدون خروج از چت گروه می‌توانید قفل‌ها، ضدفلود و وضعیت اضطراری را با
									دکمه‌های زیر تغییر دهید:
									<br />
									<span class="text-[11.5px] text-[var(--tg-hint)]">
										• وضعیت قفل اضطراری:{' '}
										<b>{inlineLocks().emergencyLock ? '🔴 فعال (چت بسته)' : '🟢 غیرفعال (عادی)'}</b>{' '}
										| حساسیت ضدفلود: <b>{inlineLocks().floodLimit} پیام</b>
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
											🛡️ قفل‌های محتوا
										</button>
										<button
											type="button"
											onClick={() =>
												handleInlinePanelButton('panel:flood', () => setInlineScreen('flood'))
											}
											class="h-9 rounded-xl bg-[var(--tg-button)]/14 text-[var(--tg-link)] text-[12.5px] font-bold border border-[var(--tg-button)]/25 active:scale-98"
										>
											⚡ تنظیم ضدفلود
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
											🌙 ساعات سکوت ({inlineLocks().quietHoursActive ? 'فعال' : 'خاموش'})
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
												? '🔓 باز کردن قفل اضطراری'
												: '🔒 قفل اضطراری گروه'}
										</button>
									</div>

									<button
										type="button"
										onClick={() =>
											handleInlinePanelButton('panel:webapp', () => navigate(`/group/${params.id}`))
										}
										class="h-9 rounded-xl bg-[var(--tg-button)] text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5"
									>
										<span>📱 باز کردن مینی‌اپ کامل تنظیمات گروه</span>
									</button>
								</div>
							</Show>

							{/* Sub-menu: Content Locks */}
							<Show when={inlineScreen() === 'locks'}>
								<div class="text-[13px] text-[var(--tg-text)] leading-relaxed bg-[var(--tg-secondary-bg)] p-3 rounded-xl">
									🛡️ <b>مدیریت زنده قفل‌های محتوا (editMessageReplyMarkup)</b>
									<br />
									روی هر قفل کلیک کنید تا وضعیت آن در لحظه تغییر کند:
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
										🔗 لینک‌ها: {inlineLocks().links ? '❌ قفل' : '✅ آزاد'}
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
										↪️ فوروارد: {inlineLocks().forwards ? '❌ قفل' : '✅ آزاد'}
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
										＠ منشن و آیدی: {inlineLocks().usernames ? '❌ قفل' : '✅ آزاد'}
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
										⭕ استوری تلگرام: {inlineLocks().stories ? '❌ قفل' : '✅ آزاد'}
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
										🎙️ ویس و ویدیو مسیج: {inlineLocks().voice ? '❌ قفل' : '✅ آزاد'}
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
										🤖 ربات‌های اینلاین: {inlineLocks().inlineBots ? '❌ قفل' : '✅ آزاد'}
									</button>
								</div>

								<button
									type="button"
									onClick={() =>
										handleInlinePanelButton('panel:main', () => setInlineScreen('root'))
									}
									class="h-9 rounded-xl bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] text-[12.5px] font-bold border border-[var(--tg-separator)]"
								>
									🔙 بازگشت به منوی اصلی پنل
								</button>
							</Show>

							{/* Sub-menu: Anti-Flood */}
							<Show when={inlineScreen() === 'flood'}>
								<div class="text-[13px] text-[var(--tg-text)] leading-relaxed bg-[var(--tg-secondary-bg)] p-3 rounded-xl">
									⚡ <b>تنظیم حساسیت ضدفلود و رگباری</b>
									<br />
									حداکثر تعداد پیام مجاز پشت سر هم در ۵ ثانیه:{' '}
									<b>{inlineLocks().floodLimit} پیام</b>
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
												{num} پیام / ۵ ثانیه
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
									🔙 بازگشت به منوی اصلی پنل
								</button>
							</Show>

							{/* Sub-menu: Quiet Hours */}
							<Show when={inlineScreen() === 'quiet'}>
								<div class="text-[13px] text-[var(--tg-text)] leading-relaxed bg-[var(--tg-secondary-bg)] p-3 rounded-xl">
									🌙 <b>مدیریت ساعات سکوت شبانه (۰۰:۰۰ تا ۰۷:۰۰)</b>
									<br />
									وضعیت فعلی:{' '}
									<b>{inlineLocks().quietHoursActive ? '🟢 فعال در برنامه شبانه' : '⚪ غیرفعال'}</b>
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
										? '⏸ غیرفعال کردن ساعات سکوت'
										: '▶️ فعال‌سازی ساعات سکوت شبانه'}
								</button>

								<button
									type="button"
									onClick={() =>
										handleInlinePanelButton('panel:main', () => setInlineScreen('root'))
									}
									class="h-9 rounded-xl bg-[var(--tg-secondary-bg)] text-[var(--tg-text)] text-[12.5px] font-bold border border-[var(--tg-separator)]"
								>
									🔙 بازگشت به منوی اصلی پنل
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
							چرخه حیات اشتراک: چه اتفاقی می‌افتد وقتی اعتبار تمام شود و کاربر پرداخت نکند؟
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
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-right ${
										subLifecycleStage() === 'active_trial'
											? 'bg-[#34C759]/15 border-[#34C759] text-[#34C759]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									۱. دوره ۲۴ ساعته رایگان فعال
								</button>
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSubLifecycleStage('warning_2h');
									}}
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-right ${
										subLifecycleStage() === 'warning_2h'
											? 'bg-[#FF9500]/15 border-[#FF9500] text-[#FF9500]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									۲. هشدار ۲ ساعت مانده به انقضا
								</button>
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSubLifecycleStage('expired_hibernated');
									}}
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-right ${
										subLifecycleStage() === 'expired_hibernated'
											? 'bg-[#FF3B30]/15 border-[#FF3B30] text-[#FF3B30]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									۳. انقضا و عدم پرداخت (خواب ایمن)
								</button>
								<button
									type="button"
									onClick={() => {
										haptic.selection();
										setSubLifecycleStage('reactivated_stars');
									}}
									class={`p-2 rounded-xl text-[11.5px] font-bold border text-right ${
										subLifecycleStage() === 'reactivated_stars'
											? 'bg-[#007AFF]/15 border-[#007AFF] text-[#007AFF]'
											: 'bg-[var(--tg-secondary-bg)] border-[var(--tg-separator)] text-[var(--tg-hint)]'
									}`}
								>
									۴. پرداخت ۱۰۰ ⭐ و بیداری آنی
								</button>
							</div>

							{/* Dynamic Explanation of Selected Subscription Stage */}
							<div class="rounded-xl bg-[var(--tg-secondary-bg)] p-3.5 border border-[var(--tg-separator)] flex flex-col gap-2">
								<Show when={subLifecycleStage() === 'active_trial'}>
									<div class="text-[13px] font-bold text-[#34C759]">
										🟢 مرحله ۱: تست رایگان ۲۴ ساعته با ۱۰۰٪ ظرفیت
									</div>
									<p class="text-[12px] text-[var(--tg-text)] leading-relaxed">
										به محض افزودن ربات اختصاصی به گروه، تمام ماژول‌های فایروال، دستورات چت، کپچای
										بیومتریک و پنل شیشه‌ای به مدت ۲۴ ساعت کاملاً رایگان فعال می‌شوند.
									</p>
								</Show>

								<Show when={subLifecycleStage() === 'warning_2h'}>
									<div class="text-[13px] font-bold text-[#FF9500]">
										🟠 مرحله ۲: ارسال نوتیفیکیشن هوشمند در پی‌وی مالک (T-2h و T-30m)
									</div>
									<p class="text-[12px] text-[var(--tg-text)] leading-relaxed">
										۲ ساعت قبل از اتمام اعتبار، ربات در پی‌وی مالک گروه پیام هشدار همراه با دکمه
										شیشه‌ای پرداخت <code>sendInvoice (currency: &quot;XTR&quot;, amount: 100)</code>{' '}
										ارسال می‌کند. در چت گروه هیچ پیام تبلیغاتی یا مزاحمی برای اعضا فرستاده نمی‌شود.
									</p>
								</Show>

								<Show when={subLifecycleStage() === 'expired_hibernated'}>
									<div class="text-[13px] font-bold text-[#FF3B30]">
										🔴 مرحله ۳: اتمام اعتبار و عدم پرداخت ⟵ ورود به «حالت خواب ایمن (Safe
										Hibernation)»
									</div>
									<ul class="text-[12px] text-[var(--tg-text)] leading-relaxed list-disc pr-4 space-y-1">
										<li>
											<b>حفظ ۱۰۰٪ تنظیمات (0% Data Loss):</b> هیچ‌کدام از قفل‌ها، لیست کلمات ممنوعه،
											اعضای معاف (VIP) و آمارهای گروه پاک نمی‌شوند.
										</li>
										<li>
											<b>عدم ترک گروه:</b> ربات هرگز گروه را ترک نمی‌کند (<code>leaveChat</code> صدا
											زده نمی‌شود) تا دسترسی ادمین از بین نرود.
										</li>
										<li>
											<b>رفتار در برابر دستورات ادمین:</b> اگر ادمین دستور <code>پنل</code> یا{' '}
											<code>بن</code> بفرستد، ربات با یک پیام محترمانه و دکمه شیشه‌ای{' '}
											<b>«⭐ تمدید آنی با ۱۰۰ استارز»</b> پاسخ می‌دهد.
										</li>
									</ul>
								</Show>

								<Show when={subLifecycleStage() === 'reactivated_stars'}>
									<div class="text-[13px] font-bold text-[#007AFF]">
										⚡ مرحله ۴: پرداخت ۱۰۰ استارز و بازگشت در کمتر از ۱۰۰ میلی‌ثانیه
									</div>
									<p class="text-[12px] text-[var(--tg-text)] leading-relaxed">
										به محض دریافت وب‌هوک <code>successful_payment</code> از تلگرام، وضعیت گروه به{' '}
										<code>paid</code> تغییر کرده و تمام قفل‌ها و دستورات دقیقاً با همان تنظیمات قبلی
										در کسری از ثانیه فعال می‌شوند.
									</p>
								</Show>
							</div>
						</div>
					</div>

					{/* Complete 10 Edge-Case Scenarios Explorer */}
					<div>
						<div class="tg-section-header">
							ماتریس ۱۰ مورد لبه بحرانی تلگرام (Edge-Case Resilience)
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
										class={`w-full p-3.5 text-right flex flex-col gap-1.5 transition-colors ${
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

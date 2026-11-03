/**
 * MiniGuard (@MiniGuardBot) — Pure In-Chat Bot Commands, Inline Keyboard Callback Engine
 * & Edge-Case Lifecycle Resolver (Telegram Bot API 8.x)
 *
 * Implements:
 * 1. Bilingual (Persian & English) Command Parser supporting both Slash (`/ban`, `/mute 2h`)
 *    and Natural Reply Triggers (`بن`, `سکوت ۲ ساعت`, `اخطار اسپم`, `حذف`, `پاکسازی ۵۰`, `پنل`, etc.)
 *    with full Persian/Arabic digit normalization (`۰-۹` -> `0-9`).
 * 2. Interactive In-Chat Inline Keyboard (`inline_keyboard`) State Machine & Admin RBAC
 *    for `/panel` and per-violation moderation buttons.
 * 3. Comprehensive Edge-Case & Subscription Expiry Lifecycle Engine (10 critical edge cases).
 */

export type CommandCategory = 'punishment' | 'cleanup' | 'locks' | 'users' | 'panel';

export interface BotCommandDefinition {
	id: string;
	category: CommandCategory;
	slashTriggers: string[];
	persianTriggers: string[];
	requiresReplyOrTarget: boolean;
	adminOnly: boolean;
	botApiMethod: string;
	requiredPerm?:
		| 'can_restrict_members'
		| 'can_delete_messages'
		| 'can_pin_messages'
		| 'can_promote_members'
		| 'can_change_info';
	titleFa: string;
	titleEn: string;
	descFa: string;
	descEn: string;
	exampleFa: string;
	exampleEn: string;
}

export const BOT_COMMANDS_CATALOG: BotCommandDefinition[] = [
	// ─── 1. Punishment & Moderation (برخورد و مجازات) ──────────────────────────
	{
		id: 'ban',
		category: 'punishment',
		slashTriggers: ['/ban', '!ban'],
		persianTriggers: ['بن', 'اخراج دایم', 'مسدود'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'banChatMember',
		requiredPerm: 'can_restrict_members',
		titleFa: 'اخراج دائم و مسدودسازی (Ban)',
		titleEn: 'Permanent Ban',
		descFa: 'مسدودسازی همیشگی کاربر از گروه به همراه حذف پیام‌های اخیر او',
		descEn: 'Permanently ban the replied user and revoke recent messages',
		exampleFa: 'ریپلای روی پیام + ارسال «بن» یا /ban @user اسپم',
		exampleEn: 'Reply with /ban or /ban @user spam',
	},
	{
		id: 'unban',
		category: 'punishment',
		slashTriggers: ['/unban', '!unban'],
		persianTriggers: ['حذف بن', 'آزادسازی', 'رفع مسدودیت'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'unbanChatMember',
		requiredPerm: 'can_restrict_members',
		titleFa: 'رفع مسدودیت کاربر (Unban)',
		titleEn: 'Unban User',
		descFa: 'خارج کردن کاربر از لیست سیاه گروه تا بتواند مجدداً عضو شود',
		descEn: 'Remove user from the group ban list (only_if_banned: true)',
		exampleFa: 'ریپلای یا ارسال «حذف بن» / /unban 123456',
		exampleEn: '/unban @user or reply with unban',
	},
	{
		id: 'kick',
		category: 'punishment',
		slashTriggers: ['/kick', '!kick'],
		persianTriggers: ['کیک', 'اخراج', 'ریموو'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'banChatMember + unbanChatMember',
		requiredPerm: 'can_restrict_members',
		titleFa: 'اخراج موقت بدون لیست سیاه (Kick)',
		titleEn: 'Kick Member (Can Rejoin)',
		descFa: 'اخراج کاربر از گروه به طوری که در صورت داشتن لینک دعوت بتواند دوباره برگردد',
		descEn: 'Remove user from group without permanent blacklist',
		exampleFa: 'ریپلای روی پیام + ارسال «اخراج» یا /kick',
		exampleEn: 'Reply with /kick',
	},
	{
		id: 'mute',
		category: 'punishment',
		slashTriggers: ['/mute', '/tmute', '!mute'],
		persianTriggers: ['سکوت', 'بی صدا', 'خفه'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'restrictChatMember',
		requiredPerm: 'can_restrict_members',
		titleFa: 'سکوت زمان‌دار یا دائم (Mute)',
		titleEn: 'Timed or Permanent Mute',
		descFa: 'بستن امکان ارسال پیام برای کاربر (پشتیبانی از دقیقه، ساعت و روز)',
		descEn: 'Restrict user from sending messages for a custom duration',
		exampleFa: 'ریپلای + «سکوت ۲ ساعت» یا «سکوت ۳ روز» یا /mute 30m',
		exampleEn: 'Reply with /mute 2h or /mute 3d',
	},
	{
		id: 'unmute',
		category: 'punishment',
		slashTriggers: ['/unmute', '!unmute'],
		persianTriggers: ['حذف سکوت', 'لغو سکوت', 'باز کردن صدا', 'آزاد'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'restrictChatMember',
		requiredPerm: 'can_restrict_members',
		titleFa: 'لغو سکوت کاربر (Unmute)',
		titleEn: 'Unmute Member',
		descFa: 'بازگرداندن فوری مجوز ارسال پیام و مدیا به کاربر سکوت‌شده',
		descEn: 'Restore full chat permissions to a muted member',
		exampleFa: 'ریپلای روی پیام + ارسال «حذف سکوت» یا /unmute',
		exampleEn: 'Reply with /unmute',
	},
	{
		id: 'warn',
		category: 'punishment',
		slashTriggers: ['/warn', '!warn'],
		persianTriggers: ['اخطار', 'هشدار'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'sendMessage + restrictChatMember',
		requiredPerm: 'can_restrict_members',
		titleFa: 'ثبت اخطار پلکانی با دکمه بخشش (Warn)',
		titleEn: 'Issue Warning (Escalating)',
		descFa: 'افزایش شمارنده اخطار کاربر (مثلاً ۱ از ۳) و اعمال مجازات خودکار در صورت رسیدن به سقف',
		descEn: 'Increment user warning count and auto-penalize on threshold',
		exampleFa: 'ریپلای + «اخطار ارسال لینک» یا /warn تبلیغات',
		exampleEn: 'Reply with /warn Posting links',
	},
	{
		id: 'unwarn',
		category: 'punishment',
		slashTriggers: ['/unwarn', '/resetwarns', '!unwarn'],
		persianTriggers: ['حذف اخطار', 'بخشش', 'پاکسازی اخطارها'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'sendMessage',
		requiredPerm: 'can_restrict_members',
		titleFa: 'حذف اخطار و بخشش کاربر (Unwarn)',
		titleEn: 'Remove / Reset Warnings',
		descFa: 'کاهش یا صفر کردن اخطارهای ثبت‌شده برای کاربر',
		descEn: 'Remove latest warning or reset all warnings for the user',
		exampleFa: 'ریپلای روی پیام + ارسال «حذف اخطار» یا /unwarn',
		exampleEn: 'Reply with /unwarn',
	},

	// ─── 2. Message & History Cleanup (پاکسازی و مدیریت پیام) ──────────────────
	{
		id: 'del',
		category: 'cleanup',
		slashTriggers: ['/del', '/d', '!del'],
		persianTriggers: ['حذف', 'پاک'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'deleteMessages',
		requiredPerm: 'can_delete_messages',
		titleFa: 'حذف آنی پیام و دستور (Delete)',
		titleEn: 'Instant Message Delete',
		descFa: 'حذف همزمان پیام ریپلای‌شده و پیام دستور ادمین در کمتر از ۱۰ میلی‌ثانیه',
		descEn: 'Delete both the target message and command message simultaneously',
		exampleFa: 'ریپلای روی پیام + ارسال «حذف» یا /del',
		exampleEn: 'Reply with /del',
	},
	{
		id: 'purge',
		category: 'cleanup',
		slashTriggers: ['/purge', '/clear', '!purge'],
		persianTriggers: ['پاکسازی', 'حذف تا اینجا'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'deleteMessages (Batch 100)',
		requiredPerm: 'can_delete_messages',
		titleFa: 'پاکسازی دسته‌جمعی پیام‌ها (Batch Purge)',
		titleEn: 'Batch Purge Messages (Up to 100)',
		descFa: 'حذف دسته‌جمعی تا ۱۰۰ پیام اخیر گروه با متد باینری deleteMessages در یک درخواست',
		descEn: 'Batch delete up to 100 messages at once via Bot API 8.x deleteMessages',
		exampleFa: '«پاکسازی ۵۰» یا ریپلای روی یک پیام قدیمی + «پاکسازی»',
		exampleEn: '/purge 50 or reply to start message with /purge',
	},
	{
		id: 'pin',
		category: 'cleanup',
		slashTriggers: ['/pin', '/unpin', '!pin'],
		persianTriggers: ['پین', 'سنجاق', 'حذف پین'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'pinChatMessage / unpinChatMessage',
		requiredPerm: 'can_pin_messages',
		titleFa: 'سنجاق و حذف سنجاق پیام (Pin / Unpin)',
		titleEn: 'Pin or Unpin Message',
		descFa: 'سنجاق کردن پیام ریپلای‌شده در بالای گروه (با امکان پین بی‌صدا)',
		descEn: 'Pin or unpin the replied message at the top of the supergroup',
		exampleFa: 'ریپلای روی پیام + ارسال «پین» یا «حذف پین»',
		exampleEn: 'Reply with /pin or /unpin',
	},
	{
		id: 'cleandeleted',
		category: 'cleanup',
		slashTriggers: ['/cleandeleted', '/zombies'],
		persianTriggers: ['حذف اکانت های دیلیت شده', 'پاکسازی دیلیت اکانت ها'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'banChatMember + unbanChatMember',
		requiredPerm: 'can_restrict_members',
		titleFa: 'پاکسازی اکانت‌های دیلیت‌شده (Deleted Accounts)',
		titleEn: 'Purge Deleted Accounts',
		descFa: 'شناسایی و اخراج خودکار اکانت‌های حذف‌شده (Deleted Account) از لیست اعضای گروه',
		descEn: 'Automatically scan and remove Deleted Accounts from the group',
		exampleFa: 'ارسال «پاکسازی دیلیت اکانت ها» یا /cleandeleted',
		exampleEn: '/cleandeleted',
	},

	// ─── 3. Quick Locks & Firewall Controls (قفل‌های سریع در چت) ───────────────
	{
		id: 'lock',
		category: 'locks',
		slashTriggers: ['/lock', '/chatlock'],
		persianTriggers: ['قفل گروه', 'بستن چت', 'قفل لینک', 'قفل مدیا', 'قفل فوروارد'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'setChatPermissions',
		requiredPerm: 'can_restrict_members',
		titleFa: 'قفل فوری گروه یا محتوا با دستور متنی',
		titleEn: 'Quick Lock Group or Content Type',
		descFa: 'قفل کردن کل چت گروه یا یک نوع محتوا (لینک، مدیا، فوروارد) مستقیماً از داخل چت',
		descEn: 'Lock entire group chat or specific media/links via text command',
		exampleFa: '«قفل گروه» یا «قفل لینک» یا /lock all',
		exampleEn: '/lock all or /lock links',
	},
	{
		id: 'unlock',
		category: 'locks',
		slashTriggers: ['/unlock', '/chatunlock'],
		persianTriggers: ['باز کردن گروه', 'بازگشایی چت', 'باز کردن لینک', 'باز کردن مدیا'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'setChatPermissions',
		requiredPerm: 'can_restrict_members',
		titleFa: 'بازگشایی فوری گروه یا قفل محتوا',
		titleEn: 'Quick Unlock Group or Content Type',
		descFa: 'باز کردن قفل اضطراری گروه یا آزادسازی ارسال لینک/مدیا با یک دستور',
		descEn: 'Unlock group chat or lift specific content locks',
		exampleFa: '«باز کردن گروه» یا «باز کردن لینک» یا /unlock all',
		exampleEn: '/unlock all or /unlock links',
	},
	{
		id: 'slowmode',
		category: 'locks',
		slashTriggers: ['/slowmode', '/slow'],
		persianTriggers: ['حالت آرام', 'اسلومود'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'setChatSlowModeDelay',
		requiredPerm: 'can_restrict_members',
		titleFa: 'تنظیم حالت آرام گروه (Slow Mode)',
		titleEn: 'Set Supergroup Slow Mode Delay',
		descFa: 'اعمال محدودیت فاصله زمانی بین پیام‌های اعضا (۱۰، ۳۰، ۶۰ ثانیه یا خاموش)',
		descEn: 'Set native Telegram slow mode delay between member messages',
		exampleFa: '«حالت آرام ۳۰» یا /slowmode 30 یا /slowmode 0',
		exampleEn: '/slowmode 30 or /slowmode 0',
	},

	// ─── 4. User Info, VIP Exemption & Reporting (کاربران و لیست سفید) ─────────
	{
		id: 'vip',
		category: 'users',
		slashTriggers: ['/vip', '/whitelist', '/free'],
		persianTriggers: ['معاف', 'ویژه', 'حذف معافیت'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'Internal Whitelist DB',
		titleFa: 'معاف کردن کاربر ویژه (VIP Whitelist)',
		titleEn: 'Add/Remove VIP Whitelist Exemption',
		descFa: 'معاف کردن کاربر مورد اعتماد از قفل لینک، ضدفلود و عضویت اجباری کانال',
		descEn: 'Exempt trusted member from anti-link, anti-flood, and mandatory join',
		exampleFa: 'ریپلای روی پیام کاربر + ارسال «معاف» یا /vip',
		exampleEn: 'Reply with /vip',
	},
	{
		id: 'info',
		category: 'users',
		slashTriggers: ['/info', '/id', '/me'],
		persianTriggers: ['اطلاعات', 'آیدی', 'آمار من'],
		requiresReplyOrTarget: false,
		adminOnly: false,
		botApiMethod: 'getChatMember',
		titleFa: 'کارت اطلاعات و شناسنامه کاربر (User Info)',
		titleEn: 'Member Profile & Security Card',
		descFa: 'نمایش آیدی عددی، تعداد پیام‌ها، اخطارها، تعداد دعوت‌ها و وضعیت معافیت کاربر',
		descEn: 'Display user ID, message count, warnings, invites, and VIP status',
		exampleFa: 'ریپلای روی کاربر + «اطلاعات» یا ارسال «آمار من»',
		exampleEn: 'Reply with /info or send /me',
	},
	{
		id: 'report',
		category: 'users',
		slashTriggers: ['/report', '@admin'],
		persianTriggers: ['گزارش', 'ادمین'],
		requiresReplyOrTarget: true,
		adminOnly: false,
		botApiMethod: 'sendMessage (Admin PM + Inline Actions)',
		titleFa: 'گزارش پیام متخلف به ادمین‌ها توسط اعضا (Report)',
		titleEn: 'Member Report to Group Admins',
		descFa: 'ارسال فوری پیام گزارش‌شده به پیوی ادمین‌ها همراه با دکمه‌های شیشه‌ای بن/سکوت/حذف',
		descEn: 'Alert group admins in PM with 1-tap Ban, Mute, and Delete inline buttons',
		exampleFa: 'ریپلای روی پیام اسپم + ارسال «گزارش» یا /report',
		exampleEn: 'Reply to spam message with /report',
	},

	// ─── 5. In-Chat Inline Button Control Panel (پنل شیشه‌ای داخل چت) ──────────
	{
		id: 'panel',
		category: 'panel',
		slashTriggers: ['/panel', '/settings', '/menu'],
		persianTriggers: ['پنل', 'تنظیمات', 'مدیریت'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'sendMessage + InlineKeyboardMarkup',
		titleFa: 'باز کردن پنل مدیریت شیشه‌ای در چت (Inline Panel)',
		titleEn: 'Open Interactive Inline Keyboard Panel',
		descFa: 'نمایش منوی شیشه‌ای کامل مدیریت قفل‌ها، ضدفلود و اشتراک مستقیماً داخل چت تلگرام',
		descEn: 'Render interactive multi-page inline button control panel inside chat',
		exampleFa: 'ارسال «پنل» یا «تنظیمات» یا /panel در گروه',
		exampleEn: 'Send /panel in group chat',
	},
	{
		id: 'reload',
		category: 'panel',
		slashTriggers: ['/reload', '/Status'],
		persianTriggers: ['بروزرسانی ادمین ها', 'وضعیت ربات'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'getChatAdministrators',
		titleFa: 'همگام‌سازی لیست ادمین‌ها و بررسی سلامت ربات',
		titleEn: 'Reload Admin Cache & Bot Health Check',
		descFa: 'دریافت مجدد لیست ادمین‌های گروه از سرور تلگرام و بررسی باینری دسترسی‌های ربات',
		descEn: 'Refresh cached group administrators and audit binary bot permissions',
		exampleFa: 'ارسال «بروزرسانی ادمین ها» یا /reload',
		exampleEn: '/reload',
	},
];

// ─── Persian / Arabic Digit Normalizer ──────────────────────────────────────
const DIGIT_MAP: Record<string, string> = {
	'۰': '0',
	'۱': '1',
	'۲': '2',
	'۳': '3',
	'۴': '4',
	'۵': '5',
	'۶': '6',
	'۷': '7',
	'۸': '8',
	'۹': '9',
	'٠': '0',
	'١': '1',
	'٢': '2',
	'٣': '3',
	'٤': '4',
	'٥': '5',
	'٦': '6',
	'٧': '7',
	'٨': '8',
	'٩': '9',
};

export function normalizeDigits(input: string): string {
	let out = '';
	for (const ch of input) {
		out += DIGIT_MAP[ch] ?? ch;
	}
	return out;
}

/**
 * Parses duration strings in Persian or English (e.g., "2h", "30m", "3d", "۲ ساعت", "۴۵ دقیقه", "۳ روز")
 * into seconds. Defaults to 3600s (1 hour) if not specified.
 */
export function parseDurationToSeconds(rawArg: string): number {
	const text = normalizeDigits(rawArg || '').trim().toLowerCase();
	if (!text) return 3600;

	const match = text.match(/(\d+)\s*(m|min| دقیقه|دقیقه|h|hr|hour| ساعت|ساعت|d|day| روز|روز|s| ثانیه|ثانیه)?/i);
	if (!match) return 3600;

	const num = parseInt(match[1], 10);
	if (!Number.isFinite(num) || num <= 0) return 3600;

	const unit = (match[2] || 'm').trim();
	if (unit.startsWith('s') || unit.includes('ثانیه')) return Math.max(30, num);
	if (unit.startsWith('m') || unit.includes('دقیقه')) return num * 60;
	if (unit.startsWith('h') || unit.includes('ساعت')) return num * 3600;
	if (unit.startsWith('d') || unit.includes('روز')) return num * 86400;
	return num * 60;
}

export interface ParsedGroupCommandResult {
	matched: boolean;
	commandId?: string;
	category?: CommandCategory;
	botApiMethod?: string;
	durationSeconds?: number;
	batchCount?: number;
	targetLockKey?: string;
	reasonText?: string;
	responsePreviewFa: string;
	inlineButtons?: Array<Array<{ text: string; callback_data: string }>>;
}

/**
 * Parses an incoming group message text (with optional reply target) into a structured bot command execution plan.
 */
export function parseGroupCommand(params: {
	text: string;
	repliedUserName?: string;
	repliedUserId?: number;
	senderIsAdmin: boolean;
}): ParsedGroupCommandResult {
	const raw = normalizeDigits(params.text || '').trim();
	if (!raw) {
		return { matched: false, responsePreviewFa: '' };
	}

	const targetName = params.repliedUserName || 'کاربر هدف';
	const targetId = params.repliedUserId || 509182;
	const lower = raw.toLowerCase();

	// 1. Check `/panel` | `پنل` | `تنظیمات`
	if (lower === '/panel' || lower === '/settings' || raw === 'پنل' || raw === 'تنظیمات') {
		if (!params.senderIsAdmin) {
			return {
				matched: true,
				commandId: 'panel',
				responsePreviewFa: '⛔ فقط ادمین‌های گروه مجاز به باز کردن پنل مدیریت هستند.',
			};
		}
		return {
			matched: true,
			commandId: 'panel',
			category: 'panel',
			botApiMethod: 'sendMessage + InlineKeyboardMarkup',
			responsePreviewFa:
				'🎛 <b>پنل مدیریت شیشه‌ای گروه — @MiniGuardBot</b>\nادمین گرامی، از دکمه‌های شیشه‌ای زیر بخش موردنظر را انتخاب کنید:',
			inlineButtons: [
				[
					{ text: '🛡️ قفل‌های محتوا', callback_data: 'mg:menu:locks' },
					{ text: '⚡ ضدفلود و رگباری', callback_data: 'mg:menu:flood' },
				],
				[
					{ text: '🌙 ساعات سکوت', callback_data: 'mg:menu:quiet' },
					{ text: '📢 عضویت اجباری', callback_data: 'mg:menu:mandatory' },
				],
				[
					{ text: '🔒 قفل اضطراری کل گروه: خاموش', callback_data: 'mg:toggle:emergencylock' },
				],
				[
					{ text: '📱 باز کردن مینی‌اپ پیشرفته', callback_data: 'mg:open:webapp' },
					{ text: '❌ بستن پنل', callback_data: 'mg:close' },
				],
			],
		};
	}

	// 2. Check `/ban` | `بن` | `اخراج دایم`
	if (
		lower.startsWith('/ban') ||
		lower.startsWith('!ban') ||
		raw === 'بن' ||
		raw.startsWith('بن ') ||
		raw.startsWith('اخراج دایم')
	) {
		const reason = raw.replace(/^(\/ban|!ban|بن|اخراج دایم)\s*/i, '').trim() || 'تخلف از قوانین گروه';
		return {
			matched: true,
			commandId: 'ban',
			category: 'punishment',
			botApiMethod: 'banChatMember',
			reasonText: reason,
			responsePreviewFa:
				`🚫 کاربر <b>${targetName}</b> [<code>${targetId}</code>] به صورت دائم از گروه مسدود و اخراج شد.\n` +
				`📝 علت: ${reason}`,
			inlineButtons: [
				[
					{ text: '🔓 رفع مسدودیت (Unban)', callback_data: `mg:unban:${targetId}` },
					{ text: '🗑️ پاکسازی کل پیام‌های کاربر', callback_data: `mg:delall:${targetId}` },
				],
			],
		};
	}

	// 3. Check `/unban` | `حذف بن` | `آزادسازی`
	if (lower.startsWith('/unban') || raw.startsWith('حذف بن') || raw.startsWith('آزادسازی')) {
		return {
			matched: true,
			commandId: 'unban',
			category: 'punishment',
			botApiMethod: 'unbanChatMember',
			responsePreviewFa: `✅ مسدودیت کاربر <b>${targetName}</b> [<code>${targetId}</code>] رفع شد و اکنون می‌تواند مجدداً عضو گروه شود.`,
		};
	}

	// 4. Check `/mute` | `سکوت` | `بی صدا` | `خفه`
	if (
		lower.startsWith('/mute') ||
		lower.startsWith('/tmute') ||
		raw.startsWith('سکوت') ||
		raw.startsWith('بی صدا') ||
		raw.startsWith('خفه')
	) {
		const arg = raw.replace(/^(\/t?mute|سکوت|بی صدا|خفه)\s*/i, '').trim();
		const seconds = parseDurationToSeconds(arg);
		const humanDuration =
			seconds >= 86400
				? `${Math.round(seconds / 86400)} روز`
				: seconds >= 3600
					? `${Math.round(seconds / 3600)} ساعت`
					: `${Math.round(seconds / 60)} دقیقه`;

		return {
			matched: true,
			commandId: 'mute',
			category: 'punishment',
			botApiMethod: 'restrictChatMember',
			durationSeconds: seconds,
			responsePreviewFa:
				`🔇 کاربر <b>${targetName}</b> [<code>${targetId}</code>] به مدت <b>${humanDuration}</b> در حالت سکوت قرار گرفت.\n` +
				`⏱ تا پایان مهلت قادر به ارسال پیام در گروه نخواهد بود.`,
			inlineButtons: [
				[
					{ text: '🔊 لغو سکوت (Unmute)', callback_data: `mg:unmute:${targetId}` },
					{ text: '🚫 تبدیل به بن دائم', callback_data: `mg:ban:${targetId}` },
				],
			],
		};
	}

	// 5. Check `/unmute` | `حذف سکوت` | `لغو سکوت`
	if (
		lower.startsWith('/unmute') ||
		raw.startsWith('حذف سکوت') ||
		raw.startsWith('لغو سکوت') ||
		raw.startsWith('باز کردن صدا')
	) {
		return {
			matched: true,
			commandId: 'unmute',
			category: 'punishment',
			botApiMethod: 'restrictChatMember',
			responsePreviewFa: `🔊 سکوت کاربر <b>${targetName}</b> [<code>${targetId}</code>] لغو شد و دسترسی ارسال پیام او بازگردانی گردید.`,
		};
	}

	// 6. Check `/warn` | `اخطار` | `هشدار`
	if (lower.startsWith('/warn') || raw.startsWith('اخطار') || raw.startsWith('هشدار')) {
		const reason = raw.replace(/^(\/warn|اخطار|هشدار)\s*/i, '').trim() || 'عدم رعایت قوانین گروه';
		return {
			matched: true,
			commandId: 'warn',
			category: 'punishment',
			botApiMethod: 'sendMessage + restrictChatMember',
			reasonText: reason,
			responsePreviewFa:
				`⚠️ کاربر <b>${targetName}</b> یک اخطار دریافت کرد!\n` +
				`📊 تعداد اخطارها: <b>۲ از ۳</b> (در صورت دریافت اخطار سوم: سکوت ۲۴ ساعته)\n` +
				`📝 دلیل: ${reason}`,
			inlineButtons: [
				[
					{ text: '💚 بخشش و حذف اخطار (۱/۳)', callback_data: `mg:unwarn:${targetId}` },
					{ text: '🔇 سکوت فوری ۲۴ ساعته', callback_data: `mg:mute24h:${targetId}` },
				],
			],
		};
	}

	// 7. Check `/purge` | `پاکسازی`
	if (lower.startsWith('/purge') || raw.startsWith('پاکسازی')) {
		const numMatch = raw.match(/(\d+)/);
		const count = numMatch ? Math.min(100, Math.max(1, parseInt(numMatch[1], 10))) : 25;
		return {
			matched: true,
			commandId: 'purge',
			category: 'cleanup',
			botApiMethod: 'deleteMessages (Batch)',
			batchCount: count,
			responsePreviewFa: `🧹 <b>پاکسازی دسته‌جمعی انجام شد!</b>\nتعداد <b>${count} پیام</b> اخیر با متد باینری <code>deleteMessages</code> در یک درخواست حذف گردید.`,
		};
	}

	// 8. Check `/del` | `حذف`
	if (lower === '/del' || lower === '/d' || raw === 'حذف' || raw === 'پاک') {
		return {
			matched: true,
			commandId: 'del',
			category: 'cleanup',
			botApiMethod: 'deleteMessages',
			responsePreviewFa: `🗑️ پیام موردنظر و دستور شما به صورت بی‌صدا در ۸ میلی‌ثانیه حذف شدند.`,
		};
	}

	// 9. Check `/lock` | `قفل ...`
	if (lower.startsWith('/lock') || raw.startsWith('قفل ')) {
		const target = raw.replace(/^(\/lock|قفل)\s*/i, '').trim() || 'گروه';
		return {
			matched: true,
			commandId: 'lock',
			category: 'locks',
			botApiMethod: 'setChatPermissions',
			targetLockKey: target,
			responsePreviewFa: `🔒 قفل <b>«${target}»</b> با موفقیت فعال شد.`,
			inlineButtons: [
				[{ text: `🔓 بازگشایی قفل «${target}»`, callback_data: `mg:unlock:${target}` }],
			],
		};
	}

	// 10. Check `/vip` | `معاف`
	if (lower.startsWith('/vip') || lower.startsWith('/whitelist') || raw === 'معاف' || raw === 'ویژه') {
		return {
			matched: true,
			commandId: 'vip',
			category: 'users',
			botApiMethod: 'Internal Whitelist DB',
			responsePreviewFa: `🌟 کاربر <b>${targetName}</b> [<code>${targetId}</code>] به لیست <b>اعضای ویژه (VIP)</b> اضافه شد و از قفل لینک، ضدفلود و عضویت اجباری معاف گردید.`,
			inlineButtons: [
				[{ text: '❌ لغو معافیت VIP', callback_data: `mg:unvip:${targetId}` }],
			],
		};
	}

	// 11. Check `/report` | `گزارش`
	if (lower.startsWith('/report') || lower === '@admin' || raw === 'گزارش') {
		return {
			matched: true,
			commandId: 'report',
			category: 'users',
			botApiMethod: 'sendMessage (Admin PM)',
			responsePreviewFa:
				`🚨 <b>گزارش تخلف ثبت شد!</b>\nپیام کاربر <b>${targetName}</b> به پیوی تمام ادمین‌های گروه ارسال گردید.`,
			inlineButtons: [
				[
					{ text: '🚫 بن متخلف + حذف پیام', callback_data: `mg:report_ban:${targetId}` },
					{ text: '🔇 سکوت ۲۴ ساعته', callback_data: `mg:report_mute:${targetId}` },
				],
				[{ text: '✅ بررسی شد (نادیده گرفتن)', callback_data: `mg:report_dismiss:${targetId}` }],
			],
		};
	}

	// 12. Check `/info` | `اطلاعات` | `آمار من`
	if (lower === '/info' || lower === '/id' || raw === 'اطلاعات' || raw === 'آیدی' || raw === 'آمار من') {
		return {
			matched: true,
			commandId: 'info',
			category: 'users',
			botApiMethod: 'getChatMember',
			responsePreviewFa:
				`👤 <b>شناسنامه امنیتی کاربر در گروه:</b>\n` +
				`• نام: <b>${targetName}</b>\n` +
				`• آیدی عددی: <code>${targetId}</code>\n` +
				`• وضعیت کپچا: ✅ تاییدشده با بیومتریک\n` +
				`• اخطارها: <code>0 / 3</code> | دعوت‌ها: <code>4 نفر</code>`,
		};
	}

	return {
		matched: false,
		responsePreviewFa: 'دستور شناخته نشد. از «پنل» یا دستورات استاندارد مانند «بن»، «سکوت ۲ ساعت»، «اخطار» استفاده کنید.',
	};
}

// ─── 2. In-Chat Inline Keyboard Callback State Machine ──────────────────────
export type InlinePanelViewId = 'main' | 'locks' | 'flood' | 'quiet' | 'subscription';

export interface InlinePanelLockState {
	links: boolean;
	forwards: boolean;
	photos: boolean;
	videos: boolean;
	voice: boolean;
	stickers: boolean;
	externalReply: boolean;
	story: boolean;
	emergencyLock: boolean;
	floodMaxMsgs: number;
	floodWindowSec: number;
	quietHoursEnabled: boolean;
}

export function evaluateCallbackQueryRbac(params: {
	callerUserId: number;
	adminUserIds: number[];
	callbackData: string;
}): {
	allowed: boolean;
	answerCallbackAlertText: string;
	showAlertModal: boolean;
} {
	if (!params.adminUserIds.includes(params.callerUserId)) {
		return {
			allowed: false,
			answerCallbackAlertText: '⛔ دسترسی غیرمجاز! این دکمه شیشه‌ای منحصراً مخصوص ادمین‌های گروه است.',
			showAlertModal: true,
		};
	}

	return {
		allowed: true,
		answerCallbackAlertText: '✅ تغییرات با موفقیت در هسته فایروال اعمال شد.',
		showAlertModal: false,
	};
}

// ─── 3. Edge-Case & Subscription Expiry Lifecycle Engine ────────────────────
export type EdgeCaseScenarioId =
	| 'subscription_expired_unpaid'
	| 'automatic_channel_forward'
	| 'anonymous_admin_command'
	| 'admin_on_admin_ban_attempt'
	| 'non_admin_callback_click'
	| 'supergroup_chat_id_migration'
	| 'bot_permission_downgraded'
	| 'unauthorized_second_group_join'
	| 'mass_raid_429_rate_limit'
	| 'botfather_token_revoked';

export interface EdgeCaseResolution {
	scenarioId: EdgeCaseScenarioId;
	severity: 'critical' | 'high' | 'protective';
	dataLost: false;
	botActionCode: string;
	titleFa: string;
	triggerConditionFa: string;
	systemBehaviorFa: string;
	simulatedBotMessageFa: string;
	inlineRecoveryButtonFa?: string;
}

export const EDGE_CASE_RESOLUTIONS: Record<EdgeCaseScenarioId, EdgeCaseResolution> = {
	subscription_expired_unpaid: {
		scenarioId: 'subscription_expired_unpaid',
		severity: 'critical',
		dataLost: false,
		botActionCode: 'SAFE_HIBERNATION_MODE + XTR_INVOICE_LINK',
		titleFa: '۱. اتمام ۲۴ ساعت تست رایگان یا اشتراک ماهانه و عدم پرداخت کاربر',
		triggerConditionFa: 'trial_ends_at < NOW() && subscription_status !== "paid"',
		systemBehaviorFa:
			'۱۰۰٪ تنظیمات، لیست کلمات ممنوعه، آمار و اخطارها در دیتابیس محفوظ می‌ماند (Data Loss = 0). ربات از گروه لفت نمی‌دهد بلکه به حالت تعلیق ایمن (Standby) می‌رود. در صورت ارسال دستور توسط ادمین، دکمه تمدید آنی ۱۰۰ ⭐ ارسال می‌شود و به محض پرداخت، در کمتر از ۰.۵ ثانیه بدون نیاز به تنظیم مجدد روشن می‌گردد.',
		simulatedBotMessageFa:
			'⏳ <b>اشتراک محافظت این گروه به پایان رسیده است!</b>\n' +
			'تمامی تنظیمات فایروال، لیست کلمات ممنوعه و آمار گروه شما <b>کاملاً محفوظ است</b>.\n' +
			'برای فعال‌سازی مجدد و آنی ربات به مدت ۳۰ روز، روی دکمه زیر بزنید (۱۰۰ استارز ⭐):',
		inlineRecoveryButtonFa: '⭐ تمدید آنی اشتراک ماهانه (100 Stars) و روشن شدن خودکار',
	},
	automatic_channel_forward: {
		scenarioId: 'automatic_channel_forward',
		severity: 'protective',
		dataLost: false,
		botActionCode: 'BYPASS_FIREWALL (is_automatic_forward === true)',
		titleFa: '۲. فوروارد خودکار پست‌های کانال متصل به گروه بحث (Discussion Group)',
		triggerConditionFa: 'message.is_automatic_forward === true',
		systemBehaviorFa:
			'وقتی گروه به کانال رسمی شما متصل است، پست‌های کانال به طور خودکار وارد گروه می‌شوند. حتی اگر قفل فوروارد و قفل لینک روشن باشد، ربات پرچم باینری is_automatic_forward را تشخیص داده و هرگز پست‌های کانال خودتان را پاک نمی‌کند.',
		simulatedBotMessageFa:
			'✅ [پست خودکار کانال متصل شناسایی شد: is_automatic_forward=true] — معاف از قفل لینک و فوروارد.',
	},
	anonymous_admin_command: {
		scenarioId: 'anonymous_admin_command',
		severity: 'protective',
		dataLost: false,
		botActionCode: 'VERIFY_SENDER_CHAT_AS_GROUP_ADMIN',
		titleFa: '۳. ارسال دستور یا لینک توسط ادمین ناشناس گروه (Anonymous Admin)',
		triggerConditionFa: 'message.sender_chat.id === message.chat.id',
		systemBehaviorFa:
			'وقتی ادمین گزینه Remain Anonymous را روشن کرده باشد، فیلد from.id خالی است و sender_chat برابر با آیدی خود گروه می‌شود. ربات این پیام را به عنوان ادمین ارشد گروه شناسایی کرده، دستورات او (بن، سکوت، پنل) را اجرا می‌کند و هرگز پیامش را حذف نمی‌کند.',
		simulatedBotMessageFa:
			'🛡️ [ادمین ناشناس گروه تأیید شد: sender_chat == chat.id] — دستور مدیریتی با موفقیت اجرا گردید.',
	},
	admin_on_admin_ban_attempt: {
		scenarioId: 'admin_on_admin_ban_attempt',
		severity: 'high',
		dataLost: false,
		botActionCode: 'BLOCK_MUTUAL_ADMIN_PUNISHMENT + ALERT_OWNER',
		titleFa: '۴. تلاش یک ادمین برای بن یا سکوت کردن مالک گروه یا ادمین دیگر (ضد کودتا)',
		triggerConditionFa: 'targetUser.status IN ("creator", "administrator")',
		systemBehaviorFa:
			'ربات قبل از اجرای دستورات بن/سکوت/کیک، نقش کاربر هدف را در کش ادمین‌ها بررسی می‌کند. در صورت ادمین بودن هدف، دستور را مسدود کرده و در صورت تکرار، به مالک اصلی گروه در پیوی هشدار امنیتی می‌دهد.',
		simulatedBotMessageFa:
			'⛔ <b>عملیات متوقف شد!</b> کاربر هدف یکی از ادمین‌های گروه است و امکان مسدودسازی یا سکوت ادمین‌ها وجود ندارد.',
	},
	non_admin_callback_click: {
		scenarioId: 'non_admin_callback_click',
		severity: 'protective',
		dataLost: false,
		botActionCode: 'answerCallbackQuery(show_alert: true)',
		titleFa: '۵. کلیک کاربران عادی روی دکمه‌های شیشه‌ای پنل مدیریت در گروه',
		triggerConditionFa: 'callback_query.from.id NOT IN group_admin_ids',
		systemBehaviorFa:
			'هر دکمه شیشه‌ای در گروه دارای لایه احراز هویت RBAC است. اگر کاربر عادی روی دکمه‌های پنل یا دکمه «لغو سکوت» کلیک کند، ربات بدون تغییر پیام، یک پنجره هشدار نیتیو تلگرام فقط برای همان شخص باز می‌کند.',
		simulatedBotMessageFa:
			'⛔ پاپ‌آپ تلگرام (answerCallbackQuery): «این دکمه شیشه‌ای منحصراً مخصوص ادمین‌های گروه است!»',
	},
	supergroup_chat_id_migration: {
		scenarioId: 'supergroup_chat_id_migration',
		severity: 'high',
		dataLost: false,
		botActionCode: 'ATOMIC_CHAT_ID_MIGRATION (migrate_to_chat_id)',
		titleFa: '۶. تبدیل گروه عادی به سوپرگروه و تغییر ناگهانی آیدی گروه (Migration)',
		triggerConditionFa: 'message.migrate_to_chat_id !== undefined',
		systemBehaviorFa:
			'هنگام ارتقای گروه به سوپرگروه در تلگرام، chat_id به یک عدد منفی ۱۰۰ رقمی جدید تغییر می‌کند. ربات به صورت خودکار تراکنش اتمیک مهاجرت را اجرا کرده و تمام تنظیمات و روزهای باقی‌مانده اشتراک را به آیدی جدید منتقل می‌کند.',
		simulatedBotMessageFa:
			'🔄 <b>ارتقای گروه به سوپرگروه تشخیص داده شد!</b> تمامی تنظیمات و اشتراک گروه به آیدی جدید منتقل گردید.',
	},
	bot_permission_downgraded: {
		scenarioId: 'bot_permission_downgraded',
		severity: 'critical',
		dataLost: false,
		botActionCode: 'GRACEFUL_DEGRADATION + OWNER_PM_ALERT',
		titleFa: '۷. برداشته شدن تیک دسترسی حذف یا مسدودسازی ربات توسط یکی از ادمین‌ها',
		triggerConditionFa: 'my_chat_member.new_chat_member.can_delete_messages === false',
		systemBehaviorFa:
			'به محض تغییر دسترسی ربات، رویداد my_chat_member دریافت می‌شود. ربات به جای کرش کردن با خطای 400 Bad Request، ماژول حذف را موقتاً متوقف کرده و فوراً در پیوی مالک گروه گزارش می‌دهد که کدام ادمین دسترسی ربات را کم کرده است.',
		simulatedBotMessageFa:
			'⚠️ <b>هشدار فوری امنیتی در پیوی مالک:</b> دسترسی <code>Delete Messages</code> ربات در گروه غیرفعال شد! برای عملکرد ضدلینک، دسترسی را بازگردانید.',
		inlineRecoveryButtonFa: '🔍 بررسی مجدد دسترسی‌های ادمین ربات',
	},
	unauthorized_second_group_join: {
		scenarioId: 'unauthorized_second_group_join',
		severity: 'critical',
		dataLost: false,
		botActionCode: 'INSTANT_LEAVE_CHAT (1_BOT_1_GROUP_GUARD)',
		titleFa: '۸. اد شدن ربات اختصاصی شما در یک گروه دیگر توسط افراد متفرقه',
		triggerConditionFa: 'my_chat_member.chat.id !== bound_telegram_chat_id',
		systemBehaviorFa:
			'طبق معماری ایزوله 1 Bot = 1 Group، اگر هر شخص دیگری ربات شما را به گروه دیگری اضافه کند، ربات در کمتر از ۱۰۰ میلی‌ثانیه عدم تطابق گروه را تشخیص داده و با متد leaveChat فوراً آن گروه را ترک می‌کند.',
		simulatedBotMessageFa:
			'⛔ این ربات به صورت اختصاصی به یک سوپرگروه دیگر قفل شده است. [اجرای خودکار leaveChat]',
	},
	mass_raid_429_rate_limit: {
		scenarioId: 'mass_raid_429_rate_limit',
		severity: 'high',
		dataLost: false,
		botActionCode: 'RING_BUFFER_BATCH_DELETE_100 + AUTO_LOCKDOWN',
		titleFa: '۹. حمله رید سنگین (۵۰۰ پیام اسپم در ۵ ثانیه) و مدیریت خطای 429 تلگرام',
		triggerConditionFa: 'incoming_spam_velocity > 25 msgs/sec',
		systemBehaviorFa:
			'به جای ارسال ۵۰۰ درخواست تک‌به‌تک deleteMessage که باعث بلاک شدن ربات توسط تلگرام (HTTP 429) می‌شود، ربات آیدی پیام‌ها را در بافر ۲۰۰ میلی‌ثانیه‌ای جمع کرده و هر ۱۰۰ پیام را با یک درخواست واحد deleteMessages پاک می‌کند و قفل اضطراری را روشن می‌نماید.',
		simulatedBotMessageFa:
			'🛡️ <b>حمله رید مهار شد!</b> ۱۰۰ پیام اسپم در ۱ درخواست دسته‌جمعی پاکسازی شد و قفل اضطراری موقت فعال گردید.',
	},
	botfather_token_revoked: {
		scenarioId: 'botfather_token_revoked',
		severity: 'critical',
		dataLost: false,
		botActionCode: 'MARK_TOKEN_INVALID + HOT_SWAP_RECOVERY',
		titleFa: '۱۰. عوض شدن یا باطل شدن توکن ربات در @BotFather (خطای 401 Unauthorized)',
		triggerConditionFa: 'Telegram API Response === 401 Unauthorized',
		systemBehaviorFa:
			'اگر مالک گروه توکن ربات را در BotFather ریووک کند، سیستم تنظیمات گروه را حذف نمی‌کند؛ وضعیت ربات را به «نیازمند بروزرسانی توکن» تغییر داده و در پیوی @MiniGuardBot اطلاع می‌دهد تا توکن جدید جایگزین شود.',
		simulatedBotMessageFa:
			'🔑 <b>توکن ربات در @BotFather تغییر کرده است!</b> برای اتصال مجدد بدون از دست رفتن تنظیمات گروه، توکن جدید را وارد کنید.',
		inlineRecoveryButtonFa: '🔄 جایگزینی توکن جدید بدون حذف تنظیمات',
	},
};

export function resolveEdgeCaseScenario(id: EdgeCaseScenarioId): EdgeCaseResolution {
	return EDGE_CASE_RESOLUTIONS[id];
}

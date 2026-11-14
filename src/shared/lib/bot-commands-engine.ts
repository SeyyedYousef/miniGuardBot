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

export interface InlineKeyboardButton {
	text: string;
	callback_data?: string;
	url?: string;
	web_app?: { url: string };
}

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
	{
		id: 'myadds',
		category: 'users',
		slashTriggers: ['/myadds', '/adds', '!myadds', '!adds'],
		persianTriggers: ['آمار اد', 'اد من', 'ادهای من', 'تعداد اد'],
		requiresReplyOrTarget: false,
		adminOnly: false,
		botApiMethod: 'Internal Add Counter',
		titleFa: 'مشاهده آمار ادشمار من (My Adds)',
		titleEn: 'Check My Add Count Progress',
		descFa: 'نمایش تعداد اعضای اضافه شده توسط کاربر، مانده تا هدف و رتبه در گروه',
		descEn: 'Show user current added count, remaining target, and group rank',
		exampleFa: 'ارسال «آمار اد» یا /myadds (یا با ریپلای روی کاربر)',
		exampleEn: 'Send /myadds (or reply to a member)',
	},
	{
		id: 'topadds',
		category: 'users',
		slashTriggers: ['/topadds', '/addstop', '!topadds'],
		persianTriggers: ['برترین ادها', 'جدول اد', 'لیست ادها', 'برترین اد'],
		requiresReplyOrTarget: false,
		adminOnly: false,
		botApiMethod: 'Internal Add Counter',
		titleFa: 'جدول برترین ادکنندگان گروه (Top Inviters)',
		titleEn: 'Group Add Leaderboard',
		descFa: 'نمایش رده‌بندی برترین اعضای گروه بر اساس تعداد افراد اضافه‌شده',
		descEn: 'Display top 10 members by invited count in the group',
		exampleFa: 'ارسال «برترین ادها» یا /topadds',
		exampleEn: 'Send /topadds',
	},
	{
		id: 'resetadds',
		category: 'users',
		slashTriggers: ['/resetadds', '!resetadds'],
		persianTriggers: ['ریست اد', 'صفر کردن اد'],
		requiresReplyOrTarget: false,
		adminOnly: true,
		botApiMethod: 'Internal Add Counter',
		titleFa: 'صفر کردن شمارنده اد کاربر یا کل گروه (Reset Adds)',
		titleEn: 'Reset User or Group Add Counter',
		descFa: 'با ریپلای ادهای یک کاربر صفر می‌شود و با «ریست اد کل» شمارنده کل گروه ریست خواهد شد',
		descEn: 'Reply to reset a single user counter, or use /resetadds all for entire group',
		exampleFa: 'ریپلای + «ریست اد» یا ارسال «ریست اد کل» / /resetadds all',
		exampleEn: 'Reply with /resetadds or send /resetadds all',
	},
	{
		id: 'setadds',
		category: 'users',
		slashTriggers: ['/setadds', '!setadds'],
		persianTriggers: ['تنظیم اد'],
		requiresReplyOrTarget: true,
		adminOnly: true,
		botApiMethod: 'Internal Add Counter',
		titleFa: 'تنظیم دستی تعداد اد کاربر (Set User Adds)',
		titleEn: 'Manually Set User Add Count',
		descFa: 'تغییر دستی تعداد اد ثبت‌شده برای کاربر هدف با ریپلای روی پیام او',
		descEn: 'Manually set recorded add count for a replied user',
		exampleFa: 'ریپلای روی پیام + ارسال «تنظیم اد ۵» یا /setadds 5',
		exampleEn: 'Reply with /setadds 5',
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

export interface BotCommandPsLocale {
	titlePs: string;
	descPs: string;
	examplePs: string;
	pashtoTriggers: string[];
}

export const COMMANDS_PS_BY_ID: Record<string, BotCommandPsLocale> = {
	ban: {
		pashtoTriggers: ['بن', 'شړل', 'دایمي شړل'],
		titlePs: 'دایمي شړل او بندیز (Ban)',
		descPs: 'کاروونکی په دایمي توګه له ګروپ څخه وباسي او د بیا یوځای کېدو مخه یې نیسي',
		examplePs: 'پیغام ته ریپلای + «شړل تبلیغات» یا /ban تبلیغات',
	},
	unban: {
		pashtoTriggers: ['شړل لرې', 'بن لرې', 'ازادول'],
		titlePs: 'د بندیز لرې کول (Unban)',
		descPs: 'د شړل شوي کاروونکي بندیز لرې کوي ترڅو بېرته ګروپ ته داخل شي',
		examplePs: 'ریپلای + «شړل لرې» یا /unban @user',
	},
	kick: {
		pashtoTriggers: ['ایستل', 'کیک'],
		titlePs: 'له ګروپ څخه لنډمهاله ایستل (Kick)',
		descPs: 'کاروونکی له ګروپ څخه وباسي خو د بیا ننوتلو اجازه یې نه بندوي',
		examplePs: 'پیغام ته ریپلای + «ایستل» یا /kick',
	},
	mute: {
		pashtoTriggers: ['بې‌غږه', 'بې غږه', 'چوپ'],
		titlePs: 'لنډمهاله یا دایمي بې‌غږه کول (Mute)',
		descPs: 'د کاروونکي د پیغام لېږلو اجازه تړي (د دقیقې، ساعت او ورځې ملاتړ)',
		examplePs: 'ریپلای + «بې‌غږه ۲ ساعته» یا «چوپ ۳ ورځې» یا /mute 30m',
	},
	unmute: {
		pashtoTriggers: ['چوپتیا لرې', 'بې‌غږه لرې', 'غږ ازاد'],
		titlePs: 'د کاروونکي بې‌غږه‌کونه لرې کول (Unmute)',
		descPs: 'بې‌غږه شوي غړي ته د پیغام او میډیا لېږلو بشپړه اجازه بېرته ورکوي',
		examplePs: 'پیغام ته ریپلای + «چوپتیا لرې» یا /unmute',
	},
	warn: {
		pashtoTriggers: ['خبرداری', 'اخطار'],
		titlePs: 'د پله‌په‌پله خبرداري ثبتول له بښنې تڼۍ سره (Warn)',
		descPs: 'د کاروونکي د خبرداریو شمېر زیاتوي (مثلاً ۱ له ۳) او حد ته په رسېدو اتومات سزا ورکوي',
		examplePs: 'ریپلای + «خبرداری د لینک لېږل» یا /warn تبلیغات',
	},
	unwarn: {
		pashtoTriggers: ['خبرداری لرې', 'بښنه', 'خبرداري پاکول'],
		titlePs: 'د خبرداري لرې کول او بښل (Unwarn)',
		descPs: 'د کاروونکي وروستی خبرداری کموي یا ټول ثبت شوي خبرداري صفر کوي',
		examplePs: 'پیغام ته ریپلای + «خبرداری لرې» یا /unwarn',
	},
	del: {
		pashtoTriggers: ['حذف', 'پاک'],
		titlePs: 'د پیغام او کمانډ سمدستي حذفول (Delete)',
		descPs: 'ریپلای شوی پیغام او د اډمین کمانډ دواړه هممهاله له ۱۰ ملي‌ثانیو کم وخت کې حذفوي',
		examplePs: 'پیغام ته ریپلای + «حذف» یا /del',
	},
	purge: {
		pashtoTriggers: ['پاکول', 'پاکسازي'],
		titlePs: 'د پیغامونو ډله‌ییز پاکول (Batch Purge)',
		descPs: 'تر ۱۰۰ وروستي پیغامونه په یوه باینري deleteMessages غوښتنه کې په ګډه حذفوي',
		examplePs: '«پاکول ۵۰» یا زوړ پیغام ته ریپلای + «پاکول»',
	},
	pin: {
		pashtoTriggers: ['پین', 'نښلول', 'پین لرې'],
		titlePs: 'د پیغام پین کول او پین لرې کول (Pin / Unpin)',
		descPs: 'ریپلای شوی پیغام د ګروپ په سر کې نښلوي (د بې‌غږه پین اسانتیا سره)',
		examplePs: 'پیغام ته ریپلای + «پین» یا «پین لرې»',
	},
	cleandeleted: {
		pashtoTriggers: ['حذف شوي اکونټونه پاکول'],
		titlePs: 'د حذف شویو اکونټونو پاکول (Deleted Accounts)',
		descPs: 'د ګروپ له غړو څخه حذف شوي اکونټونه (Deleted Account) په اتومات ډول پېژني او وباسي',
		examplePs: '«حذف شوي اکونټونه پاکول» یا /cleandeleted ولېږئ',
	},
	lock: {
		pashtoTriggers: ['قلف ګروپ', 'چټ تړل', 'قلف لینک', 'قلف میډیا', 'قلف فارورډ'],
		titlePs: 'د متني کمانډ له لارې د ګروپ یا محتوا سملاسي قلف',
		descPs: 'بشپړ چټ یا ځانګړې محتوا (لینک، میډیا، فارورډ) نیغ په نیغه له چټ څخه قلفوي',
		examplePs: '«قلف ګروپ» یا «قلف لینک» یا /lock all',
	},
	unlock: {
		pashtoTriggers: ['ګروپ خلاصول', 'چټ خلاصول', 'لینک خلاصول', 'میډیا خلاصول'],
		titlePs: 'د ګروپ یا محتوا قلف سملاسي خلاصول',
		descPs: 'د ګروپ بېړنی قلف خلاصوي یا د لینک/میډیا لېږلو اجازه بېرته پرانیزي',
		examplePs: '«ګروپ خلاصول» یا «لینک خلاصول» یا /unlock all',
	},
	slowmode: {
		pashtoTriggers: ['ورو حالت', 'سلو موډ'],
		titlePs: 'د ګروپ ورو حالت تنظیمول (Slow Mode)',
		descPs: 'د غړو د پیغامونو ترمنځ وختنی واټن ټاکي (۱۰، ۳۰، ۶۰ ثانیې یا بند)',
		examplePs: '«ورو حالت ۳۰» یا /slowmode 30 یا /slowmode 0',
	},
	vip: {
		pashtoTriggers: ['معاف', 'ځانګړی', 'معافیت لرې'],
		titlePs: 'ځانګړی غړی معاف کول (VIP Whitelist)',
		descPs: 'باوري غړی د لینک قلف، د فلډ ضد او د چینل جبري غړیتوب څخه معافوي',
		examplePs: 'د کاروونکي پیغام ته ریپلای + «معاف» یا /vip',
	},
	info: {
		pashtoTriggers: ['مالومات', 'آیډي', 'زما احصایې'],
		titlePs: 'د کاروونکي د مالوماتو او پېژندنې کارت (User Info)',
		descPs: 'عددي آیډي، د پیغامونو شمېر، خبرداري، بلنې او د VIP معافیت حالت ښيي',
		examplePs: 'کاروونکي ته ریپلای + «مالومات» یا «زما احصایې» ولېږئ',
	},
	report: {
		pashtoTriggers: ['راپور', 'اډمین'],
		titlePs: 'د غړو له خوا اډمینانو ته د سرغړونې پیغام راپور (Report)',
		descPs: 'راپور شوی پیغام سملاسي د اډمینانو شخصي پیغام ته د بن/بې‌غږه/حذف شیشه‌يي تڼیو سره لېږي',
		examplePs: 'پر سپیم پیغام ریپلای + «راپور» یا /report',
	},
	myadds: {
		pashtoTriggers: ['زما اډونه', 'زما اضافه شوي', 'د اډونو شمېر'],
		titlePs: 'زما د اضافه شویو غړو احصایې کتل (My Adds)',
		descPs: 'د کاروونکي له خوا د اضافه شویو غړو شمېر، تر هدفه پاتې شمېر او په ګروپ کې درجه ښيي',
		examplePs: '«زما اډونه» یا /myadds ولېږئ (یا پر غړي ریپلای وکړئ)',
	},
	topadds: {
		pashtoTriggers: ['غوره اضافه کوونکي', 'د اډونو جدول'],
		titlePs: 'د ګروپ د غوره اضافه کوونکو جدول (Top Inviters)',
		descPs: 'د اضافه شویو غړو د شمېر له مخې د ګروپ ۱۰ غوره غړي ښيي',
		examplePs: '«غوره اضافه کوونکي» یا /topadds ولېږئ',
	},
	resetadds: {
		pashtoTriggers: ['اډونه صفرول', 'اډونه ریسیټ'],
		titlePs: 'د کاروونکي یا ټول ګروپ د اډونو شمېر صفرول (Reset Adds)',
		descPs:
			'له ریپلای سره د یوه کاروونکي اډونه صفر کېږي او له «اډونه صفرول ټول» سره د ټول ګروپ شمېر صفرېږي',
		examplePs: 'ریپلای + «اډونه صفرول» یا «اډونه صفرول ټول» / /resetadds all',
	},
	setadds: {
		pashtoTriggers: ['اډونه ټاکل'],
		titlePs: 'د کاروونکي د اډونو شمېر په لاسي ډول ټاکل (Set User Adds)',
		descPs: 'د کاروونکي پیغام ته په ریپلای کولو سره د هغه ثبت شوی د اډونو شمېر بدلوي',
		examplePs: 'پیغام ته ریپلای + «اډونه ټاکل ۵» یا /setadds 5',
	},
	panel: {
		pashtoTriggers: ['پینل', 'تنظیمات', 'مدیریت'],
		titlePs: 'په چټ کې شیشه‌يي مدیریت پینل پرانیستل (Inline Panel)',
		descPs: 'د قلفونو، فلډ ضد او ګډون د مدیریت بشپړه شیشه‌يي مینو نیغ په نیغه په ټیلیګرام چټ کې ښيي',
		examplePs: 'په ګروپ کې «پینل» یا «تنظیمات» یا /panel ولېږئ',
	},
	reload: {
		pashtoTriggers: ['اډمینان تازه کول', 'د بوټ حالت'],
		titlePs: 'د اډمینانو لېست همغږي کول او د بوټ روغتیا ارزونه',
		descPs: 'د ټیلیګرام سرور څخه د ګروپ اډمینانو تازه لېست اخلي او د بوټ واکونه باینري معاینه کوي',
		examplePs: '«اډمینان تازه کول» یا /reload ولېږئ',
	},
};

export function getLocalizedBotCommand(
	cmd: (typeof BOT_COMMANDS_CATALOG)[number],
	lang?: string,
): {
	title: string;
	desc: string;
	example: string;
	triggers: string[];
} {
	const code = (lang || 'en').toLowerCase();
	if (code.startsWith('ps') || code.startsWith('pus')) {
		const ps = COMMANDS_PS_BY_ID[cmd.id];
		if (ps) {
			return {
				title: ps.titlePs,
				desc: ps.descPs,
				example: ps.examplePs,
				triggers: ps.pashtoTriggers,
			};
		}
	}
	if (code.startsWith('fa')) {
		return {
			title: cmd.titleFa,
			desc: cmd.descFa,
			example: cmd.exampleFa,
			triggers: cmd.persianTriggers,
		};
	}
	return {
		title: cmd.titleEn,
		desc: cmd.descEn,
		example: cmd.exampleEn,
		triggers: cmd.persianTriggers,
	};
}

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
 * Parses duration strings in Persian, Pashto, or English (e.g., "2h", "30m", "3d", "۲ ساعت", "۴۵ دقیقه", "۳ ورځې")
 * into seconds. Defaults to 3600s (1 hour) if not specified.
 */
export function parseDurationToSeconds(rawArg: string): number {
	const text = normalizeDigits(rawArg || '')
		.trim()
		.toLowerCase();
	if (!text) return 3600;

	const match = text.match(
		/(\d+)\s*(m|min|دقیقه|دقیقې|دقیقو|دقیقی|h|hr|hour|ساعتونه|ساعتونو|ساعته|ساعت|d|day|روز|ورځې|ورځو|ورځ|s|ثانیه|ثانیې|ثانیو)?/i,
	);
	if (!match) return 3600;

	const num = parseInt(match[1], 10);
	if (!Number.isFinite(num) || num <= 0) return 3600;

	const unit = (match[2] || 'm').trim();
	if (unit.startsWith('s') || unit.includes('ثانی')) return Math.max(30, num);
	if (unit.startsWith('m') || unit.includes('دقیق')) return num * 60;
	if (unit.startsWith('h') || unit.includes('ساعت')) return num * 3600;
	if (unit.startsWith('d') || unit.includes('روز') || unit.includes('ورځ')) return num * 86400;
	return num * 60;
}

export interface ParsedGroupCommandResult {
	matched: boolean;
	commandId?: string;
	category?: CommandCategory;
	botApiMethod?: string;
	durationSeconds?: number;
	batchCount?: number;
	resetAll?: boolean;
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
	lang?: string;
}): ParsedGroupCommandResult {
	const rawInput = normalizeDigits(params.text || '').trim();
	const raw = rawInput.replace(/^([/!][a-zA-Z0-9_]+)@[a-zA-Z0-9_]+(\b)/i, '$1$2');
	if (!raw) {
		return { matched: false, responsePreviewFa: '' };
	}

	const langCode = (params.lang || 'fa').toLowerCase();
	const isPs = langCode.startsWith('ps') || langCode.startsWith('pus');
	const isEn = langCode.startsWith('en');
	const pick = (fa: string, ps: string, en: string) => (isPs ? ps : isEn ? en : fa);

	const targetName = params.repliedUserName || pick('کاربر هدف', 'مخاطب کاروونکی', 'Target User');
	const targetId = params.repliedUserId || 509182;
	const lower = raw.toLowerCase();

	// 1. Check `/panel` | `پنل` | `پینل` | `تنظیمات`
	if (
		lower === '/panel' ||
		lower === '/settings' ||
		lower === '/menu' ||
		raw === 'پنل' ||
		raw === 'پینل' ||
		raw === 'تنظیمات'
	) {
		if (!params.senderIsAdmin) {
			return {
				matched: true,
				commandId: 'panel',
				responsePreviewFa: pick(
					'⛔ فقط ادمین‌های گروه مجاز به باز کردن پنل مدیریت هستند.',
					'⛔ یوازې د ګروپ اډمینان اجازه لري چې د مدیریت پینل پرانیزي.',
					'⛔ Only group admins can open the control panel.',
				),
			};
		}
		return {
			matched: true,
			commandId: 'panel',
			category: 'panel',
			botApiMethod: 'sendMessage + InlineKeyboardMarkup',
			responsePreviewFa: pick(
				'🎛 <b>پنل مدیریت شیشه‌ای گروه — @MiniGuardBot</b>\nادمین گرامی، از دکمه‌های شیشه‌ای زیر بخش موردنظر را انتخاب کنید:',
				'🎛 <b>د ګروپ شیشه‌يي مدیریت پینل — @MiniGuardBot</b>\nګرانه اډمینه، له لاندې شیشه‌يي تڼیو څخه خپله برخه وټاکئ:',
				'🎛 <b>Group Inline Control Panel — @MiniGuardBot</b>\nChoose a section below:',
			),
			inlineButtons: [
				[
					{
						text: pick('🛡️ قفل‌های محتوا', '🛡️ د محتوا قلفونه', '🛡️ Content Locks'),
						callback_data: 'mg:menu:locks',
					},
					{
						text: pick('⚡ ضدفلود و رگباری', '⚡ د فلډ ضد او چټک پیغامونه', '⚡ Anti-Flood'),
						callback_data: 'mg:menu:flood',
					},
				],
				[
					{
						text: pick('🌙 ساعات سکوت', '🌙 د چوپتیا ساعتونه', '🌙 Quiet Hours'),
						callback_data: 'mg:menu:quiet',
					},
					{
						text: pick('📢 عضویت اجباری', '📢 جبري غړیتوب', '📢 Mandatory Join'),
						callback_data: 'mg:menu:mandatory',
					},
				],
				[
					{
						text: pick(
							'🔒 قفل اضطراری کل گروه: خاموش',
							'🔒 د ټول ګروپ بېړنی قلف: بند',
							'🔒 Emergency Group Lock: OFF',
						),
						callback_data: 'mg:toggle:emergencylock',
					},
				],
				[
					{
						text: pick(
							'📱 باز کردن مینی‌اپ پیشرفته',
							'📱 پرمختللی مینی‌اپ پرانیستل',
							'📱 Open Mini App',
						),
						callback_data: 'mg:open:webapp',
					},
					{
						text: pick('❌ بستن پنل', '❌ پینل تړل', '❌ Close'),
						callback_data: 'mg:close',
					},
				],
			],
		};
	}

	// 2. Check `/unban` | `حذف بن` | `آزادسازی` | `شړل لرې` (before `/ban` / `شړل`)
	if (
		lower.startsWith('/unban') ||
		lower.startsWith('!unban') ||
		raw.startsWith('حذف بن') ||
		raw.startsWith('آزادسازی') ||
		raw.startsWith('شړل لرې') ||
		raw.startsWith('بن لرې') ||
		raw.startsWith('ازادول')
	) {
		return {
			matched: true,
			commandId: 'unban',
			category: 'punishment',
			botApiMethod: 'unbanChatMember',
			responsePreviewFa: pick(
				`✅ مسدودیت کاربر <b>${targetName}</b> [<code>${targetId}</code>] رفع شد و اکنون می‌تواند مجدداً عضو گروه شود.`,
				`✅ د کاروونکي <b>${targetName}</b> [<code>${targetId}</code>] بندیز لرې شو او اوس کولای شي بېرته له ګروپ سره یوځای شي.`,
				`✅ User <b>${targetName}</b> [<code>${targetId}</code>] was unbanned and can rejoin the group.`,
			),
		};
	}

	// 3. Check `/ban` | `بن` | `اخراج دایم` | `شړل`
	if (
		lower.startsWith('/ban') ||
		lower.startsWith('!ban') ||
		raw === 'بن' ||
		raw.startsWith('بن ') ||
		raw.startsWith('اخراج دایم') ||
		raw === 'شړل' ||
		raw.startsWith('شړل ') ||
		raw.startsWith('دایمي شړل')
	) {
		const reason =
			raw.replace(/^(\/ban|!ban|بن|اخراج دایم|دایمي شړل|شړل)\s*/i, '').trim() ||
			pick('تخلف از قوانین گروه', 'د ګروپ له قوانینو سرغړونه', 'Violation of group rules');
		return {
			matched: true,
			commandId: 'ban',
			category: 'punishment',
			botApiMethod: 'banChatMember',
			reasonText: reason,
			responsePreviewFa: pick(
				`🚫 کاربر <b>${targetName}</b> [<code>${targetId}</code>] به صورت دائم از گروه مسدود و اخراج شد.\n📝 علت: ${reason}`,
				`🚫 کاروونکی <b>${targetName}</b> [<code>${targetId}</code>] په دایمي توګه له ګروپ څخه بند او وشړل شو.\n📝 لامل: ${reason}`,
				`🚫 User <b>${targetName}</b> [<code>${targetId}</code>] was permanently banned.\n📝 Reason: ${reason}`,
			),
			inlineButtons: [
				[
					{
						text: pick('🔓 رفع مسدودیت (Unban)', '🔓 بندیز لرې کول (Unban)', '🔓 Unban User'),
						callback_data: `mg:unban:${targetId}`,
					},
					{
						text: pick(
							'🗑️ پاکسازی کل پیام‌های کاربر',
							'🗑️ د کاروونکي ټول پیغامونه پاکول',
							'🗑️ Delete All User Messages',
						),
						callback_data: `mg:delall:${targetId}`,
					},
				],
			],
		};
	}

	// 4. Check `/unmute` | `حذف سکوت` | `لغو سکوت` | `بې‌غږه لرې` | `چوپتیا لرې` (before `/mute`)
	if (
		lower.startsWith('/unmute') ||
		lower.startsWith('!unmute') ||
		raw.startsWith('حذف سکوت') ||
		raw.startsWith('لغو سکوت') ||
		raw.startsWith('باز کردن صدا') ||
		raw.startsWith('بې‌غږه لرې') ||
		raw.startsWith('بې غږه لرې') ||
		raw.startsWith('چوپتیا لرې') ||
		raw.startsWith('غږ ازاد')
	) {
		return {
			matched: true,
			commandId: 'unmute',
			category: 'punishment',
			botApiMethod: 'restrictChatMember',
			responsePreviewFa: pick(
				`🔊 سکوت کاربر <b>${targetName}</b> [<code>${targetId}</code>] لغو شد و دسترسی ارسال پیام او بازگردانی گردید.`,
				`🔊 د کاروونکي <b>${targetName}</b> [<code>${targetId}</code>] بې‌غږه‌کونه لرې شوه او د پیغام لېږلو اجازه یې بېرته ورکړل شوه.`,
				`🔊 User <b>${targetName}</b> [<code>${targetId}</code>] was unmuted and can send messages again.`,
			),
		};
	}

	// 5. Check `/mute` | `سکوت` | `بی صدا` | `خفه` | `بې‌غږه` | `چوپ`
	if (
		lower.startsWith('/mute') ||
		lower.startsWith('/tmute') ||
		raw.startsWith('سکوت') ||
		raw.startsWith('بی صدا') ||
		raw.startsWith('خفه') ||
		raw.startsWith('بې‌غږه') ||
		raw.startsWith('بې غږه') ||
		raw.startsWith('چوپ')
	) {
		const arg = raw.replace(/^(\/t?mute|سکوت|بی صدا|خفه|بې‌غږه|بې غږه|چوپ)\s*/i, '').trim();
		const seconds = parseDurationToSeconds(arg);
		const daysVal = Math.round(seconds / 86400);
		const hoursVal = Math.round(seconds / 3600);
		const minsVal = Math.round(seconds / 60);
		const humanDuration = isPs
			? seconds >= 86400
				? `${daysVal} ${daysVal === 1 ? 'ورځ' : 'ورځې'}`
				: seconds >= 3600
					? `${hoursVal} ${hoursVal === 1 ? 'ساعت' : 'ساعته'}`
					: `${minsVal} ${minsVal === 1 ? 'دقیقه' : 'دقیقې'}`
			: isEn
				? seconds >= 86400
					? `${daysVal}d`
					: seconds >= 3600
						? `${hoursVal}h`
						: `${minsVal}m`
				: seconds >= 86400
					? `${daysVal} روز`
					: seconds >= 3600
						? `${hoursVal} ساعت`
						: `${minsVal} دقیقه`;

		return {
			matched: true,
			commandId: 'mute',
			category: 'punishment',
			botApiMethod: 'restrictChatMember',
			durationSeconds: seconds,
			responsePreviewFa: pick(
				`🔇 کاربر <b>${targetName}</b> [<code>${targetId}</code>] به مدت <b>${humanDuration}</b> در حالت سکوت قرار گرفت.\n⏱ تا پایان مهلت قادر به ارسال پیام در گروه نخواهد بود.`,
				`🔇 کاروونکی <b>${targetName}</b> [<code>${targetId}</code>] د <b>${humanDuration}</b> لپاره بې‌غږه (Mute) شو.\n⏱ د مودې تر پایه به په ګروپ کې د پیغام لېږلو اجازه ونه لري.`,
				`🔇 User <b>${targetName}</b> [<code>${targetId}</code>] was muted for <b>${humanDuration}</b>.\n⏱ They cannot send messages until the restriction expires.`,
			),
			inlineButtons: [
				[
					{
						text: pick('🔊 لغو سکوت (Unmute)', '🔊 چوپتیا لرې کول (Unmute)', '🔊 Unmute'),
						callback_data: `mg:unmute:${targetId}`,
					},
					{
						text: pick('🚫 تبدیل به بن دائم', '🚫 په دایمي بن بدلول', '🚫 Upgrade to Ban'),
						callback_data: `mg:ban:${targetId}`,
					},
				],
			],
		};
	}

	// 6. Check `/warn` | `اخطار` | `هشدار` | `خبرداری`
	if (
		lower.startsWith('/warn') ||
		raw.startsWith('اخطار') ||
		raw.startsWith('هشدار') ||
		(raw.startsWith('خبرداری') && !raw.startsWith('خبرداری لرې'))
	) {
		const reason =
			raw.replace(/^(\/warn|اخطار|هشدار|خبرداری)\s*/i, '').trim() ||
			pick('عدم رعایت قوانین گروه', 'د ګروپ د قوانینو نه مراعتول', 'Ignoring group rules');
		return {
			matched: true,
			commandId: 'warn',
			category: 'punishment',
			botApiMethod: 'sendMessage + restrictChatMember',
			reasonText: reason,
			responsePreviewFa: pick(
				`⚠️ کاربر <b>${targetName}</b> یک اخطار دریافت کرد!\n📊 تعداد اخطارها: <b>۲ از ۳</b> (در صورت دریافت اخطار سوم: سکوت ۲۴ ساعته)\n📝 دلیل: ${reason}`,
				`⚠️ کاروونکي <b>${targetName}</b> یو خبرداری ترلاسه کړ!\n📊 د خبرداریو شمېر: <b>۲ له ۳</b> (د درېیم خبرداري پر مهال: ۲۴ ساعته بې‌غږه‌کونه)\n📝 لامل: ${reason}`,
				`⚠️ User <b>${targetName}</b> received a warning!\n📊 Warnings: <b>2 / 3</b> (3rd warning triggers a 24h mute)\n📝 Reason: ${reason}`,
			),
			inlineButtons: [
				[
					{
						text: pick(
							'💚 بخشش و حذف اخطار (۱/۳)',
							'💚 بښل او د خبرداري لرې کول (۱/۳)',
							'💚 Forgive Warning (1/3)',
						),
						callback_data: `mg:unwarn:${targetId}`,
					},
					{
						text: pick(
							'🔇 سکوت فوری ۲۴ ساعته',
							'🔇 سملاسي ۲۴ ساعته بې‌غږه‌کونه',
							'🔇 Instant 24h Mute',
						),
						callback_data: `mg:mute24h:${targetId}`,
					},
				],
			],
		};
	}

	// 7. Check `/purge` | `پاکسازی` | `پاکول`
	if (
		lower.startsWith('/purge') ||
		lower.startsWith('/clear') ||
		raw.startsWith('پاکسازی') ||
		raw.startsWith('پاکسازي') ||
		raw.startsWith('پاکول')
	) {
		const numMatch = raw.match(/(\d+)/);
		const count = numMatch ? Math.min(100, Math.max(1, parseInt(numMatch[1], 10))) : 25;
		return {
			matched: true,
			commandId: 'purge',
			category: 'cleanup',
			botApiMethod: 'deleteMessages (Batch)',
			batchCount: count,
			responsePreviewFa: pick(
				`🧹 <b>پاکسازی دسته‌جمعی انجام شد!</b>\nتعداد <b>${count} پیام</b> اخیر با متد باینری <code>deleteMessages</code> در یک درخواست حذف گردید.`,
				`🧹 <b>ډله‌ییز پاکول ترسره شول!</b>\nوروستي <b>${count} پیغامونه</b> د <code>deleteMessages</code> باینري میتود له لارې په یوه غوښتنه کې حذف شول.`,
				`🧹 <b>Batch purge completed!</b>\nDeleted the last <b>${count} messages</b> in a single <code>deleteMessages</code> request.`,
			),
		};
	}

	// 8. Check `/del` | `حذف` | `پاک`
	if (lower === '/del' || lower === '/d' || raw === 'حذف' || raw === 'پاک') {
		return {
			matched: true,
			commandId: 'del',
			category: 'cleanup',
			botApiMethod: 'deleteMessages',
			responsePreviewFa: pick(
				`🗑️ پیام موردنظر و دستور شما به صورت بی‌صدا در ۸ میلی‌ثانیه حذف شدند.`,
				`🗑️ ټاکل شوی پیغام او ستاسو کمانډ په بې‌غږه توګه په ۸ ملي‌ثانیو کې حذف شول.`,
				`🗑️ Target message and command were silently deleted in 8ms.`,
			),
		};
	}

	// 9. Check `/lock` | `قفل ...` | `قلف ...`
	if (lower.startsWith('/lock') || raw.startsWith('قفل ') || raw.startsWith('قلف ')) {
		const target = raw.replace(/^(\/lock|قفل|قلف)\s*/i, '').trim() || pick('گروه', 'ګروپ', 'group');
		return {
			matched: true,
			commandId: 'lock',
			category: 'locks',
			botApiMethod: 'setChatPermissions',
			targetLockKey: target,
			responsePreviewFa: pick(
				`🔒 قفل <b>«${target}»</b> با موفقیت فعال شد.`,
				`🔒 د <b>«${target}»</b> قلف په بریالیتوب سره فعال شو.`,
				`🔒 Lock <b>"${target}"</b> enabled successfully.`,
			),
			inlineButtons: [
				[
					{
						text: pick(
							`🔓 بازگشایی قفل «${target}»`,
							`🔓 د «${target}» قلف خلاصول`,
							`🔓 Unlock "${target}"`,
						),
						callback_data: `mg:unlock:${target}`,
					},
				],
			],
		};
	}

	// 10. Check `/vip` | `معاف` | `ویژه` | `ځانګړی`
	if (
		lower.startsWith('/vip') ||
		lower.startsWith('/whitelist') ||
		raw === 'معاف' ||
		raw === 'ویژه' ||
		raw === 'ځانګړی'
	) {
		return {
			matched: true,
			commandId: 'vip',
			category: 'users',
			botApiMethod: 'Internal Whitelist DB',
			responsePreviewFa: pick(
				`🌟 کاربر <b>${targetName}</b> [<code>${targetId}</code>] به لیست <b>اعضای ویژه (VIP)</b> اضافه شد و از قفل لینک، ضدفلود و عضویت اجباری معاف گردید.`,
				`🌟 کاروونکی <b>${targetName}</b> [<code>${targetId}</code>] د <b>ځانګړو غړو (VIP)</b> لېست ته ورزیات شو او د لینک قلف، فلډ ضد او جبري غړیتوب څخه معاف شو.`,
				`🌟 User <b>${targetName}</b> [<code>${targetId}</code>] was added to the <b>VIP Whitelist</b> and exempted from link locks, anti-flood, and mandatory join.`,
			),
			inlineButtons: [
				[
					{
						text: pick('❌ لغو معافیت VIP', '❌ د VIP معافیت لرې کول', '❌ Remove VIP Exemption'),
						callback_data: `mg:unvip:${targetId}`,
					},
				],
			],
		};
	}

	// 11. Check `/report` | `گزارش` | `راپور`
	if (lower.startsWith('/report') || lower === '@admin' || raw === 'گزارش' || raw === 'راپور') {
		return {
			matched: true,
			commandId: 'report',
			category: 'users',
			botApiMethod: 'sendMessage (Admin PM)',
			responsePreviewFa: pick(
				`🚨 <b>گزارش تخلف ثبت شد!</b>\nپیام کاربر <b>${targetName}</b> به پیوی تمام ادمین‌های گروه ارسال گردید.`,
				`🚨 <b>د سرغړونې راپور ثبت شو!</b>\nد کاروونکي <b>${targetName}</b> پیغام د ګروپ ټولو اډمینانو شخصي پیغام ته ولېږل شو.`,
				`🚨 <b>Violation report sent!</b>\nThe message from <b>${targetName}</b> was forwarded to all group admins in PM.`,
			),
			inlineButtons: [
				[
					{
						text: pick(
							'🚫 بن متخلف + حذف پیام',
							'🚫 سرغړوونکی شړل + پیغام حذفول',
							'🚫 Ban Offender + Delete',
						),
						callback_data: `mg:report_ban:${targetId}`,
					},
					{
						text: pick('🔇 سکوت ۲۴ ساعته', '🔇 ۲۴ ساعته بې‌غږه‌کونه', '🔇 Mute 24h'),
						callback_data: `mg:report_mute:${targetId}`,
					},
				],
				[
					{
						text: pick(
							'✅ بررسی شد (نادیده گرفتن)',
							'✅ وڅېړل شو (له پامه غورځول)',
							'✅ Reviewed (Dismiss)',
						),
						callback_data: `mg:report_dismiss:${targetId}`,
					},
				],
			],
		};
	}

	// 11.5 Check Add-Counter Commands (/myadds, /topadds, /resetadds, /setadds)
	if (
		lower === '/myadds' ||
		lower === '/adds' ||
		lower === '!myadds' ||
		lower === '!adds' ||
		raw === 'آمار اد' ||
		raw === 'اد من' ||
		raw === 'ادهای من' ||
		raw === 'تعداد اد' ||
		raw === 'زما اډونه' ||
		raw === 'زما اضافه شوي' ||
		raw === 'د اډونو شمېر'
	) {
		return {
			matched: true,
			commandId: 'myadds',
			category: 'users',
			botApiMethod: 'Internal Add Counter',
			responsePreviewFa: pick(
				`➕ <b>وضعیت ادشمار ${targetName}</b>\n📊 شمارش ادشمار زنده گروه محاسبه و ارسال می‌شود.`,
				`➕ <b>د ${targetName} د اضافه شویو غړو حالت</b>\n📊 د ګروپ ژوندی اډشمېر محاسبه او لېږل کېږي.`,
				`➕ <b>Add Counter Status for ${targetName}</b>\n📊 Live group invite count is calculated and sent.`,
			),
		};
	}

	if (
		lower === '/topadds' ||
		lower === '/addstop' ||
		lower === '!topadds' ||
		raw === 'برترین ادها' ||
		raw === 'برترین اد' ||
		raw === 'جدول اد' ||
		raw === 'لیست ادها' ||
		raw === 'غوره اضافه کوونکي' ||
		raw === 'د اډونو جدول'
	) {
		return {
			matched: true,
			commandId: 'topadds',
			category: 'users',
			botApiMethod: 'Internal Add Counter',
			responsePreviewFa: pick(
				'🏆 <b>جدول برترین ادکنندگان گروه</b>',
				'🏆 <b>د ګروپ د غوره اضافه کوونکو جدول</b>',
				'🏆 <b>Group Top Inviters Leaderboard</b>',
			),
		};
	}

	if (
		lower.startsWith('/resetadds') ||
		lower.startsWith('!resetadds') ||
		raw.startsWith('ریست اد') ||
		raw.startsWith('صفر کردن اد') ||
		raw.startsWith('اډونه صفرول') ||
		raw.startsWith('اډونه ریسیټ')
	) {
		const isAll = /\b(all|group)\b/i.test(raw) || /کل|همه|گروه|ټول|ګروپ/.test(raw);
		return {
			matched: true,
			commandId: 'resetadds',
			category: 'users',
			botApiMethod: 'Internal Add Counter',
			resetAll: isAll,
			responsePreviewFa: isAll
				? pick(
						'♻️ شمارنده ادشمار کل گروه با موفقیت صفر شد.',
						'♻️ د ټول ګروپ د اضافه شویو غړو شمېر په بریالیتوب سره صفر شو.',
						'♻️ Entire group add counter reset to zero.',
					)
				: pick(
						`♻️ شمارنده ادهای کاربر <b>${targetName}</b> صفر شد.`,
						`♻️ د کاروونکي <b>${targetName}</b> د اډونو شمېر صفر شو.`,
						`♻️ Add counter reset to zero for <b>${targetName}</b>.`,
					),
		};
	}

	if (
		lower.startsWith('/setadds') ||
		lower.startsWith('!setadds') ||
		raw.startsWith('تنظیم اد') ||
		raw.startsWith('اډونه ټاکل')
	) {
		const numMatch = raw.match(/(\d+)/);
		const countVal = numMatch ? Math.max(0, parseInt(numMatch[1], 10)) : 0;
		return {
			matched: true,
			commandId: 'setadds',
			category: 'users',
			botApiMethod: 'Internal Add Counter',
			batchCount: countVal,
			responsePreviewFa: pick(
				`✅ تعداد ادهای <b>${targetName}</b> روی <b>${countVal}</b> تنظیم شد.`,
				`✅ د <b>${targetName}</b> د اډونو شمېر پر <b>${countVal}</b> وټاکل شو.`,
				`✅ Add count for <b>${targetName}</b> set to <b>${countVal}</b>.`,
			),
		};
	}

	// 12. Check `/info` | `اطلاعات` | `آمار من` | `مالومات`
	if (
		lower === '/info' ||
		lower === '/id' ||
		lower === '/me' ||
		raw === 'اطلاعات' ||
		raw === 'آیدی' ||
		raw === 'آمار من' ||
		raw === 'مالومات' ||
		raw === 'آیډي' ||
		raw === 'زما احصایې'
	) {
		return {
			matched: true,
			commandId: 'info',
			category: 'users',
			botApiMethod: 'getChatMember',
			responsePreviewFa: pick(
				`👤 <b>شناسنامه امنیتی کاربر در گروه:</b>\n• نام: <b>${targetName}</b>\n• آیدی عددی: <code>${targetId}</code>\n• وضعیت کپچا: ✅ تاییدشده با بیومتریک\n• اخطارها: <code>0 / 3</code> | دعوت‌ها: <code>4 نفر</code>`,
				`👤 <b>په ګروپ کې د کاروونکي امنیتي پېژندکارت:</b>\n• نوم: <b>${targetName}</b>\n• عددي آیډي: <code>${targetId}</code>\n• د کپچا حالت: ✅ په بایومتریک تایید شوی\n• خبرداري: <code>0 / 3</code> | بلنې: <code>4 تنه</code>`,
				`👤 <b>Member Security Card:</b>\n• Name: <b>${targetName}</b>\n• Numeric ID: <code>${targetId}</code>\n• Captcha: ✅ Verified\n• Warnings: <code>0 / 3</code> | Invites: <code>4</code>`,
			),
		};
	}

	return {
		matched: false,
		responsePreviewFa: pick(
			'دستور شناخته نشد. از «پنل» یا دستورات استاندارد مانند «بن»، «سکوت ۲ ساعت»، «اخطار» استفاده کنید.',
			'کمانډ ونه پېژندل شو. له «پینل» یا معیاري کمانډونو لکه «شړل»، «بې‌غږه ۲ ساعته»، «خبرداری» څخه کار واخلئ.',
			'Unrecognized command. Use /panel or standard commands like /ban, /mute 2h, or /warn.',
		),
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
	lang?: string;
}): {
	allowed: boolean;
	answerCallbackAlertText: string;
	showAlertModal: boolean;
} {
	const langCode = (params.lang || 'fa').toLowerCase();
	const isPs = langCode.startsWith('ps') || langCode.startsWith('pus');
	const isEn = langCode.startsWith('en');

	if (!params.adminUserIds.includes(params.callerUserId)) {
		return {
			allowed: false,
			answerCallbackAlertText: isPs
				? '⛔ غیرمجاز لاسرسی! دا شیشه‌يي تڼۍ یوازې د ګروپ اډمینانو لپاره ده.'
				: isEn
					? '⛔ Unauthorized! This inline button is exclusively for group admins.'
					: '⛔ دسترسی غیرمجاز! این دکمه شیشه‌ای منحصراً مخصوص ادمین‌های گروه است.',
			showAlertModal: true,
		};
	}

	return {
		allowed: true,
		answerCallbackAlertText: isPs
			? '✅ بدلونونه په بریالیتوب سره د فایروال په هسته کې پلي شول.'
			: isEn
				? '✅ Changes applied to firewall core successfully.'
				: '✅ تغییرات با موفقیت در هسته فایروال اعمال شد.',
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
		botActionCode: 'SAFE_HIBERNATION_7_DAYS + XTR_INVOICE_LINK',
		titleFa: '۱. اتمام ۲۴ ساعت تست رایگان یا اشتراک ماهانه و مهلت ۱ هفته‌ای نگهداری اطلاعات',
		triggerConditionFa: 'trial_ends_at < NOW() && subscription_status !== "paid"',
		systemBehaviorFa:
			'پس از پایان اعتبار، تنظیمات، لیست کلمات ممنوعه و آمار گروه تنها به مدت ۱ هفته (۷ روز) در دیتابیس نگهداری می‌شود و ربات در این مدت به حالت تعلیق ایمن (Standby) می‌رود. در صورت تمدید طی این ۱ هفته، ربات بلافاصله بدون نیاز به تنظیم مجدد روشن می‌گردد؛ اما در صورت عدم تمدید پس از ۷ روز، اطلاعات گروه به صورت خودکار از دیتابیس پاکسازی خواهد شد.',
		simulatedBotMessageFa:
			'⏳ <b>اشتراک محافظت این گروه به پایان رسیده است!</b>\n' +
			'تمامی تنظیمات فایروال و آمار گروه شما <b>تنها تا ۱ هفته آینده (۷ روز) محفوظ می‌ماند</b> و پس از آن به صورت خودکار حذف خواهد شد.\n' +
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

export interface EdgeCasePsLocale {
	titlePs: string;
	systemBehaviorPs: string;
	simulatedBotMessagePs: string;
	inlineRecoveryButtonPs?: string;
}

export const EDGE_CASE_PS_BY_ID: Record<EdgeCaseScenarioId, EdgeCasePsLocale> = {
	subscription_expired_unpaid: {
		titlePs: '۱. د ۲۴ ساعته وړیا آزموینې یا میاشتني ګډون پای او د مالوماتو د ساتنې ۱ اوونۍ مهلت',
		systemBehaviorPs:
			'د اعتبار له پای ته رسېدو وروسته، تنظیمات، د بندو کلمو لېست او د ګروپ احصایې یوازې د ۱ اوونۍ (۷ ورځو) لپاره په ډیټابیس کې ساتل کېږي او بوټ په دې موده کې خوندي خوب حالت (Standby) ته ځي. که په دې ۱ اوونۍ کې تمدید شي، بوټ سملاسي پرته له بیا تنظیمولو بېرته فعالېږي؛ خو د ۷ ورځو تر تېرېدو وروسته به د ګروپ مالومات په اتومات ډول له ډیټابیس څخه پاک شي.',
		simulatedBotMessagePs:
			'⏳ <b>د دې ګروپ د ساتنې ګډون پای ته رسېدلی دی!</b>\n' +
			'د فایروال ټول تنظیمات او د ګروپ احصایې <b>یوازې تر راتلونکې ۱ اوونۍ (۷ ورځو) پورې خوندي پاتې کېږي</b> او له هغه وروسته به په اتومات ډول حذف شي.\n' +
			'د ۳۰ ورځو لپاره د بوټ د سملاسي بیا فعالولو لپاره پر لاندې تڼۍ کلیک وکړئ (۱۰۰ سټارز ⭐):',
		inlineRecoveryButtonPs: '⭐ د میاشتني ګډون سملاسي تمدید (100 Stars) او اتومات فعالول',
	},
	automatic_channel_forward: {
		titlePs: '۲. د بحث له ګروپ (Discussion Group) سره د تړلي چینل پوسټونو اتومات فارورډ',
		systemBehaviorPs:
			'کله چې ګروپ ستاسو له رسمي چینل سره تړلی وي، د چینل پوسټونه په اتومات ډول ګروپ ته راځي. حتی که د فارورډ قلف او لینک قلف فعال وي، بوټ د is_automatic_forward باینري نښه پېژني او هېڅکله ستاسو د خپل چینل پوسټونه نه حذفوي.',
		simulatedBotMessagePs:
			'✅ [د تړلي چینل اتومات پوسټ وپېژندل شو: is_automatic_forward=true] — د لینک او فارورډ قلف څخه معاف دی.',
	},
	anonymous_admin_command: {
		titlePs: '۳. د ګروپ د پټ اډمین (Anonymous Admin) له خوا د کمانډ یا لینک لېږل',
		systemBehaviorPs:
			'کله چې اډمین د Remain Anonymous اختیار فعال کړی وي، د from.id برخه تشه وي او sender_chat د ګروپ له آیډي سره برابر وي. بوټ دا پیغام د ګروپ د لوړ اډمین په توګه پېژني، کمانډونه یې (شړل، بې‌غږه‌کونه، پینل) اجرا کوي او هېڅکله یې پیغام نه حذفوي.',
		simulatedBotMessagePs:
			'🛡️ [د ګروپ پټ اډمین تایید شو: sender_chat == chat.id] — مدیریتي کمانډ په بریالیتوب سره اجرا شو.',
	},
	admin_on_admin_ban_attempt: {
		titlePs: '۴. د یوه اډمین له خوا د ګروپ مالک یا بل اډمین د بن یا بې‌غږه کولو هڅه (د کودتا ضد)',
		systemBehaviorPs:
			'بوټ د بن/بې‌غږه‌کونې/ایستلو کمانډونو له اجرا کولو مخکې د مخاطب کاروونکي رول د اډمینانو په حافظه کې ګوري. که مخاطب اډمین وي، کمانډ ودروي او د تکرار په صورت کې د ګروپ اصلي مالک ته په شخصي پیغام کې امنیتي خبرداری لېږي.',
		simulatedBotMessagePs:
			'⛔ <b>عملیات ودرول شول!</b> مخاطب کاروونکی د ګروپ له اډمینانو څخه دی او د اډمینانو بندول یا بې‌غږه کول ناشوني دي.',
	},
	non_admin_callback_click: {
		titlePs: '۵. په ګروپ کې د مدیریت پینل پر شیشه‌يي تڼیو د عادي غړو کلیک',
		systemBehaviorPs:
			'په ګروپ کې هره شیشه‌يي تڼۍ د RBAC تایید طبقه لري. که عادي غړی د پینل تڼیو یا د «چوپتیا لرې کول» تڼۍ کلیک کړي، بوټ د پیغام له بدلولو پرته یوازې هماغه کس ته د ټیلیګرام اصلي خبرداری ښيي.',
		simulatedBotMessagePs:
			'⛔ د ټیلیګرام خبرتیا (answerCallbackQuery): «دا شیشه‌يي تڼۍ یوازې د ګروپ اډمینانو لپاره ده!»',
	},
	supergroup_chat_id_migration: {
		titlePs: '۶. عادي ګروپ سوپرګروپ ته بدلېدل او د ګروپ آیډي ناڅاپي بدلون (Migration)',
		systemBehaviorPs:
			'په ټیلیګرام کې سوپرګروپ ته د لوړېدو پر مهال chat_id یوه نوي منفي ۱۰۰ عددي نمبر ته بدلېږي. بوټ په اتومات ډول اتومیک کډوالۍ لیږد اجرا کوي او ټول تنظیمات او د ګډون پاتې ورځې نوي آیډي ته لېږدوي.',
		simulatedBotMessagePs:
			'🔄 <b>سوپرګروپ ته د ګروپ لوړول وموندل شول!</b> ټول تنظیمات او د ګروپ ګډون نوي آیډي ته ولېږدول شول.',
	},
	bot_permission_downgraded: {
		titlePs: '۷. د یوه اډمین له خوا د بوټ د حذف یا بندولو واکونو لیرې کول',
		systemBehaviorPs:
			'د بوټ واکونو له بدلېدو سره سم my_chat_member پېښه ترلاسه کېږي. بوټ د 400 Bad Request تېروتنې سره د بندېدو پرځای د حذف ماډیول په موقتي ډول ودروي او سملاسي د ګروپ مالک ته په شخصي پیغام کې راپور ورکوي چې کوم اډمین واک کم کړی دی.',
		simulatedBotMessagePs:
			'⚠️ <b>د مالک په شخصي پیغام کې بېړنی امنیتي خبرداری:</b> په ګروپ کې د بوټ <code>Delete Messages</code> واک غیرفعال شوی! د لینک ضد فعالیت لپاره واک بېرته فعال کړئ.',
		inlineRecoveryButtonPs: '🔍 د بوټ د اډمین واکونو بیا کتنه',
	},
	unauthorized_second_group_join: {
		titlePs: '۸. د متفرقه کسانو له خوا ستاسو ځانګړي بوټ په بل ګروپ کې اضافه کول',
		systemBehaviorPs:
			'د 1 Bot = 1 Group جلاوالي معمارۍ له مخې، که بل څوک ستاسو بوټ کوم بل ګروپ ته ورزیات کړي، بوټ له ۱۰۰ ملي‌ثانیو کم وخت کې ناورته‌والی پېژني او د leaveChat له لارې سملاسي له هغه ګروپ څخه وځي.',
		simulatedBotMessagePs:
			'⛔ دا بوټ په ځانګړي ډول له یوه بل سوپرګروپ سره تړل شوی دی. [د leaveChat اتومات اجرا]',
	},
	mass_raid_429_rate_limit: {
		titlePs: '۹. دروند ریډ برید (په ۵ ثانیو کې ۵۰۰ سپیم پیغامونه) او د ټیلیګرام 429 تېروتنې مدیریت',
		systemBehaviorPs:
			'د دې پرځای چې ۵۰۰ جلا deleteMessage غوښتنې ولېږي چې د ټیلیګرام له خوا د بوټ د بندېدو (HTTP 429) لامل شي، بوټ د پیغامونو آیډي‌ګانې په ۲۰۰ ملي‌ثانیي بفر کې راټولوي، هر ۱۰۰ پیغامونه په یوه deleteMessages غوښتنه کې پاکوي او بېړنی قلف فعالوي.',
		simulatedBotMessagePs:
			'🛡️ <b>د ریډ برید مهار شو!</b> ۱۰۰ سپیم پیغامونه په ۱ ډله‌ییزه غوښتنه کې پاک شول او موقتي بېړنی قلف فعال شو.',
	},
	botfather_token_revoked: {
		titlePs: '۱۰. په @BotFather کې د بوټ ټوکن بدلېدل یا باطلېدل (401 Unauthorized تېروتنه)',
		systemBehaviorPs:
			'که د ګروپ مالک په BotFather کې د بوټ ټوکن ریووک کړي، سیستم د ګروپ تنظیمات نه حذفوي؛ د بوټ حالت «د ټوکن تازه کولو ته اړتیا» ته بدلوي او د @MiniGuardBot شخصي پیغام کې خبر ورکوي ترڅو نوی ټوکن ځای‌ناستی شي.',
		simulatedBotMessagePs:
			'🔑 <b>په @BotFather کې د بوټ ټوکن بدل شوی دی!</b> د ګروپ تنظیماتو له لاسه ورکولو پرته د بیا نښلولو لپاره نوی ټوکن دننه کړئ.',
		inlineRecoveryButtonPs: '🔄 د تنظیماتو له حذف پرته د نوي ټوکن ځای‌ناستي کول',
	},
};

export function getLocalizedEdgeCase(edge: EdgeCaseResolution, lang?: string): EdgeCaseResolution {
	const code = (lang || 'fa').toLowerCase();
	if (code.startsWith('ps') || code.startsWith('pus')) {
		const ps = EDGE_CASE_PS_BY_ID[edge.scenarioId];
		if (ps) {
			return {
				...edge,
				titleFa: ps.titlePs,
				systemBehaviorFa: ps.systemBehaviorPs,
				simulatedBotMessageFa: ps.simulatedBotMessagePs,
				inlineRecoveryButtonFa: ps.inlineRecoveryButtonPs,
			};
		}
	}
	return edge;
}

export function resolveEdgeCaseScenario(id: EdgeCaseScenarioId): EdgeCaseResolution {
	return EDGE_CASE_RESOLUTIONS[id];
}

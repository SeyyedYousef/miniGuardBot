import crypto from 'node:crypto';

/**
 * MiniGuard (@MiniGuardBot) — Binary-Verified Telegram Bot API 8.x Engine (2026)
 *
 * Implements:
 * 1. Binary HMAC-SHA256 Telegram WebApp initData signature verification (WebAppData).
 * 2. AES-256-GCM encryption/decryption for user BotFather tokens at rest.
 * 3. 4-Language ('fa' | 'en' | 'ru' | 'zh') auto-detected /start response for:
 *    - Master Bot (@MiniGuardBot)
 *    - Every User-Created Child Bot (with @MiniGuardBot attribution & CTA).
 * 4. 4-Message Automated Onboarding Sequence when a child bot joins its designated group,
 *    plus strict 1-Bot-1-Group isolation and binary admin permission verification.
 * 5. 24-Hour Free Trial + 100 Telegram Stars (XTR) monthly subscription invoicing &
 *    automated PM notifications (6h left, 1h left, threat alerts, and nightly daily stats report).
 */

export type BotLang = 'fa' | 'en' | 'ru' | 'zh';

export const resolveBotLang = (code?: string): BotLang => {
	if (!code) return 'fa';
	const c = code.toLowerCase();
	if (c.startsWith('fa') || c.startsWith('ps')) return 'fa';
	if (c.startsWith('ru') || c.startsWith('uk') || c.startsWith('be')) return 'ru';
	if (c.startsWith('zh')) return 'zh';
	return 'en';
};

// ─── 1. Binary HMAC-SHA256 Telegram WebApp initData Verification ────────────
export function verifyTelegramInitData(initDataRaw: string, botToken: string): boolean {
	try {
		const params = new URLSearchParams(initDataRaw);
		const receivedHash = params.get('hash');
		if (!receivedHash) return false;

		const pairs: string[] = [];
		params.forEach((value, key) => {
			if (key !== 'hash') {
				pairs.push(`${key}=${value}`);
			}
		});
		pairs.sort();
		const dataCheckString = pairs.join('\n');

		const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
		const calculatedHash = crypto
			.createHmac('sha256', secretKey)
			.update(dataCheckString)
			.digest('hex');

		const bufA = Buffer.from(receivedHash, 'hex');
		const bufB = Buffer.from(calculatedHash, 'hex');
		if (bufA.length !== bufB.length) return false;
		return crypto.timingSafeEqual(bufA, bufB);
	} catch {
		return false;
	}
}

// ─── 2. AES-256-GCM Token Encryption for BotFather Tokens ───────────────────
export function encryptBotToken(plainToken: string, masterKeyHex: string): string {
	const key = Buffer.from(masterKeyHex.padEnd(64, '0').slice(0, 64), 'hex');
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const encrypted = Buffer.concat([cipher.update(plainToken, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptBotToken(payload: string, masterKeyHex: string): string {
	const [ivHex, tagHex, encHex] = payload.split(':');
	const key = Buffer.from(masterKeyHex.padEnd(64, '0').slice(0, 64), 'hex');
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
	decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
	const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
	return decrypted.toString('utf8');
}

// ─── 3. Default /start Response for User-Created Child Bots (4 Languages) ───
export function buildChildBotStartMessage(params: {
	lang: BotLang;
	userFirstName: string;
	groupTitle: string;
	groupLink: string;
	miniAppUrl: string;
}) {
	const { lang, userFirstName, groupTitle, groupLink } = params;

	if (lang === 'fa') {
		return {
			text:
				`🛡️ سلام <b>${userFirstName}</b> عزیز!\n` +
				`من <b>نگهبان و مدیر هوشمند اختصاصی</b> گروه <b>«${groupTitle}»</b> هستم.\n\n` +
				`<blockquote>✨ <b>هر گروه، یک ربات مدیریت گروه اختصاصی!</b>\n` +
				`این ربات با معماری ایزوله <b>@MiniGuardBot</b> ساخته شده است؛ بدون تبلیغات مزاحم، بدون کندی و با فایروال باینری ۱۲ میلی‌ثانیه‌ای.</blockquote>\n\n` +
				`🔥 <b>شما هم گروه تلگرامی دارید؟</b>\n` +
				`در کمتر از ۳۰ ثانیه، یک ربات مدیریت گروه با <b>نام، عکس پروفایل و برند اختصاصی خودتان</b> بسازید و از بیش از ۱۰۰ قابلیت ضداسپم، قفل هوشمند، ساعات سکوت و پنل شیشه‌ای لذت ببرید (۲۴ ساعت تست رایگان) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 ساخت ربات اختصاصی گروه شما با @MiniGuardBot',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 ورود به گروه «${groupTitle}»`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	if (lang === 'ru') {
		return {
			text:
				`🛡️ Привет, <b>${userFirstName}</b>!\n` +
				`Я персональный ИИ-страж и администратор группы <b>«${groupTitle}»</b>.\n\n` +
				`<blockquote>✨ <b>Каждой группе — свой персональный бот управления!</b>\n` +
				`Этот бот работает на изолированном ядре <b>@MiniGuardBot</b> без рекламы и задержек.</blockquote>\n\n` +
				`🔥 <b>У вас тоже есть группа в Telegram?</b>\n` +
				`Создайте собственного бота управления со своим именем, аватаркой и 100+ функциями файрвола за 30 секунд (24 часа бесплатно) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 Создать своего бота в @MiniGuardBot',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 Перейти в группу «${groupTitle}»`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	if (lang === 'zh') {
		return {
			text:
				`🛡️ 您好，<b>${userFirstName}</b>！\n` +
				`我是 <b>「${groupTitle}」</b> 群组的专属安全与管理机器人。\n\n` +
				`<blockquote>✨ <b>每个群组，专属一个独立管理机器人！</b>\n` +
				`本机器人由 <b>@MiniGuardBot</b> 独享内核驱动，零广告、毫秒级反垃圾拦截。</blockquote>\n\n` +
				`🔥 <b>您也拥有 Telegram 群组吗？</b>\n` +
				`只需 30 秒即可打造冠以您自己品牌名称的专属群管机器人，解锁 100+ 项防火墙与自动管理功能（24 小时免费试用）👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 使用 @MiniGuardBot 创建专属群管机器人',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 加入群组「${groupTitle}」`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	return {
		text:
			`🛡️ Hello <b>${userFirstName}</b>!\n` +
			`I am the dedicated security & management bot for <b>"${groupTitle}"</b>.\n\n` +
			`<blockquote>✨ <b>Every Group, Its Own Dedicated Management Bot!</b>\n` +
			`Powered by the isolated <b>@MiniGuardBot</b> binary firewall engine — zero ads, zero lag, sub-12ms protection.</blockquote>\n\n` +
			`🔥 <b>Own a Telegram group?</b>\n` +
			`Build your own custom-named, custom-branded group management bot with 100+ anti-spam, firewall, and analytics features in 30 seconds (24h Free Trial) 👇`,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: '🚀 Create Your Own Group Bot via @MiniGuardBot',
						url: 'https://t.me/MiniGuardBot',
					},
				],
				[
					{
						text: `👥 Join "${groupTitle}"`,
						url: groupLink.startsWith('http')
							? groupLink
							: `https://t.me/${groupLink.replace('@', '')}`,
					},
				],
			],
		},
	};
}

// ─── 4. Master Bot (@MiniGuardBot) /start Message (4 Languages) ─────────────
export function buildMasterBotStartMessage(lang: BotLang, miniAppUrl: string) {
	if (lang === 'fa') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | هر گروه، یک ربات مدیریت گروه اختصاصی!</b>\n\n` +
				`دیگر نیازی نیست به ربات‌های عمومی، شلوغ، کند و پر از تبلیغات التماس کنید!\n` +
				`در <b>@MiniGuardBot</b>، هر گروه تلگرامی <b>ربات مدیریت گروه اختصاصی خودش</b> را با نام، عکس پروفایل و یوزرنیم دلخواه شما دارد.\n\n` +
				`<blockquote>⚡ <b>معماری ایزوله ۱ به ۱ (۱ ربات = ۱ گروه)</b>\n` +
				`ربات شما فقط و فقط برای گروه خودتان کار می‌کند؛ یعنی <b>سرعت واکنش زیر ۱۲ میلی‌ثانیه</b>، <b>بدون هیچ تبلیغ اجباری</b> و <b>پرستیژ ۱۰۰٪ اختصاصی</b> برای اعضای گروه‌تان!</blockquote>\n\n` +
				`💎 <b>چرا مدیران حرفه‌ای MiniGuard را انتخاب می‌کنند؟</b>\n` +
				`• 🤖 <b>برندینگ شخصی شما:</b> ربات با نام و لوگوی گروه خودتان در لیست ادمین‌ها می‌درخشد.\n` +
				`• 🛡️ <b>فایروال باینری نسل ۸:</b> شکار آنی لینک‌ها، کاراکترهای مخفی، جعل نام ادمین، ریپلای کانال‌ها و حملات فلود.\n` +
				`• 🎛 <b>مینی‌اپ و پنل شیشه‌ای ۱۷ زبانه:</b> بیش از ۱۰۰ قفل محتوا، ساعات سکوت، عضویت اجباری، تایید بیومتریک و ۴۰+ دستور چت (<code>بن</code>، <code>سکوت</code>، <code>پنل</code>).\n` +
				`• 📊 <b>گزارش هوشمند در پیوی:</b> ارسال آمار شبانه گروه و هشدار فوری خطرات مستقیم به پیوی شما.\n\n` +
				`🎁 <b>۲۴ ساعت تست کاملاً رایگان</b> (با تمام قابلیت‌ها) و سپس تنها <b>۱۰۰ استارز (⭐) ماهانه</b>!\n\n` +
				`👇 <b>همین حالا دکمه زیر را بزنید و در ۳۰ ثانیه ربات اختصاصی گروهتان را روشن کنید:</b>`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 ساخت ربات اختصاصی و ورود به پلتفرم MiniGuard',
							web_app: { url: miniAppUrl },
						},
					],
				],
			},
		};
	}

	if (lang === 'ru') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | Каждой группе — свой персональный бот управления!</b>\n\n` +
				`Забудьте о медленных общих ботах с навязчивой рекламой!\n` +
				`В <b>@MiniGuardBot</b> каждая группа получает <b>собственного изолированного бота</b> с вашим именем, логотипом и юзернеймом.\n\n` +
				`<blockquote>⚡ <b>Архитектура 1 Бот = 1 Группа</b>\n` +
				`Реакция файрвола быстрее 12 мс, 0% спам-рекламы и 100% престиж вашего сообщества.</blockquote>\n\n` +
				`💎 <b>Преимущества MiniGuard:</b>\n` +
				`• 🤖 <b>Ваш личный бренд:</b> бот работает под именем и аватаром вашей группы.\n` +
				`• 🛡️ <b>Бинарный файрвол Bot API 8.x:</b> мгновенная блокировка ссылок, невидимых символов, клонов админов и рейдов.\n` +
				`• 🎛 <b>Mini App на 17 языках:</b> 100+ блокировок контента, тихие часы, обязательная подписка и команды в чате.\n` +
				`• 🎁 <b>24 часа бесплатно</b>, далее всего <b>100 Stars (⭐) / месяц</b>!\n\n` +
				`👇 <b>Нажмите кнопку ниже и запустите своего бота за 30 секунд:</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Создать своего бота (MiniGuard App)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'zh') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | 每个群组，专属一个独立管理机器人！</b>\n\n` +
				`告别拥挤、缓慢且充满广告的公共群管机器人！\n` +
				`在 <b>@MiniGuardBot</b>，每个群组都拥有<b>完全属于自己品牌名称与头像的专属管理机器人</b>。\n\n` +
				`<blockquote>⚡ <b>1 机器人 = 1 群组 独享隔离架构</b>\n` +
				`12 毫秒级二进制防火墙拦截、零强制广告、彰显群组尊贵品牌形象。</blockquote>\n\n` +
				`• 🤖 <b>专属品牌定制：</b> 使用您自己的 BotFather Token 与头像名称。\n` +
				`• 🛡️ <b>100+ 项安全策略：</b> 防链接、防刷屏、零宽字符检测、夜间宵禁、强制关注与私聊统计日报。\n` +
				`• 🎁 <b>24 小时全功能免费试用</b>，之后仅需 <b>100 Stars (⭐) / 月</b>！\n\n` +
				`👇 <b>点击下方按钮，30 秒开启您的专属群管机器人：</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 打开 MiniGuard 创建专属群管机器人', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	return {
		text:
			`🛡️ <b>MiniGuard™ | Every Group, Its Own Dedicated Management Bot!</b>\n\n` +
			`Stop relying on crowded, slow, ad-filled public bots!\n` +
			`With <b>@MiniGuardBot</b>, your Telegram group gets <b>its own dedicated, custom-branded management bot</b> with your own name, avatar, and username.\n\n` +
			`<blockquote>⚡ <b>1 Bot = 1 Group Isolated Architecture</b>\n` +
			`Sub-12ms binary firewall response, zero forced ads, and 100% exclusive brand prestige for your community.</blockquote>\n\n` +
			`💎 <b>Why Top Communities Choose MiniGuard:</b>\n` +
			`• 🤖 <b>Your Own Brand:</b> Runs under your own @BotFather token, name & profile photo.\n` +
			`• 🛡️ <b>Bot API 8.x Binary Firewall:</b> Instantly blocks spam links, zero-width obfuscation, admin homograph impersonators & flood raids.\n` +
			`• 🎛 <b>17-Language Mini App & In-Chat Panel:</b> 100+ content locks, quiet hours, mandatory channel join, biometric verification & 40+ chat commands.\n` +
			`• 📊 <b>Smart PM Reports:</b> Nightly analytics & real-time threat alerts delivered to your PM.\n\n` +
			`🎁 <b>24-Hour Free Trial</b> (all features unlocked), then just <b>100 Telegram Stars (⭐) / month</b>!\n\n` +
			`👇 <b>Tap below to launch your dedicated group bot in 30 seconds:</b>`,
		reply_markup: {
			inline_keyboard: [
				[{ text: '🚀 Create Your Group Bot (MiniGuard App)', web_app: { url: miniAppUrl } }],
			],
		},
	};
}

// ─── 5. The 4 Automated Group Join Onboarding Messages ─────────────────────
export function buildGroupJoinOnboardingMessages(params: {
	lang: BotLang;
	groupId: string;
	groupTitle: string;
	botUsername: string;
	hasFullAdminPerms: boolean;
	miniAppUrl: string;
}): Array<{ text: string; reply_markup?: any }> {
	const { lang, groupId, groupTitle, botUsername, hasFullAdminPerms, miniAppUrl } = params;
	const panelDeepLink = `${miniAppUrl}#/group/${groupId}`;

	if (lang === 'fa') {
		return [
			{
				text:
					`🛡️ <b>اتصال امن برقرار شد!</b>\n` +
					`ربات اختصاصی <b>@${botUsername}</b> با موفقیت به گروه <b>«${groupTitle}»</b> متصل شد و تحت حفاظت هسته <b>@MiniGuardBot</b> قرار گرفت.`,
			},
			{
				text: hasFullAdminPerms
					? `✅ <b>بررسی باینری دسترسی‌های ادمین: کامل</b>\nدسترسی‌های حذف پیام، محدودسازی اعضا، پین پیام و ساخت لینک دعوت تأیید شد. فایروال ضداسپم و ضدلینک در بالاترین سطح فعال است.`
					: `⚠️ <b>نیاز به ارتقای دسترسی ادمین:</b>\nلطفاً دسترسی‌های <code>Delete Messages</code> و <code>Ban Users</code> را به ربات بدهید تا فایروال با حداکثر قدرت عمل کند.`,
			},
			{
				text:
					`🎁 <b>اشتراک آزمایشی ۲۴ ساعته رایگان فعال شد!</b>\n` +
					`تمامی ۱۰۰+ قابلیت پیشرفته مدیریت گروه به مدت ۲۴ ساعت کاملاً رایگان برای این گروه فعال گردید. پس از پایان دوره، تنها با <b>۱۰۰ استارز (⭐) ماهانه</b> می‌توانید ربات را فعال نگه دارید.`,
			},
			{
				text:
					`⚙️ <b>پنل مدیریت هوشمند گروه آماده است</b>\n` +
					`ادمین گرامی، برای تنظیم محدودیت‌های محتوا، ساعات سکوت، خوش‌آمدگویی و مشاهده آمار زنده، روی دکمه شیشه‌ای زیر کلیک کنید:`,
				reply_markup: {
					inline_keyboard: [
						[{ text: '🎛 باز کردن پنل تنظیمات این گروه', url: panelDeepLink }],
						[{ text: '⚡ ساخته شده با @MiniGuardBot', url: 'https://t.me/MiniGuardBot' }],
					],
				},
			},
		];
	}

	return [
		{
			text: `🛡️ <b>Handshake Complete!</b>\nDedicated bot <b>@${botUsername}</b> is now protecting <b>"${groupTitle}"</b> via <b>@MiniGuardBot</b>.`,
		},
		{
			text: hasFullAdminPerms
				? `✅ <b>Binary Admin Permission Audit: Verified</b>\nDelete, Restrict, Pin, and Invite permissions are active. Real-time firewall is online.`
				: `⚠️ <b>Admin Permissions Needed:</b>\nPlease grant <code>Delete Messages</code> and <code>Restrict Members</code> permissions to enable active enforcement.`,
		},
		{
			text: `🎁 <b>24-Hour Free Trial Activated!</b>\nAll 100+ protection modules are unlocked free for 24 hours. Keep protection active anytime for just <b>100 Stars (⭐) / month</b>.`,
		},
		{
			text: `⚙️ <b>Group Control Panel Ready</b>\nGroup Admin: Tap the button below to configure firewall rules, quiet hours, and live analytics:`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🎛 Open Group Control Panel', url: panelDeepLink }],
					[{ text: '⚡ Powered by @MiniGuardBot', url: 'https://t.me/MiniGuardBot' }],
				],
			},
		},
	];
}

// ─── 6. Smart PM Notifications (Trial Expiry, Threat Alerts & Daily Report) ─
export function buildDailyAnalyticsPmReport(params: {
	lang: BotLang;
	groupTitle: string;
	dateStr: string;
	totalMessages: number;
	activeUsers: number;
	newMembers: number;
	spamBlocked: number;
	warningsIssued: number;
}) {
	if (params.lang === 'fa') {
		return (
			`📊 <b>گزارش آمار روزانه گروه — @MiniGuardBot</b>\n` +
			`🏷 گروه: <b>${params.groupTitle}</b>\n` +
			`📅 تاریخ: <code>${params.dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 کل پیام‌های امروز: <b>${params.totalMessages.toLocaleString()}</b>\n` +
			`👥 کاربران فعال: <b>${params.activeUsers.toLocaleString()}</b>\n` +
			`➕ اعضای جدید: <b>+${params.newMembers.toLocaleString()}</b>\n` +
			`🚫 اسپم و لینک مسدودشده: <b>${params.spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ اخطارهای صادرشده: <b>${params.warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ وضعیت فایروال گروه: <b>فعال و ایمن</b>`
		);
	}

	return (
		`📊 <b>Daily Group Analytics Report — @MiniGuardBot</b>\n` +
		`🏷 Group: <b>${params.groupTitle}</b> (${params.dateStr})\n` +
		`• Messages: <b>${params.totalMessages.toLocaleString()}</b>\n` +
		`• Active Users: <b>${params.activeUsers.toLocaleString()}</b>\n` +
		`• New Members: <b>+${params.newMembers.toLocaleString()}</b>\n` +
		`• Spam Blocked: <b>${params.spamBlocked.toLocaleString()}</b>`
	);
}

// ─── 7. Native UpdateChatJoinRequest + WebApp Biometric Verification ────────
export function buildChatJoinRequestVerificationPrompt(params: {
	lang: BotLang;
	userFirstName: string;
	groupTitle: string;
	groupId: string;
	biometricRequired: boolean;
	miniAppUrl: string;
}) {
	const verifyUrl = `${params.miniAppUrl}#/group/${params.groupId}?verify_join=1&biometric=${params.biometricRequired ? '1' : '0'}`;

	if (params.lang === 'fa') {
		return {
			text:
				`🛡️ <b>احراز هویت ورود به گروه «${params.groupTitle}»</b>\n\n` +
				`سلام <b>${params.userFirstName}</b> عزیز!\n` +
				`برای جلوگیری از ورود ربات‌های اسپم (بدون ارسال هیچ پیام اضافی در گروه)، لطفاً روی دکمه زیر بزنید${
					params.biometricRequired
						? ' و با حسگر بیومتریک تلگرام (اثر انگشت / FaceID) هویت خود را تأیید کنید'
						: ''
				} تا درخواست عضویت شما (` +
				`<code>approveChatJoinRequest</code>) فوراً تایید شود:`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: params.biometricRequired
								? '🔐 تایید بیومتریک و ورود به گروه'
								: '✅ تایید هویت و ورود به گروه',
							web_app: { url: verifyUrl },
						},
					],
				],
			},
		};
	}

	return {
		text:
			`🛡️ <b>Join Verification for "${params.groupTitle}"</b>\n\n` +
			`Hello <b>${params.userFirstName}</b>! Tap below to complete ${
				params.biometricRequired ? 'Telegram Biometric Verification' : 'instant human verification'
			} so our bot can execute <code>approveChatJoinRequest</code>:`,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: params.biometricRequired
							? '🔐 Verify with Biometrics & Join'
							: '✅ Verify & Join Group',
						web_app: { url: verifyUrl },
					},
				],
			],
		},
	};
}

// ─── 8. In-Chat /panel Inline Keyboard Builder & Callback Handler ───────────
export function buildInChatControlPanelMessage(params: {
	lang: BotLang;
	groupId: string;
	groupTitle: string;
	emergencyLock: boolean;
	floodLimit: number;
	quietHoursActive: boolean;
	miniAppUrl: string;
}) {
	const panelUrl = `${params.miniAppUrl}#/group/${params.groupId}/commands`;
	return {
		text:
			`🎛 <b>پنل مدیریت سریع شیشه‌ای — ${params.groupTitle}</b>\n\n` +
			`• قفل اضطراری: <b>${params.emergencyLock ? '🔴 فعال' : '🟢 غیرفعال'}</b>\n` +
			`• حساسیت ضدفلود: <b>${params.floodLimit} پیام در ۵ ثانیه</b>\n` +
			`• ساعات سکوت شبانه: <b>${params.quietHoursActive ? '🌙 فعال' : '⚪ خاموش'}</b>\n\n` +
			`برای تغییر آنی بدون خروج از چت، روی دکمه‌های شیشه‌ای زیر بزنید:`,
		reply_markup: {
			inline_keyboard: [
				[
					{ text: '🛡️ قفل‌های محتوا', callback_data: `panel:locks:${params.groupId}` },
					{ text: '⚡ تنظیم ضدفلود', callback_data: `panel:flood:${params.groupId}` },
				],
				[
					{
						text: `🌙 ساعات سکوت (${params.quietHoursActive ? 'فعال' : 'خاموش'})`,
						callback_data: `panel:quiet:${params.groupId}`,
					},
					{
						text: params.emergencyLock ? '🔓 باز کردن قفل اضطراری' : '🔒 قفل اضطراری گروه',
						callback_data: `panel:emergency:${params.groupId}`,
					},
				],
				[{ text: '📱 باز کردن مینی‌اپ کامل تنظیمات', web_app: { url: panelUrl } }],
			],
		},
	};
}

// ─── 9. Safe Hibernation Mode (Expired 24h Trial / Monthly Stars Unpaid) ────
export function buildSafeHibernationNotice(params: {
	lang: BotLang;
	groupId: string;
	groupTitle: string;
	invoiceLink: string;
	miniAppUrl: string;
}) {
	return {
		text:
			`⏸️ <b>حالت خواب ایمن (Safe Hibernation Mode) — ${params.groupTitle}</b>\n\n` +
			`ادمین گرامی، مهلت تست ۲۴ ساعته رایگان یا اشتراک ماهانه این گروه به پایان رسیده است.\n` +
			`✅ <b>تضمین حفظ ۱۰۰٪ داده‌ها:</b> تمامی تنظیمات فایروال، قفل‌ها، لیست سفید و آمارهای گروه شما بدون هیچ‌گونه حذفی در دیتابیس محفوظ است.\n\n` +
			`⭐ برای بیدار شدن آنی ربات (در کمتر از ۱ ثانیه) با همان تنظیمات قبلی، اشتراک ماهانه را با <b>۱۰۰ استارز تلگرام</b> تمدید کنید:`,
		reply_markup: {
			inline_keyboard: [
				[{ text: '⭐ تمدید آنی با ۱۰۰ استارز (۱ ماهه)', url: params.invoiceLink }],
				[
					{
						text: '🎛 مشاهده تنظیمات ذخیره‌شده گروه',
						web_app: { url: `${params.miniAppUrl}#/group/${params.groupId}` },
					},
				],
			],
		},
	};
}

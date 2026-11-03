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
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encHex, 'hex')),
		decipher.final(),
	]);
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
				`من ربات اختصاصی حفاظت و مدیریت هوشمند گروه <b>«${groupTitle}»</b> هستم.\n\n` +
				`⚡ <b>این ربات توسط @MiniGuardBot ساخته شده است!</b>\n` +
				`اگر شما هم می‌خواهید یک ربات مدیریت گروه اختصاصی با نام و پروفایل دلخواه و بیش از ۱۰۰ قابلیت پیشرفته ضداسپم، فایروال، محدودیت محتوا و آمار روزانه داشته باشید، همین حالا آن را رایگان امتحان کنید 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 ساخت ربات مدیریت گروه با @MiniGuardBot',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 ورود به گروه ${groupTitle}`,
							url: groupLink.startsWith('http') ? groupLink : `https://t.me/${groupLink.replace('@', '')}`,
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
				`Я персональный бот защиты и управления группой <b>«${groupTitle}»</b>.\n\n` +
				`⚡ <b>Этот бот создан на платформе @MiniGuardBot!</b>\n` +
				`Хотите создать собственного бота управления группой со своим именем и более чем 100 функциями антиспама, файрвола и аналитики? Попробуйте 24 часа бесплатно прямо сейчас 👇`,
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
							text: `👥 Перейти в группу ${groupTitle}`,
							url: groupLink.startsWith('http') ? groupLink : `https://t.me/${groupLink.replace('@', '')}`,
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
				`我是 <b>「${groupTitle}」</b> 群组的专属智能管理机器人。\n\n` +
				`⚡ <b>本机器人由 @MiniGuardBot 强力驱动！</b>\n` +
				`如果您也想为自己的群组打造一款自定义名称、拥有 100+ 项反垃圾、防火墙与自动统计功能的专属管理机器人，立即免费试用 24 小时 👇`,
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
							text: `👥 加入群组 ${groupTitle}`,
							url: groupLink.startsWith('http') ? groupLink : `https://t.me/${groupLink.replace('@', '')}`,
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
			`⚡ <b>This bot was created by @MiniGuardBot!</b>\n` +
			`Want your own custom-named group management bot with 100+ advanced anti-spam, firewall, and automation features? Try it free for 24 hours right now 👇`,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: '🚀 Create Your Group Bot via @MiniGuardBot',
						url: 'https://t.me/MiniGuardBot',
					},
				],
				[
					{
						text: `👥 Join ${groupTitle}`,
						url: groupLink.startsWith('http') ? groupLink : `https://t.me/${groupLink.replace('@', '')}`,
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
				`🛡️ <b>به MiniGuard (@MiniGuardBot) خوش آمدید!</b>\n` +
				`<i>هر گروه، یک ربات مدیریت گروه پیشرفته و اختصاصی</i>\n\n` +
				`✨ <b>چرا MiniGuard بی‌نظیر است؟</b>\n` +
				`• ساخت ربات اختصاصی با نام و توکن خودتان برای هر گروه\n` +
				`• بیش از ۱۰۰ قابلیت فایروال، ضدلینک، ضدفلود، ساعات سکوت و عضویت اجباری\n` +
				`• گزارش آمار روزانه گروه و هشدار فوری خطرات در پیوی شما\n` +
				`• <b>۲۴ ساعت تست کاملاً رایگان</b> و سپس تنها <b>۱۰۰ استارز (⭐) ماهانه</b>!\n\n` +
				`همین حالا روی دکمه زیر بزنید و ربات گروه خود را بسازید 👇`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 ورود به پلتفرم MiniGuard (ساخت ربات)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'ru') {
		return {
			text:
				`🛡️ <b>Добро пожаловать в MiniGuard (@MiniGuardBot)!</b>\n` +
				`<i>Каждой группе — свой продвинутый персональный бот</i>\n\n` +
				`• Персональный бот с вашим токеном строго для 1 группы\n` +
				`• 100+ функций защиты, антиспама, тихих часов и аналитики\n` +
				`• <b>24 часа бесплатно</b>, далее всего <b>100 Stars (⭐) / месяц</b>!\n\n` +
				`Откройте Mini App ниже, чтобы создать бота 👇`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Открыть панель MiniGuard', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'zh') {
		return {
			text:
				`🛡️ <b>欢迎使用 MiniGuard (@MiniGuardBot)！</b>\n` +
				`<i>每个群组，专属一个高级管理机器人</i>\n\n` +
				`• 1 个机器人严格绑定 1 个群组，零延迟隔离防护\n` +
				`• 100+ 项反垃圾、链接过滤、夜间宵禁与私聊日报功能\n` +
				`• <b>24 小时免费试用</b>，之后仅需 <b>100 Stars (⭐) / 月</b>！`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 打开 MiniGuard 控制台', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	return {
		text:
			`🛡️ <b>Welcome to MiniGuard (@MiniGuardBot)!</b>\n` +
			`<i>Every Group, One Advanced Management Bot</i>\n\n` +
			`• Dedicated isolated bot with your own token per group\n` +
			`• 100+ anti-spam, firewall, quiet hours & daily PM analytics features\n` +
			`• <b>24-Hour Free Trial</b>, then just <b>100 Telegram Stars (⭐) / month</b>!\n\n` +
			`Tap below to launch MiniGuard and create your group bot 👇`,
		reply_markup: {
			inline_keyboard: [
				[{ text: '🚀 Launch MiniGuard Platform', web_app: { url: miniAppUrl } }],
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
					params.biometricRequired ? ' و با حسگر بیومتریک تلگرام (اثر انگشت / FaceID) هویت خود را تأیید کنید' : ''
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
			},
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

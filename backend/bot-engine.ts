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

export type BotLang = 'fa' | 'en' | 'ps' | 'ar' | 'ru' | 'tr' | 'es' | 'pt' | 'de' | 'fr' | 'zh';

export const resolveBotLang = (code?: string): BotLang => {
	if (!code) return 'fa';
	const c = code.toLowerCase();
	if (c.startsWith('fa') || c.startsWith('per') || c.startsWith('prs')) return 'fa';
	if (c.startsWith('ps') || c.startsWith('pus')) return 'ps';
	if (c.startsWith('ar')) return 'ar';
	if (c.startsWith('ru') || c.startsWith('uk') || c.startsWith('be')) return 'ru';
	if (c.startsWith('tr')) return 'tr';
	if (c.startsWith('es')) return 'es';
	if (c.startsWith('pt')) return 'pt';
	if (c.startsWith('de')) return 'de';
	if (c.startsWith('fr')) return 'fr';
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

export function escapeHtml(str: string): string {
	if (!str || typeof str !== 'string') return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// ─── 3. Default /start Response for User-Created Child Bots (11 Languages) ──
export function buildChildBotStartMessage(params: {
	lang: BotLang;
	userFirstName: string;
	groupTitle: string;
	groupLink: string;
	miniAppUrl: string;
}) {
	const { lang, groupLink } = params;
	const userFirstName = escapeHtml(params.userFirstName || 'User');
	const groupTitle = escapeHtml(params.groupTitle || 'Telegram Group');

	if (lang === 'ps') {
		return {
			text:
				`🛡️ سلام او ښه راغلاست <b>${userFirstName}</b>!\n` +
				`زه د <b>«${groupTitle}»</b> ګروپ <b>ځانګړی امنیتي او هوښیار مدیریتي بوټ</b> یم.\n\n` +
				`<blockquote>✨ <b>هر ګروپ، خپل ځانګړی مدیریتي بوټ لري!</b>\n` +
				`دا بوټ د <b>@MiniGuardBot</b> په جلا هسته کار کوي؛ له اعلانونو او ځنډ پرته، او تر ۱۲ ملي ثانیو کم چټک باینري فایروال لري.</blockquote>\n\n` +
				`🔥 <b>ایا تاسو هم ټیلیګرام ګروپ لرئ؟</b>\n` +
				`له ۳۰ ثانیو په کم وخت کې په خپل نوم، پروفایل انځور او ځانګړي برانډ سره خپل مدیریتي بوټ جوړ کړئ او له ۱۰۰ څخه زیاتو د سپیم ضد، هوښیارو قلفونو، د چوپتیا ساعتونو او شیشه‌يي پینل له اسانتیاوو څخه خوند واخلئ (۲۴ ساعته وړیا ازمایښت) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 د @MiniGuardBot له لارې خپل ځانګړی بوټ جوړ کړئ',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 «${groupTitle}» ګروپ ته ننوځئ`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

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

	if (lang === 'ar') {
		return {
			text:
				`🛡️ مرحباً بك يا <b>${userFirstName}</b>!\n` +
				`أنا <b>الحارس والمدير الذكي المخصص</b> لمجموعة <b>«${groupTitle}»</b>.\n\n` +
				`<blockquote>✨ <b>لكل مجموعة، بوت إدارة وحماية خاص بها!</b>\n` +
				`يعمل هذا البوت بنواة <b>@MiniGuardBot</b> المعزولة؛ بدون إعلانات مزعجة، وباستجابة فائقة أقل من 12 مللي ثانية.</blockquote>\n\n` +
				`🔥 <b>هل لديك مجموعة تيليجرام؟</b>\n` +
				`أنشئ بوت إدارة خاصاً بمجموعتك يحمل <b>اسمك وشعارك الخاص</b> خلال 30 ثانية مع أكثر من 100 ميزة جدار حماية ومكافحة سبام (24 ساعة تجربة مجانية) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 أنشئ بوت مجموعتك عبر @MiniGuardBot',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 دخول المجموعة «${groupTitle}»`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	if (lang === 'tr') {
		return {
			text:
				`🛡️ Merhaba <b>${userFirstName}</b>!\n` +
				`Ben <b>"${groupTitle}"</b> grubunun özel akıllı güvenlik ve yönetim botuyum.\n\n` +
				`<blockquote>✨ <b>Her Gruba Kendi Özel Yönetim Botu!</b>\n` +
				`Bu bot izole <b>@MiniGuardBot</b> çekirdeği ile çalışır — sıfır reklam, sıfır gecikme.</blockquote>\n\n` +
				`🔥 <b>Sizin de bir Telegram grubunuz var mı?</b>\n` +
				`30 saniyede kendi adınız ve logonuzla 100+ güvenlik duvarı özelliğine sahip özel grup botunuzu oluşturun (24 Saat Ücretsiz Deneme) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 @MiniGuardBot ile Kendi Grup Botunu Oluştur',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 "${groupTitle}" Grubuna Katıl`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	if (lang === 'es') {
		return {
			text:
				`🛡️ ¡Hola <b>${userFirstName}</b>!\n` +
				`Soy el bot dedicado de seguridad y administración del grupo <b>"${groupTitle}"</b>.\n\n` +
				`<blockquote>✨ <b>¡Cada Grupo, Su Propio Bot de Administración!</b>\n` +
				`Impulsado por el motor aislado de <b>@MiniGuardBot</b> — sin anuncios y con respuesta en menos de 12 ms.</blockquote>\n\n` +
				`🔥 <b>¿Tienes un grupo de Telegram?</b>\n` +
				`Crea tu propio bot de administración con tu nombre, logo y más de 100 funciones antispam en 30 segundos (24h de Prueba Gratis) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 Crea el Bot de tu Grupo en @MiniGuardBot',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 Unirse a "${groupTitle}"`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	if (lang === 'pt') {
		return {
			text:
				`🛡️ Olá <b>${userFirstName}</b>!\n` +
				`Sou o bot exclusivo de segurança e gestão do grupo <b>"${groupTitle}"</b>.\n\n` +
				`<blockquote>✨ <b>Cada Grupo, Seu Próprio Bot de Gestão!</b>\n` +
				`Desenvolvido com o núcleo isolado do <b>@MiniGuardBot</b> — zero anúncios e proteção em menos de 12 ms.</blockquote>\n\n` +
				`🔥 <b>Você também tem um grupo no Telegram?</b>\n` +
				`Crie seu próprio bot de gestão com seu nome, foto e 100+ recursos anti-spam em 30 segundos (24h Grátis) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 Criar Bot do Seu Grupo no @MiniGuardBot',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 Entrar em "${groupTitle}"`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	if (lang === 'de') {
		return {
			text:
				`🛡️ Hallo <b>${userFirstName}</b>!\n` +
				`Ich bin der dedizierte Sicherheits- und Verwaltungs-Bot für die Gruppe <b>„${groupTitle}“</b>.\n\n` +
				`<blockquote>✨ <b>Jede Gruppe, Ihr Eigener Verwaltungs-Bot!</b>\n` +
				`Angetrieben vom isolierten <b>@MiniGuardBot</b>-Firewall-Kern — werbefrei und extrem schnell.</blockquote>\n\n` +
				`🔥 <b>Besitzen Sie eine eigene Telegram-Gruppe?</b>\n` +
				`Erstellen Sie in 30 Sekunden Ihren eigenen Gruppen-Bot mit eigenem Namen und 100+ Schutzfunktionen (24h Kostenlos Testen) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 Eigenen Gruppen-Bot erstellen (@MiniGuardBot)',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 Gruppe „${groupTitle}“ beitreten`,
							url: groupLink.startsWith('http')
								? groupLink
								: `https://t.me/${groupLink.replace('@', '')}`,
						},
					],
				],
			},
		};
	}

	if (lang === 'fr') {
		return {
			text:
				`🛡️ Bonjour <b>${userFirstName}</b> !\n` +
				`Je suis le bot dédié de sécurité et de gestion du groupe <b>« ${groupTitle} »</b>.\n\n` +
				`<blockquote>✨ <b>Chaque Groupe, Son Propre Bot de Gestion !</b>\n` +
				`Propulsé par le moteur isolé <b>@MiniGuardBot</b> — zéro publicité et protection instantanée.</blockquote>\n\n` +
				`🔥 <b>Vous avez un groupe Telegram ?</b>\n` +
				`Créez votre propre bot de gestion avec votre nom et 100+ fonctions pare-feu en 30 secondes (24h d’Essai Gratuit) 👇`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 Créer Votre Bot de Groupe via @MiniGuardBot',
							url: 'https://t.me/MiniGuardBot',
						},
					],
					[
						{
							text: `👥 Rejoindre « ${groupTitle} »`,
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

// ─── 4. Master Bot (@MiniGuardBot) /start Message (11 Languages) ────────────
export function buildMasterBotStartMessage(lang: BotLang, miniAppUrl: string) {
	if (lang === 'ps') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | هر ګروپ، خپل ځانګړی مدیریتي بوټ!</b>\n\n` +
				`نور اړتیا نشته چې عامو، ګڼه‌ګوڼې لرونکو، ورو او له اعلانونو ډکو بوټانو ته اړ شئ!\n` +
				`په <b>@MiniGuardBot</b> کې، هر ټیلیګرام ګروپ ستاسو په خپل نوم، پروفایل انځور او خوښې کارن‌نوم سره <b>خپل ځانګړی مدیریتي بوټ</b> لري.\n\n` +
				`<blockquote>⚡ <b>د ۱ پر ۱ جلا جوړښت (۱ بوټ = ۱ ګروپ)</b>\n` +
				`ستاسو بوټ یوازې او یوازې ستاسو د خپل ګروپ لپاره کار کوي؛ یعنې <b>تر ۱۲ ملي ثانیو کم چټک غبرګون</b>، <b>له اجباري اعلانونو پرته</b> او ستاسو د ګروپ غړو ته <b>۱۰۰٪ ځانګړی اعتبار او وقار</b>!</blockquote>\n\n` +
				`💎 <b>ولې مسلکي اډمینان MiniGuard غوره کوي؟</b>\n` +
				`• 🤖 <b>ستاسو شخصي برانډ:</b> بوټ ستاسو د خپل @BotFather ټوکن، نوم او لوګو سره د اډمینانو په لیست کې کار کوي.\n` +
				`• 🛡️ <b>د Bot API 8.x باینري فایروال:</b> د لینکونو، پټو تورو، د اډمین جعلي حسابونو، د چینل ریپلای او د فلډ بریدونو سمدستي مخنیوی.\n` +
				`• 🎛 <b>۱۱ ژبنی مینی‌اپ او شیشه‌يي پینل:</b> له ۱۰۰ څخه زیات د محتوا قلفونه، د چوپتیا ساعتونه، اجباري غړیتوب، بایومیټریک تایید او ۴۰+ د چټ کمانډونه (<code>بن</code>، <code>سکوت</code>، <code>پینل</code>).\n` +
				`• 📊 <b>په شخصي پیغام کې هوښیار راپور:</b> ستاسو شخصي چټ ته د ګروپ ورځنۍ احصایه او بیړني امنیتي خبرداري.\n\n` +
				`🎁 <b>۲۴ ساعته بشپړ وړیا ازمایښت</b> (له ټولو ځانګړنو سره) او وروسته یوازې <b>میاشتنی ۱۰۰ سټارز (⭐)</b>!\n\n` +
				`👇 <b>همدا اوس لاندې تڼۍ کېکاږئ او په ۳۰ ثانیو کې د خپل ګروپ ځانګړی بوټ فعال کړئ:</b>`,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🚀 ځانګړی بوټ جوړ کړئ او MiniGuard ته ننوځئ',
							web_app: { url: miniAppUrl },
						},
					],
				],
			},
		};
	}

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
				`• 🎛 <b>مینی‌اپ و پنل شیشه‌ای ۱۰ زبانه:</b> بیش از ۱۰۰ قفل محتوا، ساعات سکوت، عضویت اجباری، تایید بیومتریک و ۴۰+ دستور چت (<code>بن</code>، <code>سکوت</code>، <code>پنل</code>).\n` +
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
				`• 🎛 <b>Mini App на 10 языках:</b> 100+ блокировок контента, тихие часы, обязательная подписка и команды в чате.\n` +
				`• 🎁 <b>24 часа бесплатно</b>, далее всего <b>100 Stars (⭐) / месяц</b>!\n\n` +
				`👇 <b>Нажмите кнопку ниже и запустите своего бота за 30 секунд:</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Создать своего бота (MiniGuard App)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'ar') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | لكل مجموعة، بوت إدارة وحماية خاص بها!</b>\n\n` +
				`وداعاً للبوتات العامة البطيئة والمليئة بالإعلانات المزعجة!\n` +
				`في <b>@MiniGuardBot</b>، تحصل كل مجموعة تيليجرام على <b>بوت إدارة مخصص بالكامل</b> باسمك وصورتك ومعرفك الخاص.\n\n` +
				`<blockquote>⚡ <b>معمارية معزولة (1 بوت = 1 مجموعة)</b>\n` +
				`استجابة فورية أقل من 12 مللي ثانية، بدون أي إعلانات إجبارية، وهوية احترافية 100% لمجموعتك!</blockquote>\n\n` +
				`💎 <b>لماذا يختار المحترفون MiniGuard؟</b>\n` +
				`• 🤖 <b>علامتك التجارية الخاصة:</b> يعمل البوت بتوكن @BotFather واسم وشعار مجموعتك.\n` +
				`• 🛡️ <b>جدار حماية Bot API 8.x:</b> حظر فوري للروابط، الأحرف المخفية، انتحال شخصية المشرفين، وهجمات التفليد.\n` +
				`• 🎛 <b>تطبيق مصغر بـ 10 لغات عالمية:</b> أكثر من 100 قفل محتوى، ساعات هدوء، اشتراك إجباري، وإحصائيات حية.\n` +
				`• 🎁 <b>تجربة مجانية لمدة 24 ساعة</b>، ثم <b>100 نجمة تيليجرام (⭐) شهرياً</b> فقط!\n\n` +
				`👇 <b>اضغط على الزر أدناه وأنشئ بوت مجموعتك في 30 ثانية:</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 إنشاء بوت مخصص (MiniGuard App)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'tr') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | Her Gruba Kendi Özel Yönetim Botu!</b>\n\n` +
				`Reklam dolu ve yavaş genel botları unutun!\n` +
				`<b>@MiniGuardBot</b> ile her Telegram grubu kendi adı, logosu ve kullanıcı adıyla <b>tamamen izole özel yönetim botuna</b> sahip olur.\n\n` +
				`<blockquote>⚡ <b>1 Bot = 1 Grup İzole Mimari</b>\n` +
				`12 ms altı güvenlik duvarı tepkisi, sıfır zorunlu reklam ve topluluğunuz için %100 prestij!</blockquote>\n\n` +
				`• 🤖 <b>Kendi Markanız:</b> Kendi @BotFather tokenınız, adınız ve profil fotoğrafınızla çalışır.\n` +
				`• 🛡️ <b>100+ Güvenlik Modülü:</b> Anti-link, anti-flood, gece modu, zorunlu kanal üyeliği ve canlı istatistikler.\n` +
				`• 🎁 <b>24 Saat Ücretsiz Deneme</b>, ardından ayda sadece <b>100 Stars (⭐)</b>!\n\n` +
				`👇 <b>Aşağıdaki butona dokunun ve 30 saniyede grup botunuzu başlatın:</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Özel Grup Botunu Oluştur (MiniGuard)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'es') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | ¡Cada Grupo, Su Propio Bot de Administración!</b>\n\n` +
				`¡Olvídate de los bots públicos lentos y llenos de anuncios!\n` +
				`Con <b>@MiniGuardBot</b>, tu grupo de Telegram obtiene <b>su propio bot de gestión dedicado</b> con tu propio nombre, foto y @username.\n\n` +
				`<blockquote>⚡ <b>Arquitectura Aislada 1 Bot = 1 Grupo</b>\n` +
				`Respuesta de firewall en menos de 12 ms, cero anuncios forzados y 100% prestigio para tu comunidad.</blockquote>\n\n` +
				`• 🤖 <b>Tu Propia Marca:</b> Funciona con tu propio token de @BotFather.\n` +
				`• 🛡️ <b>Más de 100 Funciones:</b> Antienlaces, antiflood, horario nocturno, unión obligatoria y analíticas reales.\n` +
				`• 🎁 <b>24 Horas de Prueba Gratis</b>, luego solo <b>100 Stars (⭐) / mes</b>.\n\n` +
				`👇 <b>Pulsa abajo para crear el bot de tu grupo en 30 segundos:</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Crear Bot de Grupo (MiniGuard App)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'pt') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | Cada Grupo, Seu Próprio Bot de Gestão Exclusivo!</b>\n\n` +
				`Pare de depender de bots públicos lentos e cheios de anúncios!\n` +
				`Com o <b>@MiniGuardBot</b>, seu grupo do Telegram ganha <b>seu próprio bot de administração dedicado</b> com seu nome, avatar e @username.\n\n` +
				`<blockquote>⚡ <b>Arquitetura Isolada 1 Bot = 1 Grupo</b>\n` +
				`Firewall binário em menos de 12 ms, zero anúncios forçados e 100% de exclusividade.</blockquote>\n\n` +
				`• 🤖 <b>Sua Própria Marca:</b> Usa seu próprio token do @BotFather.\n` +
				`• 🛡️ <b>100+ Módulos de Proteção:</b> Anti-link, anti-flood, modo noturno, inscrição obrigatória e estatísticas em tempo real.\n` +
				`• 🎁 <b>24 Horas de Teste Grátis</b>, depois apenas <b>100 Stars (⭐) / mês</b>!\n\n` +
				`👇 <b>Toque abaixo para criar o bot do seu grupo em 30 segundos:</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Criar Bot do Grupo (MiniGuard App)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'de') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | Jede Gruppe, Ihr Eigener Dedizierter Verwaltungs-Bot!</b>\n\n` +
				`Schluss mit langsamen, werbeüberladenen öffentlichen Bots!\n` +
				`Mit <b>@MiniGuardBot</b> erhält Ihre Telegram-Gruppe <b>ihren eigenen isolierten Verwaltungs-Bot</b> mit Ihrem eigenen Namen, Logo und Benutzernamen.\n\n` +
				`<blockquote>⚡ <b>1 Bot = 1 Gruppe Isolierte Architektur</b>\n` +
				`Unter 12 ms Firewall-Reaktionszeit, null Zwangswerbung und 100 % Markenprestige.</blockquote>\n\n` +
				`• 🤖 <b>Ihre Eigene Marke:</b> Läuft unter Ihrem eigenen @BotFather-Token.\n` +
				`• 🛡️ <b>100+ Sicherheitsmodule:</b> Anti-Link, Anti-Flood, Nachtruhe, Pflichtkanal und Echtzeit-Statistiken.\n` +
				`• 🎁 <b>24 Stunden Kostenlos Testen</b>, danach nur <b>100 Stars (⭐) / Monat</b>!\n\n` +
				`👇 <b>Tippen Sie unten, um Ihren Gruppen-Bot in 30 Sekunden zu starten:</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Gruppen-Bot Erstellen (MiniGuard App)', web_app: { url: miniAppUrl } }],
				],
			},
		};
	}

	if (lang === 'fr') {
		return {
			text:
				`🛡️ <b>MiniGuard™ | Chaque Groupe, Son Propre Bot de Gestion Dédié !</b>\n\n` +
				`Oubliez les bots publics lents et remplis de publicités !\n` +
				`Avec <b>@MiniGuardBot</b>, votre groupe Telegram dispose de <b>son propre bot d’administration isolé</b> avec votre nom, avatar et @username.\n\n` +
				`<blockquote>⚡ <b>Architecture Isolée 1 Bot = 1 Groupe</b>\n` +
				`Pare-feu binaire en moins de 12 ms, zéro publicité forcée et 100 % de prestige pour votre communauté.</blockquote>\n\n` +
				`• 🤖 <b>Votre Propre Marque :</b> Fonctionne avec votre propre token @BotFather.\n` +
				`• 🛡️ <b>100+ Modules de Protection :</b> Anti-lien, anti-flood, couvre-feu nocturne, adhésion obligatoire et statistiques en direct.\n` +
				`• 🎁 <b>24 Heures d’Essai Gratuit</b>, puis seulement <b>100 Stars (⭐) / mois</b> !\n\n` +
				`👇 <b>Appuyez ci-dessous pour lancer le bot de votre groupe en 30 secondes :</b>`,
			reply_markup: {
				inline_keyboard: [
					[{ text: '🚀 Créer Mon Bot de Groupe (MiniGuard)', web_app: { url: miniAppUrl } }],
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
			`• 🎛 <b>10-Language Mini App & In-Chat Panel:</b> 100+ content locks, quiet hours, mandatory channel join, biometric verification & 40+ chat commands.\n` +
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

	const i18nData: Record<
		BotLang,
		{
			handshake: string;
			permsOk: string;
			permsMissing: string;
			trialNotice: string;
			panelReady: string;
			btnPanel: string;
			btnPowered: string;
		}
	> = {
		ps: {
			handshake: `🛡️ <b>خوندي نښلون بشپړ شو!</b>\nځانګړی بوټ <b>@${botUsername}</b> اوس له <b>«${groupTitle}»</b> ګروپ سره ونښلول شو او د <b>@MiniGuardBot</b> هستې تر ساتنې لاندې دی.`,
			permsOk: `✅ <b>د اډمین واکونو باینري ارزونه: بشپړه</b>\nد پیغام پاکولو، غړو محدودولو، پیغام پین کولو او بلنې لینک جوړولو واکونه تایید شول. د سپیم او لینک ضد فایروال په بشپړ ځواک فعال دی.`,
			permsMissing: `⚠️ <b>د اډمین واکونو لوړولو ته اړتیا ده:</b>\nمهرباني وکړئ بوټ ته د <code>Delete Messages</code> او <code>Ban Users</code> واکونه ورکړئ ترڅو فایروال په بشپړ ځواک کار وکړي.`,
			trialNotice: `🎁 <b>د ۲۴ ساعتونو وړیا ازمایښتي ګډون فعال شو!</b>\nد ګروپ مدیریت ټول ۱۰۰+ پرمختللي ماډلونه د ۲۴ ساعتونو لپاره په بشپړه توګه وړیا خلاص شول. وروسته یوازې په <b>میاشتني ۱۰۰ سټارز (⭐)</b> حفاظت فعال ساتلی شئ.`,
			panelReady: `⚙️ <b>د ګروپ هوښیار کنټرول پینل چمتو دی</b>\nدرانه اډمینه، د محتوا محدودیتونو، چوپتیا ساعتونو، ښه راغلاست پیغام او ژوندۍ احصایې د تنظیم لپاره لاندې شیشه‌يي تڼۍ کېکاږئ:`,
			btnPanel: '🎛 د دې ګروپ د تنظیماتو پینل خلاص کړئ',
			btnPowered: '⚡ د @MiniGuardBot لخوا چمتو شوی',
		},
		fa: {
			handshake: `🛡️ <b>اتصال امن برقرار شد!</b>\nربات اختصاصی <b>@${botUsername}</b> با موفقیت به گروه <b>«${groupTitle}»</b> متصل شد و تحت حفاظت هسته <b>@MiniGuardBot</b> قرار گرفت.`,
			permsOk: `✅ <b>بررسی باینری دسترسی‌های ادمین: کامل</b>\nدسترسی‌های حذف پیام، محدودسازی اعضا، پین پیام و ساخت لینک دعوت تأیید شد. فایروال ضداسپم و ضدلینک در بالاترین سطح فعال است.`,
			permsMissing: `⚠️ <b>نیاز به ارتقای دسترسی ادمین:</b>\nلطفاً دسترسی‌های <code>Delete Messages</code> و <code>Ban Users</code> را به ربات بدهید تا فایروال با حداکثر قدرت عمل کند.`,
			trialNotice: `🎁 <b>اشتراک آزمایشی ۲۴ ساعته رایگان فعال شد!</b>\nتمامی ۱۰۰+ قابلیت پیشرفته مدیریت گروه به مدت ۲۴ ساعت کاملاً رایگان برای این گروه فعال گردید. پس از پایان دوره، تنها با <b>۱۰۰ استارز (⭐) ماهانه</b> می‌توانید ربات را فعال نگه دارید.`,
			panelReady: `⚙️ <b>پنل مدیریت هوشمند گروه آماده است</b>\nادمین گرامی، برای تنظیم محدودیت‌های محتوا، ساعات سکوت، خوش‌آمدگویی و مشاهده آمار زنده، روی دکمه شیشه‌ای زیر کلیک کنید:`,
			btnPanel: '🎛 باز کردن پنل تنظیمات این گروه',
			btnPowered: '⚡ ساخته شده با @MiniGuardBot',
		},
		en: {
			handshake: `🛡️ <b>Handshake Complete!</b>\nDedicated bot <b>@${botUsername}</b> is now protecting <b>"${groupTitle}"</b> via <b>@MiniGuardBot</b>.`,
			permsOk: `✅ <b>Binary Admin Permission Audit: Verified</b>\nDelete, Restrict, Pin, and Invite permissions are active. Real-time firewall is online.`,
			permsMissing: `⚠️ <b>Admin Permissions Needed:</b>\nPlease grant <code>Delete Messages</code> and <code>Restrict Members</code> permissions to enable active enforcement.`,
			trialNotice: `🎁 <b>24-Hour Free Trial Activated!</b>\nAll 100+ protection modules are unlocked free for 24 hours. Keep protection active anytime for just <b>100 Stars (⭐) / month</b>.`,
			panelReady: `⚙️ <b>Group Control Panel Ready</b>\nGroup Admin: Tap the button below to configure firewall rules, quiet hours, and live analytics:`,
			btnPanel: '🎛 Open Group Control Panel',
			btnPowered: '⚡ Powered by @MiniGuardBot',
		},
		ar: {
			handshake: `🛡️ <b>تم الاتصال الآمن بنجاح!</b>\nالبوت المخصص <b>@${botUsername}</b> متصل الآن بمجموعة <b>«${groupTitle}»</b> ويعمل بنواة حماية <b>@MiniGuardBot</b>.`,
			permsOk: `✅ <b>تدقيق صلاحيات المشرف: مكتمل</b>\nتم تأكيد صلاحيات حذف الرسائل، تقييد الأعضاء، وتثبيت الرسائل. جدار الحماية نشط بأعلى كفاءة.`,
			permsMissing: `⚠️ <b>تنبيه صلاحيات المشرف:</b>\nيرجى منح البوت صلاحيات <code>Delete Messages</code> و <code>Ban Users</code> لتمكين الحماية التامة.`,
			trialNotice: `🎁 <b>تم تفعيل التجربة المجانية لمدة 24 ساعة!</b>\nتم فتح أكثر من 100 ميزة حماية متقدمة مجاناً لمدة 24 ساعة. يمكنك التجديد بـ <b>100 نجمة (⭐) شهرياً</b> فقط.`,
			panelReady: `⚙️ <b>لوحة تحكم المجموعة جاهزة</b>\nعزيزي المشرف، اضغط على الزر الشفاف أدناه لضبط قيود المحتوى وساعات الهدوء:`,
			btnPanel: '🎛 فتح لوحة إعدادات المجموعة',
			btnPowered: '⚡ مشغل بواسطة @MiniGuardBot',
		},
		ru: {
			handshake: `🛡️ <b>Безопасное подключение установлено!</b>\nПерсональный бот <b>@${botUsername}</b> успешно подключен к группе <b>«${groupTitle}»</b> под защитой <b>@MiniGuardBot</b>.`,
			permsOk: `✅ <b>Проверка прав администратора: Успешно</b>\nПрава на удаление сообщений, блокировку участников и закрепление подтверждены. Файрвол активен.`,
			permsMissing: `⚠️ <b>Требуются права администратора:</b>\nПожалуйста, предоставьте боту права <code>Delete Messages</code> и <code>Ban Users</code>.`,
			trialNotice: `🎁 <b>24-часовой бесплатный период активирован!</b>\nВсе 100+ модулей защиты активированы бесплатно на 24 часа. Продление — всего <b>100 Stars (⭐) / месяц</b>.`,
			panelReady: `⚙️ <b>Панель управления группой готова</b>\nАдминистратор, нажмите кнопку ниже для настройки правил, тихих часов и аналитики:`,
			btnPanel: '🎛 Открыть панель настроек группы',
			btnPowered: '⚡ Работает на @MiniGuardBot',
		},
		tr: {
			handshake: `🛡️ <b>Güvenli Bağlantı Kuruldu!</b>\nÖzel bot <b>@${botUsername}</b>, <b>@MiniGuardBot</b> koruması altında <b>"${groupTitle}"</b> grubuna başarıyla bağlandı.`,
			permsOk: `✅ <b>Yönetici İzinleri Doğrulandı: Tam</b>\nMesaj silme, üye kısıtlama ve sabitleme izinleri onaylandı. Gerçek zamanlı güvenlik duvarı aktif.`,
			permsMissing: `⚠️ <b>Yönetici İzinleri Gerekli:</b>\nLütfen tam koruma için bota <code>Delete Messages</code> ve <code>Ban Users</code> izinlerini verin.`,
			trialNotice: `🎁 <b>24 Saatlik Ücretsiz Deneme Başladı!</b>\nTüm 100+ gelişmiş koruma modülü 24 saat boyunca ücretsiz aktif. Ayda sadece <b>100 Stars (⭐)</b> ile devam edin.`,
			panelReady: `⚙️ <b>Grup Kontrol Paneli Hazır</b>\nSayın Yönetici, kuralları, sessiz saatleri ve analizleri ayarlamak için aşağıdaki butona dokunun:`,
			btnPanel: '🎛 Grup Ayar Panelini Aç',
			btnPowered: '⚡ @MiniGuardBot ile Güçlendirildi',
		},
		es: {
			handshake: `🛡️ <b>¡Conexión Segura Establecida!</b>\nEl bot dedicado <b>@${botUsername}</b> ahora está protegiendo <b>"${groupTitle}"</b> a través de <b>@MiniGuardBot</b>.`,
			permsOk: `✅ <b>Auditoría de Permisos de Administrador: Verificada</b>\nPermisos de eliminar mensajes, restringir miembros y fijar confirmados. Firewall activo.`,
			permsMissing: `⚠️ <b>Permisos de Administrador Necesarios:</b>\nOtorga al bot los permisos <code>Delete Messages</code> y <code>Ban Users</code> para una protección completa.`,
			trialNotice: `🎁 <b>¡Prueba Gratuita de 24 Horas Activada!</b>\nMás de 100 módulos de protección desbloqueados gratis por 24 horas. Mantén la protección por solo <b>100 Stars (⭐) / mes</b>.`,
			panelReady: `⚙️ <b>Panel de Control Listo</b>\nAdministrador: Pulsa abajo para configurar restricciones, horas de silencio y ver estadísticas:`,
			btnPanel: '🎛 Abrir Panel de Control del Grupo',
			btnPowered: '⚡ Impulsado por @MiniGuardBot',
		},
		pt: {
			handshake: `🛡️ <b>Conexão Segura Estabelecida!</b>\nO bot dedicado <b>@${botUsername}</b> agora está protegendo <b>"${groupTitle}"</b> via <b>@MiniGuardBot</b>.`,
			permsOk: `✅ <b>Permissões de Administrador: Verificadas</b>\nPermissões de deletar mensagens, restringir membros e fixar confirmadas. Firewall ativo.`,
			permsMissing: `⚠️ <b>Permissões de Administrador Necessárias:</b>\nConceda ao bot as permissões <code>Delete Messages</code> e <code>Ban Users</code> para proteção total.`,
			trialNotice: `🎁 <b>Teste Grátis de 24 Horas Ativado!</b>\nMais de 100 módulos de proteção desbloqueados por 24 horas. Mantenha ativo por apenas <b>100 Stars (⭐) / mês</b>.`,
			panelReady: `⚙️ <b>Painel de Controle Pronto</b>\nAdministrador: Toque no botão abaixo para ajustar filtros, horários de silêncio e métricas:`,
			btnPanel: '🎛 Abrir Painel de Controle do Grupo',
			btnPowered: '⚡ Desenvolvido por @MiniGuardBot',
		},
		de: {
			handshake: `🛡️ <b>Sichere Verbindung hergestellt!</b>\nDer dedizierte Bot <b>@${botUsername}</b> schützt jetzt <b>„${groupTitle}“</b> über <b>@MiniGuardBot</b>.`,
			permsOk: `✅ <b>Admin-Berechtigungsprüfung: Erfolgreich</b>\nLöschen, Einschränken und Anheften bestätigt. Echtzeit-Firewall ist online.`,
			permsMissing: `⚠️ <b>Admin-Rechte erforderlich:</b>\nBitte gewähren Sie dem Bot <code>Delete Messages</code> und <code>Ban Users</code> Rechte.`,
			trialNotice: `🎁 <b>24-Stunden-Kostenlos-Test aktiviert!</b>\nAlle 100+ Schutzmodule 24h gratis freigeschaltet. Verlängerung für nur <b>100 Stars (⭐) / Monat</b>.`,
			panelReady: `⚙️ <b>Gruppen-Bedienfeld bereit</b>\nAdmin: Tippen Sie unten, um Firewall-Regeln, Ruhezeiten und Live-Statistiken zu konfigurieren:`,
			btnPanel: '🎛 Gruppen-Bedienfeld öffnen',
			btnPowered: '⚡ Angetrieben von @MiniGuardBot',
		},
		fr: {
			handshake: `🛡️ <b>Connexion Sécurisée Établie !</b>\nLe bot dédié <b>@${botUsername}</b> protège désormais <b>« ${groupTitle} »</b> via <b>@MiniGuardBot</b>.`,
			permsOk: `✅ <b>Audit des Permissions Administrateur : Vérifié</b>\nPermissions de suppression, restriction et épinglage confirmées. Pare-feu actif.`,
			permsMissing: `⚠️ <b>Permissions Administrateur Requises :</b>\nVeuillez accorder <code>Delete Messages</code> et <code>Ban Users</code> au bot.`,
			trialNotice: `🎁 <b>Essai Gratuit de 24 Heures Activé !</b>\nPlus de 100 modules de protection débloqués pendant 24h. Maintenez l'activité pour <b>100 Stars (⭐) / mois</b>.`,
			panelReady: `⚙️ <b>Panneau de Gestion Prêt</b>\nAdmin : Appuyez ci-dessous pour configurer les filtres, heures de silence et statistiques :`,
			btnPanel: '🎛 Ouvrir le panneau du groupe',
			btnPowered: '⚡ Propulsé par @MiniGuardBot',
		},
		zh: {
			handshake: `🛡️ <b>安全握手成功！</b>\n专属机器人 <b>@${botUsername}</b> 现已接入 <b>「${groupTitle}」</b>，并受 <b>@MiniGuardBot</b> 内核全面保护。`,
			permsOk: `✅ <b>管理员权限二进制审计：已通过</b>\n删除消息、限制成员、置顶消息权限已确认。实时安全防火墙已上线。`,
			permsMissing: `⚠️ <b>需要提升管理员权限：</b>\n请为机器人授予 <code>Delete Messages</code> 和 <code>Ban Users</code> 权限以开启完整防护。`,
			trialNotice: `🎁 <b>24 小时免费试用已开启！</b>\n全部 100+ 项高级管理与防御模块免费解锁 24 小时。到期仅需 <b>100 Stars (⭐) / 月</b> 即可持续运行。`,
			panelReady: `⚙️ <b>智能群管控制面板已就绪</b>\n群组管理员：点击下方按钮即可配置内容过滤、夜间静音与实时分析：`,
			btnPanel: '🎛 打开此群组的管理面板',
			btnPowered: '⚡ 由 @MiniGuardBot 提供技术支持',
		},
	};

	const cur = i18nData[lang] || i18nData.en;

	return [
		{ text: cur.handshake },
		{ text: hasFullAdminPerms ? cur.permsOk : cur.permsMissing },
		{ text: cur.trialNotice },
		{
			text: cur.panelReady,
			reply_markup: {
				inline_keyboard: [
					[{ text: cur.btnPanel, url: panelDeepLink }],
					[{ text: cur.btnPowered, url: 'https://t.me/MiniGuardBot' }],
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
	const {
		lang,
		groupTitle,
		dateStr,
		totalMessages,
		activeUsers,
		newMembers,
		spamBlocked,
		warningsIssued,
	} = params;

	const templates: Record<BotLang, string> = {
		ps:
			`📊 <b>د ګروپ ورځنی تحلیلي راپور — @MiniGuardBot</b>\n` +
			`🏷 ګروپ: <b>${groupTitle}</b>\n` +
			`📅 نېټه: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 د نن ټول پیغامونه: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 فعال کارنان: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ نوي غړي: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 بند شوي سپیم او لینکونه: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ ورکړل شوي خبرداري: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ د ګروپ فایروال وضعیت: <b>فعال او خوندي</b>`,
		fa:
			`📊 <b>گزارش آمار روزانه گروه — @MiniGuardBot</b>\n` +
			`🏷 گروه: <b>${groupTitle}</b>\n` +
			`📅 تاریخ: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 کل پیام‌های امروز: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 کاربران فعال: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ اعضای جدید: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 اسپم و لینک مسدودشده: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ اخطارهای صادرشده: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ وضعیت فایروال گروه: <b>فعال و ایمن</b>`,
		en:
			`📊 <b>Daily Group Analytics Report — @MiniGuardBot</b>\n` +
			`🏷 Group: <b>${groupTitle}</b>\n` +
			`📅 Date: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 Today's Total Messages: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 Active Users: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ New Members: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 Spam & Links Blocked: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ Warnings Issued: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ Group Firewall Status: <b>Active & Secure</b>`,
		ar:
			`📊 <b>تقرير إحصائيات المجموعة اليومي — @MiniGuardBot</b>\n` +
			`🏷 المجموعة: <b>${groupTitle}</b>\n` +
			`📅 التاريخ: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 إجمالي رسائل اليوم: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 الأعضاء النشطون: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ الأعضاء الجدد: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 السبام والروابط المحظورة: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ التحذيرات الصادرة: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ حالة جدار الحماية: <b>نشط وآمن</b>`,
		ru:
			`📊 <b>Ежедневный аналитический отчет — @MiniGuardBot</b>\n` +
			`🏷 Группа: <b>${groupTitle}</b>\n` +
			`📅 Дата: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 Всего сообщений сегодня: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 Активных пользователей: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ Новых участников: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 Заблокировано спама и ссылок: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ Выдано предупреждений: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ Статус файрвола: <b>Активен и защищен</b>`,
		tr:
			`📊 <b>Günlük Grup Analiz Raporu — @MiniGuardBot</b>\n` +
			`🏷 Grup: <b>${groupTitle}</b>\n` +
			`📅 Tarih: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 Bugünkü Toplam Mesaj: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 Aktif Kullanıcı: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ Yeni Katılan Üye: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 Engellenen Spam/Link: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ Verilen Uyarı: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ Güvenlik Duvarı Durumu: <b>Aktif ve Güvenli</b>`,
		es:
			`📊 <b>Informe Diario de Analíticas — @MiniGuardBot</b>\n` +
			`🏷 Grupo: <b>${groupTitle}</b>\n` +
			`📅 Fecha: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 Mensajes totales hoy: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 Usuarios activos: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ Nuevos miembros: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 Spam y enlaces bloqueados: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ Advertencias emitidas: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ Estado del Firewall: <b>Activo y Seguro</b>`,
		pt:
			`📊 <b>Relatório Diário de Análise — @MiniGuardBot</b>\n` +
			`🏷 Grupo: <b>${groupTitle}</b>\n` +
			`📅 Data: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 Mensagens hoje: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 Usuários ativos: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ Novos membros: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 Spam e links bloqueados: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ Advertências emitidas: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ Status do Firewall: <b>Ativo e Seguro</b>`,
		de:
			`📊 <b>Täglicher Gruppen-Analysebericht — @MiniGuardBot</b>\n` +
			`🏷 Gruppe: <b>${groupTitle}</b>\n` +
			`📅 Datum: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 Nachrichten heute: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 Aktive Benutzer: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ Neue Mitglieder: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 Blockierter Spam & Links: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ Ausgesprochene Verwarnungen: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ Firewall-Status: <b>Aktiv und Sicher</b>`,
		fr:
			`📊 <b>Rapport Statistique Quotidien — @MiniGuardBot</b>\n` +
			`🏷 Groupe : <b>${groupTitle}</b>\n` +
			`📅 Date : <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 Messages aujourd'hui : <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 Utilisateurs actifs : <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ Nouveaux membres : <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 Spam et liens bloqués : <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ Avertissements émis : <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ Statut du Pare-feu : <b>Actif et Sécurisé</b>`,
		zh:
			`📊 <b>群组每日分析报告 — @MiniGuardBot</b>\n` +
			`🏷 群组: <b>${groupTitle}</b>\n` +
			`📅 日期: <code>${dateStr}</code>\n` +
			`────────────────────\n` +
			`💬 今日消息总量: <b>${totalMessages.toLocaleString()}</b>\n` +
			`👥 活跃用户数: <b>${activeUsers.toLocaleString()}</b>\n` +
			`➕ 新增成员: <b>+${newMembers.toLocaleString()}</b>\n` +
			`🚫 拦截垃圾信息与链接: <b>${spamBlocked.toLocaleString()}</b>\n` +
			`⚠️ 发出违规警告: <b>${warningsIssued.toLocaleString()}</b>\n` +
			`────────────────────\n` +
			`✅ 群组防火墙状态: <b>运行中且安全</b>`,
	};

	return templates[lang] || templates.en;
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
	const { lang, userFirstName, groupTitle, groupId, biometricRequired, miniAppUrl } = params;
	const verifyUrl = `${miniAppUrl}#/group/${groupId}?verify_join=1&biometric=${biometricRequired ? '1' : '0'}`;

	const dict: Record<BotLang, { text: string; btnBiometric: string; btnStandard: string }> = {
		ps: {
			text:
				`🛡️ <b>«${groupTitle}» ګروپ ته د ننوتلو هویت تایید</b>\n\n` +
				`سلام <b>${userFirstName}</b>!\n` +
				`د سپیم بوټانو د مخنیوي لپاره، مهرباني وکړئ لاندې تڼۍ کېکاږئ${
					biometricRequired
						? ' او د ټیلیګرام د بایومیټریک حسګر له لارې خپل هویت تایید کړئ'
						: ' او خپل هویت تایید کړئ'
				} ترڅو ستاسو د غړیتوب غوښتنه سمدستي تایید شي:`,
			btnBiometric: '🔐 بایومیټریک تایید او ګروپ ته ننوتل',
			btnStandard: '✅ هویت تایید او ګروپ ته ننوتل',
		},
		fa: {
			text:
				`🛡️ <b>احراز هویت ورود به گروه «${groupTitle}»</b>\n\n` +
				`سلام <b>${userFirstName}</b> عزیز!\n` +
				`برای جلوگیری از ورود ربات‌های اسپم، لطفاً روی دکمه زیر بزنید${
					biometricRequired ? ' و با حسگر بیومتریک تلگرام هویت خود را تأیید کنید' : ''
				} تا درخواست عضویت شما فوراً تأیید شود:`,
			btnBiometric: '🔐 تایید بیومتریک و ورود به گروه',
			btnStandard: '✅ تایید هویت و ورود به گروه',
		},
		en: {
			text:
				`🛡️ <b>Join Verification for "${groupTitle}"</b>\n\n` +
				`Hello <b>${userFirstName}</b>!\n` +
				`To prevent spam bots, please tap below${
					biometricRequired ? ' to verify using Telegram Biometrics' : ' to verify you are human'
				} and approve your join request:`,
			btnBiometric: '🔐 Verify with Biometrics & Join',
			btnStandard: '✅ Verify & Join Group',
		},
		ar: {
			text:
				`🛡️ <b>التحقق من الانضمام لمجموعة «${groupTitle}»</b>\n\n` +
				`مرحباً بك يا <b>${userFirstName}</b>!\n` +
				`لمنع بوتات السبام، يرجى الضغط أدناه${
					biometricRequired ? ' وتأكيد هويتك بالبصمة البيومترية' : ' للتحقق البشري'
				} والموافقة الفورية على انضمامك:`,
			btnBiometric: '🔐 التحقق بالبصمة والانضمام',
			btnStandard: '✅ تأكيد الهوية والانضمام',
		},
		ru: {
			text:
				`🛡️ <b>Верификация для входа в «${groupTitle}»</b>\n\n` +
				`Привет, <b>${userFirstName}</b>!\n` +
				`Для защиты от спам-ботов подтвердите личность${
					biometricRequired ? ' с помощью биометрии Telegram' : ''
				}, чтобы ваша заявка была мгновенно одобрена:`,
			btnBiometric: '🔐 Подтвердить биометрией и войти',
			btnStandard: '✅ Подтвердить личность и войти',
		},
		tr: {
			text:
				`🛡️ <b>"${groupTitle}" Grubuna Katılım Doğrulaması</b>\n\n` +
				`Merhaba <b>${userFirstName}</b>!\n` +
				`Spam botlarını önlemek için lütfen aşağıdaki butona dokunun${
					biometricRequired ? ' ve biyometrik sensörle kimliğinizi doğrulayın' : ''
				}:`,
			btnBiometric: '🔐 Biyometrik ile Doğrula ve Katıl',
			btnStandard: '✅ Doğrula ve Gruba Katıl',
		},
		es: {
			text:
				`🛡️ <b>Verificación de Ingreso a "${groupTitle}"</b>\n\n` +
				`¡Hola <b>${userFirstName}</b>!\n` +
				`Para prevenir bots de spam, pulsa el botón de abajo${
					biometricRequired ? ' y verifica con biometría de Telegram' : ''
				} para aprobar tu solicitud:`,
			btnBiometric: '🔐 Verificar con Biometría y Unirse',
			btnStandard: '✅ Verificar y Unirse al Grupo',
		},
		pt: {
			text:
				`🛡️ <b>Verificação de Entrada em "${groupTitle}"</b>\n\n` +
				`Olá <b>${userFirstName}</b>!\n` +
				`Para evitar bots de spam, toque abaixo${
					biometricRequired ? ' e valide com biometria do Telegram' : ''
				} para aprovar sua entrada:`,
			btnBiometric: '🔐 Verificar com Biometria e Entrar',
			btnStandard: '✅ Verificar e Entrar no Grupo',
		},
		de: {
			text:
				`🛡️ <b>Beitrittsüberprüfung für „${groupTitle}“</b>\n\n` +
				`Hallo <b>${userFirstName}</b>!\n` +
				`Um Spam-Bots zu verhindern, tippen Sie unten${
					biometricRequired ? ' und bestätigen Sie per Telegram-Biometrie' : ''
				}:`,
			btnBiometric: '🔐 Mit Biometrie verifizieren & beitreten',
			btnStandard: '✅ Verifizieren & Beitreten',
		},
		fr: {
			text:
				`🛡️ <b>Vérification d'accès à « ${groupTitle} »</b>\n\n` +
				`Bonjour <b>${userFirstName}</b> !\n` +
				`Pour bloquer les bots indésirables, veuillez cliquer ci-dessous${
					biometricRequired ? ' et valider par biométrie' : ''
				} :`,
			btnBiometric: '🔐 Vérifier par biométrie & rejoindre',
			btnStandard: '✅ Vérifier et rejoindre le groupe',
		},
		zh: {
			text:
				`🛡️ <b>加入群组「${groupTitle}」人机验证</b>\n\n` +
				`您好 <b>${userFirstName}</b>！\n` +
				`为防止垃圾广告机器人入侵，请点击下方按钮${
					biometricRequired ? ' 并使用 Telegram 生物识别验证身份' : ' 完成验证'
				}以立即通过进群申请:`,
			btnBiometric: '🔐 生物识别验证并加入群组',
			btnStandard: '✅ 人机验证并加入群组',
		},
	};

	const cur = dict[lang] || dict.en;

	return {
		text: cur.text,
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: biometricRequired ? cur.btnBiometric : cur.btnStandard,
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
	const { lang, groupId, groupTitle, emergencyLock, floodLimit, quietHoursActive, miniAppUrl } =
		params;
	const panelUrl = `${miniAppUrl}#/group/${groupId}`;

	const dict: Record<
		BotLang,
		{
			title: string;
			emergencyLabel: string;
			floodLabel: string;
			quietLabel: string;
			footer: string;
			btnLocks: string;
			btnFlood: string;
			btnQuiet: string;
			btnEmergencyLock: string;
			btnEmergencyUnlock: string;
			btnWebApp: string;
		}
	> = {
		ps: {
			title: `🎛 <b>د چټک کنټرول شیشه‌يي پینل — ${groupTitle}</b>`,
			emergencyLabel: `• بیړنی قلف: <b>${emergencyLock ? '🔴 فعال' : '🟢 غیرفعال'}</b>`,
			floodLabel: `• د فلډ ضد حساسیت: <b>په ۵ ثانیو کې ${floodLimit} پیغامونه</b>`,
			quietLabel: `• د شپې چوپتیا ساعتونه: <b>${quietHoursActive ? '🌙 فعال' : '⚪ بند'}</b>`,
			footer: 'له چټ څخه بې له وتلو، د سملاسي بدلون لپاره لاندې شیشه‌يي تڼۍ کېکاږئ:',
			btnLocks: '🛡️ د محتوا قلفونه',
			btnFlood: '⚡ د فلډ ضد تنظیم',
			btnQuiet: `🌙 د چوپتیا ساعتونه (${quietHoursActive ? 'فعال' : 'بند'})`,
			btnEmergencyLock: '🔒 د ګروپ بیړنی قلف',
			btnEmergencyUnlock: '🔓 د بیړني قلف خلاصول',
			btnWebApp: '📱 د تنظیماتو بشپړ مینی‌اپ خلاصول',
		},
		fa: {
			title: `🎛 <b>پنل مدیریت سریع شیشه‌ای — ${groupTitle}</b>`,
			emergencyLabel: `• قفل اضطراری: <b>${emergencyLock ? '🔴 فعال' : '🟢 غیرفعال'}</b>`,
			floodLabel: `• حساسیت ضدفلود: <b>${floodLimit} پیام در ۵ ثانیه</b>`,
			quietLabel: `• ساعات سکوت شبانه: <b>${quietHoursActive ? '🌙 فعال' : '⚪ خاموش'}</b>`,
			footer: 'برای تغییر آنی بدون خروج از چت، روی دکمه‌های شیشه‌ای زیر بزنید:',
			btnLocks: '🛡️ قفل‌های محتوا',
			btnFlood: '⚡ تنظیم ضدفلود',
			btnQuiet: `🌙 ساعات سکوت (${quietHoursActive ? 'فعال' : 'خاموش'})`,
			btnEmergencyLock: '🔒 قفل اضطراری گروه',
			btnEmergencyUnlock: '🔓 باز کردن قفل اضطراری',
			btnWebApp: '📱 باز کردن مینی‌اپ کامل تنظیمات',
		},
		en: {
			title: `🎛 <b>Quick Inline Control Panel — ${groupTitle}</b>`,
			emergencyLabel: `• Emergency Lock: <b>${emergencyLock ? '🔴 Enabled' : '🟢 Disabled'}</b>`,
			floodLabel: `• Anti-Flood Limit: <b>${floodLimit} msgs / 5s</b>`,
			quietLabel: `• Quiet Hours: <b>${quietHoursActive ? '🌙 Active' : '⚪ Off'}</b>`,
			footer: 'Tap the buttons below for instant control without leaving the chat:',
			btnLocks: '🛡️ Content Locks',
			btnFlood: '⚡ Anti-Flood Config',
			btnQuiet: `🌙 Quiet Hours (${quietHoursActive ? 'Active' : 'Off'})`,
			btnEmergencyLock: '🔒 Emergency Lock Group',
			btnEmergencyUnlock: '🔓 Unlock Emergency Group',
			btnWebApp: '📱 Open Full Mini App Settings',
		},
		ar: {
			title: `🎛 <b>لوحة التحكم السريعة الشفافة — ${groupTitle}</b>`,
			emergencyLabel: `• القفل الطارئ: <b>${emergencyLock ? '🔴 مفعّل' : '🟢 معطّل'}</b>`,
			floodLabel: `• حساسية مكافحة التفليد: <b>${floodLimit} رسائل / 5 ثوانٍ</b>`,
			quietLabel: `• ساعات الهدوء الليلي: <b>${quietHoursActive ? '🌙 نشط' : '⚪ متوقف'}</b>`,
			footer: 'اضغط على الأزرار الشفافة أدناه للتغيير الفوري دون مغادرة المحادثة:',
			btnLocks: '🛡️ أقفال المحتوى',
			btnFlood: '⚡ ضبط التفليد',
			btnQuiet: `🌙 ساعات الهدوء (${quietHoursActive ? 'نشط' : 'متوقف'})`,
			btnEmergencyLock: '🔒 قفل اضطراري للمجموعة',
			btnEmergencyUnlock: '🔓 فتح القفل الاضطراري',
			btnWebApp: '📱 فتح تطبيق الإعدادات المصغر',
		},
		ru: {
			title: `🎛 <b>Быстрая инлайн-панель управления — ${groupTitle}</b>`,
			emergencyLabel: `• Экстренная блокировка: <b>${emergencyLock ? '🔴 Вкл' : '🟢 Выкл'}</b>`,
			floodLabel: `• Лимит анти-флуда: <b>${floodLimit} сообщ. / 5 сек</b>`,
			quietLabel: `• Тихие часы: <b>${quietHoursActive ? '🌙 Активны' : '⚪ Выкл'}</b>`,
			footer: 'Нажимайте кнопки ниже для мгновенного управления прямо в чате:',
			btnLocks: '🛡️ Блокировки контента',
			btnFlood: '⚡ Настройка анти-флуда',
			btnQuiet: `🌙 Тихие часы (${quietHoursActive ? 'Вкл' : 'Выкл'})`,
			btnEmergencyLock: '🔒 Экстренно заблокировать',
			btnEmergencyUnlock: '🔓 Снять экстренную блокировку',
			btnWebApp: '📱 Открыть полный Mini App',
		},
		tr: {
			title: `🎛 <b>Hızlı Butonlu Yönetim Paneli — ${groupTitle}</b>`,
			emergencyLabel: `• Acil Kilit: <b>${emergencyLock ? '🔴 Açık' : '🟢 Kapalı'}</b>`,
			floodLabel: `• Anti-Flood Limiti: <b>${floodLimit} mesaj / 5 sn</b>`,
			quietLabel: `• Sessiz Saatler: <b>${quietHoursActive ? '🌙 Aktif' : '⚪ Kapalı'}</b>`,
			footer: 'Sohbetten çıkmadan anında değiştirmek için butonlara dokunun:',
			btnLocks: '🛡️ İçerik Kilitleri',
			btnFlood: '⚡ Anti-Flood Ayarı',
			btnQuiet: `🌙 Sessiz Saatler (${quietHoursActive ? 'Aktif' : 'Kapalı'})`,
			btnEmergencyLock: '🔒 Acil Grup Kilidi',
			btnEmergencyUnlock: '🔓 Acil Kilidi Aç',
			btnWebApp: '📱 Tam Mini App Ayarlarını Aç',
		},
		es: {
			title: `🎛 <b>Panel de Control Rápido Inline — ${groupTitle}</b>`,
			emergencyLabel: `• Bloqueo de Emergencia: <b>${emergencyLock ? '🔴 Activado' : '🟢 Desactivado'}</b>`,
			floodLabel: `• Límite Anti-Flood: <b>${floodLimit} msgs / 5s</b>`,
			quietLabel: `• Horas de Silencio: <b>${quietHoursActive ? '🌙 Activo' : '⚪ Apagado'}</b>`,
			footer: 'Toca los botones para administrar al instante sin salir del chat:',
			btnLocks: '🛡️ Bloqueos de Contenido',
			btnFlood: '⚡ Ajuste Anti-Flood',
			btnQuiet: `🌙 Horas de Silencio (${quietHoursActive ? 'Activo' : 'Apagado'})`,
			btnEmergencyLock: '🔒 Bloqueo de Emergencia',
			btnEmergencyUnlock: '🔓 Desbloqueo de Emergencia',
			btnWebApp: '📱 Abrir Mini App Completa',
		},
		pt: {
			title: `🎛 <b>Painel de Controle Rápido Inline — ${groupTitle}</b>`,
			emergencyLabel: `• Bloqueio de Emergência: <b>${emergencyLock ? '🔴 Ativado' : '🟢 Desativado'}</b>`,
			floodLabel: `• Limite Anti-Flood: <b>${floodLimit} msgs / 5s</b>`,
			quietLabel: `• Horário de Silêncio: <b>${quietHoursActive ? '🌙 Ativo' : '⚪ Desligado'}</b>`,
			footer: 'Toque nos botões para gerenciar sem sair do chat:',
			btnLocks: '🛡️ Bloqueios de Conteúdo',
			btnFlood: '⚡ Ajuste Anti-Flood',
			btnQuiet: `🌙 Horário de Silêncio (${quietHoursActive ? 'Ativo' : 'Desligado'})`,
			btnEmergencyLock: '🔒 Bloqueio de Emergência',
			btnEmergencyUnlock: '🔓 Desbloquear Emergência',
			btnWebApp: '📱 Abrir Mini App Completo',
		},
		de: {
			title: `🎛 <b>Schnell-Bedienfeld Inline — ${groupTitle}</b>`,
			emergencyLabel: `• Notfall-Sperre: <b>${emergencyLock ? '🔴 Aktiv' : '🟢 Deaktiviert'}</b>`,
			floodLabel: `• Anti-Flood-Grenze: <b>${floodLimit} Nachr. / 5s</b>`,
			quietLabel: `• Ruhezeiten: <b>${quietHoursActive ? '🌙 Aktiv' : '⚪ Aus'}</b>`,
			footer: 'Tippen Sie unten für sofortige Anpassungen im Chat:',
			btnLocks: '🛡️ Inhaltssperren',
			btnFlood: '⚡ Anti-Flood-Einstellung',
			btnQuiet: `🌙 Ruhezeit (${quietHoursActive ? 'Aktiv' : 'Aus'})`,
			btnEmergencyLock: '🔒 Notfall-Gruppensperre',
			btnEmergencyUnlock: '🔓 Notfall-Sperre aufheben',
			btnWebApp: '📱 Vollständige Mini App öffnen',
		},
		fr: {
			title: `🎛 <b>Panneau de Contrôle Rapide Inline — ${groupTitle}</b>`,
			emergencyLabel: `• Verrouillage d'urgence : <b>${emergencyLock ? '🔴 Activé' : '🟢 Désactivé'}</b>`,
			floodLabel: `• Limite anti-flood : <b>${floodLimit} msgs / 5s</b>`,
			quietLabel: `• Heures de silence : <b>${quietHoursActive ? '🌙 Actif' : '⚪ Désactivé'}</b>`,
			footer: 'Appuyez sur les boutons pour modifier directement dans le chat :',
			btnLocks: '🛡️ Verrous de contenu',
			btnFlood: '⚡ Réglage anti-flood',
			btnQuiet: `🌙 Heures de silence (${quietHoursActive ? 'Actif' : 'Désactivé'})`,
			btnEmergencyLock: "🔒 Verrouillage d'urgence",
			btnEmergencyUnlock: "🔓 Déverrouillage d'urgence",
			btnWebApp: '📱 Ouvrir la Mini App complète',
		},
		zh: {
			title: `🎛 <b>群内快捷内联控制面板 — ${groupTitle}</b>`,
			emergencyLabel: `• 紧急全员锁定: <b>${emergencyLock ? '🔴 已开启' : '🟢 已关闭'}</b>`,
			floodLabel: `• 刷屏限制灵敏度: <b>${floodLimit} 条消息 / 5 秒</b>`,
			quietLabel: `• 夜间静音时间: <b>${quietHoursActive ? '🌙 开启' : '⚪ 关闭'}</b>`,
			footer: '点击下方内联按钮无需离开群聊即可实时切换:',
			btnLocks: '🛡️ 内容锁定规则',
			btnFlood: '⚡ 防刷屏阈值设定',
			btnQuiet: `🌙 夜间静音 (${quietHoursActive ? '开启' : '关闭'})`,
			btnEmergencyLock: '🔒 紧急全群锁定',
			btnEmergencyUnlock: '🔓 解除紧急锁定',
			btnWebApp: '📱 打开完整配置 Mini App',
		},
	};

	const cur = dict[lang] || dict.en;

	return {
		text: `${cur.title}\n\n${cur.emergencyLabel}\n${cur.floodLabel}\n${cur.quietLabel}\n\n${cur.footer}`,
		reply_markup: {
			inline_keyboard: [
				[
					{ text: cur.btnLocks, callback_data: `panel:locks:${groupId}` },
					{ text: cur.btnFlood, callback_data: `panel:flood:${groupId}` },
				],
				[
					{ text: cur.btnQuiet, callback_data: `panel:quiet:${groupId}` },
					{
						text: emergencyLock ? cur.btnEmergencyUnlock : cur.btnEmergencyLock,
						callback_data: `panel:emergency:${groupId}`,
					},
				],
				[{ text: cur.btnWebApp, web_app: { url: panelUrl } }],
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
	const { lang, groupId, groupTitle, invoiceLink, miniAppUrl } = params;

	const dict: Record<BotLang, { text: string; btnStars: string; btnView: string }> = {
		ps: {
			text:
				`⏸️ <b>د خوندي خوب حالت (Safe Hibernation Mode) — ${groupTitle}</b>\n\n` +
				`درانه اډمینه، د دې ګروپ د ۲۴ ساعتونو وړیا ازمایښتي دوره یا میاشتنی ګډون پای ته رسېدلی دی.\n` +
				`⏳ <b>د معلوماتو د ساتنې ۱ اونیزه موده:</b> ستاسو د فایروال ټول تنظیمات، قلفونه، سپین لیست او د ګروپ احصایې یوازې د <b>۱ اونۍ (۷ ورځو)</b> لپاره په ډېټابېس کې خوندي ساتل کېږي او وروسته به په اتوماتيک ډول پاک شي.\n\n` +
				`⭐ د پخوانیو تنظیماتو له مخې په ۱ ثانیه کې د بوټ د راویښولو لپاره، خپل میاشتنی ګډون په <b>۱۰۰ ټیلیګرام سټارز</b> تمدید کړئ:`,
			btnStars: '⭐ په ۱۰۰ سټارز سملاسي تمدید (۱ میاشتنی)',
			btnView: '🎛 د ګروپ خوندي شوي تنظیمات کتل',
		},
		fa: {
			text:
				`⏸️ <b>حالت خواب ایمن (Safe Hibernation Mode) — ${groupTitle}</b>\n\n` +
				`ادمین گرامی، مهلت تست ۲۴ ساعته رایگان یا اشتراک ماهانه این گروه به پایان رسیده است.\n` +
				`⏳ <b>مهلت ۱ هفته‌ای نگهداری اطلاعات:</b> تمامی تنظیمات فایروال، قفل‌ها، لیست سفید و آمارهای گروه شما <b>تنها به مدت ۱ هفته (۷ روز)</b> در دیتابیس محفوظ می‌ماند و پس از آن به صورت خودکار پاکسازی خواهد شد.\n\n` +
				`⭐ برای بیدار شدن آنی ربات (در کمتر از ۱ ثانیه) با همان تنظیمات قبلی، اشتراک ماهانه را با <b>۱۰۰ استارز تلگرام</b> تمدید کنید:`,
			btnStars: '⭐ تمدید آنی با ۱۰۰ استارز (۱ ماهه)',
			btnView: '🎛 مشاهده تنظیمات ذخیره‌شده گروه',
		},
		en: {
			text:
				`⏸️ <b>Safe Hibernation Mode — ${groupTitle}</b>\n\n` +
				`Dear Admin, the 24-hour free trial or monthly subscription for this group has expired.\n` +
				`⏳ <b>1-Week Data Retention Grace Period:</b> All firewall settings, content locks, whitelists, and analytics are preserved for <b>exactly 1 week (7 days)</b> before automated cleanup.\n\n` +
				`⭐ To instantly awaken protection with your exact saved settings, renew your subscription for <b>100 Telegram Stars</b>:`,
			btnStars: '⭐ Instant Renewal with 100 Stars (1 Month)',
			btnView: '🎛 View Saved Group Settings',
		},
		ar: {
			text:
				`⏸️ <b>وضع السكون الآمن (Safe Hibernation) — ${groupTitle}</b>\n\n` +
				`عزيزي المشرف، انتهت فترة التجربة المجانية (24 ساعة) أو الاشتراك الشهري لهذه المجموعة.\n` +
				`⏳ <b>مهلة حفظ البيانات لمدة أسبوع:</b> ستبقى كافة إعدادات جدار الحماية والأقفال والإحصائيات محفوظة لمدة <b>أسبوع واحد (7 أيام)</b> فقط قبل الحذف النهائي.\n\n` +
				`⭐ لتفعيل البوت فوراً بالبيانات السابقة، قم بتجديد الاشتراك بـ <b>100 نجمة تيليجرام (⭐)</b>:`,
			btnStars: '⭐ تجديد فوري بـ 100 نجمة (شهر كامل)',
			btnView: '🎛 عرض إعدادات المجموعة المحفوظة',
		},
		ru: {
			text:
				`⏸️ <b>Режим безопасной спячки (Safe Hibernation) — ${groupTitle}</b>\n\n` +
				`Уважаемый администратор, срок действия 24-часового бесплатного периода или подписки группы истек.\n` +
				`⏳ <b>1 неделя сохранения данных:</b> Все правила файрвола, списки и аналитика сохраняются в базе данных <b>ровно 7 дней</b> перед автоматическим удалением.\n\n` +
				`⭐ Чтобы мгновенно пробудить бота с вашими настройками, продлите подписку за <b>100 Telegram Stars</b>:`,
			btnStars: '⭐ Мгновенное продление за 100 Stars (1 мес.)',
			btnView: '🎛 Посмотреть сохраненные настройки',
		},
		tr: {
			text:
				`⏸️ <b>Güvenli Uyku Modu (Safe Hibernation) — ${groupTitle}</b>\n\n` +
				`Sayın Yönetici, bu grup için 24 saatlik deneme süresi veya aylık abonelik sona erdi.\n` +
				`⏳ <b>1 Haftalık Veri Koruma Süresi:</b> Tüm güvenlik duvarı ayarları ve istatistikleriniz otomatik silinmeden önce <b>yalnızca 1 hafta (7 gün)</b> boyunca saklanır.\n\n` +
				`⭐ Botu aynı ayarlarla anında uyandırmak için aboneliği <b>100 Telegram Stars</b> ile yenileyin:`,
			btnStars: '⭐ 100 Stars ile Anında Yenile (1 Ay)',
			btnView: '🎛 Kaydedilen Grup Ayarlarını Gör',
		},
		es: {
			text:
				`⏸️ <b>Modo de Hibernación Segura — ${groupTitle}</b>\n\n` +
				`Estimado Administrador: la prueba gratuita de 24 horas o la suscripción mensual de este grupo ha expirado.\n` +
				`⏳ <b>Retención de Datos por 1 Semana:</b> Todas las configuraciones y estadísticas se guardan durante <b>exactamente 7 días</b> antes de la eliminación definitiva.\n\n` +
				`⭐ Para reactivar la protección al instante con tus ajustes guardados, renueva por <b>100 Telegram Stars</b>:`,
			btnStars: '⭐ Renovar al Instante con 100 Stars (1 Mes)',
			btnView: '🎛 Ver Configuración Guardada del Grupo',
		},
		pt: {
			text:
				`⏸️ <b>Modo de Hibernação Segura — ${groupTitle}</b>\n\n` +
				`Prezado Administrador, o período de teste de 24h ou a assinatura mensal deste grupo expirou.\n` +
				`⏳ <b>Retenção de Dados por 1 Semana:</b> Todas as configurações de firewall e métricas ficam guardadas por <b>7 dias</b> antes da limpeza automática.\n\n` +
				`⭐ Para reativar o bot instantaneamente com os mesmos ajustes, renove por <b>100 Telegram Stars</b>:`,
			btnStars: '⭐ Renovação Instantânea com 100 Stars (1 Mês)',
			btnView: '🎛 Ver Configurações Salvas do Grupo',
		},
		de: {
			text:
				`⏸️ <b>Sicherer Ruhezustand (Safe Hibernation) — ${groupTitle}</b>\n\n` +
				`Sehr geehrter Administrator, der 24-Stunden-Gratistest oder das Monatsabonnement ist abgelaufen.\n` +
				`⏳ <b>1 Woche Datenerhalt:</b> Alle Firewall-Regeln und Statistiken bleiben <b>genau 7 Tage</b> gespeichert, bevor sie bereinigt werden.\n\n` +
				`⭐ Um den Bot sofort mit den gespeicherten Daten zu wecken, verlängern Sie für <b>100 Telegram Stars</b>:`,
			btnStars: '⭐ Sofortige Verlängerung mit 100 Stars (1 Monat)',
			btnView: '🎛 Gespeicherte Gruppen-Einstellungen anzeigen',
		},
		fr: {
			text:
				`⏸️ <b>Mode Hibernation Sécurisée — ${groupTitle}</b>\n\n` +
				`Cher Administrateur, la période d'essai de 24h ou l'abonnement mensuel de ce groupe a expiré.\n` +
				`⏳ <b>Rétention des données pendant 1 semaine :</b> Tous vos paramètres et statistiques sont conservés pendant <b>exactement 7 jours</b>.\n\n` +
				`⭐ Pour réactiver immédiatement la protection avec vos réglages, renouvelez pour <b>100 Telegram Stars</b> :`,
			btnStars: '⭐ Renouvellement immédiat avec 100 Stars (1 Mois)',
			btnView: '🎛 Voir les paramètres sauvegardés',
		},
		zh: {
			text:
				`⏸️ <b>安全休眠模式（Safe Hibernation Mode） — ${groupTitle}</b>\n\n` +
				`尊敬的群组管理员，该群组的 24 小时免费试用或按月订阅已到期。\n` +
				`⏳ <b>1 周数据保留宽限期：</b> 所有的防火墙规则、锁定配置与分析数据将在数据库中保留 <b>整整 1 周（7 天）</b>，随后将自动清除。\n\n` +
				`⭐ 仅需 <b>100 Telegram Stars</b> 续费，即可毫秒级唤醒机器人并完全恢复原有的全部设置：`,
			btnStars: '⭐ 使用 100 Stars 立即续费（1 个月）',
			btnView: '🎛 查看该群组已保存的配置数据',
		},
	};

	const cur = dict[lang] || dict.en;

	return {
		text: cur.text,
		reply_markup: {
			inline_keyboard: [
				[{ text: cur.btnStars, url: invoiceLink }],
				[{ text: cur.btnView, web_app: { url: `${miniAppUrl}#/group/${groupId}` } }],
			],
		},
	};
}

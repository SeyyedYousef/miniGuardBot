import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	API_MESSAGES,
	getApiMessage,
	getLocalizedCallbackNotice,
	getLocalizedStarsInvoice,
	getLocalizedSubscriptionPackages,
	resolveRequestLang,
} from './api-i18n.js';
import {
	buildChatJoinRequestVerificationPrompt,
	buildChildBotStartMessage,
	buildDailyAnalyticsPmReport,
	buildGroupJoinOnboardingMessages,
	buildInChatControlPanelMessage,
	buildMasterBotStartMessage,
	buildSafeHibernationNotice,
	resolveBotLang,
} from './bot-engine.js';
import {
	checkRateLimit,
	createServer,
	escapeHtml,
	extractCleanBotToken,
	generateJwt,
	getGroupSettings,
	processTelegramUpdate,
	telegram,
	verifyJwt,
} from './server.js';

describe('MiniGuard Backend Bot Engine & Firewall Execution', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('deletes message immediately when a regular user posts a link with link lock enabled', async () => {
		const deleteSpy = vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });
		const sendSpy = vi
			.spyOn(telegram, 'sendMessage')
			.mockResolvedValue({ ok: true, result: { message_id: 999 } });

		const mockUpdate = {
			update_id: 101,
			message: {
				message_id: 42,
				chat: { id: -1001234567890, type: 'supergroup', title: 'Test Tech Group' },
				from: { id: 77777, first_name: 'SpammerBob', is_bot: false },
				text: 'Join my pump group: https://t.me/spam_link',
				entities: [{ type: 'url', offset: 20, length: 24, url: 'https://t.me/spam_link' }],
			},
		};

		// Ensure group settings has removeLinks: true
		const settings = getGroupSettings(-1001234567890);
		settings.removeLinks = true;
		settings.adminUserIds = [99999]; // Spammer is NOT admin

		await processTelegramUpdate(mockUpdate, 'test_bot_token');

		// Assert deleteMessage was called for the violating message
		expect(deleteSpy).toHaveBeenCalledWith(-1001234567890, 42, 'test_bot_token');
		// Assert warning message was sent
		expect(sendSpy).toHaveBeenCalled();
	});

	it('exempts administrators from link deletion', async () => {
		const deleteSpy = vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });
		const _sendSpy = vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true });

		const mockUpdate = {
			update_id: 102,
			message: {
				message_id: 43,
				chat: { id: -1001234567890, type: 'supergroup', title: 'Test Tech Group' },
				from: { id: 99999, first_name: 'SuperAdmin', is_bot: false },
				text: 'Official link: https://github.com/myorg/project',
				entities: [{ type: 'url', offset: 15, length: 32 }],
			},
		};

		const settings = getGroupSettings(-1001234567890);
		settings.removeLinks = true;
		settings.adminUserIds = [99999]; // User IS admin

		await processTelegramUpdate(mockUpdate, 'test_bot_token');

		// Admin messages MUST NOT be deleted
		expect(deleteSpy).not.toHaveBeenCalled();
	});

	it('detects and deletes messages with hidden Zero-Width bypass characters', async () => {
		const deleteSpy = vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });
		vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true, result: { message_id: 998 } });

		const mockUpdate = {
			update_id: 103,
			message: {
				message_id: 44,
				chat: { id: -1001234567890, type: 'supergroup', title: 'Test Tech Group' },
				from: { id: 88888, first_name: 'BypassHacker', is_bot: false },
				text: 'Hidden bypass \u200B\u200E message',
			},
		};

		const settings = getGroupSettings(-1001234567890);
		settings.blockZeroWidthChars = true;
		settings.adminUserIds = [99999];

		await processTelegramUpdate(mockUpdate, 'test_bot_token');

		expect(deleteSpy).toHaveBeenCalledWith(-1001234567890, 44, 'test_bot_token');
	});

	it('executes /ban and Persian "بن" command on replied user when invoked by admin', async () => {
		const banSpy = vi.spyOn(telegram, 'banChatMember').mockResolvedValue({ ok: true });
		const deleteSpy = vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });
		const sendSpy = vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true });

		const mockUpdate = {
			update_id: 104,
			message: {
				message_id: 50,
				chat: { id: -1001234567890, type: 'supergroup', title: 'Test Tech Group' },
				from: { id: 99999, first_name: 'SuperAdmin', is_bot: false },
				text: 'بن تبلیغات و اسپم',
				reply_to_message: {
					message_id: 49,
					from: { id: 77777, first_name: 'SpammerBob' },
				},
			},
		};

		const settings = getGroupSettings(-1001234567890);
		settings.adminUserIds = [99999];

		await processTelegramUpdate(mockUpdate, 'test_bot_token');

		expect(deleteSpy).toHaveBeenCalledWith(-1001234567890, 50, 'test_bot_token'); // Deletes command text
		expect(banSpy).toHaveBeenCalledWith(
			-1001234567890,
			77777,
			{ revoke_messages: true },
			'test_bot_token',
		);
		expect(sendSpy).toHaveBeenCalled();
	});

	it('opens interactive in-chat control panel keyboard when admin types "پنل" or "/panel"', async () => {
		const deleteSpy = vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });
		const sendSpy = vi.spyOn(telegram, 'sendMessage').mockResolvedValue({ ok: true });

		const mockUpdate = {
			update_id: 105,
			message: {
				message_id: 55,
				chat: { id: -1001234567890, type: 'supergroup', title: 'Test Tech Group' },
				from: { id: 99999, first_name: 'SuperAdmin', is_bot: false },
				text: 'پنل',
			},
		};

		const settings = getGroupSettings(-1001234567890);
		settings.adminUserIds = [99999];

		await processTelegramUpdate(mockUpdate, 'test_bot_token');

		expect(deleteSpy).toHaveBeenCalledWith(-1001234567890, 55, 'test_bot_token');
		expect(sendSpy).toHaveBeenCalledWith(
			-1001234567890,
			expect.stringContaining('پنل مدیریت سریع شیشه‌ای'),
			expect.objectContaining({ reply_markup: expect.any(Object) }),
			'test_bot_token',
		);
	});

	it('approves legitimate human chat join requests automatically', async () => {
		const approveSpy = vi.spyOn(telegram, 'approveChatJoinRequest').mockResolvedValue({ ok: true });

		const mockJoinUpdate = {
			update_id: 106,
			chat_join_request: {
				chat: { id: -1001234567890, title: 'Test Group' },
				from: { id: 12345, first_name: 'RealUser', is_bot: false },
			},
		};

		await processTelegramUpdate(mockJoinUpdate, 'test_bot_token');

		expect(approveSpy).toHaveBeenCalledWith(-1001234567890, 12345, 'test_bot_token');
	});

	it('extracts valid BotFather tokens even when pasted with extra message text or zero-width chars', () => {
		const rawPasted =
			'Done! Congratulations on your new bot. Use this token to access the HTTP API:\n\u200B123456789:AAFMockTestTokenForSecurityAuditX1234\nKeep your token secure!';
		expect(extractCleanBotToken(rawPasted)).toBe('123456789:AAFMockTestTokenForSecurityAuditX1234');
		expect(extractCleanBotToken('invalid-token')).toBeNull();
	});

	it('accepts valid bot token via POST /api/v1/bots and returns 201 with bound group', async () => {
		const srv = createServer();
		await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
		const addr = srv.address() as { port: number };
		try {
			const res = await fetch(`http://127.0.0.1:${addr.port}/api/v1/bots`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bot_token: '123456789:AAFMockTestTokenForSecurityAuditX1234',
					bot_username: 'MyCustomGuardBot',
					bound_group_link: '@my_super_group',
				}),
			});
			expect(res.status).toBe(201);
			const json = (await res.json()) as any;
			expect(json.bot_username).toBe('MyCustomGuardBot');
			expect(json.status).toBe('active');
			expect(json.bound_group_id).toBeTruthy();
		} finally {
			srv.close();
		}
	});

	describe('Security Engineering Audit & Hardening Suite', () => {
		const testSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

		it('signs and verifies JWT tokens with HS256 HMAC and timing-safe equality', () => {
			const payload = {
				userId: 5076130392,
				role: 'owner',
				exp: Math.floor(Date.now() / 1000) + 3600,
			};
			const jwt = generateJwt(payload, testSecret);
			expect(typeof jwt).toBe('string');
			expect(jwt.split('.')).toHaveLength(3);

			const decoded = verifyJwt(jwt, testSecret);
			expect(decoded).not.toBeNull();
			expect(decoded?.userId).toBe(5076130392);
			expect(decoded?.role).toBe('owner');
		});

		it('rejects tampered or forged JWT tokens', () => {
			const payload = { userId: 12345, role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 };
			const jwt = generateJwt(payload, testSecret);
			const tampered = jwt.slice(0, -4) + 'abcd';
			expect(verifyJwt(tampered, testSecret)).toBeNull();
		});

		it('rejects expired JWT tokens', () => {
			const expiredPayload = {
				userId: 12345,
				role: 'user',
				exp: Math.floor(Date.now() / 1000) - 100,
			};
			const expiredJwt = generateJwt(expiredPayload, testSecret);
			expect(verifyJwt(expiredJwt, testSecret)).toBeNull();
		});

		it('enforces IP rate limiting and rejects excessive requests with retry-after', () => {
			const ip = '198.51.100.42';
			// Limit to 3 requests per 1000ms
			expect(checkRateLimit(ip, 3, 1000).allowed).toBe(true);
			expect(checkRateLimit(ip, 3, 1000).allowed).toBe(true);
			expect(checkRateLimit(ip, 3, 1000).allowed).toBe(true);
			const rateExceeded = checkRateLimit(ip, 3, 1000);
			expect(rateExceeded.allowed).toBe(false);
			expect(rateExceeded.retryAfter).toBeGreaterThan(0);
		});

		it('sanitizes user input via escapeHtml to prevent HTML injection in Telegram messages', () => {
			const dangerousInput = '<script>alert("xss")</script> & <b>bold</b> "quoted"';
			const sanitized = escapeHtml(dangerousInput);
			expect(sanitized).toBe(
				'&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt; &quot;quoted&quot;',
			);
			expect(sanitized).not.toContain('<script>');
		});

		it('attaches hardened security headers to all HTTP responses', async () => {
			const srv = createServer();
			await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
			const addr = srv.address() as { port: number };
			try {
				const res = await fetch(`http://127.0.0.1:${addr.port}/health`, {
					headers: { Origin: 'https://miniguard-app.pages.dev' },
				});
				expect(res.headers.get('x-content-type-options')).toBe('nosniff');
				expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
				expect(res.headers.get('strict-transport-security')).toBeTruthy();
				expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
				expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
				expect(res.headers.get('access-control-allow-origin')).toBe(
					'https://miniguard-app.pages.dev',
				);
			} finally {
				srv.close();
			}
		});
	});

	describe('Pashto (ps) Localization & Bot Engine Support', () => {
		it('resolves ps and pus language codes across bot and API helpers', () => {
			expect(resolveBotLang('ps')).toBe('ps');
			expect(resolveBotLang('ps-AF')).toBe('ps');
			expect(resolveBotLang('ps_PK')).toBe('ps');
			expect(resolveBotLang('pus')).toBe('ps');

			expect(resolveRequestLang({ url: '/api/v1/auth?lang=ps', headers: {} } as any)).toBe('ps');
			expect(
				resolveRequestLang({
					url: '/api/v1/auth',
					headers: { 'accept-language': 'ps-AF,en;q=0.8' },
				} as any),
			).toBe('ps');
		});

		it('builds Pashto messages for all Telegram bot builders without English fallback', () => {
			const childStart = buildChildBotStartMessage({
				lang: 'ps',
				userFirstName: 'Ahmad',
				groupTitle: 'Kabul Devs',
				groupLink: 'https://t.me/kabuldevs',
				miniAppUrl: 'https://app.example.com',
			});
			expect(childStart.text).toContain('Ahmad');
			expect(childStart.text).toContain('ګروپ');

			const masterStart = buildMasterBotStartMessage('ps', 'https://app.example.com');
			expect(masterStart.text).toContain('MiniGuard');
			expect(masterStart.text).toContain('بوټ');
			expect(masterStart.reply_markup.inline_keyboard.length).toBeGreaterThan(0);

			const onboarding = buildGroupJoinOnboardingMessages({
				lang: 'ps',
				groupId: 'grp-ps-1',
				groupTitle: 'Pashto Group',
				botUsername: 'PashtoGuardBot',
				hasFullAdminPerms: true,
				miniAppUrl: 'https://app.example.com',
			});
			expect(onboarding).toHaveLength(4);
			for (const msg of onboarding) {
				expect(msg.text.trim().length).toBeGreaterThan(0);
			}

			const dailyReport = buildDailyAnalyticsPmReport({
				lang: 'ps',
				groupTitle: 'Pashto Group',
				dateStr: '2026-11-14',
				totalMessages: 250,
				activeUsers: 45,
				newMembers: 12,
				spamBlocked: 9,
				warningsIssued: 4,
			});
			expect(dailyReport).toContain('Pashto Group');
			expect(dailyReport).toContain('250');

			const joinPrompt = buildChatJoinRequestVerificationPrompt({
				lang: 'ps',
				userFirstName: 'Wali',
				groupTitle: 'Pashto Group',
				groupId: 'grp-ps-1',
				biometricRequired: true,
				miniAppUrl: 'https://app.example.com',
			});
			expect(joinPrompt.text).toContain('Wali');
			expect(joinPrompt.reply_markup.inline_keyboard[0][0].text).toBeTruthy();

			const controlPanel = buildInChatControlPanelMessage({
				lang: 'ps',
				groupId: 'grp-ps-1',
				groupTitle: 'Pashto Group',
				emergencyLock: false,
				floodLimit: 5,
				quietHoursActive: true,
				miniAppUrl: 'https://app.example.com',
			});
			expect(controlPanel.text).toContain('Pashto Group');
			expect(controlPanel.reply_markup.inline_keyboard.length).toBeGreaterThan(0);

			const hibernation = buildSafeHibernationNotice({
				lang: 'ps',
				groupId: 'grp-ps-1',
				groupTitle: 'Pashto Group',
				invoiceLink: 'https://t.me/$invoice',
				miniAppUrl: 'https://app.example.com',
			});
			expect(hibernation.text).toContain('Pashto Group');
			expect(hibernation.reply_markup.inline_keyboard.length).toBeGreaterThan(0);
		});

		it('provides complete Pashto API messages, packages, invoice strings, and callback notices', () => {
			for (const [key, entry] of Object.entries(API_MESSAGES)) {
				expect(entry.ps.trim().length, `Missing ps string for API_MESSAGES.${key}`).toBeGreaterThan(
					0,
				);
				const enVars = [...(entry.en.match(/\{[a-zA-Z0-9_]+\}/g) || [])].sort();
				const psVars = [...(entry.ps.match(/\{[a-zA-Z0-9_]+\}/g) || [])].sort();
				expect(psVars, `Placeholder mismatch in API_MESSAGES.${key}`).toEqual(enVars);
			}

			expect(getApiMessage('INVALID_TOKEN_FORMAT', 'ps')).toContain('ټوکن');

			const pkgs = getLocalizedSubscriptionPackages('ps', 100);
			expect(pkgs.length).toBeGreaterThanOrEqual(2);
			expect(pkgs[0].name).toContain('۲۴');

			const invoice = getLocalizedStarsInvoice('ps', 'Kabul Group', 100);
			expect(invoice.title).toBeTruthy();
			expect(invoice.description).toContain('Kabul Group');
			expect(invoice.priceLabel).toBeTruthy();

			const noticeKeys = [
				'LINKS_LOCKED',
				'LINKS_UNLOCKED',
				'EMERGENCY_LOCKED',
				'EMERGENCY_UNLOCKED',
				'QUIET_HOURS_ENABLED',
				'QUIET_HOURS_DISABLED',
				'USER_UNMUTED',
				'USER_BANNED',
				'ACTION_DONE',
			] as const;
			for (const noticeKey of noticeKeys) {
				const text = getLocalizedCallbackNotice(noticeKey, 'ps');
				expect(text.trim().length).toBeGreaterThan(0);
				expect(text).not.toBe(getLocalizedCallbackNotice(noticeKey, 'en'));
			}
		});

		it('responds in Pashto when an admin sends "پینل" in a Pashto-configured group', async () => {
			vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });
			const sendSpy = vi
				.spyOn(telegram, 'sendMessage')
				.mockResolvedValue({ ok: true, result: { message_id: 555 } });

			const chatId = -1009988776655;
			const settings = getGroupSettings(chatId, 'Pashto Test Group');
			settings.adminUserIds = [10101];
			settings.language = 'ps';
			settings.fullSettings = {
				general: {
					language: 'ps',
					enablePersianNaturalCommands: true,
				},
			};

			await processTelegramUpdate(
				{
					update_id: 901,
					message: {
						message_id: 301,
						chat: { id: chatId, type: 'supergroup', title: 'Pashto Test Group' },
						from: { id: 10101, first_name: 'Admin', is_bot: false, language_code: 'ps' },
						text: 'پینل',
					},
				},
				'test_ps_token',
			);

			expect(sendSpy).toHaveBeenCalled();
			const lastCallText = String(sendSpy.mock.calls.at(-1)?.[1] || '');
			expect(lastCallText).toContain('شیشه‌يي');
		});
	});
});

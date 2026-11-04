import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createServer,
	extractCleanBotToken,
	getGroupSettings,
	processTelegramUpdate,
	telegram,
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
			'Done! Congratulations on your new bot. Use this token to access the HTTP API:\n\u200B8463728029:AAFxFFyIQ1gYh16MP1uYk6_xFDcWiMQuEfY\nKeep your token secure!';
		expect(extractCleanBotToken(rawPasted)).toBe(
			'8463728029:AAFxFFyIQ1gYh16MP1uYk6_xFDcWiMQuEfY',
		);
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
					bot_token: '8463728029:AAFxFFyIQ1gYh16MP1uYk6_xFDcWiMQuEfY',
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
});

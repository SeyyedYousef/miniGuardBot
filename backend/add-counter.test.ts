import type http from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createServer,
	formatGroupTemplate,
	getEffectiveAddCounterConfig,
	getGroupSettings,
	getUserAddCount,
	processTelegramUpdate,
	telegram,
} from './server.js';

describe('Add-Counter Feature Engine & API', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('formats rich add-counter template variables accurately ({added}, {remain}, {target}, {percent}, {progress_bar})', () => {
		const formatted = formatGroupTemplate(
			'کاربر {user} | اد فعلی: {added} | مانده: {remain} | هدف: {target} | پیشرفت: {percent}% | {progress_bar} | لحظه‌ای: {just_added} ({added_users}) | رتبه #{rank}',
			{
				user: 'Reza',
				id: 555,
				group: 'گروه تست',
				added: 3,
				target: 5,
				just_added: 2,
				added_users: 'Ali, Sara',
				rank: 1,
			},
		);
		expect(formatted).toContain('<b>Reza</b>');
		expect(formatted).toContain('اد فعلی: 3');
		expect(formatted).toContain('مانده: 2');
		expect(formatted).toContain('هدف: 5');
		expect(formatted).toContain('پیشرفت: 60%');
		expect(formatted).toContain('🟩🟩🟩🟩🟩⬜⬜⬜');
		expect(formatted).toContain('لحظه‌ای: 2 (Ali, Sara)');
		expect(formatted).toContain('رتبه #1');
	});

	it('announces customized Add-Counter progress message in group when member adds friends and completes target', async () => {
		const chatId = -1009911223344;
		const settings = getGroupSettings(chatId, 'گروه تست ادشمار');
		settings.adminUserIds = [100];
		settings.blockBots = false;
		settings.fullSettings = {
			...(settings.fullSettings || {}),
			general: { language: 'fa', botEnabled: true, welcomeMessage: false, hideJoinLeave: false },
			content_restrictions: {
				...(settings.fullSettings?.content_restrictions || {}),
				blockBots: {
					enabled: false,
					mode: 'always',
					start: '00:00',
					end: '00:00',
					penalty: 'delete',
				},
			},
			add_counter: {
				enabled: true,
				sendProgressMessage: true,
				sendCompletionMessage: true,
				requireTargetToChat: true,
				requiredCount: 2,
				preventDuplicateReadd: true,
				ignoreBots: true,
				countAdmins: true,
				autoDeleteSec: 0,
				leaderboardEnabled: true,
			},
			custom_texts: {
				addCounterText: 'شما تا الان {added} نفر اضافه کردید (مانده: {remain} از {target})',
				addCounterCompleteText: 'تبریک {user}! هدف {target} اد تکمیل شد ({added})',
				forceAddText: 'برای چت {remainadd} نفر اضافه کن ({added}/{number})',
			},
		};

		const sendSpy = vi
			.spyOn(telegram, 'sendMessage')
			.mockResolvedValue({ ok: true, result: { message_id: 777 } });
		const deleteSpy = vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });
		vi.spyOn(telegram, 'banChatMember').mockResolvedValue({ ok: true });
		vi.spyOn(telegram, 'unbanChatMember').mockResolvedValue({ ok: true });

		// 1. User 2001 tries to chat before adding anyone -> deleted + forceAddText shown
		await processTelegramUpdate(
			{
				update_id: 1,
				message: {
					message_id: 10,
					chat: { id: chatId, type: 'supergroup', title: 'گروه تست ادشمار' },
					from: { id: 2001, first_name: 'حسین', is_bot: false },
					text: 'سلام به همه',
				},
			},
			'test_token',
		);
		expect(deleteSpy).toHaveBeenCalledWith(chatId, 10, 'test_token');
		expect(sendSpy).toHaveBeenCalledWith(
			chatId,
			expect.stringContaining('برای چت 2 نفر اضافه کن (0/2)'),
			expect.any(Object),
			'test_token',
		);

		sendSpy.mockClear();
		deleteSpy.mockClear();

		// 2. User 2001 adds 1 new human member (3001) -> Add-Counter sends progress message
		await processTelegramUpdate(
			{
				update_id: 2,
				message: {
					message_id: 11,
					chat: { id: chatId, type: 'supergroup', title: 'گروه تست ادشمار' },
					from: { id: 2001, first_name: 'حسین', is_bot: false },
					new_chat_members: [{ id: 3001, first_name: 'علی', is_bot: false }],
				},
			},
			'test_token',
		);
		expect(getUserAddCount(settings, 2001)).toBe(1);
		expect(sendSpy).toHaveBeenCalledWith(
			chatId,
			'شما تا الان 1 نفر اضافه کردید (مانده: 1 از 2)',
			expect.any(Object),
			'test_token',
		);

		sendSpy.mockClear();

		// 3. Re-adding the same member (3001) is blocked by anti-cheat deduplication
		await processTelegramUpdate(
			{
				update_id: 3,
				message: {
					message_id: 12,
					chat: { id: chatId, type: 'supergroup', title: 'گروه تست ادشمار' },
					from: { id: 2001, first_name: 'حسین', is_bot: false },
					new_chat_members: [{ id: 3001, first_name: 'علی', is_bot: false }],
				},
			},
			'test_token',
		);
		expect(getUserAddCount(settings, 2001)).toBe(1);
		expect(sendSpy).not.toHaveBeenCalled();

		// 4. Adding a bot is ignored when ignoreBots is true
		await processTelegramUpdate(
			{
				update_id: 4,
				message: {
					message_id: 13,
					chat: { id: chatId, type: 'supergroup', title: 'گروه تست ادشمار' },
					from: { id: 2001, first_name: 'حسین', is_bot: false },
					new_chat_members: [{ id: 3999, first_name: 'HelperBot', is_bot: true }],
				},
			},
			'test_token',
		);
		expect(getUserAddCount(settings, 2001)).toBe(1);

		// 5. User 2001 adds second unique human (3002) -> reaches target & sends completion congrats
		await processTelegramUpdate(
			{
				update_id: 5,
				message: {
					message_id: 14,
					chat: { id: chatId, type: 'supergroup', title: 'گروه تست ادشمار' },
					from: { id: 2001, first_name: 'حسین', is_bot: false },
					new_chat_members: [{ id: 3002, first_name: 'رضا', is_bot: false }],
				},
			},
			'test_token',
		);
		expect(getUserAddCount(settings, 2001)).toBe(2);
		expect(sendSpy).toHaveBeenCalledWith(
			chatId,
			'تبریک <b>حسین</b>! هدف 2 اد تکمیل شد (2)',
			expect.any(Object),
			'test_token',
		);

		deleteSpy.mockClear();

		// 6. Now user 2001 can chat freely without deletion
		await processTelegramUpdate(
			{
				update_id: 6,
				message: {
					message_id: 15,
					chat: { id: chatId, type: 'supergroup', title: 'گروه تست ادشمار' },
					from: { id: 2001, first_name: 'حسین', is_bot: false },
					text: 'الان دیگه میتونم پیام بدم',
				},
			},
			'test_token',
		);
		expect(deleteSpy).not.toHaveBeenCalled();
	});

	it('supports /myadds, /topadds, admin /setadds, and /resetadds commands inside Telegram chat', async () => {
		const chatId = -1009911223355;
		const settings = getGroupSettings(chatId, 'گروه دستورات ادشمار');
		settings.adminUserIds = [100];
		settings.fullSettings = {
			...(settings.fullSettings || {}),
			general: { language: 'fa', botEnabled: true, welcomeMessage: false },
			add_counter: {
				enabled: true,
				requiredCount: 5,
				leaderboardEnabled: true,
			},
		};

		const sendSpy = vi
			.spyOn(telegram, 'sendMessage')
			.mockResolvedValue({ ok: true, result: { message_id: 888 } });
		vi.spyOn(telegram, 'deleteMessage').mockResolvedValue({ ok: true });

		// User 4001 adds 2 users
		await processTelegramUpdate(
			{
				update_id: 10,
				message: {
					message_id: 20,
					chat: { id: chatId, type: 'supergroup', title: 'گروه دستورات ادشمار' },
					from: { id: 4001, first_name: 'مهرداد', is_bot: false },
					new_chat_members: [
						{ id: 5001, first_name: 'الف', is_bot: false },
						{ id: 5002, first_name: 'ب', is_bot: false },
					],
				},
			},
			'test_token',
		);

		sendSpy.mockClear();

		// Member asks "آمار اد"
		await processTelegramUpdate(
			{
				update_id: 11,
				message: {
					message_id: 21,
					chat: { id: chatId, type: 'supergroup', title: 'گروه دستورات ادشمار' },
					from: { id: 4001, first_name: 'مهرداد', is_bot: false },
					text: 'آمار اد',
				},
			},
			'test_token',
		);
		expect(sendSpy).toHaveBeenCalledWith(
			chatId,
			expect.stringContaining('اد فعلی: <b>2</b>'),
			expect.any(Object),
			'test_token',
		);

		sendSpy.mockClear();

		// Member asks "/topadds"
		await processTelegramUpdate(
			{
				update_id: 12,
				message: {
					message_id: 22,
					chat: { id: chatId, type: 'supergroup', title: 'گروه دستورات ادشمار' },
					from: { id: 4001, first_name: 'مهرداد', is_bot: false },
					text: '/topadds',
				},
			},
			'test_token',
		);
		expect(sendSpy).toHaveBeenCalledWith(
			chatId,
			expect.stringContaining('مهرداد'),
			expect.any(Object),
			'test_token',
		);

		// Admin manually adjusts user 4001 to 7 via "تنظیم اد ۷"
		await processTelegramUpdate(
			{
				update_id: 13,
				message: {
					message_id: 23,
					chat: { id: chatId, type: 'supergroup', title: 'گروه دستورات ادشمار' },
					from: { id: 100, first_name: 'Admin', is_bot: false },
					reply_to_message: {
						message_id: 21,
						from: { id: 4001, first_name: 'مهرداد', is_bot: false },
					},
					text: 'تنظیم اد ۷',
				},
			},
			'test_token',
		);
		expect(getUserAddCount(settings, 4001)).toBe(7);

		// Admin resets group counter via "ریست اد کل"
		await processTelegramUpdate(
			{
				update_id: 14,
				message: {
					message_id: 24,
					chat: { id: chatId, type: 'supergroup', title: 'گروه دستورات ادشمار' },
					from: { id: 100, first_name: 'Admin', is_bot: false },
					text: 'ریست اد کل',
				},
			},
			'test_token',
		);
		expect(getUserAddCount(settings, 4001)).toBe(0);
	});

	it('exposes REST API endpoints for Add-Counter settings sync, adjust, and reset', async () => {
		const srv = createServer();
		await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
		const addr = srv.address() as any;
		const baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
		const gid = '-1009911223366';

		try {
			// Save add_counter via /settings and verify mandatory_membership sync
			const putRes = await fetch(`${baseUrl}/groups/${gid}/settings`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category: 'add_counter',
					data: {
						enabled: true,
						requireTargetToChat: true,
						requiredCount: 4,
						autoDeleteSec: 30,
					},
					version: 1,
				}),
			});
			expect(putRes.status).toBe(200);
			const savedSettings = await putRes.json();
			expect(savedSettings.add_counter.enabled).toBe(true);
			expect(savedSettings.mandatory_membership.forced_add_enabled).toBe(true);
			expect(savedSettings.mandatory_membership.forced_add_count).toBe(4);
			expect(getEffectiveAddCounterConfig(getGroupSettings(Number(gid))).requiredCount).toBe(4);

			// Adjust user add count
			const adjRes = await fetch(`${baseUrl}/groups/${gid}/add-counter/adjust`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 7701, count: 4, name: 'نگار' }),
			});
			expect(adjRes.status).toBe(200);
			const adjJson = await adjRes.json();
			expect(adjJson.user.count).toBe(4);

			// Fetch leaderboard stats
			const statsRes = await fetch(`${baseUrl}/groups/${gid}/add-counter`);
			expect(statsRes.status).toBe(200);
			const statsJson = await statsRes.json();
			expect(statsJson.total_group_adds).toBe(4);
			expect(statsJson.completed_users_count).toBe(1);
			expect(statsJson.leaderboard[0].name).toBe('نگار');

			// Reset user add count
			const rstRes = await fetch(`${baseUrl}/groups/${gid}/add-counter/reset`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 7701 }),
			});
			expect(rstRes.status).toBe(200);
			const afterRst = await (await fetch(`${baseUrl}/groups/${gid}/add-counter`)).json();
			expect(afterRst.leaderboard[0].count).toBe(0);
		} finally {
			await new Promise<void>((resolve) => (srv as http.Server).close(() => resolve()));
		}
	});
});

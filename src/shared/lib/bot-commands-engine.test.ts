import { describe, expect, it } from 'vitest';
import {
	BOT_COMMANDS_CATALOG,
	evaluateCallbackQueryRbac,
	normalizeDigits,
	parseDurationToSeconds,
	parseGroupCommand,
	resolveEdgeCaseScenario,
} from './bot-commands-engine.js';

describe('MiniGuard Bot Commands, Inline Callbacks & Edge-Case Engine', () => {
	it('normalizes Persian and Arabic digits and parses timed durations accurately', () => {
		expect(normalizeDigits('سکوت ۲۴ ساعت')).toBe('سکوت 24 ساعت');
		expect(parseDurationToSeconds('۲ ساعت')).toBe(7200);
		expect(parseDurationToSeconds('30m')).toBe(1800);
		expect(parseDurationToSeconds('۳ روز')).toBe(259200);
		expect(parseDurationToSeconds('۴۵ دقیقه')).toBe(2700);
	});

	it('parses natural Persian and Slash moderation commands (ban, mute, warn, purge, panel)', () => {
		const banCmd = parseGroupCommand({
			text: 'بن ارسال لینک کلاهبرداری',
			repliedUserName: 'SpammerX',
			repliedUserId: 9001,
			senderIsAdmin: true,
		});
		expect(banCmd.matched).toBe(true);
		expect(banCmd.commandId).toBe('ban');
		expect(banCmd.botApiMethod).toBe('banChatMember');
		expect(banCmd.inlineButtons && banCmd.inlineButtons.length > 0).toBe(true);

		const muteCmd = parseGroupCommand({
			text: 'سکوت ۲ ساعت',
			repliedUserName: 'NoisyUser',
			repliedUserId: 9002,
			senderIsAdmin: true,
		});
		expect(muteCmd.matched).toBe(true);
		expect(muteCmd.commandId).toBe('mute');
		expect(muteCmd.durationSeconds).toBe(7200);

		const purgeCmd = parseGroupCommand({
			text: 'پاکسازی ۵۰',
			senderIsAdmin: true,
		});
		expect(purgeCmd.matched).toBe(true);
		expect(purgeCmd.commandId).toBe('purge');
		expect(purgeCmd.batchCount).toBe(50);

		const panelCmd = parseGroupCommand({
			text: 'پنل',
			senderIsAdmin: true,
		});
		expect(panelCmd.matched).toBe(true);
		expect(panelCmd.commandId).toBe('panel');
		expect(panelCmd.inlineButtons?.length).toBe(4);
	});

	it('enforces admin-only RBAC on inline keyboard callback queries', () => {
		const adminClick = evaluateCallbackQueryRbac({
			callerUserId: 101,
			adminUserIds: [101, 102],
			callbackData: 'mg:toggle:links',
		});
		expect(adminClick.allowed).toBe(true);
		expect(adminClick.showAlertModal).toBe(false);

		const regularMemberClick = evaluateCallbackQueryRbac({
			callerUserId: 999,
			adminUserIds: [101, 102],
			callbackData: 'mg:toggle:links',
		});
		expect(regularMemberClick.allowed).toBe(false);
		expect(regularMemberClick.showAlertModal).toBe(true);
	});

	it('resolves subscription expiry (7-day retention) and critical edge cases', () => {
		const expired = resolveEdgeCaseScenario('subscription_expired_unpaid');
		expect(expired.dataLost).toBe(false);
		expect(expired.botActionCode).toContain('SAFE_HIBERNATION_7_DAYS');
		expect(expired.systemBehaviorFa).toContain('۱ هفته');

		const migration = resolveEdgeCaseScenario('supergroup_chat_id_migration');
		expect(migration.dataLost).toBe(false);
		expect(migration.botActionCode).toContain('ATOMIC_CHAT_ID_MIGRATION');

		expect(BOT_COMMANDS_CATALOG.length).toBeGreaterThanOrEqual(16);
	});
});

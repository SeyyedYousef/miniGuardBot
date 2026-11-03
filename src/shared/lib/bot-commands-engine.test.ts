import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	BOT_COMMANDS_CATALOG,
	evaluateCallbackQueryRbac,
	normalizeDigits,
	parseDurationToSeconds,
	parseGroupCommand,
	resolveEdgeCaseScenario,
} from './bot-commands-engine.ts';

describe('MiniGuard Bot Commands, Inline Callbacks & Edge-Case Engine (node:test)', () => {
	it('normalizes Persian and Arabic digits and parses timed durations accurately', () => {
		assert.equal(normalizeDigits('سکوت ۲۴ ساعت'), 'سکوت 24 ساعت');
		assert.equal(parseDurationToSeconds('۲ ساعت'), 7200);
		assert.equal(parseDurationToSeconds('30m'), 1800);
		assert.equal(parseDurationToSeconds('۳ روز'), 259200);
		assert.equal(parseDurationToSeconds('۴۵ دقیقه'), 2700);
	});

	it('parses natural Persian and Slash moderation commands (ban, mute, warn, purge, panel)', () => {
		const banCmd = parseGroupCommand({
			text: 'بن ارسال لینک کلاهبرداری',
			repliedUserName: 'SpammerX',
			repliedUserId: 9001,
			senderIsAdmin: true,
		});
		assert.equal(banCmd.matched, true);
		assert.equal(banCmd.commandId, 'ban');
		assert.equal(banCmd.botApiMethod, 'banChatMember');
		assert.ok(banCmd.inlineButtons && banCmd.inlineButtons.length > 0);

		const muteCmd = parseGroupCommand({
			text: 'سکوت ۲ ساعت',
			repliedUserName: 'NoisyUser',
			repliedUserId: 9002,
			senderIsAdmin: true,
		});
		assert.equal(muteCmd.matched, true);
		assert.equal(muteCmd.commandId, 'mute');
		assert.equal(muteCmd.durationSeconds, 7200);

		const purgeCmd = parseGroupCommand({
			text: 'پاکسازی ۵۰',
			senderIsAdmin: true,
		});
		assert.equal(purgeCmd.matched, true);
		assert.equal(purgeCmd.commandId, 'purge');
		assert.equal(purgeCmd.batchCount, 50);

		const panelCmd = parseGroupCommand({
			text: 'پنل',
			senderIsAdmin: true,
		});
		assert.equal(panelCmd.matched, true);
		assert.equal(panelCmd.commandId, 'panel');
		assert.equal(panelCmd.inlineButtons?.length, 4);
	});

	it('enforces admin-only RBAC on inline keyboard callback queries', () => {
		const adminClick = evaluateCallbackQueryRbac({
			callerUserId: 101,
			adminUserIds: [101, 102],
			callbackData: 'mg:toggle:links',
		});
		assert.equal(adminClick.allowed, true);
		assert.equal(adminClick.showAlertModal, false);

		const regularMemberClick = evaluateCallbackQueryRbac({
			callerUserId: 999,
			adminUserIds: [101, 102],
			callbackData: 'mg:toggle:links',
		});
		assert.equal(regularMemberClick.allowed, false);
		assert.equal(regularMemberClick.showAlertModal, true);
	});

	it('resolves subscription expiry and critical edge cases with zero data loss', () => {
		const expired = resolveEdgeCaseScenario('subscription_expired_unpaid');
		assert.equal(expired.dataLost, false);
		assert.ok(expired.botActionCode.includes('SAFE_HIBERNATION_MODE'));

		const migration = resolveEdgeCaseScenario('supergroup_chat_id_migration');
		assert.equal(migration.dataLost, false);
		assert.ok(migration.botActionCode.includes('ATOMIC_CHAT_ID_MIGRATION'));

		assert.ok(BOT_COMMANDS_CATALOG.length >= 16);
	});
});

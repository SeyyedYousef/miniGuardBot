import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	type BinaryFirewallConfig,
	detectHomographAdminSpoofing,
	detectZeroWidthOrBidiOverride,
	evaluateBinaryMessageFirewall,
	evaluateChatJoinRequest,
	isForumTopicWhitelisted,
} from './firewall-engine.ts';

const baseConfig: BinaryFirewallConfig = {
	forumTopicsMode: true,
	whitelistedTopicIds: [42, 108],
	lockTopicCreation: true,
	blockZeroWidthChars: true,
	blockHomographImpersonation: true,
	protectedAdminNames: ['Ali Rezaei', 'مدیر اصلی گروه'],
	blockExternalReplies: true,
	blockStoryForwards: true,
	blockPremiumCustomEmojis: true,
	blockSpoilerMessages: true,
	removeLinks: true,
};

describe('MiniGuard Binary & Protocol Firewall Engine (node:test)', () => {
	it('detects invisible Zero-Width Space (U+200B) and RTL Override (U+202E) characters', () => {
		const clean = detectZeroWidthOrBidiOverride('سلام دوستان به گروه خوش آمدید');
		assert.equal(clean.detected, false);

		const obfuscatedLink = detectZeroWidthOrBidiOverride('https://t\u200B.me/\u202Espam_channel');
		assert.equal(obfuscatedLink.detected, true);
		assert.ok(obfuscatedLink.codePoints.includes('U+200B'));
		assert.ok(obfuscatedLink.codePoints.includes('U+202E'));
	});

	it('detects Cyrillic/Arabic Homograph spoofing of group admin display names', () => {
		// Using Cyrillic 'а' (\u0430) and 'е' (\u0435) instead of Latin 'a' and 'e'
		const cyrillicSpoof = 'Аli Rеzaei';
		const res = detectHomographAdminSpoofing(cyrillicSpoof, baseConfig.protectedAdminNames);
		assert.equal(res.spoofed, true);
		assert.equal(res.matchedAdmin, 'Ali Rezaei');

		// Using Arabic Kaf/Yeh against Persian admin title
		const arabicSpoof = 'مدير اصلي گروه';
		const resFa = detectHomographAdminSpoofing(arabicSpoof, baseConfig.protectedAdminNames);
		assert.equal(resFa.spoofed, true);

		const normalMember = detectHomographAdminSpoofing('Mohammad Karimi', baseConfig.protectedAdminNames);
		assert.equal(normalMember.spoofed, false);
	});

	it('exempts whitelisted Forum Topic IDs (message_thread_id) from link/external_reply locks', () => {
		assert.equal(isForumTopicWhitelisted(42, true, [42, 108]), true);
		assert.equal(isForumTopicWhitelisted(999, true, [42, 108]), false);

		// Link inside whitelisted topic #42 is allowed
		const allowedInTopic = evaluateBinaryMessageFirewall(
			{
				message_id: 1,
				user_id: 1001,
				user_display_name: 'Sina',
				message_thread_id: 42,
				text: 'Check out https://github.com/solidjs/solid',
				entities: [{ type: 'url', offset: 10, length: 31 }],
			},
			baseConfig,
		);
		assert.equal(allowedInTopic.allowed, true);
		assert.equal(allowedInTopic.reason, 'whitelisted_topic');

		// Same link in non-whitelisted topic #99 is blocked
		const blockedInGeneral = evaluateBinaryMessageFirewall(
			{
				message_id: 2,
				user_id: 1001,
				user_display_name: 'Sina',
				message_thread_id: 99,
				text: 'Check out https://github.com/solidjs/solid',
				entities: [{ type: 'url', offset: 10, length: 31 }],
			},
			baseConfig,
		);
		assert.equal(blockedInGeneral.allowed, false);
		assert.equal(blockedInGeneral.reason, 'link_blocked');
	});

	it('blocks Bot API 8.x external_reply, story forwards, and custom_emoji spam', () => {
		const extReplyVerdict = evaluateBinaryMessageFirewall(
			{
				message_id: 10,
				user_id: 2002,
				user_display_name: 'User2',
				text: 'Look at this channel post',
				external_reply: { origin_chat_id: -10099887766, origin_type: 'channel' },
			},
			baseConfig,
		);
		assert.equal(extReplyVerdict.allowed, false);
		assert.equal(extReplyVerdict.reason, 'external_reply_blocked');

		const storyVerdict = evaluateBinaryMessageFirewall(
			{
				message_id: 11,
				user_id: 2002,
				user_display_name: 'User2',
				story: { id: 55, chat_id: -10012345 },
			},
			baseConfig,
		);
		assert.equal(storyVerdict.allowed, false);
		assert.equal(storyVerdict.reason, 'story_forward_blocked');

		const customEmojiVerdict = evaluateBinaryMessageFirewall(
			{
				message_id: 12,
				user_id: 2002,
				user_display_name: 'User2',
				text: '💎 Join VIP',
				entities: [{ type: 'custom_emoji', offset: 0, length: 2, custom_emoji_id: '5368324170671202286' }],
			},
			baseConfig,
		);
		assert.equal(customEmojiVerdict.allowed, false);
		assert.equal(customEmojiVerdict.reason, 'premium_custom_emoji_blocked');
	});

	it('evaluates UpdateChatJoinRequest with WebApp Biometric verification', () => {
		const pendingBio = evaluateChatJoinRequest({
			userId: 501,
			isBot: false,
			userDisplayName: 'Reza',
			biometricRequired: true,
			biometricTokenVerified: false,
			protectedAdminNames: baseConfig.protectedAdminNames,
		});
		assert.equal(pendingBio.action, 'pending_biometric');

		const approvedHuman = evaluateChatJoinRequest({
			userId: 501,
			isBot: false,
			userDisplayName: 'Reza',
			biometricRequired: true,
			biometricTokenVerified: true,
			protectedAdminNames: baseConfig.protectedAdminNames,
		});
		assert.equal(approvedHuman.action, 'approve');

		const spoofDeclined = evaluateChatJoinRequest({
			userId: 502,
			isBot: false,
			userDisplayName: 'Аli Rеzaei',
			biometricRequired: false,
			biometricTokenVerified: false,
			protectedAdminNames: baseConfig.protectedAdminNames,
		});
		assert.equal(spoofDeclined.action, 'decline');
	});
});
